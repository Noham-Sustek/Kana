import { describe, expect, it } from 'vitest'
import type { AnswerEvent } from '@/engine/scheduler'
import {
  activeKana,
  AUTO_STAGES,
  createAutoContext,
  createSelectionContext,
  focusKanaIds,
  nextAutoQuestion,
  recordAutoAnswers,
} from '@/features/quiz/auto'
import { groupsOfScript } from '@/data/kana'
import { checkAnswer, correctAnswerLabel } from '@/features/quiz/questions'
import { seededRng } from '@/features/quiz/random'
import { toAnswerRecords } from '@/features/quiz/session'

const T0 = 1_700_000_000_000

describe('mode auto', () => {
  it('un débutant commence par la ligne a au stage 1', () => {
    const ctx = createAutoContext('hiragana', AUTO_STAGES, [], 1)
    expect(activeKana(ctx).map((k) => k.char)).toEqual(['あ', 'い', 'う', 'え', 'お'])
    const next = nextAutoQuestion(ctx, T0, seededRng(1))!
    expect(next.question.stage).toBe(1)
    expect(next.ctx.recent).toHaveLength(1)
  })

  it('la progression est reconstituée depuis l’historique et le déblocage conservé', () => {
    const history: AnswerEvent[] = ['h-a', 'h-i', 'h-u', 'h-e'].flatMap((kanaId) =>
      [0, 1, 2, 3].map((i) => ({ kanaId, stage: 1 as const, correct: true, responseMs: 900, answeredAt: T0 + i, revealed: false })),
    )
    expect(createAutoContext('hiragana', AUTO_STAGES, history, 1).unlocked).toBe(2)
    expect(createAutoContext('hiragana', AUTO_STAGES, [], 3).unlocked).toBe(3)
  })

  it('un apprenant parfait voit s’ouvrir les groupes et arrive aux mots, dessins et phrases', () => {
    const rng = seededRng(7)
    let ctx = createAutoContext('hiragana', AUTO_STAGES, [], 1)
    let now = T0
    const unlockedGroups: string[] = []
    const stages = new Set<number>()

    // Assez de questions pour ouvrir tout le parcours (une part lui est réservée) et monter en stage.
    for (let i = 0; i < 2500; i++) {
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
    for (const stage of [5, 6, 7, 8]) expect(stages.has(stage)).toBe(true)
  }, 30_000)

  it('la dernière ligne débloquée revient à chaque session, même après des jours sans jouer', () => {
    // Lignes a et ka acquises aux stages 1 et 2 il y a trois jours, ligne sa tout juste ouverte.
    const DAY = 86_400_000
    const path = groupsOfScript('hiragana')
    const history: AnswerEvent[] = path.slice(0, 2).flatMap((g) =>
      g.kanaIds.flatMap((kanaId) =>
        ([1, 2] as const).flatMap((stage) =>
          [0, 1, 2, 3].map((i) => ({ kanaId, stage, correct: true, responseMs: 900, answeredAt: T0 + i * 60_000, revealed: false })),
        ),
      ),
    )
    const start = createAutoContext('hiragana', AUTO_STAGES, history, 3)
    expect(focusKanaIds(start)).toEqual(path[2]!.kanaIds)

    for (let seed = 1; seed <= 30; seed++) {
      let ctx = start
      const rng = seededRng(seed)
      let newest = 0
      for (let q = 0; q < 20; q++) {
        ctx = nextAutoQuestion(ctx, T0 + 3 * DAY + q * 10_000, rng)!.ctx
        if (path[2]!.kanaIds.includes(ctx.recent.at(-1)!.kanaId)) newest++
      }
      expect(newest).toBeGreaterThanOrEqual(2)
    }
  })

  it('une fois la dernière ligne acquise, ce sont les kana qui manquent au déblocage', () => {
    const acquired = (ids: string[]): AnswerEvent[] =>
      ids.flatMap((kanaId) =>
        [0, 1, 2, 3].map((i) => ({ kanaId, stage: 1 as const, correct: true, responseMs: 900, answeredAt: T0 + i, revealed: false })),
      )
    // Ligne ka acquise, mais trop peu de la ligne a pour ouvrir la suivante.
    const ctx = createAutoContext('hiragana', AUTO_STAGES, acquired(['h-a', 'h-ka', 'h-ki', 'h-ku', 'h-ke', 'h-ko']), 2)
    expect(ctx.unlocked).toBe(2)
    expect(focusKanaIds(ctx)).toEqual(['h-i', 'h-u', 'h-e', 'h-o'])
    expect(focusKanaIds(createSelectionContext(['h-a'], AUTO_STAGES, []))).toEqual([])
  })

  it('le katakana a son propre parcours', () => {
    const ctx = createAutoContext('katakana', AUTO_STAGES, [], 1)
    expect(activeKana(ctx).every((k) => k.script === 'katakana')).toBe(true)
    expect(ctx.stages).toEqual(AUTO_STAGES)
  })

  it('une sélection ne pose que les kana choisis, sans débloquer de groupe', () => {
    const rng = seededRng(3)
    const chosen = ['h-nu', 'h-me', 'k-so', 'k-n']
    let ctx = createSelectionContext(chosen, AUTO_STAGES, [])
    expect(activeKana(ctx).map((k) => k.id)).toEqual(chosen)
    let now = T0
    for (let i = 0; i < 200; i++) {
      const next = nextAutoQuestion(ctx, now, rng)!
      ctx = next.ctx
      const q = next.question
      if (q.stage < 6) expect(chosen).toContain(q.kanaIds[0])
      const recorded = recordAutoAnswers(ctx, toAnswerRecords(q, { correct: true, responseMs: 1000, revealed: false }, now))
      expect(recorded.newlyUnlocked).toEqual([])
      ctx = recorded.ctx
      now += 4000
    }
    expect(ctx.progress.size).toBeGreaterThan(chosen.length)
  })
})
