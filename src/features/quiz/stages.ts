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

/** Familles d'exercice du design system, chacune avec son icône. */
export type StageFamily = 'recognize' | 'write' | 'read'

export const FAMILIES: Record<StageFamily, { label: string; icon: 'eye' | 'writing' | 'book' }> = {
  recognize: { label: 'Reconnaître', icon: 'eye' },
  write: { label: 'Écrire', icon: 'writing' },
  read: { label: 'Lire', icon: 'book' },
}

export interface StagePresentation {
  /** Nom montré à l'utilisateur (vocabulaire du design system). */
  name: string
  family: StageFamily
  /** Une ligne sous le nom, dans le choix de l'exercice. */
  description: string
  /** Consigne au-dessus du sujet ; absente quand le sujet suffit (dessin). */
  ask?: string
  /** Le nom répète la consigne (« Quel son ? ») : la ligne de famille l'omet. */
  nameInAsk?: boolean
}

// Noms et familles du design system (docs/design/README.md, Vocabulaire) ; les numéros ne changent pas.
const PRESENTATION: Record<StageId, StagePresentation> = {
  1: { name: 'Quel son ?', family: 'recognize', description: 'Un kana, quatre lectures', ask: 'Quel est ce son ?', nameInAsk: true },
  2: { name: 'Quel kana ?', family: 'recognize', description: 'Une lecture, quatre kana', ask: 'Quel est ce kana ?', nameInAsk: true },
  3: { name: 'Faux jumeaux', family: 'recognize', description: 'Huit lectures proches', ask: 'Quel est ce son ?' },
  4: { name: 'De mémoire', family: 'recognize', description: 'Vous tapez la lecture', ask: 'Tapez la lecture' },
  5: { name: 'Tracer un kana', family: 'write', description: 'Au doigt, trait par trait' },
  6: { name: 'Lire un mot', family: 'read', description: 'Un mot en kana, vous tapez la lecture', ask: 'Tapez la lecture' },
  7: { name: 'Tracer un mot', family: 'write', description: 'Une case par caractère' },
  8: { name: 'Lire une phrase', family: 'read', description: 'Une phrase, vous tapez la lecture', ask: 'Tapez la lecture' },
  9: { name: 'Composer une phrase', family: 'read', description: 'Des étiquettes en kana à mettre dans l’ordre', ask: 'Écrivez en kana' },
}

export function stagePresentation(id: StageId): StagePresentation {
  return PRESENTATION[id]
}

/** Ligne de famille d'une question : « Reconnaître » ou « Lire · Lire un mot ». */
export function stageKindLabel(id: StageId): string {
  const p = PRESENTATION[id]
  const family = FAMILIES[p.family].label
  return p.nameInAsk ? family : `${family} · ${p.name}`
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
