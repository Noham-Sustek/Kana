import type { NewAnswer } from '@/db/answers'
import { checkAnswer } from '@/features/quiz/questions'
import type { Question, QuizOptions } from '@/features/quiz/types'

// Machine à états d'une session de quiz, pure et sans effet de bord : le store
// l'orchestre et persiste les résultats.

export type AttemptStatus = 'pending' | 'correct' | 'failed'

/** Résultat d'une question, fixé au premier essai (une réussite après réessai reste un échec). */
export interface Outcome {
  correct: boolean
  responseMs: number
  revealed: boolean
}

export interface SessionState {
  questions: Question[]
  /** Nombre de questions prévu (en mode auto, les questions sont ajoutées au fur et à mesure). */
  plannedCount: number
  options: QuizOptions
  index: number
  status: AttemptStatus
  /** Réponses erronées déjà données pour la question courante. */
  wrongAnswers: string[]
  questionStartedAt: number
  outcomes: (Outcome | undefined)[]
  finished: boolean
}

export interface Transition {
  state: SessionState
  /** Présent quand la question vient de recevoir son résultat définitif. */
  outcome?: Outcome
}

export function startSession(
  questions: Question[],
  options: QuizOptions,
  now: number,
  plannedCount = questions.length,
): SessionState {
  return {
    questions,
    plannedCount,
    options,
    index: 0,
    status: 'pending',
    wrongAnswers: [],
    questionStartedAt: now,
    outcomes: questions.map(() => undefined),
    finished: questions.length === 0,
  }
}

export function currentQuestion(state: SessionState): Question | undefined {
  return state.questions[state.index]
}

function settle(state: SessionState, outcome: Outcome): Transition {
  if (state.outcomes[state.index]) return { state }
  const outcomes = [...state.outcomes]
  outcomes[state.index] = outcome
  return { state: { ...state, outcomes }, outcome }
}

export function submitAnswer(state: SessionState, answer: string, now: number): Transition {
  const question = currentQuestion(state)
  if (!question || state.status !== 'pending' || state.wrongAnswers.includes(answer)) return { state }

  const correct = checkAnswer(question, answer)
  const { state: settled, outcome } = settle(state, {
    correct,
    responseMs: now - state.questionStartedAt,
    revealed: false,
  })

  if (correct) return { state: { ...settled, status: 'correct' }, outcome }
  return {
    state: {
      ...settled,
      status: state.options.retry ? 'pending' : 'failed',
      wrongAnswers: [...state.wrongAnswers, answer],
    },
    outcome,
  }
}

/** « Afficher la réponse » ou chrono écoulé. */
export function revealAnswer(state: SessionState, now: number): Transition {
  if (state.status !== 'pending' || state.finished) return { state }
  const { state: settled, outcome } = settle(state, {
    correct: false,
    responseMs: now - state.questionStartedAt,
    revealed: true,
  })
  return { state: { ...settled, status: 'failed' }, outcome }
}

export function nextQuestion(state: SessionState, now: number): SessionState {
  if (state.status === 'pending') return state
  const index = state.index + 1
  return {
    ...state,
    index,
    status: 'pending',
    wrongAnswers: [],
    questionStartedAt: now,
    finished: index >= state.questions.length,
  }
}

/** Ajoute une question en fin de session (mode auto). */
export function appendQuestion(state: SessionState, question: Question): SessionState {
  return { ...state, questions: [...state.questions, question], outcomes: [...state.outcomes, undefined] }
}

export function score(state: SessionState): { correct: number; total: number } {
  return {
    correct: state.outcomes.filter((o) => o?.correct).length,
    total: state.outcomes.filter(Boolean).length,
  }
}

/** Lignes à enregistrer en base pour un résultat (une par kana évalué). */
export function toAnswerRecords(question: Question, outcome: Outcome, answeredAt: number): NewAnswer[] {
  return question.kanaIds.map((kanaId) => ({
    kanaId,
    stage: question.stage,
    correct: outcome.correct,
    responseMs: outcome.responseMs,
    answeredAt,
    revealed: outcome.revealed,
    ...(question.kind === 'input' && question.wordId ? { wordId: question.wordId } : {}),
  }))
}
