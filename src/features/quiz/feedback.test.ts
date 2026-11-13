import { describe, expect, it } from 'vitest'
import { getKana, kanaOfScript } from '@/data/kana'
import { WORDS } from '@/data/words'
import { confusableLine, exampleLine, feedbackFor, type Line } from '@/features/quiz/feedback'
import { kanaQuestion, wordQuestion } from '@/features/quiz/questions'
import { seededRng } from '@/features/quiz/random'
import type { ChoiceQuestion } from '@/features/quiz/types'

const text = (line: Line) => line.map((s) => s.text).join('')
const nu = getKana('h-nu')!
const pool = kanaOfScript('hiragana')

function choice(stage: 1 | 2): ChoiceQuestion {
  return kanaQuestion(stage, nu, pool, seededRng(1)) as ChoiceQuestion
}

describe('feedbackFor', () => {
  it('ne dit rien tant que la question attend sa première réponse', () => {
    expect(feedbackFor({ question: choice(1), status: 'pending', wrongAnswers: [], revealed: false })).toBeNull()
  })

  it('« Juste » avec un mot d’exemple pour un kana', () => {
    const fb = feedbackFor({ question: choice(1), status: 'correct', wrongAnswers: [], revealed: false })!
    expect(fb.signal).toBe('correct')
    expect(text(fb.title)).toBe('Juste')
    expect(text(fb.detail[0]!)).toContain('ぬ')
  })

  it('« Pas encore » nomme la réponse choisie, dans le bon sens', () => {
    const q1 = choice(1)
    const wrong1 = q1.choices.find((c) => c.id !== q1.answerId)!
    const fb1 = feedbackFor({ question: q1, status: 'pending', wrongAnswers: [wrong1.id], revealed: false })!
    expect(fb1.signal).toBe('wrong')
    expect(text(fb1.title)).toBe('Pas encore')
    expect(text(fb1.detail[0]!)).toBe(
      `« ${wrong1.label} » s’écrit ${getKana(wrong1.id)!.char}. Choisissez une autre réponse.`,
    )

    const q2 = choice(2)
    const wrong2 = q2.choices.find((c) => c.id !== q2.answerId)!
    const fb2 = feedbackFor({ question: q2, status: 'pending', wrongAnswers: [wrong2.id], revealed: false })!
    expect(text(fb2.detail[0]!)).toMatch(new RegExp(`^${wrong2.label} se lit « `))
  })

  it('réponse révélée : œil, la réponse et les kana proches', () => {
    const fb = feedbackFor({ question: choice(1), status: 'failed', wrongAnswers: [], revealed: true })!
    expect(fb.signal).toBe('revealed')
    expect(text(fb.title)).toBe('La réponse : nu')
    expect(text(fb.detail[0]!)).toContain('め (me)')
  })

  it('échec sans réessai : croix, la réponse en kana pour un choix de kana', () => {
    const q = choice(2)
    const wrong = q.choices.find((c) => c.id !== q.answerId)!
    const fb = feedbackFor({ question: q, status: 'failed', wrongAnswers: [wrong.id], revealed: false })!
    expect(fb.signal).toBe('wrong')
    expect(fb.title).toEqual([{ text: 'La réponse : ' }, { text: 'ぬ', jp: true }])
  })

  it('mot : kanji et traduction', () => {
    const word = WORDS.find((w) => w.kanji)!
    const fb = feedbackFor({ question: wordQuestion(word), status: 'correct', wrongAnswers: [], revealed: false })!
    expect(text(fb.detail[0]!)).toBe(`${word.kanji} · ${word.meaning}`)
  })
})

describe('détails', () => {
  it('mot d’exemple commençant par le kana si possible', () => {
    expect(text(exampleLine(getKana('h-ka')!)!)).toMatch(/^か/)
  })

  it('kana proches de la même écriture, sans le kana lui-même', () => {
    const line = text(confusableLine(nu)!)
    expect(line).toMatch(/^À ne pas confondre avec /)
    expect(line).not.toContain('ぬ')
    expect(confusableLine(getKana('k-nu')!)).not.toBeNull()
  })
})
