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
  { id: 5, title: 'Écouter', description: 'Son → kana, 4 choix' },
  { id: 6, title: 'Lire', description: 'Mot → lecture au clavier' },
]

export function getStage(id: StageId): StageInfo {
  return STAGES.find((s) => s.id === id)!
}
