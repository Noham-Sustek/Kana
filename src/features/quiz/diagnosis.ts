import { normalizeRomaji, tokenize } from '@/features/quiz/reading'

// Où une saisie romaji se trompe : la lecture attendue est alignée sur la saisie, kana par kana
// (le moins d'erreurs possible), pour dire quels mots ou quels kana sont faux. Sert à l'écran
// (mots en vert / rouge) et à la progression : une erreur sur un mot ne compte plus tous les
// kana de la phrase comme faux.

interface Cell {
  /** Kana auquel l'erreur est imputée (っ : le kana suivant, ー : le précédent). */
  kanaId: string | null
  forms: string[]
  word: number
  /** Position dans le texte en kana. */
  start: number
  end: number
}

export interface ReadingDiagnosis {
  /** Par caractère du texte : juste, faux, ou `null` (espace). Mot entier pour une phrase, kana par kana sinon. */
  marks: (boolean | null)[]
  /** Par mot du texte (séparés par des espaces) : juste ou faux. */
  words: boolean[]
  /** La saisie découpée en morceaux justes / faux (`null` : espace). */
  typed: { text: string; ok: boolean | null }[]
  /** Kana dont toutes les occurrences ont été bien lues. */
  correctKana: ReadonlySet<string>
}

const VOWELS = new Set(['a', 'i', 'u', 'e', 'o'])
const MAX_SUBSTITUTION = 4

function cellsOf(text: string): Cell[] | null {
  const units = tokenize(text)
  if (!units) return null
  const cells: Cell[] = []
  let pos = 0
  let word = 0
  let prev: { kanaId: string; romaji: string } | null = null
  units.forEach((unit, u) => {
    if (unit.type === 'space') {
      pos += 1
      word += 1
      return
    }
    if (unit.type === 'kana') {
      cells.push({ kanaId: unit.kanaId, forms: unit.romaji, word, start: pos, end: pos + unit.char.length })
      prev = { kanaId: unit.kanaId, romaji: unit.romaji[0]! }
      pos += unit.char.length
      return
    }
    if (unit.type === 'sokuon') {
      const next = units[u + 1]
      const forms = next?.type === 'kana' ? [...new Set(next.romaji.flatMap((r) => (r.startsWith('ch') ? [r[0]!, 't'] : [r[0]!])))] : []
      cells.push({ kanaId: next?.type === 'kana' ? next.kanaId : null, forms, word, start: pos, end: pos + 1 })
    } else {
      const last: { kanaId: string; romaji: string } | null = prev
      const vowel = last ? last.romaji.at(-1)! : ''
      cells.push({ kanaId: last?.kanaId ?? null, forms: VOWELS.has(vowel) ? [vowel, '-'] : ['-'], word, start: pos, end: pos + 1 })
    }
    pos += 1
  })
  return cells
}

/** Saisie normalisée (comme `normalizeRomaji`) et, pour chaque caractère gardé, sa place dans la saisie brute. */
function normalizeWithMap(input: string): { target: string; raw: number[] } {
  let target = ''
  const raw: number[] = []
  for (let i = 0; i < input.length; i++) {
    const c = normalizeRomaji(input[i]!)
    if (c === '') continue
    target += c
    raw.push(i)
  }
  return { target, raw }
}

type Step = { from: [number, number]; kind: 'match' | 'sub' | 'insert' }

/** Diagnostic d'une saisie pour un texte en kana ; `null` si le texte ne se découpe pas. */
export function diagnoseReading(text: string, input: string): ReadingDiagnosis | null {
  const cells = cellsOf(text)
  if (!cells || cells.length === 0) return null
  const { target, raw } = normalizeWithMap(input)
  const C = cells.length
  const N = target.length

  const cost = Array.from({ length: C + 1 }, () => new Array<number>(N + 1).fill(Infinity))
  const back = Array.from({ length: C + 1 }, () => new Array<Step | null>(N + 1).fill(null))
  cost[0]![0] = 0
  const relax = (c: number, p: number, value: number, step: Step) => {
    if (value < cost[c]![p]!) {
      cost[c]![p] = value
      back[c]![p] = step
    }
  }

  for (let c = 0; c <= C; c++) {
    for (let p = 0; p <= N; p++) {
      const here = cost[c]![p]!
      if (here === Infinity) continue
      if (c < C) {
        const cell = cells[c]!
        for (const form of cell.forms) {
          if (target.startsWith(form, p)) relax(c + 1, p + form.length, here, { from: [c, p], kind: 'match' })
        }
        for (let k = 0; k <= MAX_SUBSTITUTION && p + k <= N; k++) {
          if (!cell.forms.includes(target.slice(p, p + k))) relax(c + 1, p + k, here + 1, { from: [c, p], kind: 'sub' })
        }
      }
      if (p < N) relax(c, p + 1, here + 1, { from: [c, p], kind: 'insert' })
    }
  }

  // Remontée : état de chaque case, et case à laquelle revient chaque caractère tapé.
  const ok = new Array<boolean>(C).fill(true)
  const owner = new Array<number>(N).fill(0)
  let c = C
  let p = N
  while (c > 0 || p > 0) {
    const step = back[c]![p]!
    const [pc, pp] = step.from
    if (step.kind === 'insert') {
      const blamed = Math.max(0, c - 1)
      ok[blamed] = false
      owner[pp] = blamed
    } else {
      if (step.kind === 'sub') ok[pc] = false
      for (let i = pp; i < p; i++) owner[i] = pc
    }
    c = pc
    p = pp
  }

  const wordCount = text.split(' ').length
  const words = new Array<boolean>(wordCount).fill(true)
  cells.forEach((cell, i) => {
    if (!ok[i]) words[cell.word] = false
  })
  const sentence = wordCount > 1
  const status = (i: number) => (sentence ? words[cells[i]!.word]! : ok[i]!)

  const marks: (boolean | null)[] = [...text].map(() => null)
  cells.forEach((cell, i) => {
    for (let j = cell.start; j < cell.end; j++) marks[j] = status(i)
  })

  const rawStatus = new Array<boolean | null>(input.length).fill(null)
  raw.forEach((r, n) => {
    rawStatus[r] = status(owner[n]!)
  })
  const typed: ReadingDiagnosis['typed'] = []
  for (let i = 0; i < input.length; i++) {
    const last = typed.at(-1)
    if (last && last.ok === rawStatus[i]) last.text += input[i]
    else typed.push({ text: input[i]!, ok: rawStatus[i]! })
  }

  const wrong = new Set<string>()
  const seen = new Set<string>()
  cells.forEach((cell, i) => {
    if (!cell.kanaId) return
    seen.add(cell.kanaId)
    if (!ok[i]) wrong.add(cell.kanaId)
  })
  const correctKana = new Set([...seen].filter((id) => !wrong.has(id)))

  return { marks, words, typed, correctKana }
}
