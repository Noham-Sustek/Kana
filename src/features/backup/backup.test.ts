import { describe, expect, it } from 'vitest'
import {
  BACKUP_FORMAT,
  BACKUP_VERSION,
  BackupError,
  backupFileName,
  parseBackup,
  profileToActivate,
} from '@/features/backup/backup'

function sample() {
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: 1_700_000_000_000,
    profiles: [{ id: 1, name: 'Moi', createdAt: 1 }],
    answers: [
      {
        id: 3,
        profileId: 1,
        kanaId: 'h-a',
        stage: 1,
        correct: true,
        responseMs: 1200,
        answeredAt: 5,
        revealed: false,
      },
      {
        id: 4,
        profileId: 1,
        kanaId: 'h-ne',
        stage: 6,
        correct: false,
        responseMs: 3000,
        answeredAt: 6,
        revealed: true,
        wordId: 'neko',
      },
    ],
    customGroups: [{ id: 2, profileId: 1, name: 'Difficiles', kanaIds: ['h-nu', 'h-me'], createdAt: 3 }],
    autoStates: [{ profileId: 1, script: 'hiragana', unlockedGroups: 3 }],
    preferences: { 'kana-settings': '{"state":{"theme":"dark"}}', inconnu: 'x' },
  }
}

describe('parseBackup', () => {
  it('accepte une sauvegarde valide (aller-retour JSON) et filtre les préférences inconnues', () => {
    const parsed = parseBackup(JSON.parse(JSON.stringify(sample())))
    expect(parsed.answers).toHaveLength(2)
    expect(parsed.customGroups[0]?.kanaIds).toEqual(['h-nu', 'h-me'])
    expect(parsed.autoStates[0]?.unlockedGroups).toBe(3)
    expect(parsed.preferences).toEqual({ 'kana-settings': '{"state":{"theme":"dark"}}' })
  })

  it('refuse un fichier qui n’est pas une sauvegarde Kana', () => {
    expect(() => parseBackup({ hello: 'world' })).toThrow(BackupError)
    expect(() => parseBackup([])).toThrow(BackupError)
    expect(() => parseBackup(null)).toThrow(BackupError)
  })

  it('refuse une version future', () => {
    expect(() => parseBackup({ ...sample(), version: BACKUP_VERSION + 1 })).toThrow(/plus récente/)
  })

  it('signale l’élément invalide', () => {
    const data = sample()
    data.answers[1]!.stage = 10
    expect(() => parseBackup(data)).toThrow(/réponses, élément 2/)
  })

  it('renumérote les stages d’une sauvegarde v1 (avant les stages de dessin)', () => {
    const v1 = { ...sample(), version: 1 }
    v1.answers[0]!.stage = 5
    v1.answers[1]!.stage = 6
    const parsed = parseBackup(v1)
    expect(parsed.version).toBe(BACKUP_VERSION)
    expect(parsed.answers.map((a) => a.stage)).toEqual([6, 7])
    // Une sauvegarde v2 est prise telle quelle.
    expect(parseBackup(sample()).answers.map((a) => a.stage)).toEqual([1, 6])
  })

  it('refuse des données rattachées à un profil absent', () => {
    const data = sample()
    data.customGroups[0]!.profileId = 7
    expect(() => parseBackup(data)).toThrow(/listes/)
  })

  it('exige au moins un profil et toutes les tables', () => {
    expect(() => parseBackup({ ...sample(), profiles: [] })).toThrow(/aucun profil/)
    const { answers: _answers, ...withoutAnswers } = sample()
    expect(() => parseBackup(withoutAnswers)).toThrow(/manquant/)
  })
})

describe('profileToActivate', () => {
  it('reprend le profil actif sauvegardé s’il existe, sinon le premier', () => {
    const base = parseBackup({ ...sample(), profiles: [{ id: 1, name: 'A', createdAt: 1 }, { id: 4, name: 'B', createdAt: 2 }] })
    const withPref = (profileId: number) => ({
      ...base,
      preferences: { 'kana-profile': JSON.stringify({ state: { profileId }, version: 1 }) },
    })
    expect(profileToActivate(withPref(4))).toBe(4)
    expect(profileToActivate(withPref(9))).toBe(1)
    expect(profileToActivate({ ...base, preferences: { 'kana-profile': '{oups' } })).toBe(1)
  })
})

describe('backupFileName', () => {
  it('contient la date locale', () => {
    expect(backupFileName(new Date(2026, 9, 2).getTime())).toBe('kana-sauvegarde-2026-10-02.json')
  })
})
