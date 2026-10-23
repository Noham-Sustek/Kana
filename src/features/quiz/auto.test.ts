import { describe, expect, it } from 'vitest'
import type { AnswerEvent } from '@/engine/scheduler'
import {
  activeKana,
  autoStages,
  createAutoContext,
  createSelectionContext,
  nextAutoQuestion,
  recordAutoAnswers,
} from '@/features/quiz/auto'
import { checkAnswer, correctAnswerLabel } from '@/features/quiz/questions'
import { seededRng } from '@/features/quiz/random'
import { toAnswerRecords } from '@/features/quiz/session'

const T0 = 1_700_000_000_000

describe('mode auto', () => {
  it('un débutant commence par la ligne a au stage 1', () => {
    const ctx = createAutoContext('hiragana', autoStages(false), [], 1)
    expect(activeKana(ctx).map((k) => k.char)).toEqual(['あ', 'い', 'う', 'え', 'お'])
    const next = nextAutoQuestion(ctx, T0, seededRng(1))!
    expect(next.question.stage).toBe(1)
    expect(next.ctx.recent).toHaveLength(1)
  })

  it('la progression est reconstituée depuis l’historique et le déblocage conservé', () => {
    const history: AnswerEvent[] = ['h-a', 'h-i', 'h-u', 'h-e'].flatMap((kanaId) =>
      [0, 1, 2, 3].map((i) => ({ kanaId, stage: 1 as const, correct: true, responseMs: 900, answeredAt: T0 + i, revealed: false })),
    )
    expect(createAutoContext('hiragana', autoStages(false), history, 1).unlocked).toBe(2)
    expect(createAutoContext('hiragana', autoStages(false), [], 3).unlocked).toBe(3)
  })

  it('un apprenant parfait voit s’ouvrir les groupes et arrive aux mots, dessins et phrases', () => {
    const rng = seededRng(7)
    let ctx = createAutoContext('hiragana', autoStages(false), [], 1)
    let now = T0
    const unlockedGroups: string[] = []
    const stages = new Set<number>()

    for (let i = 0; i < 1500; i++) {
      const next = nextAutoQuestion(ctx, now, rng)!
      ctx = next.ctx
      const q = next.question
      stages.add(q.stage)
      if (q.kind !== 'draw') {
        const answer = q.kind === 'choice' ? q.answerId : correctAnswerLabel(q)
        expect(checkAnswer(q, answer)).toBe(true)
      }
      const recorded = recordAutoAnswers(ctx, toAnswerRecords(q, { correct: true, responseMs: 1000, revealed: false }, now))
      ctx = recorded.ctx
      unlockedGroups.push(...recorded.newlyUnlocked.map((g) => g.id))
      now += 4000
    }

    expect(unlockedGroups.slice(0, 2)).toEqual(['hiragana-ka', 'hiragana-sa'])
    for (const stage of [5, 7, 8, 9]) expect(stages.has(stage)).toBe(true)
    // Sans voix japonaise, pas de stage 6 (écouter).
    expect(stages.has(6)).toBe(false)
  })

  it('le katakana a son propre parcours', () => {
    const ctx = createAutoContext('katakana', autoStages(true), [], 1)
    expect(activeKana(ctx).every((k) => k.script === 'katakana')).toBe(true)
    expect(ctx.stages).toContain(6)
  })

  it('une sélection ne pose que les kana choisis, sans débloquer de groupe', () => {
    const rng = seededRng(3)
    const chosen = ['h-nu', 'h-me', 'k-so', 'k-n']
    let ctx = createSelectionContext(chosen, autoStages(false), [])
    expect(activeKana(ctx).map((k) => k.id)).toEqual(chosen)
    let now = T0
    for (let i = 0; i < 200; i++) {
      const next = nextAutoQuestion(ctx, now, rng)!
      ctx = next.ctx
      const q = next.question
      if (q.stage < 7) expect(chosen).toContain(q.kanaIds[0])
      const recorded = recordAutoAnswers(ctx, toAnswerRecords(q, { correct: true, responseMs: 1000, revealed: false }, now))
      expect(recorded.newlyUnlocked).toEqual([])
      ctx = recorded.ctx
      now += 4000
    }
    expect(ctx.progress.size).toBeGreaterThan(chosen.length)
  })
})
