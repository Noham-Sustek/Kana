import { KANA } from '@/data/kana'

// Lecture d'un texte en kana (kana seul ou mot) : découpage en unités et
// vérification d'une saisie romaji. Les mots sont romanisés « kana par kana »
// (とうきょう → toukyou, ノート → nooto), toutes variantes de romaji acceptées.

type Unit =
  | { type: 'kana'; char: string; kanaId: string; romaji: string[] }
  | { type: 'sokuon' } // っ / ッ : double la consonne suivante
  | { type: 'long' } // ー : prolonge la voyelle précédente

const kanaByChar = new Map(KANA.map((k) => [k.char, k]))

const SOKUON = new Set(['っ', 'ッ'])
const LONG_MARK = 'ー'

/** Découpe un texte en unités ; `null` si un caractère n'est pas reconnu. */
export function tokenize(text: string): Unit[] | null {
  const units: Unit[] = []
  let i = 0
  while (i < text.length) {
    const pair = kanaByChar.get(text.slice(i, i + 2))
    const single = kanaByChar.get(text[i]!)
    const kana = pair ?? single
    if (kana) {
      units.push({ type: 'kana', char: kana.char, kanaId: kana.id, romaji: kana.romaji })
      i += kana.char.length
    } else if (SOKUON.has(text[i]!)) {
      units.push({ type: 'sokuon' })
      i++
    } else if (text[i] === LONG_MARK) {
      units.push({ type: 'long' })
      i++
    } else {
      return null
    }
  }
  return units
}

/** Ids des kana distincts composant le texte (hors っ et ー). */
export function kanaIdsOf(text: string): string[] {
  const ids = (tokenize(text) ?? []).flatMap((u) => (u.type === 'kana' ? [u.kanaId] : []))
  return [...new Set(ids)]
}

/** Saisie utilisateur → forme comparable (minuscules, sans espaces). */
export function normalizeRomaji(input: string): string {
  return input.toLowerCase().replace(/[\s　]/g, '').replace(/[’‘`]/g, "'")
}

const VOWELS = new Set(['a', 'i', 'u', 'e', 'o'])

/** Formes possibles d'une consonne doublée devant `romaji` (っち → tchi / cchi). */
function geminate(romaji: string): string[] {
  const forms = [romaji[0]! + romaji]
  if (romaji.startsWith('ch')) forms.push('t' + romaji)
  return forms
}

/** Vrai si `input` est une lecture valide du texte en kana. */
export function matchesReading(text: string, input: string): boolean {
  const units = tokenize(text)
  if (!units || units.length === 0) return false
  const target = normalizeRomaji(input)

  const match = (u: number, pos: number, prevVowel: string | null): boolean => {
    if (u === units.length) return pos === target.length
    const unit = units[u]!

    if (unit.type === 'long') {
      return (
        (prevVowel !== null && target.startsWith(prevVowel, pos) && match(u + 1, pos + 1, prevVowel)) ||
        (target.startsWith('-', pos) && match(u + 1, pos + 1, prevVowel))
      )
    }

    if (unit.type === 'sokuon') {
      const next = units[u + 1]
      if (next?.type !== 'kana') return false
      return next.romaji.some((r) =>
        geminate(r).some((form) => target.startsWith(form, pos) && match(u + 2, pos + form.length, lastVowel(r))),
      )
    }

    return unit.romaji.some(
      (r) => target.startsWith(r, pos) && match(u + 1, pos + r.length, lastVowel(r)),
    )
  }

  return match(0, 0, null)
}

function lastVowel(romaji: string): string | null {
  const last = romaji[romaji.length - 1]!
  return VOWELS.has(last) ? last : null
}

/** Romanisation de référence (variantes principales), pour afficher la bonne réponse. */
export function toRomaji(text: string): string {
  const units = tokenize(text)
  if (!units) return ''
  let out = ''
  let prevVowel: string | null = null
  for (let u = 0; u < units.length; u++) {
    const unit = units[u]!
    if (unit.type === 'long') {
      out += prevVowel ?? '-'
    } else if (unit.type === 'sokuon') {
      const next = units[u + 1]
      if (next?.type === 'kana') out += geminate(next.romaji[0]!).at(-1)!.slice(0, 1)
    } else {
      const r = unit.romaji[0]!
      out += r
      prevVowel = lastVowel(r)
    }
  }
  return out
}
