import { describe, expect, it } from 'vitest'
import { KANA } from '@/data/kana'
import { isWritable, strokesOf } from '@/data/strokes'
import type { Point } from '@/features/writing/geometry'
import { dtwMean, evaluateCharacter, evaluateStroke, prepareStroke } from '@/features/writing/strokeMatch'
import { applyVerdict, createWritingState, isComplete, shouldShowHint, totalMistakes } from '@/features/writing/session'

const A = strokesOf('あ')!
const preparedA = A.map(prepareStroke)
const DA = strokesOf('だ')!
const preparedDA = DA.map(prepareStroke)

const shift = (pts: Point[], dx: number, dy: number): Point[] => pts.map(([x, y]) => [x + dx, y + dy])
const scaleAround = (pts: Point[], k: number): Point[] => {
  const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length
  const cy = pts.reduce((s, p) => s + p[1], 0) / pts.length
  return pts.map(([x, y]) => [cx + (x - cx) * k, cy + (y - cy) * k])
}
// Tremblement déterministe pour simuler un tracé au doigt.
const jitter = (pts: Point[], amp: number): Point[] =>
  pts.map(([x, y], i) => [x + Math.sin(i * 1.7) * amp, y + Math.cos(i * 2.3) * amp])

describe('données de tracés', () => {
  it('couvre tous les kana d’un seul caractère', () => {
    const single = KANA.filter((k) => [...k.char].length === 1)
    expect(single.filter((k) => !isWritable(k)).map((k) => k.char)).toEqual([])
  })

  it('donne le bon nombre de traits', () => {
    expect(strokesOf('あ')).toHaveLength(3)
    expect(strokesOf('ふ')).toHaveLength(4)
    expect(strokesOf('ン')).toHaveLength(2)
    expect(strokesOf('きゃ')).toBeUndefined()
  })
})

describe('evaluateStroke', () => {
  it('accepte le trait exact, même tremblé', () => {
    expect(evaluateStroke(A[0]!, preparedA, 0, 'trace')).toEqual({ ok: true })
    expect(evaluateStroke(jitter(A[2]!, 2.5), preparedA, 2, 'trace')).toEqual({ ok: true })
  })

  it('refuse un trait dessiné à l’envers', () => {
    expect(evaluateStroke([...A[1]!].reverse(), preparedA, 1, 'trace')).toMatchObject({ ok: false, fault: 'direction' })
  })

  it('détecte une erreur d’ordre', () => {
    expect(evaluateStroke(A[2]!, preparedA, 0, 'trace')).toEqual({ ok: false, fault: 'order', matchedIndex: 2 })
  })

  it('distingue position et forme', () => {
    expect(evaluateStroke(shift(A[0]!, 0, 30), preparedA, 0, 'trace')).toMatchObject({ fault: 'position' })
    const zigzag: Point[] = Array.from({ length: 30 }, (_, i) => [20 + i * 2, i % 2 ? 30 : 70])
    expect(evaluateStroke(zigzag, preparedA, 2, 'trace')).toMatchObject({ fault: 'shape' })
  })

  it('refuse un simple tapotement', () => {
    expect(evaluateStroke([[50, 50]], preparedA, 1, 'free')).toMatchObject({ ok: false })
  })

  it('tolère décalage et taille en mode libre, pas en mode calque', () => {
    const drawn = scaleAround(shift(A[2]!, 12, -10), 1.25)
    expect(evaluateStroke(drawn, preparedA, 2, 'free')).toEqual({ ok: true })
    expect(evaluateStroke(drawn, preparedA, 2, 'trace')).toMatchObject({ ok: false })
  })

  it('accepte chaque trait exact et refuse chaque trait long inversé, pour tous les kana', () => {
    const failures: string[] = []
    for (const kana of KANA.filter(isWritable)) {
      const strokes = strokesOf(kana.char)!
      const prepared = strokes.map(prepareStroke)
      strokes.forEach((stroke, i) => {
        for (const mode of ['trace', 'free'] as const) {
          if (!evaluateStroke(jitter(stroke, 2), prepared, i, mode).ok) failures.push(`${kana.char}#${i + 1} ${mode} exact`)
          if (prepared[i]!.length >= 14 && evaluateStroke([...stroke].reverse(), prepared, i, mode).ok)
            failures.push(`${kana.char}#${i + 1} ${mode} inversé`)
        }
      })
    }
    expect(failures).toEqual([])
  })

  it('mode libre : un kana écrit petit dans un coin est juste trait par trait (calage sur les traits posés)', () => {
    const small = A.map((s) => s.map(([x, y]): Point => [8 + x * 0.55, 6 + y * 0.55]))
    small.forEach((stroke, i) => {
      expect(evaluateStroke(stroke, preparedA, i, 'free', small.slice(0, i))).toEqual({ ok: true })
    })
  })

  it('accepte une longue courbe un peu déformée en calque (boucle de ね)', () => {
    const NE = strokesOf('ね')!
    const prepared = NE.map(prepareStroke)
    const last = NE.length - 1
    const bent = NE[last]!.map(([x, y], i, all): Point => [x + 4 * Math.sin((Math.PI * i) / all.length), y + 3])
    expect(evaluateStroke(bent, prepared, last, 'trace')).toEqual({ ok: true })
  })

  it('ne vérifie pas le sens des points du dakuten', () => {
    const last = DA.length - 1
    expect(evaluateStroke([...DA[last]!].reverse(), preparedDA, last, 'trace')).toEqual({ ok: true })
  })
})

describe('dtwMean', () => {
  it('vaut 0 pour deux tracés identiques et tolère une vitesse irrégulière', () => {
    const line: Point[] = Array.from({ length: 32 }, (_, i) => [i, 0])
    const uneven: Point[] = Array.from({ length: 32 }, (_, i) => [31 * (i / 31) ** 1.6, 0])
    expect(dtwMean(line, line)).toBe(0)
    expect(dtwMean(uneven, line)).toBeLessThan(1.5)
  })
})

describe('evaluateCharacter (vérification à la fin)', () => {
  const small = A.map((s) => s.map(([x, y]): Point => [30 + x * 0.6, 35 + y * 0.6]))

  it('caractère juste, même petit et décalé', () => {
    expect(evaluateCharacter(small, preparedA, 'free')).toEqual([{ ok: true }, { ok: true }, { ok: true }])
  })

  it('désigne le trait faux sans fausser les autres', () => {
    const wrong = [small[0]!, [...small[1]!].reverse(), small[2]!]
    const verdicts = evaluateCharacter(wrong, preparedA, 'free')
    expect(verdicts[0]).toEqual({ ok: true })
    expect(verdicts[1]).toMatchObject({ ok: false, fault: 'direction' })
    expect(verdicts[2]).toEqual({ ok: true })
  })

  it('trait manquant, trait en trop, ordre inversé', () => {
    expect(evaluateCharacter(small.slice(0, 2), preparedA, 'free')[2]).toEqual({ ok: false, fault: 'missing' })
    expect(evaluateCharacter([...small, small[2]!], preparedA, 'free').at(-1)).toMatchObject({ ok: false })
    const swapped = evaluateCharacter([small[2]!, small[1]!, small[0]!], preparedA, 'free')
    expect(swapped[0]).toMatchObject({ ok: false, fault: 'order', matchedIndex: 2 })
  })
})

describe('session d’écriture', () => {
  it('avance trait par trait et compte les erreurs', () => {
    let s = createWritingState(2)
    s = applyVerdict(s, { ok: false, fault: 'shape' })
    expect(shouldShowHint(s)).toBe(false)
    s = applyVerdict(s, { ok: false, fault: 'direction' })
    expect(shouldShowHint(s)).toBe(true)
    s = applyVerdict(s, { ok: true })
    expect(s.done).toBe(1)
    expect(shouldShowHint(s)).toBe(false)
    s = applyVerdict(s, { ok: true })
    expect(isComplete(s)).toBe(true)
    expect(totalMistakes(s)).toBe(2)
    expect(applyVerdict(s, { ok: false, fault: 'shape' })).toBe(s)
  })
})
