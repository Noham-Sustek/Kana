import { describe, expect, it } from 'vitest'
import type { BookSentence } from '@/data/book'
import {
  chronoResult,
  createChrono,
  kanaCount,
  matchesWord,
  randomStart,
  remainingSeconds,
  sentenceWords,
  skipWord,
  startChrono,
  submitWord,
} from '@/features/chrono/chrono'

const sentence = (kana: string, newParagraph = false): BookSentence => ({
  kana,
  original: kana,
  meaning: '…',
  chapter: 1,
  newParagraph,
})

const BOOK = [sentence('ジョバンニ は わらいました', true), sentence('きょう は'), sentence('ねこ', true)]
const words = (i: number) => sentenceWords(BOOK[i]!, 'hiragana')

describe('lecture chronométrée', () => {
  it('donne les mots dans l’écriture choisie', () => {
    expect(sentenceWords(BOOK[0]!, 'hiragana')).toEqual(['ジョバンニ', 'は', 'わらいました'])
    expect(sentenceWords(BOOK[0]!, 'katakana')).toEqual(['ジョバンニ', 'ハ', 'ワライマシタ'])
  })

  it('accepte wa pour la particule, et toutes les variantes de romaji', () => {
    expect(matchesWord('は', 'wa')).toBe(true)
    expect(matchesWord('は', 'ha')).toBe(true)
    expect(matchesWord('ハ', 'wa')).toBe(true)
    expect(matchesWord('きょう', 'kyou')).toBe(true)
    expect(matchesWord('ぴたっと', 'pitatto')).toBe(true)
    expect(matchesWord('きょう', 'kyo')).toBe(false)
  })

  it('compte les kana (yōon, っ et ー compris)', () => {
    expect(kanaCount('きょう')).toBe(2)
    expect(kanaCount('コーヒー')).toBe(4)
    expect(kanaCount('ぴたっと')).toBe(4)
  })

  it('part d’un début de paragraphe', () => {
    expect(randomStart(BOOK, () => 0)).toBe(0)
    expect(randomStart(BOOK, () => 0.99)).toBe(2)
  })

  it('avance sur un mot juste, reste sur un mot faux, puis reprend au début du livre', () => {
    let s = createChrono(1)
    s = submitWord(s, 'kyou', words, BOOK.length)
    expect(s).toMatchObject({ sentence: 1, word: 1, correctWords: 1, correctKana: 2 })
    s = submitWord(s, 'ha', words, BOOK.length)
    expect(s).toMatchObject({ sentence: 2, word: 0, correctWords: 2 })
    s = submitWord(s, 'neko', words, BOOK.length)
    expect(s).toMatchObject({ sentence: 0, word: 0 })
    expect(s.visited).toEqual([1, 2, 0])

    s = submitWord(s, 'jobani', words, BOOK.length)
    expect(s).toMatchObject({ sentence: 0, word: 0, errors: 1, wrong: true })
    s = submitWord(s, '  ', words, BOOK.length)
    expect(s.errors).toBe(1)
    s = submitWord(s, 'jobanni', words, BOOK.length)
    expect(s).toMatchObject({ word: 1, wrong: false })
    s = skipWord(s, words, BOOK.length)
    expect(s).toMatchObject({ word: 2, skipped: 1, correctWords: 4 })
  })

  it('chronomètre à partir de la première frappe et calcule le score', () => {
    let s = createChrono(0)
    expect(remainingSeconds(s, 60, 5000)).toBe(60)
    s = startChrono(s, 1000)
    expect(startChrono(s, 9000).startedAt).toBe(1000)
    expect(remainingSeconds(s, 60, 31_000)).toBe(30)
    expect(remainingSeconds(s, 60, 99_000)).toBe(0)

    s = submitWord(s, 'jobanni', words, BOOK.length)
    s = submitWord(s, 'he', words, BOOK.length)
    s = submitWord(s, 'wa', words, BOOK.length)
    expect(chronoResult(s, 60)).toEqual({
      correctWords: 2,
      correctKana: 5,
      kanaPerMinute: 5,
      errors: 1,
      skipped: 0,
      accuracy: 67,
    })
    expect(chronoResult(createChrono(0), 120).accuracy).toBe(0)
  })
})
