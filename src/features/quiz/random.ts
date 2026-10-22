/** Générateur pseudo-aléatoire : `Math.random` en production, graine fixe dans les tests. */
export type Rng = () => number

/** mulberry32 : rapide, déterministe, suffisant pour mélanger des questions. */
export function seededRng(seed: number): Rng {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[out[i], out[j]] = [out[j]!, out[i]!]
  }
  return out
}

/**
 * `count` éléments tirés de `items` : chaque élément sort une fois avant qu'un
 * autre ne revienne, et jamais deux fois de suite.
 */
export function drawCycling<T>(items: readonly T[], count: number, rng: Rng): T[] {
  if (items.length === 0) return []
  const out: T[] = []
  while (out.length < count) {
    let round = shuffle(items, rng)
    if (round.length > 1 && round[0] === out[out.length - 1]) {
      round = [...round.slice(1), round[0]!]
    }
    out.push(...round.slice(0, count - out.length))
  }
  return out
}
