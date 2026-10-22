// Planificateur du mode auto : maîtrise par (kana, stage), répétition espacée
// inspirée de SM-2, introduction progressive des groupes et passage aux stages
// supérieurs. Module pur : aucune dépendance au DOM, à Dexie ni à l'horloge
// (le temps `now` et l'aléa `rng` sont fournis par l'appelant).

import type { StageId } from '@/features/quiz/types'

// ---------------------------------------------------------------------------
// Paramètres
// ---------------------------------------------------------------------------

const SECOND = 1000
const MINUTE = 60 * SECOND
const DAY = 24 * 60 * MINUTE

/**
 * Temps de réponse [rapide, lent] par stage, en ms. En dessous de « rapide » la
 * réponse juste vaut 1 ; au-delà de « lent » elle plafonne à SLOW_QUALITY.
 */
export const SPEED_THRESHOLDS: Record<StageId, [fast: number, slow: number]> = {
  1: [2500, 7000],
  2: [2500, 7000],
  3: [3500, 9000],
  4: [3500, 9000],
  5: [3000, 8000],
  6: [6000, 15000],
}

/** Qualité d'une réponse juste mais très lente : insuffisante pour être maîtrisé. */
export const SLOW_QUALITY = 0.4
/** Poids d'une nouvelle réponse dans la moyenne mobile de maîtrise. */
export const MASTERY_ALPHA = 0.35
/** Seuil de maîtrise d'une carte (≈ 4 réponses justes et rapides d'affilée depuis zéro). */
export const MASTERY_THRESHOLD = 0.8
/** Part des kana actifs à maîtriser pour débloquer le groupe suivant. */
export const UNLOCK_RATIO = 0.8

const GOOD_QUALITY = 0.8
const HARD_QUALITY = 0.5
const MIN_EASE = 1.3
const MAX_EASE = 3
const INITIAL_EASE = 2.5
const RELEARN_INTERVAL = 30 * SECOND
/** Intervalles des premières réussites, avant d'appliquer le facteur de facilité. */
const LEARNING_STEPS = [2 * MINUTE, 10 * MINUTE, DAY]

/** Score de priorité d'une carte jamais vue (≈ une carte tout juste échue). */
const NEW_CARD_PRIORITY = 1
/** Le tirage se fait parmi les N cartes les plus prioritaires. */
const CANDIDATE_POOL = 4

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Ce que le planificateur retient d'une réponse (sous-ensemble d'AnswerRecord). */
export interface AnswerEvent {
  kanaId: string
  stage: StageId
  correct: boolean
  responseMs: number
  answeredAt: number
  revealed: boolean
}

/** État de révision d'un kana à un stage. */
export interface CardState {
  /** Réussites consécutives (remis à 0 par un échec). */
  reps: number
  lapses: number
  ease: number
  intervalMs: number
  lastAt: number
  dueAt: number
  /** Moyenne mobile de la qualité des réponses, 0 à 1. */
  mastery: number
  answers: number
}

/** Cartes indexées par `cardKey(kanaId, stage)`. */
export type Progress = ReadonlyMap<string, CardState>

export interface CardRef {
  kanaId: string
  stage: StageId
}

export type Rng = () => number

export function cardKey(kanaId: string, stage: StageId): string {
  return `${kanaId}|${stage}`
}

// ---------------------------------------------------------------------------
// Qualité et mise à jour d'une carte
// ---------------------------------------------------------------------------

/** Qualité d'une réponse, de 0 (échec) à 1 (juste et rapide). */
export function answerQuality(event: Pick<AnswerEvent, 'stage' | 'correct' | 'responseMs' | 'revealed'>): number {
  if (!event.correct || event.revealed) return 0
  const [fast, slow] = SPEED_THRESHOLDS[event.stage]
  if (event.responseMs <= fast) return 1
  if (event.responseMs >= slow) return SLOW_QUALITY
  return 1 - ((event.responseMs - fast) / (slow - fast)) * (1 - SLOW_QUALITY)
}

/** Nouvel état d'une carte après une réponse de qualité `quality` à l'instant `at`. */
export function reviewCard(card: CardState | undefined, quality: number, at: number): CardState {
  const prev = card ?? {
    reps: 0,
    lapses: 0,
    ease: INITIAL_EASE,
    intervalMs: 0,
    lastAt: at,
    dueAt: at,
    mastery: 0,
    answers: 0,
  }
  const mastery = prev.mastery + MASTERY_ALPHA * (quality - prev.mastery)
  let { reps, lapses, ease, intervalMs } = prev

  if (quality < HARD_QUALITY) {
    if (reps > 0) lapses++
    reps = 0
    ease = Math.max(MIN_EASE, ease - 0.2)
    intervalMs = RELEARN_INTERVAL
  } else if (quality < GOOD_QUALITY) {
    reps++
    ease = Math.max(MIN_EASE, ease - 0.15)
    intervalMs = Math.max(MINUTE, intervalMs * 1.2)
  } else {
    reps++
    ease = Math.min(MAX_EASE, ease + 0.05)
    intervalMs = LEARNING_STEPS[reps - 1] ?? intervalMs * ease
  }

  return { reps, lapses, ease, intervalMs, lastAt: at, dueAt: at + intervalMs, mastery, answers: prev.answers + 1 }
}

export function applyAnswers(progress: Progress, events: readonly AnswerEvent[]): Map<string, CardState> {
  const next = new Map(progress)
  for (const e of events) {
    const key = cardKey(e.kanaId, e.stage)
    next.set(key, reviewCard(next.get(key), answerQuality(e), e.answeredAt))
  }
  return next
}

/** Progression reconstituée à partir de l'historique complet des réponses. */
export function buildProgress(events: readonly AnswerEvent[]): Map<string, CardState> {
  return applyAnswers(new Map(), [...events].sort((a, b) => a.answeredAt - b.answeredAt))
}

// ---------------------------------------------------------------------------
// Maîtrise, stages et groupes
// ---------------------------------------------------------------------------

export function isMastered(card: CardState | undefined): boolean {
  return card !== undefined && card.mastery >= MASTERY_THRESHOLD
}

/**
 * Stage en cours d'apprentissage pour un kana : le premier des `stages` (dans
 * l'ordre donné) qui n'est pas maîtrisé ; `null` si tous le sont.
 */
export function currentStage(progress: Progress, kanaId: string, stages: readonly StageId[]): StageId | null {
  return stages.find((s) => !isMastered(progress.get(cardKey(kanaId, s)))) ?? null
}

/** Un kana est acquis quand il est maîtrisé au premier stage du parcours. */
export function isAcquired(progress: Progress, kanaId: string, stages: readonly StageId[]): boolean {
  const first = stages[0]
  return first !== undefined && isMastered(progress.get(cardKey(kanaId, first)))
}

export interface PathGroup {
  id: string
  kanaIds: readonly string[]
}

/**
 * Nombre de groupes du parcours débloqués : on ajoute le groupe suivant tant
 * qu'au moins UNLOCK_RATIO des kana actifs sont acquis. Ne redescend jamais
 * sous `alreadyUnlocked` (un oubli ne retire pas un groupe).
 */
export function unlockedGroupCount(
  path: readonly PathGroup[],
  progress: Progress,
  stages: readonly StageId[],
  alreadyUnlocked = 1,
): number {
  let count = Math.min(Math.max(1, alreadyUnlocked), path.length)
  while (count < path.length) {
    const active = activeKanaIds(path, count)
    const acquired = active.filter((id) => isAcquired(progress, id, stages)).length
    if (acquired < Math.ceil(active.length * UNLOCK_RATIO)) break
    count++
  }
  return count
}

export function activeKanaIds(path: readonly PathGroup[], unlocked: number): string[] {
  return path.slice(0, unlocked).flatMap((g) => g.kanaIds)
}

/** Part des kana actifs acquis (0 à 1), pour l'affichage. */
export function acquiredRatio(path: readonly PathGroup[], unlocked: number, progress: Progress, stages: readonly StageId[]): number {
  const active = activeKanaIds(path, unlocked)
  if (active.length === 0) return 0
  return active.filter((id) => isAcquired(progress, id, stages)).length / active.length
}

// ---------------------------------------------------------------------------
// Choix de la prochaine question
// ---------------------------------------------------------------------------

export interface NextCardInput {
  progress: Progress
  /** Kana actifs (groupes débloqués). */
  kanaIds: readonly string[]
  /** Stages du parcours, dans l'ordre de progression. */
  stages: readonly StageId[]
  now: number
  /** Dernières cartes posées (la plus récente en dernier), à éviter. */
  recent?: readonly CardRef[]
  /** Exclut une carte impossible à poser (ex. stage 6 sans mot disponible). */
  isApplicable?: (card: CardRef) => boolean
  rng: Rng
}

/**
 * Priorité d'une carte déjà vue : temps écoulé rapporté à l'intervalle prévu
 * (≥ 1 = due), pondéré par la faiblesse de la maîtrise.
 */
export function cardPriority(card: CardState, now: number): number {
  const overdue = (now - card.lastAt) / Math.max(card.intervalMs, 1)
  return overdue * (1.5 - card.mastery)
}

/** Cartes candidates d'un kana : stages déjà atteints + stage en cours. */
function candidateCards(input: NextCardInput, kanaId: string): { ref: CardRef; priority: number }[] {
  const { progress, stages, now } = input
  const stagesForKana = stages.filter((s) => input.isApplicable?.({ kanaId, stage: s }) ?? true)
  const current = currentStage(progress, kanaId, stagesForKana)
  const reached = current === null ? stagesForKana : stagesForKana.slice(0, stagesForKana.indexOf(current) + 1)

  return reached.map((stage) => {
    const card = progress.get(cardKey(kanaId, stage))
    return { ref: { kanaId, stage }, priority: card ? cardPriority(card, now) : NEW_CARD_PRIORITY }
  })
}

/** Prochaine carte à poser, ou `null` si aucun kana n'est actif. */
export function nextCard(input: NextCardInput): CardRef | null {
  const all = input.kanaIds.flatMap((id) => candidateCards(input, id))
  if (all.length === 0) return null

  // Éviter les kana posés récemment, si le choix le permet ; jamais deux fois de suite le même.
  const recentKana = new Set((input.recent ?? []).map((r) => r.kanaId))
  const last = input.recent?.at(-1)?.kanaId
  const fresh = all.filter((c) => !recentKana.has(c.ref.kanaId))
  const notLast = all.filter((c) => c.ref.kanaId !== last)
  const pool = fresh.length > 0 ? fresh : notLast.length > 0 ? notLast : all

  const top = [...pool].sort((a, b) => b.priority - a.priority).slice(0, CANDIDATE_POOL)
  const total = top.reduce((sum, c) => sum + c.priority, 0)
  let r = input.rng() * total
  for (const c of top) {
    r -= c.priority
    if (r < 0) return c.ref
  }
  return top[0]!.ref
}
