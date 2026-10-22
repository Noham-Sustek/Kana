export type StageId = 1 | 2 | 3 | 4 | 5 | 6

export type Prompt =
  | { type: 'kana'; text: string }
  | { type: 'romaji'; text: string }
  /** Son à jouer ; `text` = kana à prononcer. */
  | { type: 'audio'; text: string }
  | { type: 'word'; text: string; meaning: string }

export interface Choice {
  /** Id du kana correspondant. */
  id: string
  label: string
}

interface QuestionBase {
  stage: StageId
  prompt: Prompt
  /** Kana évalués par la question (plusieurs pour un mot). */
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

export type Question = ChoiceQuestion | InputQuestion

export interface QuizOptions {
  /** Après une erreur, laisser retenter au lieu de passer à la correction. */
  retry: boolean
  /** Temps limite par question en secondes, 0 = pas de chrono. */
  timerSeconds: number
}
