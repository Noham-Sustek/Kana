import { CONFUSABLE_SETS } from '@/data/confusables'
import { getGroup, kanaOfScript, type Kana } from '@/data/kana'
import { WORDS, type Word } from '@/data/words'
import { drawCycling, shuffle, type Rng } from '@/features/quiz/random'
import { kanaIdsOf, matchesReading, toRomaji } from '@/features/quiz/reading'
import type { ChoiceQuestion, InputQuestion, Question, StageId } from '@/features/quiz/types'

// ---------------------------------------------------------------------------
// Similarité visuelle
// ---------------------------------------------------------------------------

const confusableChars = new Map<string, Set<string>>()
for (const set of CONFUSABLE_SETS) {
  for (const ch of set) {
    const known = confusableChars.get(ch) ?? new Set<string>()
    for (const other of set) if (other !== ch) known.add(other)
    confusableChars.set(ch, known)
  }
}

/** Caractère sans dakuten/handakuten (ば, ぱ → は). */
function baseChar(ch: string): string {
  return ch.normalize('NFD')[0]!
}

function charsLookAlike(a: string, b: string): boolean {
  return a === b || baseChar(a) === baseChar(b) || (confusableChars.get(a)?.has(b) ?? false)
}

/** Deux kana distincts de même forme caractère par caractère (シ/ツ, ば/ぱ, きゃ/きょ). */
export function looksAlike(a: Kana, b: Kana): boolean {
  if (a.id === b.id || a.script !== b.script || a.char.length !== b.char.length) return false
  return [...a.char].every((ch, i) => charsLookAlike(ch, b.char[i]!))
}

// ---------------------------------------------------------------------------
// Distracteurs
// ---------------------------------------------------------------------------

/** Vrai si les deux kana ne peuvent pas être distingués par leur romaji (じ/ぢ, チ/ティ). */
function ambiguous(a: Kana, b: Kana): boolean {
  return a.romaji.includes(b.romaji[0]!) || b.romaji.includes(a.romaji[0]!)
}

/**
 * Choisit `count` distracteurs pour `target`, en épuisant les viviers dans
 * l'ordre de priorité, sans doublon ni ambiguïté de romaji.
 */
function pickDistractors(target: Kana, tiers: Kana[][], count: number): Kana[] {
  const picked: Kana[] = []
  for (const tier of tiers) {
    for (const k of tier) {
      if (picked.length === count) return picked
      if (ambiguous(k, target) || picked.some((p) => p.id === k.id || ambiguous(p, k))) continue
      picked.push(k)
    }
  }
  return picked
}

function choiceQuestion(
  stage: StageId,
  target: Kana,
  distractors: Kana[],
  choiceType: 'kana' | 'romaji',
  prompt: ChoiceQuestion['prompt'],
  rng: Rng,
): ChoiceQuestion {
  const choices = shuffle([target, ...distractors], rng).map((k) => ({
    id: k.id,
    label: choiceType === 'kana' ? k.char : k.romaji[0]!,
  }))
  return { kind: 'choice', stage, prompt, kanaIds: [target.id], choiceType, choices, answerId: target.id }
}

// ---------------------------------------------------------------------------
// Génération
// ---------------------------------------------------------------------------

/** Mots dont tous les kana appartiennent à la sélection. */
export function wordsForPool(pool: readonly Kana[]): Word[] {
  const ids = new Set(pool.map((k) => k.id))
  return WORDS.filter((w) => kanaIdsOf(w.kana).every((id) => ids.has(id)))
}

export function wordQuestion(word: Word): InputQuestion {
  return {
    kind: 'input',
    stage: 6,
    prompt: { type: 'word', text: word.kana, meaning: word.meaning },
    kanaIds: kanaIdsOf(word.kana),
    reading: word.kana,
    expected: toRomaji(word.kana),
    wordId: word.id,
  }
}

/** Question sur un kana précis ; `pool` sert de vivier prioritaire de distracteurs. */
export function kanaQuestion(stage: Exclude<StageId, 6>, target: Kana, pool: readonly Kana[], rng: Rng): Question {
  const sameScript = (list: readonly Kana[]) => list.filter((k) => k.script === target.script)
  const poolTier = shuffle(sameScript(pool), rng)
  const scriptTier = shuffle(kanaOfScript(target.script), rng)

  switch (stage) {
    case 1:
      return choiceQuestion(1, target, pickDistractors(target, [poolTier, scriptTier], 3), 'romaji', { type: 'kana', text: target.char }, rng)
    case 2:
      return choiceQuestion(2, target, pickDistractors(target, [poolTier, scriptTier], 3), 'kana', { type: 'romaji', text: target.romaji[0]! }, rng)
    case 3: {
      const similar = scriptTier.filter((k) => looksAlike(k, target))
      const kind = getGroup(target.groupId)!.kind
      const sameKind = scriptTier.filter((k) => getGroup(k.groupId)!.kind === kind)
      return choiceQuestion(3, target, pickDistractors(target, [similar, sameKind, scriptTier], 7), 'romaji', { type: 'kana', text: target.char }, rng)
    }
    case 4:
      return {
        kind: 'input',
        stage: 4,
        prompt: { type: 'kana', text: target.char },
        kanaIds: [target.id],
        reading: target.char,
        expected: target.romaji[0]!,
      }
    case 5:
      return choiceQuestion(5, target, pickDistractors(target, [poolTier, scriptTier], 3), 'kana', { type: 'audio', text: target.char }, rng)
  }
}

/** Questions d'une session pour un stage, à partir des kana sélectionnés. */
export function generateQuestions(
  stage: StageId,
  pool: readonly Kana[],
  count: number,
  rng: Rng = Math.random,
): Question[] {
  if (stage === 6) return drawCycling(wordsForPool(pool), count, rng).map(wordQuestion)
  return drawCycling(pool, count, rng).map((target) => kanaQuestion(stage, target, pool, rng))
}

export function checkAnswer(question: Question, answer: string): boolean {
  return question.kind === 'choice' ? answer === question.answerId : matchesReading(question.reading, answer)
}

/** Bonne réponse en clair, pour la correction. */
export function correctAnswerLabel(question: Question): string {
  if (question.kind === 'input') return question.expected
  return question.choices.find((c) => c.id === question.answerId)!.label
}
