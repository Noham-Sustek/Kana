import data from '@/data/strokes.json'
import type { Kana } from '@/data/kana'
import { fromFlat, type Point } from '@/features/writing/geometry'

// Généré par scripts/build-strokes.mjs à partir de KanjiVG (CC BY-SA 3.0).
// Coordonnées dans un carré de STROKE_VIEWBOX unités, traits dans l'ordre d'écriture.
export const STROKE_VIEWBOX: number = data.viewBox

const raw: Record<string, number[][] | undefined> = data.strokes
const cache = new Map<string, Point[][]>()

/** Traits d'un caractère seul, ou `undefined` s'il n'est pas dans les données. */
export function strokesOf(char: string): Point[][] | undefined {
  const cached = cache.get(char)
  if (cached) return cached
  const flat = raw[char]
  if (!flat) return undefined
  const strokes = flat.map(fromFlat)
  cache.set(char, strokes)
  return strokes
}

/** Les exercices portent sur les kana d'un seul caractère (les yōon s'écrivent avec deux kana déjà travaillés). */
export function isWritable(kana: Kana): boolean {
  return [...kana.char].length === 1 && raw[kana.char] !== undefined
}
