import { describe, expect, it } from 'vitest'
import { getKana } from '@/data/kana'
import { cardKey, type CardState } from '@/engine/scheduler'
import { confusablesOf, familyMastery, wordsWithKana } from '@/features/kana/detail'

const card = (mastery: number, intervalMs: number): CardState => ({
  reps: 2, lapses: 0, ease: 2.5, intervalMs, lastAt: 0, dueAt: 0, mastery, answers: 3,
})

describe('fiche kana', () => {
  it('maîtrise par famille : le meilleur stage de chaque famille', () => {
    const progress = new Map([
      [cardKey('h-nu', 1), card(0.5, 0)],
      [cardKey('h-nu', 3), card(0.9, 8 * 86_400_000)],
      [cardKey('h-nu', 5), card(0.4, 0)],
      [cardKey('h-me', 6), card(0.9, 0)],
    ])
    expect(familyMastery(progress, 'h-nu')).toEqual({ recognize: 3, write: 1, read: 0 })
  })

  it('kana proches de la même écriture, sans doublon', () => {
    const chars = confusablesOf(getKana('h-nu')!).map((k) => k.char)
    expect(chars).toEqual(['あ', 'お', 'め', 'ね', 'れ', 'わ'])
    expect(confusablesOf(getKana('k-nu')!).every((k) => k.script === 'katakana')).toBe(true)
  })

  it('mots qui contiennent le kana, les plus courts d’abord', () => {
    const words = wordsWithKana(getKana('h-nu')!, 3)
    expect(words).toHaveLength(3)
    expect(words.every((w) => w.kana.includes('ぬ'))).toBe(true)
    expect(words[0]!.kana.length).toBeLessThanOrEqual(words[2]!.kana.length)
  })
})
