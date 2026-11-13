import { describe, expect, it } from 'vitest'
import { cardKey, type CardState } from '@/engine/scheduler'
import {
  acquiredByFamily,
  acquiredByScript,
  activityTip,
  formatSpent,
  inPeriod,
  periodStart,
  shortDate,
} from '@/features/stats/progress'

const at = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h).getTime()
const card = (mastery: number): CardState => ({
  reps: 2, lapses: 0, ease: 2.5, intervalMs: 60_000, lastAt: 0, dueAt: 0, mastery, answers: 3,
})

describe('Progrès', () => {
  it('période : les n derniers jours, aujourd’hui compris', () => {
    const now = at(2026, 11, 13, 18)
    expect(periodStart(7, now)).toBe(new Date(2026, 10, 7).getTime())
    const answers = [{ answeredAt: at(2026, 11, 6, 23) }, { answeredAt: at(2026, 11, 7, 0) }, { answeredAt: now }]
    expect(inPeriod(answers, 7, now)).toHaveLength(2)
    expect(inPeriod(answers, 'all', now)).toHaveLength(3)
  })

  it('kana acquis par écriture et par famille', () => {
    const progress = new Map([
      [cardKey('h-a', 1), card(0.9)],
      [cardKey('h-a', 5), card(0.9)],
      [cardKey('h-i', 1), card(0.4)],
      [cardKey('k-a', 1), card(0.9)],
    ])
    const scripts = acquiredByScript(progress, [1, 2])
    expect(scripts.hiragana.acquired).toBe(1)
    expect(scripts.katakana.acquired).toBe(1)
    expect(scripts.hiragana.total).toBeGreaterThan(70)
    expect(acquiredByFamily(progress, ['h-a', 'h-i'])).toEqual({ counts: { recognize: 1, write: 1, read: 0 }, seen: 2 })
  })

  it('bulle d’activité et formats', () => {
    const now = at(2026, 11, 13)
    expect(activityTip({ day: '2026-11-07', questions: 36, correct: 31, timeMs: 250_000 }, now)).toEqual({
      title: 'Sam. 7 nov. · 36 réponses',
      detail: '31 justes · 86 % · 4 min 10',
    })
    expect(activityTip({ day: '2026-11-13', questions: 0, correct: 0, timeMs: 0 }, now).title).toBe('Aujourd’hui · aucune réponse')
    expect(formatSpent(45_000)).toBe('45 s')
    expect(formatSpent(120_000)).toBe('2 min')
    expect(shortDate('2026-10-31')).toBe('31 oct.')
  })
})
