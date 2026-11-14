import { describe, expect, it } from 'vitest'
import { LAYOUT_ROWS, editValue, layoutForLanguages } from '@/lib/keyboard'

describe('layoutForLanguages', () => {
  it('déduit la disposition de la langue du système', () => {
    expect(layoutForLanguages(['fr-FR', 'en-US'])).toBe('azerty')
    expect(layoutForLanguages(['fr'])).toBe('azerty')
    expect(layoutForLanguages(['fr-CA'])).toBe('qwerty')
    expect(layoutForLanguages(['fr-CH'])).toBe('qwertz')
    expect(layoutForLanguages(['de-DE'])).toBe('qwertz')
    expect(layoutForLanguages(['en-GB', 'fr-FR'])).toBe('qwerty')
    expect(layoutForLanguages(['ja-JP'])).toBe('qwerty')
    expect(layoutForLanguages([])).toBe('qwerty')
  })
})

describe('LAYOUT_ROWS', () => {
  it('contient les 26 lettres une seule fois', () => {
    for (const rows of Object.values(LAYOUT_ROWS)) {
      expect([...rows.join('')].sort().join('')).toBe('abcdefghijklmnopqrstuvwxyz')
    }
  })
})

describe('editValue', () => {
  it('insère au curseur ou remplace la sélection', () => {
    expect(editValue('ka', 2, 2, 'n')).toEqual({ value: 'kan', caret: 3 })
    expect(editValue('kna', 1, 1, 'a')).toEqual({ value: 'kana', caret: 2 })
    expect(editValue('xyz', 0, 3, 'a')).toEqual({ value: 'a', caret: 1 })
  })
  it('efface le caractère avant le curseur, ou la sélection', () => {
    expect(editValue('kan', 3, 3, null)).toEqual({ value: 'ka', caret: 2 })
    expect(editValue('kana', 1, 3, null)).toEqual({ value: 'ka', caret: 1 })
    expect(editValue('ka', 0, 0, null)).toEqual({ value: 'ka', caret: 0 })
  })
  it('tolère une sélection hors limites', () => {
    expect(editValue('ka', 9, 9, 'a')).toEqual({ value: 'kaa', caret: 3 })
  })
})
