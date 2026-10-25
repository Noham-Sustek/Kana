import { describe, expect, it } from 'vitest'
import { WORDS } from '@/data/words'
import { kanaIdsOf, matchesReading, toRomaji, tokenize } from '@/features/quiz/reading'

describe('matchesReading', () => {
  it.each([
    ['し', 'shi'],
    ['し', 'si'],
    ['し', ' SHI '],
    ['ん', 'n'],
    ['ん', 'nn'],
    ['を', 'o'],
    ['きって', 'kitte'],
    ['ざっし', 'zasshi'],
    ['ざっし', 'zassi'],
    ['ちょっと', 'chotto'],
    ['ちょっと', 'tyotto'],
    ['まっちゃ', 'matcha'],
    ['まっちゃ', 'maccha'],
    ['とうきょう', 'toukyou'],
    ['とうきょう', 'toukyo u'],
    ['じゃがいも', 'zyagaimo'],
    ['ノート', 'nooto'],
    ['ノート', 'no-to'],
    ['パーティー', 'paatii'],
    ['ふじさん', 'huzisan'],
  ])('%s ← %s', (text, input) => {
    expect(matchesReading(text, input)).toBe(true)
  })

  it.each([
    ['し', 'chi'],
    ['きって', 'kite'],
    ['とうきょう', 'tokyo'],
    ['ノート', 'noto'],
    ['ねこ', 'neko2'],
    ['ねこ', ''],
  ])('%s ← %s refusé', (text, input) => {
    expect(matchesReading(text, input)).toBe(false)
  })
})

describe('toRomaji', () => {
  it.each([
    ['とうきょう', 'toukyou'],
    ['きって', 'kitte'],
    ['まっちゃ', 'matcha'],
    ['ちょっと', 'chotto'],
    ['コーヒー', 'koohii'],
    ['ヴァイオリン', 'vaiorin'],
  ])('%s → %s', (text, romaji) => {
    expect(toRomaji(text)).toBe(romaji)
  })
})

describe('liste de mots', () => {
  it('contient environ 6500 mots, sans doublon', () => {
    expect(WORDS.length).toBeGreaterThanOrEqual(6500)
    const ids = WORDS.map((w) => w.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it.each(WORDS.map((w) => [w.kana, w] as const))('%s est lisible', (_, word) => {
    expect(tokenize(word.kana)).not.toBeNull()
    expect(kanaIdsOf(word.kana).length).toBeGreaterThan(0)
    expect(word.meaning.trim()).not.toBe('')
    // La lecture de référence est elle-même acceptée.
    expect(matchesReading(word.kana, toRomaji(word.kana))).toBe(true)
    // Un mot n'utilise qu'une seule écriture.
    const scripts = new Set(kanaIdsOf(word.kana).map((id) => id[0]))
    expect(scripts.size).toBe(1)
  })
})
