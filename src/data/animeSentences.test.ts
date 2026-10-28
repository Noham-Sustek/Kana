import { describe, expect, it } from 'vitest'
import { ANIME_SENTENCES } from '@/data/animeSentences'
import { SENTENCES } from '@/data/sentences'
import { matchesReading, toRomaji, tokenize } from '@/features/quiz/reading'

describe("phrases d'anime", () => {
  it('existent, sans doublon ni collision avec les phrases d’exemple', () => {
    expect(ANIME_SENTENCES.length).toBeGreaterThanOrEqual(80)
    const ids = [...SENTENCES, ...ANIME_SENTENCES].map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it.each(ANIME_SENTENCES.map((s) => [s.text, s] as const))('%s est lisible', (_, s) => {
    expect(tokenize(s.text)).not.toBeNull()
    expect(s.text).not.toMatch(/ {2}|^ | $/)
    expect(s.meaning.trim()).not.toBe('')
    expect(s.original?.trim()).toBeTruthy()
    expect(s.series).toBe('dragonball')
    expect(matchesReading(s.text, toRomaji(s.text))).toBe(true)
  })
})
