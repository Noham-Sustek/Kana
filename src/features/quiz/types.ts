import type { Script } from '@/data/kana'

export type StageId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9

export type Prompt =
  | { type: 'kana'; text: string }
  | { type: 'romaji'; text: string }
  | { type: 'word'; text: string; meaning: string; kanji?: string }
  /**
   * Phrase à lire (`text` en kana, mots séparés par des espaces) ou, au stage 9, à
   * composer (`text` en romaji). `original` / `source` : réplique d'anime et sa scène.
   */
  | { type: 'sentence' | 'romajiSentence'; text: string; meaning: string; original?: string; source?: string }
  /** À dessiner : `text` = romaji ; `note` lève une ambiguïté (じ/ぢ…). */
  | { type: 'draw'; text: string; script: Script; meaning?: string; note?: string }

export interface Choice {
  /** Id du kana correspondant. */
  id: string
  label: string
}

interface QuestionBase {
  stage: StageId
  prompt: Prompt
  /** Kana évalués par la question (plusieurs pour un mot ou une phrase). */
  kanaIds: string[]
}

export interface ChoiceQuestion extends QuestionBase {
  kind: 'choice'
  /** Nature des libellés, pour la typo (police japonaise ou non). */
  choiceType: 'kana' | 'romaji'
  choices: Choice[]
  answerId: string
}

export interface InputQuestion extends QuestionBase {
  kind: 'input'
  /** Texte en kana dont il faut taper la lecture. */
  reading: string
  /** Lecture de référence affichée en correction. */
  expected: string
  wordId?: string
}

/** Dessin au doigt, caractère par caractère (stages 5 et 7). */
export interface DrawQuestion extends QuestionBase {
  kind: 'draw'
  /** Texte en kana attendu. */
  target: string
  /** Caractères à dessiner, dans l'ordre (きゃ → き, ゃ). */
  chars: string[]
  wordId?: string
  /** Écriture en kanji du mot, montrée après la réponse. */
  kanji?: string
}

/** Phrase à reconstruire avec des étiquettes en kana (stage 9). */
export interface ComposeQuestion extends QuestionBase {
  kind: 'compose'
  /** Phrase attendue, mots séparés par des espaces (une étiquette par mot). */
  reading: string
  /** Étiquettes proposées : les mots de la phrase et des intrus, mélangés. */
  tiles: string[]
}

export type Question = ChoiceQuestion | InputQuestion | DrawQuestion | ComposeQuestion

export interface QuizOptions {
  /** Après une erreur, laisser retenter au lieu de passer à la correction. */
  retry: boolean
  /** Temps limite par question en secondes, 0 = pas de chrono. */
  timerSeconds: number
}
