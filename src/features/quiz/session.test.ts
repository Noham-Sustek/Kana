import { describe, expect, it } from 'vitest'
import { getKana } from '@/data/kana'
import { generateQuestions } from '@/features/quiz/questions'
import { seededRng } from '@/features/quiz/random'
import {
  nextQuestion,
  revealAnswer,
  score,
  startSession,
  submitAnswer,
  submitDrawing,
  toAnswerRecords,
} from '@/features/quiz/session'
import type { ChoiceQuestion } from '@/features/quiz/types'

const pool = ['h-a', 'h-i', 'h-u', 'h-e', 'h-o'].map((id) => getKana(id)!)

function setup(retry: boolean) {
  const questions = generateQuestions(1, pool, 3, seededRng(1)) as ChoiceQuestion[]
  const state = startSession(questions, { retry, timerSeconds: 0 }, 1000)
  const q = questions[0]!
  const wrong = q.choices.find((c) => c.id !== q.answerId)!.id
  return { questions, state, q, wrong }
}

describe('session', () => {
  it('bonne réponse du premier coup', () => {
    const { state, q } = setup(true)
    const { state: s, outcome } = submitAnswer(state, q.answerId, 1800)
    expect(s.status).toBe('correct')
    expect(outcome).toEqual({ correct: true, responseMs: 800, revealed: false })
  })

  it('avec réessai : l’erreur est enregistrée, la réussite suivante ne la corrige pas', () => {
    const { state, q, wrong } = setup(true)
    const first = submitAnswer(state, wrong, 1500)
    expect(first.state.status).toBe('pending')
    expect(first.outcome?.correct).toBe(false)

    const again = submitAnswer(first.state, wrong, 1600)
    expect(again.state).toBe(first.state)

    const second = submitAnswer(first.state, q.answerId, 2000)
    expect(second.state.status).toBe('correct')
    expect(second.outcome).toBeUndefined()
    expect(score(second.state)).toEqual({ correct: 0, total: 1 })
  })

  it('sans réessai : une erreur clôt la question', () => {
    const { state, q, wrong } = setup(false)
    const { state: s } = submitAnswer(state, wrong, 1500)
    expect(s.status).toBe('failed')
    expect(submitAnswer(s, q.answerId, 1600).state).toBe(s)
  })

  it('afficher la réponse compte comme une erreur révélée', () => {
    const { state } = setup(true)
    const { state: s, outcome } = revealAnswer(state, 3000)
    expect(s.status).toBe('failed')
    expect(outcome).toEqual({ correct: false, responseMs: 2000, revealed: true })
  })

  it('révéler après une erreur ne crée pas de second résultat', () => {
    const { state, wrong } = setup(true)
    const { state: s } = submitAnswer(state, wrong, 1500)
    expect(revealAnswer(s, 1700).outcome).toBeUndefined()
  })

  it('enchaîne les questions jusqu’à la fin', () => {
    const { questions, state } = setup(true)
    let s = state
    expect(nextQuestion(s, 0)).toBe(s) // pas de passage tant que la question est en cours
    for (const q of questions) {
      s = submitAnswer(s, q.answerId, 2000).state
      s = nextQuestion(s, 2500)
    }
    expect(s.finished).toBe(true)
    expect(score(s)).toEqual({ correct: 3, total: 3 })
  })

  it('stage 7 : une ligne par kana distinct du mot', () => {
    const questions = generateQuestions(7, [getKana('h-ne')!, getKana('h-ko')!], 10)
    const q = questions.find((question) => question.kind === 'input' && question.wordId === 'ねこ')
    const records = toAnswerRecords(q!, { correct: true, responseMs: 1200, revealed: false }, 42)
    expect(records).toEqual([
      { kanaId: 'h-ne', stage: 7, correct: true, responseMs: 1200, answeredAt: 42, revealed: false, wordId: 'ねこ' },
      { kanaId: 'h-ko', stage: 7, correct: true, responseMs: 1200, answeredAt: 42, revealed: false, wordId: 'ねこ' },
    ])
  })

  it('dessin : résultat fixé par submitDrawing, sans réessai', () => {
    const questions = generateQuestions(5, [getKana('h-a')!, getKana('h-i')!], 2)
    let state = startSession(questions, { retry: true, timerSeconds: 0 }, 0)
    expect(submitAnswer(state, 'a', 10).state).toBe(state)
    const failed = submitDrawing(state, false, 3000)
    expect(failed.state.status).toBe('failed')
    expect(failed.outcome).toEqual({ correct: false, responseMs: 3000, revealed: false })
    state = nextQuestion(failed.state, 4000)
    const ok = submitDrawing(state, true, 9000)
    expect(ok.state.status).toBe('correct')
    expect(ok.outcome?.responseMs).toBe(5000)
    expect(score(ok.state)).toEqual({ correct: 1, total: 2 })
  })
})
