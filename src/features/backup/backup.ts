import type { AnswerRecord, AutoState, CustomGroup, Profile } from '@/db/db'
import { renumberStageV1 } from '@/features/quiz/stages'
import type { StageId } from '@/features/quiz/types'

// Sauvegarde complète de la progression (tous profils) au format JSON.
// Toute évolution incompatible du format = BACKUP_VERSION + 1, avec conversion
// des anciennes versions dans parseBackup.

export const BACKUP_FORMAT = 'kana-backup'
export const BACKUP_VERSION = 2

/** Préférences d'interface (localStorage) incluses dans la sauvegarde. */
export const PREFERENCE_KEYS = ['kana-settings', 'kana-quiz-settings', 'kana-writing-settings', 'kana-profile'] as const

export interface Backup {
  format: typeof BACKUP_FORMAT
  version: typeof BACKUP_VERSION
  exportedAt: number
  profiles: Profile[]
  answers: AnswerRecord[]
  customGroups: CustomGroup[]
  autoStates: AutoState[]
  /** Valeurs brutes du localStorage, par clé de PREFERENCE_KEYS. */
  preferences: Record<string, string>
}

export class BackupError extends Error {}

type Rec = Record<string, unknown>

const isRecord = (v: unknown): v is Rec => typeof v === 'object' && v !== null && !Array.isArray(v)
const isInt = (v: unknown): v is number => Number.isInteger(v)
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const isStr = (v: unknown): v is string => typeof v === 'string'
const isBool = (v: unknown): v is boolean => typeof v === 'boolean'
const isStage = (v: unknown): v is StageId => isInt(v) && v >= 1 && v <= 9

function list<T>(data: Rec, key: string, label: string, check: (r: Rec) => boolean): T[] {
  const value = data[key]
  if (!Array.isArray(value)) throw new BackupError(`Sauvegarde incomplète : « ${label} » manquant.`)
  const index = value.findIndex((r) => !isRecord(r) || !check(r))
  if (index >= 0) throw new BackupError(`Sauvegarde corrompue : ${label}, élément ${index + 1} invalide.`)
  return value as T[]
}

const isProfile = (r: Rec) => isInt(r.id) && isStr(r.name) && isNum(r.createdAt)

const isAnswer = (r: Rec) =>
  isInt(r.id) &&
  isInt(r.profileId) &&
  isStr(r.kanaId) &&
  isStage(r.stage) &&
  isBool(r.correct) &&
  isNum(r.responseMs) &&
  isNum(r.answeredAt) &&
  isBool(r.revealed) &&
  (r.wordId === undefined || isStr(r.wordId))

const isCustomGroup = (r: Rec) =>
  isInt(r.id) && isInt(r.profileId) && isStr(r.name) && Array.isArray(r.kanaIds) && r.kanaIds.every(isStr) && isNum(r.createdAt)

const isAutoState = (r: Rec) =>
  isInt(r.profileId) && (r.script === 'hiragana' || r.script === 'katakana') && isInt(r.unlockedGroups)

/** Vérifie et normalise une sauvegarde lue depuis un fichier. */
export function parseBackup(input: unknown): Backup {
  if (!isRecord(input) || input.format !== BACKUP_FORMAT) {
    throw new BackupError('Ce fichier n’est pas une sauvegarde Kana.')
  }
  let data: Rec = input
  if (!isInt(data.version) || data.version > BACKUP_VERSION) {
    throw new BackupError('Sauvegarde créée par une version plus récente de Kana : mettez l’application à jour.')
  }

  // v1 : stages numérotés avant l'ajout des stages de dessin.
  if (data.version === 1 && Array.isArray(data.answers)) {
    data = {
      ...data,
      answers: data.answers.map((a: unknown) =>
        isRecord(a) && isInt(a.stage) && a.stage <= 6 ? { ...a, stage: renumberStageV1(a.stage) } : a,
      ),
    }
  }

  const profiles = list<Profile>(data, 'profiles', 'profils', isProfile)
  if (profiles.length === 0) throw new BackupError('Sauvegarde corrompue : aucun profil.')
  const profileIds = new Set(profiles.map((p) => p.id))
  const owned = (r: Rec) => profileIds.has(r.profileId as number)

  const preferences: Record<string, string> = {}
  if (isRecord(data.preferences)) {
    for (const key of PREFERENCE_KEYS) {
      const value = data.preferences[key]
      if (isStr(value)) preferences[key] = value
    }
  }

  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: isNum(data.exportedAt) ? data.exportedAt : 0,
    profiles,
    answers: list<AnswerRecord>(data, 'answers', 'réponses', (r) => isAnswer(r) && owned(r)),
    customGroups: list<CustomGroup>(data, 'customGroups', 'listes', (r) => isCustomGroup(r) && owned(r)),
    autoStates: list<AutoState>(data, 'autoStates', 'mode auto', (r) => isAutoState(r) && owned(r)),
    preferences,
  }
}

/** Profil à activer après import : celui des préférences sauvegardées s'il existe, sinon le premier. */
export function profileToActivate(backup: Backup): number {
  try {
    const raw = backup.preferences['kana-profile']
    const id: unknown = raw ? JSON.parse(raw)?.state?.profileId : undefined
    if (backup.profiles.some((p) => p.id === id)) return id as number
  } catch {
    // Préférence illisible : on se rabat sur le premier profil.
  }
  return backup.profiles[0]!.id
}

/** Nom de fichier proposé à l'export. */
export function backupFileName(at: number): string {
  const d = new Date(at)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `kana-sauvegarde-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.json`
}
