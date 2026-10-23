import type { Script } from '@/data/kana'

export type StageId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8

export type Prompt =
  | { type: 'kana'; text: string }
  | { type: 'romaji'; text: string }
  | { type: 'word'; text: string; meaning: string }
  /** Phrase à lire (mots séparés par des espaces). */
  | { type: 'sentence'; text: string; meaning: string }
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
}

export type Question = ChoiceQuestion | InputQuestion | DrawQuestion

export interface QuizOptions {
  /** Après une erreur, laisser retenter au lieu de passer à la correction. */
  retry: boolean
  /** Temps limite par question en secondes, 0 = pas de chrono. */
  timerSeconds: number
}
