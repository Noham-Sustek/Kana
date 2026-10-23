import { describe, expect, it } from 'vitest'
import { SENTENCES, toKatakana } from '@/data/sentences'
import { isDrawable } from '@/data/strokes'
import { WORDS } from '@/data/words'
import { KANA } from '@/data/kana'
import { kanaIdsOf, matchesReading, toRomaji, tokenize } from '@/features/quiz/reading'

describe('phrases', () => {
  it('existent dans les trois écritures, sans doublon', () => {
    const ids = SENTENCES.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const script of ['hiragana', 'katakana', 'mixed'] as const) {
      expect(SENTENCES.filter((s) => s.script === script).length).toBeGreaterThanOrEqual(45)
    }
  })

  it.each(SENTENCES.map((s) => [s.text, s] as const))('%s est lisible', (_, s) => {
    expect(tokenize(s.text)).not.toBeNull()
    expect(s.meaning.trim()).not.toBe('')
    expect(s.text).not.toMatch(/ {2}|^ | $/)
    expect(matchesReading(s.text, toRomaji(s.text))).toBe(true)
    const scripts = new Set(kanaIdsOf(s.text).map((id) => id[0]))
    expect([...scripts].sort()).toEqual(s.script === 'mixed' ? ['h', 'k'] : [s.script === 'hiragana' ? 'h' : 'k'])
  })

  it('lit les particules isolées wa / e / o, la lecture du kana restant acceptée', () => {
    const s = 'わたし は がっこう へ ほん を もって いきます'
    expect(toRomaji(s)).toBe('watashi wa gakkou e hon o motte ikimasu')
    expect(matchesReading(s, 'watashiwagakkouehonomotteikimasu')).toBe(true)
    expect(matchesReading(s, 'watashi ha gakkou he hon wo motte ikimasu')).toBe(true)
    expect(matchesReading(toKatakana(s), 'watashi wa gakkou e hon o motte ikimasu')).toBe(true)
    // Dans un mot, は garde sa lecture.
    expect(toRomaji('はは は はな が すき です')).toBe('haha wa hana ga suki desu')
  })

  it('convertit les hiragana en katakana', () => {
    expect(toKatakana('がっこう へ いきます')).toBe('ガッコウ ヘ イキマス')
  })
})

describe('dessin', () => {
  it('tous les kana et tous les mots peuvent être dessinés', () => {
    expect(KANA.filter((k) => !isDrawable(k.char)).map((k) => k.char)).toEqual([])
    expect(WORDS.filter((w) => !isDrawable(w.kana)).map((w) => w.kana)).toEqual([])
  })

  it('romanise ー en voyelle longue pour les mots à dessiner', () => {
    expect(toRomaji('コーヒー', { macron: true })).toBe('kōhī')
    expect(toRomaji('とうきょう', { macron: true })).toBe('toukyou')
  })
})
