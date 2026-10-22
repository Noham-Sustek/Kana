import { create } from 'zustand'
import { recordAnswers } from '@/db/answers'
import {
  currentQuestion,
  nextQuestion,
  revealAnswer,
  startSession,
  submitAnswer,
  toAnswerRecords,
  type SessionState,
  type Transition,
} from '@/features/quiz/session'
import type { Question, QuizOptions } from '@/features/quiz/types'

interface QuizSessionStore {
  session: SessionState | null
  start: (questions: Question[], options: QuizOptions) => void
  submit: (answer: string) => void
  reveal: () => void
  next: () => void
  quit: () => void
}

// Session en mémoire uniquement : seules les réponses sont persistées (Dexie).
export const useQuizSessionStore = create<QuizSessionStore>()((set, get) => {
  const apply = (transition: (s: SessionState, now: number) => Transition) => {
    const session = get().session
    if (!session) return
    const now = Date.now()
    const question = currentQuestion(session)
    const { state, outcome } = transition(session, now)
    set({ session: state })
    if (question && outcome) {
      recordAnswers(toAnswerRecords(question, outcome, now)).catch((err: unknown) =>
        console.error('Enregistrement de la réponse impossible', err),
      )
    }
  }

  return {
    session: null,
    start: (questions, options) => set({ session: startSession(questions, options, Date.now()) }),
    submit: (answer) => apply((s, now) => submitAnswer(s, answer, now)),
    reveal: () => apply(revealAnswer),
    next: () => {
      const session = get().session
      if (session) set({ session: nextQuestion(session, Date.now()) })
    },
    quit: () => set({ session: null }),
  }
})
