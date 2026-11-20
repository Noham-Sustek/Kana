import { describe, expect, it } from 'vitest'
import { UNLIKELY_WEIGHT, plausibleKeys, resolveKey, type KeyTarget } from '@/lib/keyTargeting'

const set = (before: string) => [...(plausibleKeys(before) ?? [])].sort().join('')

describe('plausibleKeys', () => {
  it('début de mot : toute lettre qui commence une lecture, ni q, ni l, ni x, ni espace', () => {
    const keys = plausibleKeys('')!
    for (const c of 'aiueokstnhmyrwgzdbpjfcv') expect(keys.has(c)).toBe(true)
    for (const c of 'qlx -') expect(keys.has(c)).toBe(false)
  })

  it('après ts : seulement les voyelles de tsa, tsi, tsu, tse, tso', () => {
    expect(set('ts')).toBe('aeiou')
  })

  it('après sh : voyelles (sha, shi, shu, she, sho)', () => {
    expect(set('sh')).toBe('aeiou')
  })

  it('après k : voyelle, y (kya) ou k doublé (っ)', () => {
    expect(set('k')).toBe('aeikouy')
  })

  it('après t : doublement tt, et tch (っち)', () => {
    const keys = plausibleKeys('t')!
    expect(keys.has('t')).toBe(true)
    expect(keys.has('c')).toBe(true)
    expect(keys.has('s')).toBe(true)
    expect(keys.has('k')).toBe(false)
  })

  it('après une syllabe complète : nouvelle syllabe, tiret de voyelle longue, espace', () => {
    const keys = plausibleKeys('ka')!
    expect(keys.has('k')).toBe(true)
    expect(keys.has('-')).toBe(true)
    expect(keys.has(' ')).toBe(true)
    expect(keys.has('q')).toBe(false)
  })

  it('n : ん complet ou début de na / nya, apostrophe possible', () => {
    const keys = plausibleKeys('n')!
    expect(keys.has('a')).toBe(true)
    expect(keys.has('k')).toBe(true)
    expect(keys.has("'")).toBe(true)
    expect(keys.has('-')).toBe(false)
  })

  it('seul le mot en cours compte dans une phrase', () => {
    expect(set('watashi wa ts')).toBe('aeiou')
  })

  it('mot qui ne se lit plus : pas de prédiction', () => {
    expect(plausibleKeys('kq')).toBeNull()
    expect(plausibleKeys('xyz')).toBeNull()
  })

  it('ne dépend jamais de la réponse : même résultat pour un mot juste ou faux', () => {
    expect(set('sa')).toBe(set('su'))
  })
})

/** Rangée de touches de 36 × 46 px séparées de 5 px. */
function row(ids: string, weights: Record<string, number> = {}): KeyTarget[] {
  return [...ids].map((id, i) => ({ id, left: i * 41, top: 0, width: 36, height: 46, weight: weights[id] ?? 1 }))
}

describe('resolveKey', () => {
  it('le cœur d’une touche lui revient toujours, même improbable', () => {
    const keys = row('kl', { l: UNLIKELY_WEIGHT })
    expect(resolveKey(41 + 18 + 5, 23, keys)).toBe('l')
  })

  it('à poids égal, un toucher dans l’espace entre deux touches va à la plus proche', () => {
    const keys = row('as')
    expect(resolveKey(37, 23, keys)).toBe('a')
    expect(resolveKey(40, 23, keys)).toBe('s')
  })

  it('le bord d’une touche improbable revient à sa voisine plausible', () => {
    const keys = row('kl', { l: UNLIKELY_WEIGHT })
    // 3 px dans le l, du côté du k
    expect(resolveKey(44, 23, keys)).toBe('k')
    // Sans prédiction, c’est bien le l
    expect(resolveKey(44, 23, row('kl'))).toBe('l')
  })

  it('vaut aussi entre deux rangées', () => {
    const keys: KeyTarget[] = [
      { id: 'u', left: 0, top: 0, width: 36, height: 46, weight: 1 },
      { id: 'j', left: 0, top: 53, width: 36, height: 46, weight: UNLIKELY_WEIGHT },
    ]
    expect(resolveKey(18, 56, keys)).toBe('u')
  })

  it('loin de toute touche : rien', () => {
    expect(resolveKey(500, 500, row('as'))).toBeNull()
  })
})
