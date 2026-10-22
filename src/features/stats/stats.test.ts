import { describe, expect, it } from 'vitest'
import {
  MAX_RESPONSE_MS,
  computeStreak,
  dailyActivity,
  dayKey,
  kanaStats,
  mostMissed,
  summarize,
  type StatsAnswer,
} from '@/features/stats/stats'

const at = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h).getTime()

let tick = 0
function answer(kanaId: string, correct: boolean, answeredAt: number, extra: Partial<StatsAnswer> = {}): StatsAnswer {
  // Horodatages distincts : chaque appel = une question.
  return { kanaId, correct, revealed: false, responseMs: 1000, answeredAt: answeredAt + tick++, ...extra }
}

describe('dayKey', () => {
  it('formate le jour local', () => {
    expect(dayKey(at(2026, 3, 5, 0))).toBe('2026-03-05')
    expect(dayKey(at(2026, 12, 31, 23))).toBe('2026-12-31')
  })
})

describe('computeStreak', () => {
  const now = at(2026, 10, 22, 18)

  it('vaut 0 sans réponse', () => {
    expect(computeStreak([], now)).toEqual({ current: 0, best: 0, today: false })
  })

  it('compte les jours consécutifs jusqu’à aujourd’hui', () => {
    const answers = [at(2026, 10, 20), at(2026, 10, 21, 8), at(2026, 10, 21, 22), at(2026, 10, 22, 9)].map((t) => ({
      answeredAt: t,
    }))
    expect(computeStreak(answers, now)).toEqual({ current: 3, best: 3, today: true })
  })

  it('reste active si la dernière réponse date d’hier', () => {
    const answers = [at(2026, 10, 20), at(2026, 10, 21)].map((t) => ({ answeredAt: t }))
    expect(computeStreak(answers, now)).toEqual({ current: 2, best: 2, today: false })
  })

  it('est rompue après un jour sans réponse, la meilleure série est conservée', () => {
    const answers = [at(2026, 10, 1), at(2026, 10, 2), at(2026, 10, 3), at(2026, 10, 4), at(2026, 10, 20)].map(
      (t) => ({ answeredAt: t }),
    )
    expect(computeStreak(answers, now)).toEqual({ current: 0, best: 4, today: false })
  })

  it('traverse un changement de mois et d’heure', () => {
    const answers = [at(2026, 10, 24), at(2026, 10, 25), at(2026, 10, 26), at(2026, 10, 27)].map((t) => ({
      answeredAt: t,
    }))
    expect(computeStreak(answers, at(2026, 10, 27, 20)).current).toBe(4)
    const months = [at(2026, 2, 28), at(2026, 3, 1)].map((t) => ({ answeredAt: t }))
    expect(computeStreak(months, at(2026, 3, 1, 20)).current).toBe(2)
  })
})

describe('kanaStats / mostMissed', () => {
  const t = at(2026, 10, 1)

  it('agrège par kana avec un taux récent', () => {
    const answers = [
      ...Array.from({ length: 10 }, () => answer('h-a', false, t)),
      ...Array.from({ length: 10 }, () => answer('h-a', true, t + 1000)),
      answer('h-i', true, t),
    ]
    const stats = kanaStats(answers)
    expect(stats.get('h-a')).toEqual({ kanaId: 'h-a', attempts: 20, correct: 10, recentRate: 1 })
    expect(stats.get('h-i')?.recentRate).toBe(1)
  })

  it('classe les plus ratés et ignore les kana peu vus ou réussis', () => {
    const answers = [
      answer('h-a', false, t),
      answer('h-a', false, t),
      answer('h-a', true, t),
      answer('h-ka', false, t),
      answer('h-ka', true, t),
      answer('h-ka', true, t),
      answer('h-sa', false, t),
      answer('h-sa', false, t),
      answer('h-i', true, t),
      answer('h-i', true, t),
      answer('h-i', true, t),
    ]
    expect(mostMissed(kanaStats(answers), 5).map((s) => s.kanaId)).toEqual(['h-a', 'h-ka'])
  })
})

describe('summarize', () => {
  it('compte une question par horodatage et plafonne les temps', () => {
    const t = at(2026, 10, 1)
    const word = [
      { kanaId: 'h-ne', correct: true, revealed: false, responseMs: 4000, answeredAt: t },
      { kanaId: 'h-ko', correct: true, revealed: false, responseMs: 4000, answeredAt: t },
    ]
    const answers = [
      ...word,
      { kanaId: 'h-a', correct: false, revealed: false, responseMs: 120_000, answeredAt: t + 1 },
      { kanaId: 'h-i', correct: false, revealed: true, responseMs: 9000, answeredAt: t + 2 },
    ]
    const s = summarize(answers)
    expect(s.questions).toBe(3)
    expect(s.successRate).toBeCloseTo(1 / 3)
    expect(s.averageResponseMs).toBe((4000 + MAX_RESPONSE_MS) / 2)
  })

  it('gère l’absence de données', () => {
    expect(summarize([])).toEqual({ questions: 0, successRate: 0, averageResponseMs: null })
  })
})

describe('dailyActivity', () => {
  it('renvoie les N derniers jours, aujourd’hui en dernier', () => {
    const now = at(2026, 10, 22, 18)
    const answers = [answer('h-a', true, at(2026, 10, 22, 8)), answer('h-a', false, at(2026, 10, 20)), answer('h-i', true, at(2026, 9, 1))]
    const days = dailyActivity(answers, now, 3)
    expect(days).toEqual([
      { day: '2026-10-20', questions: 1, correct: 0 },
      { day: '2026-10-21', questions: 0, correct: 0 },
      { day: '2026-10-22', questions: 1, correct: 1 },
    ])
  })
})
