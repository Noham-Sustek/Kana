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
import { kanaQuestion, wordQuestion, wordsForPool } from '@/features/quiz/questions'
import type { Rng } from '@/features/quiz/random'
import { kanaIdsOf } from '@/features/quiz/reading'
import type { Question, StageId } from '@/features/quiz/types'

// Mode auto : relie le planificateur (engine/scheduler) à la génération de
// questions. Pur : l'état est passé et renvoyé, la persistance est ailleurs.

/** Stages du parcours auto, dans l'ordre de progression. Le stage 5 exige l'audio. */
export function autoStages(audioAvailable: boolean): StageId[] {
  return audioAvailable ? [1, 2, 3, 4, 5, 6] : [1, 2, 3, 4, 6]
}

/** Nombre de kana posés récemment à ne pas reposer tout de suite. */
const RECENT_SIZE = 3

export interface AutoContext {
  script: Script
  /** Groupes de l'écriture, dans l'ordre d'introduction. */
  path: KanaGroup[]
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
  return { script, path, stages, progress, unlocked: unlockedGroupCount(path, progress, stages, storedUnlocked), recent: [] }
}

export function activeKana(ctx: AutoContext): Kana[] {
  return activeKanaIds(ctx.path, ctx.unlocked).map((id) => getKana(id)!)
}

/** Prochaine question choisie par le planificateur, ou `null` s'il n'y a rien à poser. */
export function nextAutoQuestion(ctx: AutoContext, now: number, rng: Rng): { question: Question; ctx: AutoContext } | null {
  const pool = activeKana(ctx)
  const words = wordsForPool(pool)
  // Stage 6 seulement pour les kana présents dans au moins un mot lisible.
  const readable = new Set(words.flatMap((w) => kanaIdsOf(w.kana)))

  const card = nextCard({
    progress: ctx.progress,
    kanaIds: pool.map((k) => k.id),
    stages: ctx.stages,
    now,
    recent: ctx.recent,
    isApplicable: ({ kanaId, stage }) => stage !== 6 || readable.has(kanaId),
    rng,
  })
  if (!card) return null

  let question: Question
  if (card.stage === 6) {
    const candidates = words.filter((w) => kanaIdsOf(w.kana).includes(card.kanaId))
    question = wordQuestion(candidates[Math.floor(rng() * candidates.length)]!)
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
