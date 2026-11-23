import { describe, expect, it } from 'vitest'
import { diagnoseReading } from '@/features/quiz/diagnosis'
import { KANA } from '@/data/kana'

const id = (char: string) => KANA.find((k) => k.char === char)!.id

/** Saisie rendue avec [ ] autour des morceaux faux. */
function show(text: string, input: string): string {
  const d = diagnoseReading(text, input)!
  return d.typed.map((s) => (s.ok === false ? `[${s.text}]` : s.text)).join('')
}

describe('diagnoseReading', () => {
  it('saisie juste : tout est juste', () => {
    const d = diagnoseReading('わたし は ねこ', 'watashi wa neko')!
    expect(d.words).toEqual([true, true, true])
    expect(d.typed.every((s) => s.ok !== false)).toBe(true)
  })

  it('phrase : seul le mot faux est signalé, dans la saisie et dans le texte', () => {
    const d = diagnoseReading('わたし は ねこ です', 'watashi wa niko desu')!
    expect(d.words).toEqual([true, true, false, true])
    expect(show('わたし は ねこ です', 'watashi wa niko desu')).toBe('watashi wa [niko] desu')
    expect(d.marks).toEqual([true, true, true, null, true, null, false, false, null, true, true])
  })

  it('phrase tapée sans espaces : le mot faux est quand même retrouvé', () => {
    expect(show('わたし は ねこ です', 'watashiwanikodesu')).toBe('watashiwa[niko]desu')
  })

  it('mot seul : le kana faux, pas le mot entier', () => {
    const d = diagnoseReading('さくら', 'sakara')!
    expect(d.marks).toEqual([true, false, true])
    expect(show('さくら', 'sakara')).toBe('sa[ka]ra')
  })

  it('kana oublié ou en trop', () => {
    expect(diagnoseReading('さくら', 'sara')!.marks).toEqual([true, false, true])
    expect(show('ねこ', 'nekoo')).toBe('ne[koo]')
  })

  it('っ oublié : le mot est faux, l’erreur va au kana qui suit', () => {
    const d = diagnoseReading('きって', 'kite')!
    expect(d.marks[1]).toBe(false)
    expect(d.correctKana.has(id('き'))).toBe(true)
    expect(d.correctKana.has(id('て'))).toBe(false)
  })

  it('progression : un kana juste partout compte juste, un kana raté une fois compte faux', () => {
    const d = diagnoseReading('ねこ は ねる', 'neko wa naru')!
    expect(d.correctKana.has(id('ね'))).toBe(false)
    expect(d.correctKana.has(id('こ'))).toBe(true)
    expect(d.correctKana.has(id('は'))).toBe(true)
    expect(d.correctKana.has(id('る'))).toBe(true)
  })

  it('particule は lue wa, ou ha', () => {
    expect(diagnoseReading('わたし は', 'watashi ha')!.words).toEqual([true, true])
  })

  it('ー : voyelle doublée ou tiret', () => {
    expect(diagnoseReading('コーヒー', 'koohii')!.marks.every(Boolean)).toBe(true)
    expect(diagnoseReading('コーヒー', 'ko-hi-')!.marks.every(Boolean)).toBe(true)
  })

  it('saisie vide : tout est faux', () => {
    expect(diagnoseReading('ねこ', '')!.marks).toEqual([false, false])
  })
})
