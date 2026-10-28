import type { StageId } from '@/features/quiz/types'

export interface StageInfo {
  id: StageId
  title: string
  description: string
}

export const STAGES: readonly StageInfo[] = [
  { id: 1, title: 'Reconnaître', description: 'Kana → romaji, 4 choix' },
  { id: 2, title: 'Retrouver', description: 'Romaji → kana, 4 choix' },
  { id: 3, title: 'Discerner', description: 'Kana → romaji, 8 choix proches' },
  { id: 4, title: 'Taper', description: 'Kana → romaji au clavier' },
  { id: 5, title: 'Dessiner', description: 'Romaji → kana tracé au doigt' },
  { id: 6, title: 'Lire', description: 'Mot → lecture au clavier' },
  { id: 7, title: 'Écrire', description: 'Mot en romaji → tracé au doigt' },
  { id: 8, title: 'Phrases', description: 'Phrase → lecture au clavier' },
  { id: 9, title: 'Composer', description: 'Phrase en romaji → étiquettes en kana' },
]

export function getStage(id: StageId): StageInfo {
  return STAGES.find((s) => s.id === id)!
}

// Historique de la numérotation (persistée dans answers.stage, les sauvegardes
// et les réglages) :
// v1 : 1-4, 5 Écouter, 6 Lire
// v2 : 1-4, 5 Dessiner, 6 Écouter, 7 Lire, 8 Écrire, 9 Phrases
// v3 : 1-4, 5 Dessiner, 6 Lire, 7 Écrire, 8 Phrases (stage audio supprimé)
//      + 9 Composer, ajouté en fin de liste (aucune renumérotation)

/** v1 → v2. */
export function renumberStageV1(stage: number): number {
  return stage === 5 ? 6 : stage === 6 ? 7 : stage
}

/** v2 → v3 ; `null` pour l'ancien stage Écouter, supprimé. */
export function renumberStageV2(stage: number): number | null {
  if (stage === 6) return null
  return stage > 6 ? stage - 1 : stage
}

/** Numéro d'un stage enregistré avec la numérotation `version` → numéro actuel (`null` = supprimé). */
export function migrateStage(stage: number, version: number): number | null {
  return renumberStageV2(version < 2 ? renumberStageV1(stage) : stage)
}
