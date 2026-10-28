import { getKana, groupsOfScript, type Kana, type KanaGroup, type Script } from '@/data/kana'
import {
  activeKanaIds,
  applyAnswers,
  buildProgress,
  nextCard,
  unlockedGroupCount,
  type AnswerEvent,
  type CardRef,
  type CardState,
} from '@/engine/scheduler'
import {
  composeQuestion,
  kanaQuestion,
  sentenceQuestion,
  sentencesForPool,
  wordDrawQuestion,
  wordQuestion,
  wordsForPool,
} from '@/features/quiz/questions'
import type { Rng } from '@/features/quiz/random'
import { kanaIdsOf } from '@/features/quiz/reading'
import type { Question, StageId } from '@/features/quiz/types'

// Mode auto : relie le planificateur (engine/scheduler) à la génération de
// questions. Pur : l'état est passé et renvoyé, la persistance est ailleurs.

/** Stages du parcours auto, dans l'ordre de progression. */
export const AUTO_STAGES: StageId[] = [1, 2, 3, 4, 5, 6, 7, 8]

/** Nombre de kana posés récemment à ne pas reposer tout de suite. */
const RECENT_SIZE = 3

export interface AutoContext {
  script: Script
  /** Groupes de l'écriture, dans l'ordre d'introduction (vide pour une sélection). */
  path: KanaGroup[]
  /** Kana choisis par l'utilisateur : remplace le parcours (pas de déblocage). */
  selection: string[] | null
  stages: StageId[]
  progress: Map<string, CardState>
  unlocked: number
  recent: CardRef[]
}

export function createAutoContext(
  script: Script,
  stages: StageId[],
  history: readonly AnswerEvent[],
  storedUnlocked: number,
): AutoContext {
  const path = groupsOfScript(script)
  const progress = buildProgress(history)
  return {
    script,
    path,
    selection: null,
    stages,
    progress,
    unlocked: unlockedGroupCount(path, progress, stages, storedUnlocked),
    recent: [],
  }
}

/**
 * Révision des kana choisis par l'utilisateur : même planificateur (répétition
 * espacée, stages successifs), sans parcours ni déblocage. `script` n'est utilisé
 * que pour le parcours ; `history` = toutes les réponses du profil.
 */
export function createSelectionContext(
  kanaIds: readonly string[],
  stages: StageId[],
  history: readonly AnswerEvent[],
): AutoContext {
  const selection = kanaIds.filter((id) => getKana(id) !== undefined)
  const script = getKana(selection[0] ?? '')?.script ?? 'hiragana'
  return { script, path: [], selection, stages, progress: buildProgress(history), unlocked: 0, recent: [] }
}

export function activeKana(ctx: AutoContext): Kana[] {
  const ids = ctx.selection ?? activeKanaIds(ctx.path, ctx.unlocked)
  return ids.map((id) => getKana(id)!)
}

/** Prochaine question choisie par le planificateur, ou `null` s'il n'y a rien à poser. */
export function nextAutoQuestion(ctx: AutoContext, now: number, rng: Rng): { question: Question; ctx: AutoContext } | null {
  const pool = activeKana(ctx)
  const words = wordsForPool(pool)
  const sentences = sentencesForPool(pool)
  // Stages 6 à 8 seulement pour les kana présents dans au moins un mot / une phrase lisible.
  const inWords = new Set(words.flatMap((w) => kanaIdsOf(w.kana)))
  const inSentences = new Set(sentences.flatMap((s) => kanaIdsOf(s.text)))

  const card = nextCard({
    progress: ctx.progress,
    kanaIds: pool.map((k) => k.id),
    stages: ctx.stages,
    now,
    recent: ctx.recent,
    isApplicable: ({ kanaId, stage }) =>
      stage >= 8 ? inSentences.has(kanaId) : stage >= 6 ? inWords.has(kanaId) : true,
    rng,
  })
  if (!card) return null

  const pick = <T>(items: T[]) => items[Math.floor(rng() * items.length)]!
  let question: Question
  if (card.stage === 6 || card.stage === 7) {
    const word = pick(words.filter((w) => kanaIdsOf(w.kana).includes(card.kanaId)))
    question = card.stage === 6 ? wordQuestion(word) : wordDrawQuestion(word)
  } else if (card.stage === 8 || card.stage === 9) {
    const sentence = pick(sentences.filter((s) => kanaIdsOf(s.text).includes(card.kanaId)))
    question = card.stage === 8 ? sentenceQuestion(sentence) : composeQuestion(sentence, rng)
  } else {
    question = kanaQuestion(card.stage, getKana(card.kanaId)!, pool, rng)
  }

  return { question, ctx: { ...ctx, recent: [...ctx.recent, card].slice(-RECENT_SIZE) } }
}

/** Intègre des réponses ; renvoie aussi les groupes nouvellement débloqués. */
export function recordAutoAnswers(
  ctx: AutoContext,
  events: readonly AnswerEvent[],
): { ctx: AutoContext; newlyUnlocked: KanaGroup[] } {
  const progress = applyAnswers(ctx.progress, events)
  const unlocked = unlockedGroupCount(ctx.path, progress, ctx.stages, ctx.unlocked)
  return {
    ctx: { ...ctx, progress, unlocked },
    newlyUnlocked: ctx.path.slice(ctx.unlocked, unlocked),
  }
}
