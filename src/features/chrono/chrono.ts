import type { BookSentence } from '@/data/book'
import { toKatakana } from '@/data/sentences'
import { matchesReading, tokenize } from '@/features/quiz/reading'

// Lecture chronométrée : le texte du livre défile mot par mot, à partir d'un
// paragraphe tiré au sort. Un mot est vérifié quand on tape espace ; juste → mot
// suivant, faux → on le retape (ou on le passe). Fonctions pures, `now` injecté.

export type ChronoScript = 'hiragana' | 'katakana'

/** Durées proposées, en secondes. */
export const CHRONO_DURATIONS = [60, 120, 180, 300] as const
export type ChronoDuration = (typeof CHRONO_DURATIONS)[number]

/**
 * Mots d'une phrase dans l'écriture choisie. Hiragana : le texte tel que relu
 * (katakana d'origine conservés) ; katakana : tout converti.
 */
export function sentenceWords(sentence: BookSentence, script: ChronoScript): string[] {
  const text = script === 'katakana' ? toKatakana(sentence.kana) : sentence.kana
  return text.split(' ')
}

/** Saisie d'un mot. Une particule は / へ / を seule se lit aussi wa / e / o. */
export function matchesWord(word: string, input: string): boolean {
  // L'espace final fait de は / へ / を un mot isolé, donc une particule (cf. reading.ts).
  return matchesReading(`${word} `, input)
}

/** Nombre de kana d'un mot (きょ compte pour un, comme っ et ー). */
export function kanaCount(word: string): number {
  return (tokenize(word) ?? []).filter((u) => u.type !== 'space').length
}

/** Index de la première phrase d'un paragraphe tiré au sort. */
export function randomStart(sentences: readonly BookSentence[], rng: () => number = Math.random): number {
  const starts = sentences.flatMap((s, i) => (s.newParagraph ? [i] : []))
  return starts[Math.floor(rng() * starts.length)] ?? 0
}

export interface ChronoState {
  /** Phrase et mot en cours. */
  sentence: number
  word: number
  /** Premier mot tapé : le chrono démarre à ce moment. */
  startedAt: number | null
  /** Mots justes, kana de ces mots, saisies fausses, mots passés. */
  correctWords: number
  correctKana: number
  errors: number
  skipped: number
  /** La dernière saisie du mot en cours était fausse. */
  wrong: boolean
  /** Phrases parcourues, dans l'ordre (pour le récapitulatif). */
  visited: number[]
}

export function createChrono(start: number): ChronoState {
  return {
    sentence: start,
    word: 0,
    startedAt: null,
    correctWords: 0,
    correctKana: 0,
    errors: 0,
    skipped: 0,
    wrong: false,
    visited: [start],
  }
}

/** Démarre le chrono à la première frappe (sans effet ensuite). */
export function startChrono(state: ChronoState, now: number): ChronoState {
  return state.startedAt === null ? { ...state, startedAt: now } : state
}

/** Passe au mot suivant ; après le dernier mot du livre, on reprend au début. */
function advance(state: ChronoState, words: (sentence: number) => string[], total: number): ChronoState {
  if (state.word + 1 < words(state.sentence).length) return { ...state, word: state.word + 1, wrong: false }
  const sentence = (state.sentence + 1) % total
  return { ...state, sentence, word: 0, wrong: false, visited: [...state.visited, sentence] }
}

/**
 * Vérifie la saisie du mot en cours. `words` donne les mots d'une phrase,
 * `total` le nombre de phrases du livre.
 */
export function submitWord(
  state: ChronoState,
  input: string,
  words: (sentence: number) => string[],
  total: number,
): ChronoState {
  const word = words(state.sentence)[state.word]!
  if (input.trim() === '') return state
  if (!matchesWord(word, input)) return { ...state, errors: state.errors + 1, wrong: true }
  return advance(
    { ...state, correctWords: state.correctWords + 1, correctKana: state.correctKana + kanaCount(word) },
    words,
    total,
  )
}

/** Abandonne le mot en cours (compté à part, sans kana gagnés). */
export function skipWord(state: ChronoState, words: (sentence: number) => string[], total: number): ChronoState {
  return advance({ ...state, skipped: state.skipped + 1 }, words, total)
}

export interface ChronoResult {
  correctWords: number
  correctKana: number
  kanaPerMinute: number
  errors: number
  skipped: number
  /** Part des saisies justes, en %. */
  accuracy: number
}

export function chronoResult(state: ChronoState, durationSeconds: number): ChronoResult {
  const attempts = state.correctWords + state.errors
  return {
    correctWords: state.correctWords,
    correctKana: state.correctKana,
    kanaPerMinute: Math.round((state.correctKana * 60) / durationSeconds),
    errors: state.errors,
    skipped: state.skipped,
    accuracy: attempts === 0 ? 0 : Math.round((state.correctWords / attempts) * 100),
  }
}

/** Secondes restantes (durée entière tant que le chrono n'a pas démarré). */
export function remainingSeconds(state: ChronoState, durationSeconds: number, now: number): number {
  if (state.startedAt === null) return durationSeconds
  return Math.min(durationSeconds, Math.max(0, durationSeconds - (now - state.startedAt) / 1000))
}
