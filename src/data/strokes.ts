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

// Dessin dans le quiz : chaque caractère a sa propre case, un petit kana s'y
// dessine donc en taille normale (ゃ → や, っ → つ).
const SMALL_TO_FULL: Record<string, string> = {
  ぁ: 'あ', ぃ: 'い', ぅ: 'う', ぇ: 'え', ぉ: 'お', っ: 'つ', ゃ: 'や', ゅ: 'ゆ', ょ: 'よ', ゎ: 'わ',
  ァ: 'ア', ィ: 'イ', ゥ: 'ウ', ェ: 'エ', ォ: 'オ', ッ: 'ツ', ャ: 'ヤ', ュ: 'ユ', ョ: 'ヨ', ヮ: 'ワ',
}

/** ー (absent de KanjiVG) : un trait horizontal de gauche à droite, au pas de ~2 unités. */
const LONG_MARK_STROKES: Point[][] = [Array.from({ length: 39 }, (_, i): Point => [17 + i * 2, 54.5])]

export function isSmallKana(char: string): boolean {
  return char in SMALL_TO_FULL
}

/** Traits à dessiner pour un caractère dans le quiz, ou `undefined` s'il n'est pas dessinable. */
export function drawingStrokesOf(char: string): Point[][] | undefined {
  if (char === 'ー') return LONG_MARK_STROKES
  return strokesOf(SMALL_TO_FULL[char] ?? char)
}

/** Vrai si chaque caractère du texte peut être dessiné. */
export function isDrawable(text: string): boolean {
  return [...text].every((c) => drawingStrokesOf(c) !== undefined)
}
