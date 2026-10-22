import { Dexie, type EntityTable } from 'dexie'
import type { Script } from '@/data/kana'
import type { StageId } from '@/features/quiz/types'

/** Une réponse à une question de quiz (premier essai uniquement). */
export interface AnswerRecord {
  id: number
  kanaId: string
  stage: StageId
  correct: boolean
  /** Temps entre l'affichage de la question et la réponse, en ms. */
  responseMs: number
  /** Horodatage (ms epoch). */
  answeredAt: number
  /** Réponse affichée via « Afficher la réponse » ou chrono écoulé. */
  revealed: boolean
  /** Stage 6 : mot dont ce kana faisait partie (une ligne par kana distinct du mot). */
  wordId?: string
}

/** Liste de kana composée par l'utilisateur. */
export interface CustomGroup {
  id: number
  name: string
  kanaIds: string[]
  createdAt: number
}

/** Mode auto : nombre de groupes débloqués par écriture (ne décroît jamais). */
export interface AutoState {
  script: Script
  unlockedGroups: number
}

// Toute évolution de schéma passe par un nouveau db.version(n) ; ne jamais
// modifier une version existante.
export const db = new Dexie('kana') as Dexie & {
  answers: EntityTable<AnswerRecord, 'id'>
  customGroups: EntityTable<CustomGroup, 'id'>
  autoState: EntityTable<AutoState, 'script'>
}

db.version(1).stores({})
db.version(2).stores({
  answers: '++id, kanaId, stage, answeredAt, [kanaId+stage]',
  customGroups: '++id, name',
})
db.version(3).stores({
  autoState: 'script',
})
