import { describe, expect, it } from 'vitest'
import { KANA, getKana, groupsOfScript, kanaOfScript, type Kana } from '@/data/kana'
import { checkAnswer, correctAnswerLabel, generateQuestions, looksAlike, wordsForPool } from '@/features/quiz/questions'
import { seededRng } from '@/features/quiz/random'
import type { ChoiceQuestion, StageId } from '@/features/quiz/types'

const k = (id: string) => getKana(id)!
const groupKana = (groupId: string) => KANA.filter((kana) => kana.groupId === groupId)

const SMALL_POOL = groupKana('hiragana-ka')
const FULL_HIRAGANA = kanaOfScript('hiragana')
const FULL_KATAKANA = kanaOfScript('katakana')

function choiceQuestions(stage: StageId, pool: readonly Kana[], count = 200) {
  return generateQuestions(stage, pool, count, seededRng(stage * 1000 + pool.length)) as ChoiceQuestion[]
}

describe('génération', () => {
  it.each([1, 2, 3, 4, 5, 6] as StageId[])('stage %i : nombre de questions et kana issus de la sélection', (stage) => {
    const questions = generateQuestions(stage, SMALL_POOL, 12, seededRng(1))
    expect(questions).toHaveLength(12)
    const poolIds = SMALL_POOL.map((kana) => kana.id)
    for (const q of questions) {
      expect(q.stage).toBe(stage)
      expect(poolIds).toContain(q.kanaIds[0])
    }
  })

  it('ne pose pas deux fois de suite le même kana', () => {
    const questions = generateQuestions(1, SMALL_POOL, 100, seededRng(7))
    for (let i = 1; i < questions.length; i++) {
      expect(questions[i]!.kanaIds[0]).not.toBe(questions[i - 1]!.kanaIds[0])
    }
  })

  it('chaque kana sort avant qu’un autre ne revienne', () => {
    const questions = generateQuestions(1, SMALL_POOL, SMALL_POOL.length, seededRng(3))
    expect(new Set(questions.map((q) => q.kanaIds[0])).size).toBe(SMALL_POOL.length)
  })

  it('sélection vide → aucune question', () => {
    expect(generateQuestions(1, [], 10)).toEqual([])
  })
})

describe('questions à choix', () => {
  const cases: [StageId, number, readonly Kana[]][] = [
    [1, 4, SMALL_POOL],
    [1, 4, FULL_KATAKANA],
    [2, 4, FULL_HIRAGANA],
    [3, 8, FULL_HIRAGANA],
    [3, 8, FULL_KATAKANA],
    [6, 4, SMALL_POOL],
  ]

  it.each(cases)('stage %i : %i choix distincts et non ambigus', (stage, n, pool) => {
    for (const q of choiceQuestions(stage, pool)) {
      expect(q.choices).toHaveLength(n)
      expect(q.choices.map((c) => c.id)).toContain(q.answerId)
      expect(new Set(q.choices.map((c) => c.label)).size).toBe(n)

      const target = k(q.answerId)
      for (const c of q.choices) {
        const kana = k(c.id)
        expect(kana.script).toBe(target.script)
        // Aucun distracteur ne doit aussi être une bonne réponse.
        if (c.id !== q.answerId) {
          expect(target.romaji).not.toContain(kana.romaji[0])
          expect(kana.romaji).not.toContain(target.romaji[0])
        }
      }
    }
  })

  it('stage 2 n’oppose jamais des homophones (じ/ぢ)', () => {
    const pool = [k('h-ji'), k('h-dji'), k('h-zu'), k('h-dzu')]
    for (const q of choiceQuestions(2, pool)) {
      const ids = q.choices.map((c) => c.id)
      expect(ids.includes('h-ji') && ids.includes('h-dji')).toBe(false)
      expect(ids.includes('h-zu') && ids.includes('h-dzu')).toBe(false)
    }
  })

  it('stage 3 privilégie les kana visuellement proches', () => {
    for (const [target, lookalike] of [
      ['k-shi', 'k-tsu'],
      ['k-so', 'k-n'],
      ['h-nu', 'h-me'],
    ]) {
      const questions = choiceQuestions(3, [k(target!)], 5)
      for (const q of questions) {
        expect(q.choices.map((c) => c.id)).toContain(lookalike)
      }
    }
  })

  it('looksAlike rapproche les variantes à (han)dakuten et les yōon d’une même ligne', () => {
    expect(looksAlike(k('h-ha'), k('h-ba'))).toBe(true)
    expect(looksAlike(k('h-ba'), k('h-pa'))).toBe(true)
    expect(looksAlike(k('h-kya'), k('h-kyo'))).toBe(true)
    expect(looksAlike(k('k-shi'), k('k-tsu'))).toBe(true)
    expect(looksAlike(k('h-ka'), k('h-ka'))).toBe(false)
    expect(looksAlike(k('h-shi'), k('k-shi'))).toBe(false)
  })

  it('checkAnswer et correctAnswerLabel', () => {
    const [q] = choiceQuestions(1, SMALL_POOL, 1)
    expect(checkAnswer(q!, q!.answerId)).toBe(true)
    expect(checkAnswer(q!, q!.choices.find((c) => c.id !== q!.answerId)!.id)).toBe(false)
    expect(correctAnswerLabel(q!)).toBe(k(q!.answerId).romaji[0])
  })
})

describe('questions à saisie', () => {
  it('stage 4 accepte les variantes de romaji', () => {
    const [q] = generateQuestions(4, [k('h-shi')], 1)
    expect(q!.kind).toBe('input')
    expect(checkAnswer(q!, 'shi')).toBe(true)
    expect(checkAnswer(q!, 'si')).toBe(true)
    expect(checkAnswer(q!, 'su')).toBe(false)
    expect(correctAnswerLabel(q!)).toBe('shi')
  })

  it('stage 7 ne pose que des mots lisibles avec la sélection', () => {
    const pool = groupsOfScript('hiragana')
      .filter((g) => g.kind === 'gojuon')
      .flatMap((g) => groupKana(g.id))
    const words = wordsForPool(pool)
    expect(words.length).toBeGreaterThan(50)
    const poolIds = new Set(pool.map((kana) => kana.id))
    for (const q of generateQuestions(7, pool, 100, seededRng(5))) {
      expect(q.kind).toBe('input')
      for (const id of q.kanaIds) expect(poolIds.has(id)).toBe(true)
    }
  })

  it('stages 7 à 9 sans mot ni phrase disponible → aucune question', () => {
    for (const stage of [7, 8, 9] as StageId[]) expect(generateQuestions(stage, [k('h-n')], 10)).toEqual([])
  })

  it('stage 9 : phrases lisibles avec la sélection, dans l’écriture demandée', () => {
    for (const filter of ['hiragana', 'katakana', 'mixed'] as const) {
      const questions = generateQuestions(9, KANA, 30, seededRng(2), filter)
      expect(questions).toHaveLength(30)
      for (const q of questions) {
        expect(q.kind).toBe('input')
        if (q.kind !== 'input') continue
        expect(checkAnswer(q, q.expected)).toBe(true)
        const scripts = new Set(q.kanaIds.map((id) => id[0]))
        expect(scripts.size).toBe(filter === 'mixed' ? 2 : 1)
      }
    }
    // Hiragana seuls : pas de phrase katakana ni mixte.
    for (const q of generateQuestions(9, FULL_HIRAGANA, 30, seededRng(4))) {
      expect(q.kanaIds.every((id) => id.startsWith('h-'))).toBe(true)
    }
  })
})

describe('questions à dessiner', () => {
  it('stage 5 : un kana à dessiner, précisé quand un autre se lit pareil', () => {
    const [q] = generateQuestions(5, [k('h-kya')], 1)
    expect(q).toMatchObject({ kind: 'draw', stage: 5, target: 'きゃ', chars: ['き', 'ゃ'], kanaIds: ['h-kya'] })
    expect(q!.prompt).toMatchObject({ type: 'draw', text: 'kya', script: 'hiragana' })
    const [ji] = generateQuestions(5, [k('h-dji')], 1)
    expect(ji!.prompt).toMatchObject({ text: 'ji', note: expect.stringContaining('d') })
    expect(checkAnswer(ji!, 'ji')).toBe(false)
    expect(correctAnswerLabel(ji!)).toBe('ぢ')
  })

  it('stage 8 : un mot de la sélection, en romaji et en français', () => {
    const pool = kanaOfScript('katakana')
    for (const q of generateQuestions(8, pool, 30, seededRng(9))) {
      expect(q.kind).toBe('draw')
      if (q.kind !== 'draw') continue
      expect(q.chars.join('')).toBe(q.target)
      expect(q.wordId).toBe(q.target)
      expect(q.prompt).toMatchObject({ type: 'draw', script: 'katakana', meaning: expect.any(String) })
    }
  })
})
