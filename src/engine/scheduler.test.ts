import { describe, expect, it } from 'vitest'
import { seededRng } from '@/features/quiz/random'
import type { StageId } from '@/features/quiz/types'
import {
  MASTERY_THRESHOLD,
  SLOW_QUALITY,
  acquiredRatio,
  activeKanaIds,
  answerQuality,
  applyAnswers,
  buildProgress,
  cardKey,
  currentStage,
  isMastered,
  nextCard,
  reviewCard,
  unlockedGroupCount,
  type AnswerEvent,
  type CardRef,
  type CardState,
  type PathGroup,
} from '@/engine/scheduler'

const STAGES: StageId[] = [1, 2, 3, 4]
const T0 = 1_700_000_000_000
const DAY = 24 * 3600_000

const FAST = 1000
const SLOW = 20_000

function answer(kanaId: string, stage: StageId, correct: boolean, responseMs: number, at: number): AnswerEvent {
  return { kanaId, stage, correct, responseMs, answeredAt: at, revealed: false }
}

/** `n` réponses successives, espacées d'une minute. */
function answers(kanaId: string, stage: StageId, n: number, correct = true, responseMs = FAST, start = T0): AnswerEvent[] {
  return Array.from({ length: n }, (_, i) => answer(kanaId, stage, correct, responseMs, start + i * 60_000))
}

const PATH: PathGroup[] = [
  { id: 'a', kanaIds: ['h-a', 'h-i', 'h-u', 'h-e', 'h-o'] },
  { id: 'ka', kanaIds: ['h-ka', 'h-ki', 'h-ku', 'h-ke', 'h-ko'] },
  { id: 'sa', kanaIds: ['h-sa', 'h-shi', 'h-su', 'h-se', 'h-so'] },
]

describe('qualité d’une réponse', () => {
  it('juste et rapide = 1, faux ou révélé = 0', () => {
    expect(answerQuality({ stage: 1, correct: true, responseMs: FAST, revealed: false })).toBe(1)
    expect(answerQuality({ stage: 1, correct: false, responseMs: FAST, revealed: false })).toBe(0)
    expect(answerQuality({ stage: 1, correct: true, responseMs: FAST, revealed: true })).toBe(0)
  })

  it('décroît avec le temps de réponse, sans passer sous le plancher', () => {
    const q = (ms: number) => answerQuality({ stage: 1, correct: true, responseMs: ms, revealed: false })
    expect(q(4000)).toBeLessThan(1)
    expect(q(4000)).toBeGreaterThan(q(6000))
    expect(q(SLOW)).toBe(SLOW_QUALITY)
  })

  it('les stages à saisie tolèrent plus de temps', () => {
    const at = (stage: StageId) => answerQuality({ stage, correct: true, responseMs: 5000, revealed: false })
    expect(at(4)).toBeGreaterThan(at(1))
    expect(at(6)).toBe(1)
    expect(at(5)).toBe(1)
  })
})

describe('maîtrise', () => {
  it('quatre réponses justes et rapides suffisent', () => {
    const progress = buildProgress(answers('h-a', 1, 4))
    expect(isMastered(progress.get(cardKey('h-a', 1)))).toBe(true)
    expect(isMastered(buildProgress(answers('h-a', 1, 3)).get(cardKey('h-a', 1)))).toBe(false)
  })

  it('juste mais lent n’est jamais maîtrisé', () => {
    const card = buildProgress(answers('h-a', 1, 30, true, SLOW)).get(cardKey('h-a', 1))!
    expect(card.mastery).toBeLessThan(MASTERY_THRESHOLD)
    expect(isMastered(card)).toBe(false)
  })

  it('une erreur fait perdre la maîtrise, deux bonnes réponses la rendent', () => {
    let progress = buildProgress(answers('h-a', 1, 6))
    progress = applyAnswers(progress, [answer('h-a', 1, false, FAST, T0 + 10 * 60_000)])
    expect(isMastered(progress.get(cardKey('h-a', 1)))).toBe(false)
    progress = applyAnswers(progress, answers('h-a', 1, 3, true, FAST, T0 + 11 * 60_000))
    expect(isMastered(progress.get(cardKey('h-a', 1)))).toBe(true)
  })

  it('l’historique est rejoué dans l’ordre chronologique', () => {
    const events = [answer('h-a', 1, false, FAST, T0 + 5000), ...answers('h-a', 1, 4)]
    const shuffled = [events[3]!, events[0]!, events[4]!, events[1]!, events[2]!]
    expect(buildProgress(shuffled)).toEqual(buildProgress(events))
  })
})

describe('répétition espacée', () => {
  it('les intervalles s’allongent avec les réussites', () => {
    let card: CardState | undefined
    const intervals: number[] = []
    for (let i = 0; i < 6; i++) {
      card = reviewCard(card, 1, T0 + i)
      intervals.push(card.intervalMs)
    }
    for (let i = 1; i < intervals.length; i++) expect(intervals[i]).toBeGreaterThan(intervals[i - 1]!)
  })

  it('un échec ramène la carte très vite et réduit la facilité', () => {
    let card = reviewCard(undefined, 1, T0)
    card = reviewCard(card, 1, T0 + 1)
    const failed = reviewCard(card, 0, T0 + 2)
    expect(failed.intervalMs).toBeLessThanOrEqual(60_000)
    expect(failed.ease).toBeLessThan(card.ease)
    expect(failed.lapses).toBe(1)
    expect(failed.reps).toBe(0)
  })

  it('une réponse lente (difficile) progresse moins qu’une rapide', () => {
    const base = reviewCard(reviewCard(reviewCard(undefined, 1, T0), 1, T0), 1, T0)
    expect(reviewCard(base, 0.6, T0).intervalMs).toBeLessThan(reviewCard(base, 1, T0).intervalMs)
  })
})

describe('passage aux stages supérieurs', () => {
  it('commence au stage 1 puis avance quand le stage est maîtrisé', () => {
    expect(currentStage(new Map(), 'h-a', STAGES)).toBe(1)
    let progress = buildProgress(answers('h-a', 1, 4))
    expect(currentStage(progress, 'h-a', STAGES)).toBe(2)
    progress = applyAnswers(progress, answers('h-a', 2, 4, true, FAST, T0 + DAY))
    expect(currentStage(progress, 'h-a', STAGES)).toBe(3)
  })

  it('revient au stage oublié après une erreur', () => {
    let progress = buildProgress([...answers('h-a', 1, 4), ...answers('h-a', 2, 4, true, FAST, T0 + DAY)])
    progress = applyAnswers(progress, [answer('h-a', 1, false, FAST, T0 + 2 * DAY)])
    expect(currentStage(progress, 'h-a', STAGES)).toBe(1)
  })

  it('null quand tous les stages sont maîtrisés', () => {
    const progress = buildProgress(STAGES.flatMap((s, i) => answers('h-a', s, 4, true, FAST, T0 + i * DAY)))
    expect(currentStage(progress, 'h-a', STAGES)).toBeNull()
  })
})


describe('introduction progressive des groupes', () => {
  it('démarre avec le premier groupe seulement', () => {
    expect(unlockedGroupCount(PATH, new Map(), STAGES)).toBe(1)
    expect(activeKanaIds(PATH, 1)).toEqual(PATH[0]!.kanaIds)
  })

  it('débloque le groupe suivant à 80 % de kana acquis', () => {
    const three = buildProgress(['h-a', 'h-i', 'h-u'].flatMap((id) => answers(id, 1, 4)))
    expect(acquiredRatio(PATH, 1, three, STAGES)).toBeCloseTo(0.6)
    expect(unlockedGroupCount(PATH, three, STAGES)).toBe(1)

    const four = applyAnswers(three, answers('h-e', 1, 4))
    expect(unlockedGroupCount(PATH, four, STAGES)).toBe(2)
  })

  it('peut débloquer plusieurs groupes d’un coup si tout est déjà acquis', () => {
    const progress = buildProgress(PATH.flatMap((g) => g.kanaIds).flatMap((id) => answers(id, 1, 4)))
    expect(unlockedGroupCount(PATH, progress, STAGES)).toBe(3)
  })

  it('ne reverrouille jamais un groupe', () => {
    expect(unlockedGroupCount(PATH, new Map(), STAGES, 2)).toBe(2)
  })
})

describe('choix de la prochaine carte', () => {
  const kanaIds = PATH[0]!.kanaIds

  it('propose d’abord des cartes au stage 1 pour un débutant', () => {
    const card = nextCard({ progress: new Map(), kanaIds, stages: STAGES, now: T0, rng: seededRng(1) })
    expect(card?.stage).toBe(1)
    expect(kanaIds).toContain(card?.kanaId)
  })

  it('aucun kana actif → null', () => {
    expect(nextCard({ progress: new Map(), kanaIds: [], stages: STAGES, now: T0, rng: seededRng(1) })).toBeNull()
  })

  it('ne repose pas le kana qui vient d’être posé', () => {
    const rng = seededRng(2)
    for (let i = 0; i < 100; i++) {
      const recent: CardRef[] = [{ kanaId: 'h-a', stage: 1 }]
      expect(nextCard({ progress: new Map(), kanaIds, stages: STAGES, now: T0, recent, rng })?.kanaId).not.toBe('h-a')
    }
  })

  it('un kana maîtrisé au stage 1 passe au stage 2 (et le stage 1 reste en révision)', () => {
    const progress = buildProgress(answers('h-a', 1, 4))
    const seen = new Set<string>()
    const rng = seededRng(3)
    for (let i = 0; i < 300; i++) {
      const c = nextCard({ progress, kanaIds: ['h-a'], stages: STAGES, now: T0 + DAY, rng })!
      seen.add(`${c.stage}`)
    }
    expect(seen).toEqual(new Set(['1', '2']))
  })

  it('les kana faibles reviennent plus souvent que les kana maîtrisés', () => {
    const now = T0 + 3600_000
    // h-a, h-i, h-u : bien maîtrisés ; h-e : souvent raté ; h-o : juste mais lent.
    const progress = buildProgress([
      ...['h-a', 'h-i', 'h-u'].flatMap((id) => answers(id, 1, 6)),
      ...answers('h-e', 1, 6, false),
      ...answers('h-o', 1, 6, true, SLOW),
    ])
    const counts = new Map<string, number>()
    const rng = seededRng(4)
    for (let i = 0; i < 1000; i++) {
      const c = nextCard({ progress, kanaIds, stages: [1], now, rng })!
      counts.set(c.kanaId, (counts.get(c.kanaId) ?? 0) + 1)
    }
    const weak = Math.min(counts.get('h-e') ?? 0, counts.get('h-o') ?? 0)
    const strong = Math.max(counts.get('h-a') ?? 0, counts.get('h-i') ?? 0, counts.get('h-u') ?? 0)
    expect(weak).toBeGreaterThan(strong * 2)
  })

  it('respecte isApplicable (stage inaccessible ignoré)', () => {
    const progress = buildProgress(answers('h-a', 1, 4))
    const rng = seededRng(5)
    for (let i = 0; i < 100; i++) {
      const c = nextCard({
        progress,
        kanaIds: ['h-a'],
        stages: [1, 2, 3],
        now: T0 + DAY,
        rng,
        isApplicable: ({ stage }) => stage !== 2,
      })!
      expect(c.stage).not.toBe(2)
    }
  })
})

describe('simulation d’un apprenant', () => {
  it('un apprenant parfait débloque les groupes et monte en stage au fil des sessions', () => {
    const rng = seededRng(42)
    let progress = new Map<string, CardState>()
    let unlocked = 1
    let now = T0
    const recent: CardRef[] = []
    const stagesSeen = new Set<StageId>()

    for (let i = 0; i < 400; i++) {
      const card = nextCard({ progress, kanaIds: activeKanaIds(PATH, unlocked), stages: STAGES, now, recent, rng })!
      stagesSeen.add(card.stage)
      progress = applyAnswers(progress, [answer(card.kanaId, card.stage, true, FAST, now)])
      unlocked = unlockedGroupCount(PATH, progress, STAGES, unlocked)
      recent.push(card)
      if (recent.length > 3) recent.shift()
      now += 5000
    }

    expect(unlocked).toBe(PATH.length)
    expect(stagesSeen.has(4)).toBe(true)
  })

  it('un apprenant qui se trompe toujours reste sur le premier groupe', () => {
    const rng = seededRng(43)
    let progress = new Map<string, CardState>()
    let unlocked = 1
    let now = T0
    for (let i = 0; i < 200; i++) {
      const card = nextCard({ progress, kanaIds: activeKanaIds(PATH, unlocked), stages: STAGES, now, rng })!
      expect(card.stage).toBe(1)
      progress = applyAnswers(progress, [answer(card.kanaId, card.stage, false, FAST, now)])
      unlocked = unlockedGroupCount(PATH, progress, STAGES, unlocked)
      now += 5000
    }
    expect(unlocked).toBe(1)
  })
})
