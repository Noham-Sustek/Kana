/**
 * Zones de toucher du clavier intégré qui suivent ce qu'on peut écrire ensuite (pur, testé).
 *
 * Comme les claviers de téléphone, une touche plausible « déborde » un peu sur ses voisines
 * improbables, sans que rien ne change à l'écran. La prédiction ne regarde que la grammaire du
 * romaji (après « ts » vient un « u », « q » n'existe pas…), jamais la réponse attendue : le
 * clavier ne doit pas aider à répondre juste, seulement à taper ce qu'on visait.
 */
import { KANA } from '@/data/kana'

const VOWELS = new Set(['a', 'i', 'u', 'e', 'o'])

/** Unités qu'on peut taper d'un bloc : chaque lecture de kana, et sa forme à consonne doublée (っ). */
const UNITS: ReadonlySet<string> = (() => {
  const units = new Set<string>()
  for (const kana of KANA) {
    for (const r of kana.romaji) {
      units.add(r)
      const first = r[0]!
      if (!VOWELS.has(first) && first !== 'n') {
        units.add(first + r)
        if (r.startsWith('ch')) units.add('t' + r)
      }
    }
  }
  return units
})()

/** Tous les débuts d'unité (sans l'unité vide). */
const PREFIXES: ReadonlySet<string> = (() => {
  const prefixes = new Set<string>()
  for (const u of UNITS) for (let i = 1; i <= u.length; i++) prefixes.add(u.slice(0, i))
  return prefixes
})()

const MAX_UNIT = Math.max(...[...UNITS].map((u) => u.length))

/** Poids d'une touche improbable face à une touche plausible (1). */
export const UNLIKELY_WEIGHT = 0.05

/**
 * Touches plausibles après `before` (le texte avant le curseur) : lettres qui prolongent une
 * lecture, tiret après une voyelle (voyelle longue), espace entre deux mots. `null` quand le mot
 * en cours ne se lit déjà plus : pas de prédiction, toutes les touches se valent.
 */
export function plausibleKeys(before: string): ReadonlySet<string> | null {
  const word = (before.toLowerCase().replace(/[’‘`]/g, "'").split(/\s/).pop() ?? '').replace(/[^a-z'-]/g, '')

  // Coupures atteignables : positions où le mot se découpe exactement en unités.
  const reach = new Array<boolean>(word.length + 1).fill(false)
  reach[0] = true
  for (let i = 0; i < word.length; i++) {
    if (!reach[i]) continue
    if (word[i] === '-' && i > 0 && VOWELS.has(word[i - 1]!)) reach[i + 1] = true
    for (let len = 1; len <= MAX_UNIT && i + len <= word.length; len++) {
      if (UNITS.has(word.slice(i, i + len))) reach[i + len] = true
    }
  }

  const keys = new Set<string>()
  let readable = false
  for (let i = 0; i <= word.length; i++) {
    if (!reach[i]) continue
    const pending = word.slice(i)
    if (pending !== '' && !PREFIXES.has(pending)) continue
    readable = true
    for (let c = 97; c <= 122; c++) {
      const letter = String.fromCharCode(c)
      if (PREFIXES.has(pending + letter)) keys.add(letter)
    }
    if (pending === '' && i > 0) {
      keys.add(' ')
      if (VOWELS.has(word[i - 1]!)) keys.add('-')
    }
    if (pending === 'n') keys.add("'")
  }
  return readable ? keys : null
}

export interface KeyTarget {
  id: string
  /** Rectangle de la touche à l'écran. */
  left: number
  top: number
  width: number
  height: number
  /** 1 = plausible, `UNLIKELY_WEIGHT` = improbable. */
  weight: number
}

/** Cœur d'une touche (en part de sa demi-taille) : y toucher la choisit toujours. */
const CORE = 0.6
/** Portée au-delà du bord, en part de la taille de la touche (couvre les espaces entre touches). */
const REACH_X = 0.35
const REACH_Y = 0.3
const SIGMA = 0.32

/**
 * Touche visée par un toucher en (x, y) : le cœur d'une touche lui revient toujours, ailleurs
 * (bord, espace entre deux touches) la plus probable l'emporte, sa proximité pondérée par sa
 * plausibilité. `null` si le toucher est loin de toute touche.
 */
export function resolveKey(x: number, y: number, keys: readonly KeyTarget[]): string | null {
  let best: string | null = null
  let bestScore = 0
  for (const key of keys) {
    const dx = (x - (key.left + key.width / 2)) / key.width
    const dy = (y - (key.top + key.height / 2)) / key.height
    if (Math.abs(dx) <= CORE / 2 && Math.abs(dy) <= CORE / 2) return key.id
    if (Math.abs(dx) > 0.5 + REACH_X || Math.abs(dy) > 0.5 + REACH_Y) continue
    const score = key.weight * Math.exp(-(dx * dx + dy * dy) / (2 * SIGMA * SIGMA))
    if (score > bestScore) {
      bestScore = score
      best = key.id
    }
  }
  return best
}
