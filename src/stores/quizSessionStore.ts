import { create } from 'zustand'
import type { KanaGroup, PathScript } from '@/data/kana'
import { loadProfileAnswers, recordAnswers } from '@/db/answers'
import { loadAnswersForScript, loadUnlockedGroups, saveUnlockedGroups } from '@/db/autoState'
import {
  createAutoContext,
  createSelectionContext,
  nextAutoQuestion,
  recordAutoAnswers,
  type AutoContext,
} from '@/features/quiz/auto'
import {
  appendQuestion,
  currentQuestion,
  nextQuestion,
  revealAnswer,
  startSession,
  submitAnswer,
  submitDrawing,
  toAnswerRecords,
  type SessionState,
  type Transition,
} from '@/features/quiz/session'
import type { Question, QuizOptions, StageId } from '@/features/quiz/types'
import { haptic, type HapticKind } from '@/lib/haptic'
import { activeProfileId } from '@/stores/profileStore'

export interface AutoParams {
  script: PathScript
  /** Kana choisis par l'utilisateur ; absent = parcours guidé de `script`. */
  kanaIds?: string[]
  stages: StageId[]
  questionCount: number
  options: QuizOptions
}

interface QuizSessionStore {
  session: SessionState | null
  /** Profil auquel les réponses de la session sont rattachées. */
  profileId: number
  /** Présent en mode auto : état du planificateur pour la session en cours. */
  auto: AutoContext | null
  autoParams: AutoParams | null
  /** Groupes débloqués pendant la session (mode auto). */
  unlockedThisSession: KanaGroup[]

  start: (questions: Question[], options: QuizOptions) => void
  startAuto: (params: AutoParams) => Promise<void>
  submit: (answer: string) => void
  submitDrawing: (correct: boolean) => void
  /** `timedOut` : chrono écoulé (vibration propre), sinon « Afficher la réponse ». */
  reveal: (timedOut?: boolean) => void
  next: () => void
  quit: () => void
}

function persistError(err: unknown) {
  console.error('Enregistrement impossible', err)
}

/** Vibration d'une réponse : juste, fausse (aussi à chaque réessai), chrono écoulé. Rien pour « Afficher la réponse ». */
function answerHaptic(before: SessionState, after: SessionState, timedOut: boolean): HapticKind | null {
  if (before.status !== 'pending' || after === before) return null
  if (after.status === 'correct') return 'correct'
  if (timedOut && after.status === 'failed') return 'timeout'
  if (after.wrongAnswers.length > before.wrongAnswers.length) return 'wrong'
  // Dessin raté (pas de réponse texte enregistrée).
  if (after.status === 'failed' && !after.outcomes[after.index]?.revealed) return 'wrong'
  return null
}

// Session en mémoire uniquement : seules les réponses (et le déblocage auto) sont persistées (Dexie).
export const useQuizSessionStore = create<QuizSessionStore>()((set, get) => {
  const apply = (transition: (s: SessionState, now: number) => Transition, timedOut = false) => {
    const { session, auto, profileId } = get()
    if (!session) return
    const now = Date.now()
    const question = currentQuestion(session)
    const { state, outcome } = transition(session, now)
    set({ session: state })
    const feel = answerHaptic(session, state, timedOut)
    if (feel) haptic(feel)
    if (!question || !outcome) return

    const records = toAnswerRecords(question, outcome, now)
    recordAnswers(profileId, records).catch(persistError)

    if (auto) {
      const { ctx, newlyUnlocked } = recordAutoAnswers(auto, records)
      set((s) => ({ auto: ctx, unlockedThisSession: [...s.unlockedThisSession, ...newlyUnlocked] }))
      if (newlyUnlocked.length > 0) {
        haptic('unlock')
        saveUnlockedGroups(profileId, ctx.script, ctx.unlocked).catch(persistError)
      }
    }
  }

  return {
    session: null,
    profileId: activeProfileId(),
    auto: null,
    autoParams: null,
    unlockedThisSession: [],

    start: (questions, options) =>
      set({
        session: startSession(questions, options, Date.now()),
        profileId: activeProfileId(),
        auto: null,
        autoParams: null,
        unlockedThisSession: [],
      }),

    startAuto: async (params) => {
      const profileId = activeProfileId()
      const now = Date.now()
      let ctx: AutoContext
      if (params.kanaIds) {
        ctx = createSelectionContext(params.kanaIds, params.stages, await loadProfileAnswers(profileId))
      } else {
        const [history, storedUnlocked] = await Promise.all([
          loadAnswersForScript(profileId, params.script),
          loadUnlockedGroups(profileId, params.script),
        ])
        ctx = createAutoContext(params.script, params.stages, history, storedUnlocked)
        if (ctx.unlocked > storedUnlocked) saveUnlockedGroups(profileId, params.script, ctx.unlocked).catch(persistError)
      }
      const first = nextAutoQuestion(ctx, now, Math.random)
      if (first) ctx = first.ctx
      set({
        session: startSession(first ? [first.question] : [], params.options, now, params.questionCount),
        profileId,
        auto: ctx,
        autoParams: params,
        unlockedThisSession: [],
      })
    },

    submit: (answer) => apply((s, now) => submitAnswer(s, answer, now)),
    submitDrawing: (correct) => apply((s, now) => submitDrawing(s, correct, now)),
    reveal: (timedOut = false) => apply(revealAnswer, timedOut),

    next: () => {
      let { session, auto } = get()
      if (!session || session.status === 'pending') return
      const now = Date.now()
      // Mode auto : la question suivante est choisie maintenant, avec la progression à jour.
      if (auto && session.index + 1 < session.plannedCount && session.index + 1 >= session.questions.length) {
        const generated = nextAutoQuestion(auto, now, Math.random)
        if (generated) {
          session = appendQuestion(session, generated.question)
          auto = generated.ctx
        }
      }
      set({ session: nextQuestion(session, now), auto })
    },

    quit: () => set({ session: null, auto: null, autoParams: null, unlockedThisSession: [] }),
  }
})
