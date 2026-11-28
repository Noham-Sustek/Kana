import { groupsOfScript, type GroupKind, type KanaGroup, type Script } from '@/data/kana'
import type { AnswerRecord, WritingResult } from '@/db/db'
import type { StrokeFault } from '@/features/writing/strokeMatch'

/** Lentille Écriture : 0 = jamais tracé, 1 = calque réussi, 2 = de mémoire réussi. */
export type WritingLevelReached = 0 | 1 | 2

/** Lignes exercées en écriture (les yōon s'écrivent avec des kana déjà travaillés seuls). */
export const WRITABLE_KINDS: readonly GroupKind[] = ['gojuon', 'dakuten', 'handakuten']

/** Durée moyenne d'un kana dans l'exercice (observer, calque, de mémoire), pour l'estimation. */
const SECONDS_PER_KANA = 45

/**
 * Niveau atteint par kana. Un tracé de mémoire réussi compte aussi au quiz : un
 * « Tracer un kana » (stage 5) juste du premier coup, sans réponse affichée.
 */
export function writingLevels(
  results: readonly Pick<WritingResult, 'kanaId' | 'level' | 'success'>[],
  answers: readonly Pick<AnswerRecord, 'kanaId' | 'stage' | 'correct' | 'revealed'>[] = [],
): Map<string, 1 | 2> {
  const levels = new Map<string, 1 | 2>()
  const raise = (kanaId: string, level: 1 | 2) => {
    if ((levels.get(kanaId) ?? 0) < level) levels.set(kanaId, level)
  }
  for (const r of results) if (r.success) raise(r.kanaId, r.level === 3 ? 2 : 1)
  for (const a of answers) if (a.stage === 5 && a.correct && !a.revealed) raise(a.kanaId, 2)
  return levels
}

/** État d'écriture d'un kana, en une ligne (fiche du kana). */
export function writingStatus(level: WritingLevelReached): string {
  if (level === 2) return 'Réussi de mémoire'
  if (level === 1) return 'Calque réussi · de mémoire à faire'
  return 'Ordre des traits, calque, puis de mémoire'
}

export interface LineToTrace {
  group: KanaGroup
  /** Kana de la ligne pas encore réussis de mémoire. */
  kanaIds: string[]
  minutes: number
}

/** Première ligne (dans l'ordre du tableau) qui a encore des kana à réussir de mémoire. */
export function nextLineToTrace(script: Script, levels: ReadonlyMap<string, number>): LineToTrace | null {
  for (const group of groupsOfScript(script)) {
    if (!WRITABLE_KINDS.includes(group.kind)) continue
    const kanaIds = group.kanaIds.filter((id) => (levels.get(id) ?? 0) < 2)
    if (kanaIds.length > 0) {
      return { group, kanaIds, minutes: Math.max(1, Math.round((kanaIds.length * SECONDS_PER_KANA) / 60)) }
    }
  }
  return null
}

/** Détail d'un trait après le tracé de mémoire : « Juste du premier coup », « Juste après 2 essais ». */
export function strokeNote(mistakes: number): string {
  if (mistakes === 0) return 'Juste du premier coup'
  return `Juste après ${mistakes + 1} essais`
}

/** Faute d'un trait, en clair (vérification à la fin du kana). */
export const FAULT_LABELS: Record<StrokeFault, string> = {
  order: 'Pas dans l’ordre',
  direction: 'Sens inversé',
  position: 'Bonne forme, mal placé',
  shape: 'Forme à reprendre',
  missing: 'Manquant',
}

/**
 * Réussite d'un tracé : sans modèle affiché, sans indice de mémoire, et sans trait
 * faux quand la vérification se fait à la fin (`faults`).
 */
export function isWritingSuccess(
  level: 2 | 3,
  r: { revealed: boolean; hinted: boolean; faults?: readonly (StrokeFault | null)[] },
): boolean {
  return !r.revealed && (level === 2 || !r.hinted) && !r.faults?.some((f) => f !== null)
}
