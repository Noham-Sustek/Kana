import { describe, expect, it } from 'vitest'
import { groupsOfScript } from '@/data/kana'
import { cardKey, type CardState } from '@/engine/scheduler'
import { backupReminder, estimateMinutes, pathView, sessionCta, streakView } from '@/features/home/home'
import { lineText } from '@/lib/segments'

const path = groupsOfScript('hiragana')
const [a, ka] = [path[0]!, path[1]!]
const STAGES = [1, 2] as const

const mastered: CardState = { reps: 3, lapses: 0, ease: 2.5, intervalMs: 0, lastAt: 0, dueAt: 0, mastery: 1, answers: 3 }
function progressOf(kanaIds: string[]) {
  return new Map(kanaIds.map((id) => [cardKey(id, 1), mastered]))
}

// Mercredi 13 novembre 2024, midi (heure locale).
const NOW = new Date(2024, 10, 13, 12).getTime()
const day = (offset: number) => new Date(2024, 10, 13 + offset, 9).getTime()

describe('streakView', () => {
  it('semaine du lundi au dimanche, aujourd’hui en pointillés tant que rien n’est fait', () => {
    const answers = [{ answeredAt: day(-2) }, { answeredAt: day(-1) }]
    const view = streakView(answers, { current: 2, today: false }, NOW)
    expect(view.week).toEqual(['on', 'on', 'today', 'off', 'off', 'off', 'off'])
    expect(view.message).toBe('Une session aujourd’hui la porte à 3.')
  })

  it('messages : session faite, série rompue, premier jour', () => {
    expect(streakView([{ answeredAt: day(0) }], { current: 1, today: true }, NOW).message).toBe(
      'Session faite aujourd’hui. À demain.',
    )
    expect(streakView([{ answeredAt: day(-5) }], { current: 0, today: false }, NOW).message).toBe(
      'Une session aujourd’hui relance votre série.',
    )
    expect(streakView([], { current: 0, today: false }, NOW).message).toBe(
      'Votre série commence avec la première session.',
    )
  })
})

describe('pathView', () => {
  it('premier jour : ligne あ à découvrir, romaji listés, ligne か verrouillée', () => {
    const view = pathView(path, 1, new Map(), STAGES, false)
    expect(view.tiles.map((t) => t.state)).toEqual(['current', 'locked'])
    expect(view.doneCount).toBe(0)
    expect(lineText(view.headline)).toBe('Ligne あ : 5 kana à découvrir.')
    expect(lineText(view.detail)).toBe('a, i, u, e, o.')
  })

  it('compte les kana manquants avant d’ouvrir la ligne suivante', () => {
    // あ acquise, 2 kana sur 5 de か : 7 / 10 actifs, il en faut 8.
    const view = pathView(path, 2, progressOf([...a.kanaIds, ...ka.kanaIds.slice(0, 2)]), STAGES, true)
    expect(view.tiles.map((t) => t.state)).toEqual(['done', 'current', 'locked'])
    expect(view.tiles[1]!.fill).toBeCloseTo(0.4)
    expect(view.focus).toBe(ka)
    expect(lineText(view.headline)).toBe('Ligne か : 2 kana acquis sur 5.')
    expect(lineText(view.detail)).toBe("Encore un et la ligne さ s’ouvre.")
  })

  it('ligne tout juste ouverte', () => {
    const view = pathView(path, 2, progressOf(a.kanaIds), STAGES, true)
    expect(lineText(view.headline)).toBe('Ligne か ouverte.')
    expect(lineText(view.detail)).toBe('5 kana à découvrir.')
  })

  it('ne montre que les dernières cases', () => {
    const all = path.flatMap((g) => g.kanaIds)
    const view = pathView(path, path.length, progressOf(all), STAGES, true)
    expect(view.doneCount).toBe(path.length)
    expect(view.tiles.length).toBeLessThanOrEqual(10)
    expect(view.focus).toBeUndefined()
  })
})

describe('sessionCta', () => {
  it('première session, session du jour, encore une session', () => {
    expect(sessionCta({ hasHistory: false, doneToday: false, questionCount: 12, focus: a })).toEqual({
      label: 'Première session',
      detail: '5 kana à découvrir · environ 3 min',
      secondary: false,
    })
    expect(sessionCta({ hasHistory: true, doneToday: false, questionCount: 12, focus: ka }).label).toBe('Session du jour')
    expect(sessionCta({ hasHistory: true, doneToday: true, questionCount: 10, focus: ka })).toEqual({
      label: 'Encore une session',
      detail: 'Ligne か · 10 questions',
      secondary: true,
    })
  })

  it('durée estimée d’au moins une minute', () => {
    expect(estimateMinutes(1)).toBe(1)
    expect(estimateMinutes(12)).toBe(3)
  })
})

describe('backupReminder', () => {
  const DAY = 86_400_000
  it('rien sans réponse, ni avant 30 jours', () => {
    expect(backupReminder({ now: NOW, firstAnswerAt: undefined, lastBackupAt: null, dismissedAt: null })).toBeNull()
    expect(backupReminder({ now: NOW, firstAnswerAt: NOW - 10 * DAY, lastBackupAt: null, dismissedAt: null })).toBeNull()
  })

  it('rappel après 30 jours, masqué 7 jours', () => {
    const base = { now: NOW, firstAnswerAt: NOW - 90 * DAY, lastBackupAt: NOW - 34 * DAY }
    expect(backupReminder({ ...base, dismissedAt: null })).toBe('Dernière sauvegarde il y a 34 jours.')
    expect(backupReminder({ ...base, dismissedAt: NOW - 2 * DAY })).toBeNull()
    expect(backupReminder({ ...base, lastBackupAt: null, dismissedAt: null })).toBe(
      'Aucune sauvegarde de votre progression pour l’instant.',
    )
  })
})
