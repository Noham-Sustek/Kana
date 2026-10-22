import { Dexie, type EntityTable, type Table } from 'dexie'
import type { Script } from '@/data/kana'
import type { StageId } from '@/features/quiz/types'

/** Une réponse à une question de quiz (premier essai uniquement). */
export interface AnswerRecord {
  id: number
  profileId: number
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
  profileId: number
  name: string
  kanaIds: string[]
  createdAt: number
}

/** Mode auto : nombre de groupes débloqués par profil et par écriture (ne décroît jamais). */
export interface AutoState {
  profileId: number
  script: Script
  unlockedGroups: number
}

/** Profil local : chaque profil a sa propre progression. */
export interface Profile {
  id: number
  name: string
  createdAt: number
}

/** Profil créé à l'installation, et auquel les données d'avant les profils sont rattachées. */
export const DEFAULT_PROFILE_ID = 1
export const DEFAULT_PROFILE_NAME = 'Moi'

// Toute évolution de schéma passe par un nouveau db.version(n) ; ne jamais
// modifier une version existante.
export const db = new Dexie('kana') as Dexie & {
  answers: EntityTable<AnswerRecord, 'id'>
  customGroups: EntityTable<CustomGroup, 'id'>
  autoStates: Table<AutoState, [number, Script]>
  profiles: EntityTable<Profile, 'id'>
}

db.version(1).stores({})
db.version(2).stores({
  answers: '++id, kanaId, stage, answeredAt, [kanaId+stage]',
  customGroups: '++id, name',
})
db.version(3).stores({
  autoState: 'script',
})
// v4 : profils. Tout l'existant est rattaché au profil par défaut ; autoState
// change de clé primaire, d'où une nouvelle table (l'ancienne est supprimée en v5).
db.version(4)
  .stores({
    profiles: '++id',
    answers: '++id, kanaId, stage, answeredAt, [kanaId+stage], [profileId+kanaId], [profileId+answeredAt]',
    customGroups: '++id, name, profileId',
    autoStates: '[profileId+script]',
  })
  .upgrade(async (tx) => {
    await tx.table('profiles').add({ id: DEFAULT_PROFILE_ID, name: DEFAULT_PROFILE_NAME, createdAt: Date.now() })
    await tx.table('answers').toCollection().modify({ profileId: DEFAULT_PROFILE_ID })
    await tx.table('customGroups').toCollection().modify({ profileId: DEFAULT_PROFILE_ID })
    const old = await tx.table<{ script: Script; unlockedGroups: number }>('autoState').toArray()
    await tx.table('autoStates').bulkAdd(old.map((s) => ({ ...s, profileId: DEFAULT_PROFILE_ID })))
  })
db.version(5).stores({
  autoState: null,
})

db.on('populate', (tx) => {
  tx.table('profiles').add({ id: DEFAULT_PROFILE_ID, name: DEFAULT_PROFILE_NAME, createdAt: Date.now() })
})
