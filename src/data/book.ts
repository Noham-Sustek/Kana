import data from '@/data/book.json'
import { scriptOf, toKatakana, type Sentence } from '@/data/sentences'

// 銀河鉄道の夜 (Kenji Miyazawa, domaine public, texte d'Aozora Bunko) réécrit en
// kana par scripts/build-book.mjs, lectures et traductions relues à la main
// (scripts/book-review.json). Ne pas éditer book.json : relancer `npm run book`.

export const BOOK_TITLE = 'Train de nuit dans la Voie lactée'
export const BOOK_ORIGINAL_TITLE = '銀河鉄道の夜'
export const BOOK_AUTHOR = 'Kenji Miyazawa'

export const BOOK_CHAPTERS: readonly string[] = [
  'La leçon de l’après-midi',
  'L’imprimerie',
  'La maison',
  'La nuit de la fête du Centaure',
  'Le pilier de la roue du temps',
  'La gare de la Voie lactée',
  'La croix du Nord et la côte du Pliocène',
  'L’oiseleur',
  'Le billet de Giovanni',
]

export interface BookSentence {
  /** Mots en kana séparés par des espaces (kanji lus en hiragana, katakana d'origine conservés). */
  kana: string
  /** Phrase d'origine, avec kanji et ponctuation. */
  original: string
  meaning: string
  /** Numéro de chapitre, à partir de 1. */
  chapter: number
  /** Première phrase d'un paragraphe. */
  newParagraph: boolean
}

type Row = [kana: string, original: string, meaning: string, chapter: number, newParagraph: number]

export const BOOK_SENTENCES: readonly BookSentence[] = (data.sentences as Row[]).map(
  ([kana, original, meaning, chapter, newParagraph]) => ({
    kana,
    original,
    meaning,
    chapter,
    newParagraph: newParagraph === 1,
  }),
)

/** Phrases assez courtes pour les stages 8 et 9 (au-delà, la saisie devient pénible). */
const QUIZ_MAX_WORDS = 12

/**
 * Phrases du livre proposées aux stages 8 et 9, mêlées aux phrases d'exemple :
 * telles quelles (hiragana, ou mélange avec les katakana d'origine) et tout en
 * katakana. Id préfixé pour ne jamais rencontrer celui d'une phrase d'exemple.
 */
export const BOOK_QUIZ_SENTENCES: readonly Sentence[] = [
  // Une phrase répétée (« と いいました ») n'est gardée qu'une fois.
  ...new Map(
    BOOK_SENTENCES.filter((s) => {
      const words = s.kana.split(' ').length
      return words >= 2 && words <= QUIZ_MAX_WORDS
    })
      .flatMap((s): Sentence[] => {
        const base = { meaning: s.meaning, original: s.original, chapter: s.chapter }
        const katakana = toKatakana(s.kana)
        const variants: Sentence[] = [{ ...base, id: `book:${s.kana}`, text: s.kana, script: scriptOf(s.kana) }]
        if (katakana !== s.kana) variants.push({ ...base, id: `book:${katakana}`, text: katakana, script: 'katakana' })
        return variants
      })
      .map((s) => [s.id, s] as const),
  ).values(),
]

/** Provenance affichée après la réponse : titre · chapitre. */
export function bookSource(chapter: number): string {
  return `${BOOK_TITLE} · chapitre ${chapter} (${BOOK_CHAPTERS[chapter - 1] ?? ''})`
}
