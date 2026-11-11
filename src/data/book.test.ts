import { describe, expect, it } from 'vitest'
import { ANIME_SENTENCES } from '@/data/animeSentences'
import { BOOK_CHAPTERS, BOOK_QUIZ_SENTENCES, BOOK_SENTENCES } from '@/data/book'
import { SENTENCES } from '@/data/sentences'
import { matchesReading, toRomaji, tokenize } from '@/features/quiz/reading'

describe('livre', () => {
  it('contient tout le texte relu, chapitre par chapitre', () => {
    expect(BOOK_SENTENCES.length).toBeGreaterThan(1100)
    const chapters = new Set(BOOK_SENTENCES.map((s) => s.chapter))
    expect([...chapters].sort((a, b) => a - b)).toEqual(BOOK_CHAPTERS.map((_, i) => i + 1))
    expect(BOOK_SENTENCES[0]!.newParagraph).toBe(true)
  })

  it.each(BOOK_SENTENCES.map((s) => [s.kana, s] as const))('%s est lisible', (_, s) => {
    expect(tokenize(s.kana)).not.toBeNull()
    expect(s.kana).not.toMatch(/ {2}|^ | $/)
    expect(s.meaning.trim()).not.toBe('')
    expect(s.original.trim()).not.toBe('')
    expect(matchesReading(s.kana, toRomaji(s.kana))).toBe(true)
  })

  it('fournit des phrases courtes aux stages 8 et 9, sans collision d’id', () => {
    expect(BOOK_QUIZ_SENTENCES.length).toBeGreaterThan(500)
    expect(BOOK_QUIZ_SENTENCES.every((s) => s.text.split(' ').length <= 12)).toBe(true)
    expect(BOOK_QUIZ_SENTENCES.some((s) => s.script === 'katakana')).toBe(true)
    const ids = [...SENTENCES, ...ANIME_SENTENCES, ...BOOK_QUIZ_SENTENCES].map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
