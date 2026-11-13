import { describe, expect, it } from 'vitest'
import { groupsOfScript } from '@/data/kana'
import { cardKey, type CardState } from '@/engine/scheduler'
import {
  applicableOptions,
  bestChronoRecord,
  bestChronoScore,
  freeSessionLine,
  kanaSummary,
  optionsSummary,
  reviewDetail,
  reviewSelection,
  startDetail,
  unavailableReason,
  type FreeSessionInput,
} from '@/features/learn/learn'

const hira = groupsOfScript('hiragana')
const kata = groupsOfScript('katakana')

describe('session libre', () => {
  it('ne montre que les options qui s’appliquent', () => {
    expect(applicableOptions(1)).toEqual({ drawingCheck: false, sentences: false })
    expect(applicableOptions(5)).toEqual({ drawingCheck: true, sentences: false })
    expect(applicableOptions(7)).toEqual({ drawingCheck: true, sentences: false })
    expect(applicableOptions(9)).toEqual({ drawingCheck: false, sentences: true })
  })

  it('résume les options et le choix des kana', () => {
    expect(optionsSummary({ questionCount: 20, timerSeconds: 0, retry: true })).toBe('20 questions · sans chrono · réessai')
    expect(optionsSummary({ questionCount: 10, timerSeconds: 5, retry: false })).toBe(
      '10 questions · 5 s par question · sans réessai',
    )
    expect(kanaSummary(20, hira.slice(0, 4), 0)).toBe('20 kana · 4 lignes de hiragana')
    expect(kanaSummary(13, [hira[0]!, hira[1]!, kata[0]!], 1)).toBe('13 kana · 2 lignes de hiragana et 1 de katakana, 1 liste')
    expect(kanaSummary(8, [], 1)).toBe('8 kana · 1 liste')
    expect(kanaSummary(0, [], 0)).toBe('Aucun kana choisi')
    expect(freeSessionLine(1, 3, 0, 20)).toBe('Quel son ? · 3 lignes · 20 questions')
    expect(freeSessionLine(3, 1, 2, 10)).toBe('Faux jumeaux · 1 ligne, 2 listes · 10 questions')
  })

  const input = (over: Partial<FreeSessionInput>): FreeSessionInput => ({
    stage: 1, poolSize: 20, wordCount: 0, sentenceCount: 0, sentenceFilter: 'all', anime: false, questionCount: 20, ...over,
  })

  it('bouton Commencer : ce que couvre la session', () => {
    expect(startDetail(input({}))).toBe('20 kana · 20 questions')
    expect(startDetail(input({ stage: 6, wordCount: 1 }))).toBe('1 mot · 20 questions')
    expect(startDetail(input({ stage: 8, sentenceFilter: 'hiragana', anime: true, questionCount: 10 }))).toBe(
      'Hiragana et Dragon Ball · 10 questions',
    )
    expect(startDetail(input({ stage: 9 }))).toBe('Toutes les phrases · 20 questions')
  })

  it('explique pourquoi la session ne peut pas commencer', () => {
    expect(unavailableReason(input({}))).toBeNull()
    expect(unavailableReason(input({ poolSize: 0 }))).toMatch(/au moins une ligne/)
    expect(unavailableReason(input({ stage: 7, wordCount: 0 }))).toMatch(/Aucun mot/)
    expect(unavailableReason(input({ stage: 8, sentenceCount: 0 }))).toMatch(/Aucune phrase/)
    // Les répliques de Dragon Ball ne dépendent pas des kana.
    expect(unavailableReason(input({ stage: 9, poolSize: 0, anime: true }))).toBeNull()
  })
})

describe('révision ciblée', () => {
  const card = (mastery: number, dueAt: number): CardState => ({
    reps: 2, lapses: 0, ease: 2.5, intervalMs: 60_000, lastAt: 0, dueAt, mastery, answers: 3,
  })

  it('kana pas encore acquis ou arrivés à échéance, parmi les kana travaillés', () => {
    const now = 1_000_000
    const progress = new Map([
      [cardKey('h-a', 1), card(0.9, now + 1)], // acquis, pas encore dû
      [cardKey('h-i', 1), card(0.9, now - 1)], // acquis, dû
      [cardKey('h-u', 1), card(0.3, now + 1)], // pas encore acquis
      [cardKey('h-e', 1), card(0.9, now + 1)],
      [cardKey('h-e', 2), card(0.5, now + 1)], // un stage pas acquis
      [cardKey('h-o', 9), card(0.1, 0)], // stage hors de la révision
    ])
    const sel = reviewSelection(progress, [1, 2], now)
    expect(sel).toEqual({ due: ['h-i', 'h-u', 'h-e'], seen: 4 })
    expect(reviewDetail(sel)).toBe('3 kana à revoir parmi vos 4 kana')
    expect(reviewDetail({ due: [], seen: 4 })).toBe('Rien à revoir parmi vos 4 kana')
    expect(reviewDetail({ due: [], seen: 0 })).toBe('Après vos premières sessions')
  })
})

it('record de lecture chronométrée du profil', () => {
  const best = { '1:hiragana:60': 30, '1:katakana:120': 42, '2:hiragana:60': 80 }
  expect(bestChronoScore(best, 1)).toBe(42)
  expect(bestChronoScore(best, 3)).toBeNull()
  expect(bestChronoRecord(best, 1)).toEqual({ score: 42, duration: 120 })
})
