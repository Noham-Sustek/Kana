import { describe, expect, it } from 'vitest'
import { getKana, kanaOfScript } from '@/data/kana'
import { cardKey, masteryLevel, type CardState } from '@/engine/scheduler'
import { kanaQuestion } from '@/features/quiz/questions'
import { seededRng } from '@/features/quiz/random'
import { nextQuestion, revealAnswer, startSession, submitAnswer } from '@/features/quiz/session'
import {
  extendedStreak,
  formatDuration,
  formatResponseTime,
  masteryGains,
  missedItems,
  sessionTimes,
  sessionTitle,
} from '@/features/quiz/summary'
import type { ChoiceQuestion } from '@/features/quiz/types'
import { lineText } from '@/lib/segments'

const pool = kanaOfScript('hiragana')
const q = (id: string) => kanaQuestion(1, getKana(id)!, pool, seededRng(3)) as ChoiceQuestion
const wrongOf = (question: ChoiceQuestion) => question.choices.find((c) => c.id !== question.answerId)!.id

describe('formats', () => {
  it('durée et temps de réponse', () => {
    expect(formatDuration(168_000)).toBe('2:48')
    expect(formatDuration(3_725_000)).toBe('1:02:05')
    expect(formatResponseTime(2100)).toBe('2,1 s')
    expect(formatResponseTime(12_400)).toBe('12 s')
  })

  it('titres', () => {
    expect(sessionTitle('daily', 1)).toBe('Session du jour')
    expect(sessionTitle('targeted', 1)).toBe('Révision ciblée')
    expect(sessionTitle('free', 3)).toBe('Session libre · Faux jumeaux')
  })
})

describe('session', () => {
  const opts = { retry: false, timerSeconds: 0 }

  it('durée du début à la fin, moyenne hors réponses affichées', () => {
    const [q1, q2] = [q('h-nu'), q('h-me')]
    let s = startSession([q1, q2], opts, 1000)
    s = submitAnswer(s, q1.answerId, 3000).state
    s = nextQuestion(s, 3500)
    s = revealAnswer(s, 9000).state
    s = nextQuestion(s, 9500)
    expect(s.finished).toBe(true)
    expect(sessionTimes(s)).toEqual({ durationMs: 8500, averageMs: 2000 })
  })

  it('À revoir : réponse donnée au premier essai, réponse affichée, sans doublon', () => {
    const [q1, q2, q3] = [q('h-nu'), q('h-me'), q('h-nu')]
    const wrong = wrongOf(q1)
    let s = startSession([q1, q2, q3], { retry: true, timerSeconds: 0 }, 0)
    s = submitAnswer(s, wrong, 10).state
    s = submitAnswer(s, q1.answerId, 20).state // réussite après réessai : reste un échec
    s = nextQuestion(s, 30)
    s = revealAnswer(s, 40).state
    s = nextQuestion(s, 50)
    s = submitAnswer(s, wrongOf(q3), 60).state
    const items = missedItems(s)
    expect(items.map((i) => i.text)).toEqual(['ぬ', 'め'])
    expect(items[0]!.kanaId).toBe('h-nu')
    expect(lineText(items[0]!.note)).toBe(`Vous avez répondu « ${getKana(wrong)!.romaji[0]} » (${getKana(wrong)!.char})`)
    expect(lineText(items[1]!.note)).toBe('Réponse affichée')
  })

  it('la série s’allonge si rien n’a été fait plus tôt dans la journée', () => {
    const start = new Date(2024, 10, 13, 18).getTime()
    expect(extendedStreak([{ answeredAt: start + 1000 }], start)).toBe(true)
    expect(extendedStreak([{ answeredAt: new Date(2024, 10, 13, 9).getTime() }], start)).toBe(false)
    expect(extendedStreak([{ answeredAt: new Date(2024, 10, 12, 20).getTime() }], start)).toBe(true)
  })
})

describe('maîtrise', () => {
  const card = (mastery: number, intervalMs: number, answers = 3): CardState => ({
    reps: 2, lapses: 0, ease: 2.5, intervalMs, lastAt: 0, dueAt: 0, mastery, answers,
  })

  it('niveaux : nouveau, en cours, acquis, solide', () => {
    expect(masteryLevel(undefined)).toBe(0)
    expect(masteryLevel(card(0.5, 0))).toBe(1)
    expect(masteryLevel(card(0.9, 60_000))).toBe(2)
    expect(masteryLevel(card(0.9, 8 * 86_400_000))).toBe(3)
  })

  it('ne garde que les cartes qui progressent, les plus hautes d’abord', () => {
    const before = new Map([[cardKey('h-sa', 1), card(0.9, 60_000)], [cardKey('h-ta', 1), card(0.5, 0)]])
    const after = new Map([
      [cardKey('h-sa', 1), card(0.9, 8 * 86_400_000)],
      [cardKey('h-ta', 1), card(0.5, 0)],
      [cardKey('h-chi', 1), card(0.4, 0)],
    ])
    const cards = [
      { kanaId: 'h-chi', stage: 1 as const },
      { kanaId: 'h-ta', stage: 1 as const },
      { kanaId: 'h-sa', stage: 1 as const },
      { kanaId: 'h-sa', stage: 1 as const },
    ]
    expect(masteryGains(before, after, cards)).toEqual([
      { kanaId: 'h-sa', stage: 1, from: 2, to: 3 },
      { kanaId: 'h-chi', stage: 1, from: 0, to: 1 },
    ])
  })
})
