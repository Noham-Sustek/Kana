import type { StrokeVerdict } from '@/features/writing/strokeMatch'

/** Nombre d'erreurs sur un même trait avant d'afficher l'indice. */
export const HINT_AFTER = 2

export interface WritingState {
  strokeCount: number
  /** Nombre de traits validés (= rang du trait attendu). */
  done: number
  /** Erreurs par trait. */
  mistakes: number[]
  last: StrokeVerdict | null
}

export function createWritingState(strokeCount: number): WritingState {
  return { strokeCount, done: 0, mistakes: Array.from({ length: strokeCount }, () => 0), last: null }
}

export function applyVerdict(state: WritingState, verdict: StrokeVerdict): WritingState {
  if (isComplete(state)) return state
  if (verdict.ok) return { ...state, done: state.done + 1, last: verdict }
  const mistakes = state.mistakes.map((m, i) => (i === state.done ? m + 1 : m))
  return { ...state, mistakes, last: verdict }
}

export function isComplete(state: WritingState): boolean {
  return state.done >= state.strokeCount
}

export function shouldShowHint(state: WritingState): boolean {
  return !isComplete(state) && (state.mistakes[state.done] ?? 0) >= HINT_AFTER
}

export function totalMistakes(state: WritingState): number {
  return state.mistakes.reduce((a, b) => a + b, 0)
}
