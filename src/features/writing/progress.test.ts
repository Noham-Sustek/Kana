import { describe, expect, it } from 'vitest'
import { getGroup } from '@/data/kana'
import {
  isWritingSuccess,
  nextLineToTrace,
  strokeNote,
  writingLevels,
  writingStatus,
} from '@/features/writing/progress'

describe('écriture', () => {
  it('niveau atteint : calque, de mémoire, ou tracé juste au quiz', () => {
    const levels = writingLevels(
      [
        { kanaId: 'h-a', level: 2, success: true },
        { kanaId: 'h-a', level: 3, success: true },
        { kanaId: 'h-i', level: 2, success: true },
        { kanaId: 'h-i', level: 3, success: false },
        { kanaId: 'h-u', level: 3, success: false },
      ],
      [
        { kanaId: 'h-e', stage: 5, correct: true, revealed: false },
        { kanaId: 'h-o', stage: 5, correct: false, revealed: false },
        { kanaId: 'h-ka', stage: 1, correct: true, revealed: false },
      ],
    )
    expect(Object.fromEntries(levels)).toEqual({ 'h-a': 2, 'h-i': 1, 'h-e': 2 })
    expect(writingStatus(1)).toBe('Calque réussi · de mémoire à faire')
  })

  it('réussite : sans modèle affiché ; de mémoire, sans indice', () => {
    expect(isWritingSuccess(2, { revealed: false, hinted: true })).toBe(true)
    expect(isWritingSuccess(3, { revealed: false, hinted: true })).toBe(false)
    expect(isWritingSuccess(3, { revealed: true, hinted: false })).toBe(false)
    expect(isWritingSuccess(3, { revealed: false, hinted: false })).toBe(true)
  })

  it('prochaine ligne à tracer et durée estimée', () => {
    const done = new Map(getGroup('hiragana-a')!.kanaIds.map((id) => [id, 2]))
    done.set('h-ka', 2)
    const line = nextLineToTrace('hiragana', done)!
    expect(line.group.id).toBe('hiragana-ka')
    expect(line.kanaIds).toEqual(['h-ki', 'h-ku', 'h-ke', 'h-ko'])
    expect(line.minutes).toBe(3)
    expect(nextLineToTrace('katakana', new Map())!.group.id).toBe('katakana-a')
  })

  it('note par trait', () => {
    expect(strokeNote(0)).toBe('Juste du premier coup')
    expect(strokeNote(2)).toBe('Juste après 3 essais')
  })
})
