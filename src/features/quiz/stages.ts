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
  { id: 6, title: 'Écouter', description: 'Son → kana, 4 choix' },
  { id: 7, title: 'Lire', description: 'Mot → lecture au clavier' },
  { id: 8, title: 'Écrire', description: 'Mot en romaji → tracé au doigt' },
  { id: 9, title: 'Phrases', description: 'Phrase → lecture au clavier' },
]

export function getStage(id: StageId): StageInfo {
  return STAGES.find((s) => s.id === id)!
}

/** Numéro de stage d'avant l'ajout des stages de dessin (5 Écouter, 6 Lire) → numéro actuel. */
export function renumberStageV1(stage: number): number {
  return stage === 5 ? 6 : stage === 6 ? 7 : stage
}
