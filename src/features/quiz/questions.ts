import { ANIME_SENTENCES, ANIME_SERIES_LABELS } from '@/data/animeSentences'
import { CONFUSABLE_SETS } from '@/data/confusables'
import { KANA, getGroup, kanaOfScript, type Kana } from '@/data/kana'
import { SENTENCES, type AnimeSeries, type Sentence, type SentenceScript } from '@/data/sentences'
import { WORDS, type Word } from '@/data/words'
import { drawCycling, shuffle, type Rng } from '@/features/quiz/random'
import { kanaIdsOf, matchesReading, toRomaji, tokenize } from '@/features/quiz/reading'
import type {
  ChoiceQuestion,
  ComposeQuestion,
  DrawQuestion,
  InputQuestion,
  Question,
  StageId,
} from '@/features/quiz/types'

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

/**
 * Filtre des phrases (stages 8 et 9) : une écriture, `all` = toutes les phrases
 * d'exemple, ou une série d'anime (option « Phrases d'anime »).
 */
export type SentenceFilter = SentenceScript | 'all' | AnimeSeries

/**
 * Phrases dont tous les kana appartiennent à la sélection. Les répliques d'anime
 * mêlent toutes sortes de kana : elles sont proposées quelle que soit la sélection.
 */
export function sentencesForPool(pool: readonly Kana[], filter: SentenceFilter = 'all'): Sentence[] {
  if (filter === 'dragonball') return ANIME_SENTENCES.filter((s) => s.series === filter)
  const ids = new Set(pool.map((k) => k.id))
  return SENTENCES.filter(
    (s) => (filter === 'all' || s.script === filter) && kanaIdsOf(s.text).every((id) => ids.has(id)),
  )
}

/** Contexte affiché avec une réplique d'anime (série · scène). */
function sentenceSource(sentence: Sentence): string | undefined {
  return sentence.series && sentence.scene ? `${ANIME_SERIES_LABELS[sentence.series]} · ${sentence.scene}` : undefined
}

export function wordQuestion(word: Word): InputQuestion {
  return {
    kind: 'input',
    stage: 6,
    prompt: { type: 'word', text: word.kana, meaning: word.meaning, kanji: word.kanji },
    kanaIds: [...kanaIdsOf(word.kana)],
    reading: word.kana,
    expected: toRomaji(word.kana),
    wordId: word.id,
  }
}

/** Stage 7 : le mot est donné en romaji (ー noté ā, ī…) et en français, à dessiner. */
export function wordDrawQuestion(word: Word): DrawQuestion {
  const kanaIds = [...kanaIdsOf(word.kana)]
  return {
    kind: 'draw',
    stage: 7,
    prompt: {
      type: 'draw',
      text: toRomaji(word.kana, { macron: true }),
      script: kanaIds[0]?.startsWith('k-') ? 'katakana' : 'hiragana',
      meaning: word.meaning,
    },
    kanaIds,
    target: word.kana,
    chars: [...word.kana],
    wordId: word.id,
    kanji: word.kanji,
  }
}

export function sentenceQuestion(sentence: Sentence): InputQuestion {
  return {
    kind: 'input',
    stage: 8,
    prompt: {
      type: 'sentence',
      text: sentence.text,
      meaning: sentence.meaning,
      original: sentence.original,
      source: sentenceSource(sentence),
    },
    kanaIds: [...kanaIdsOf(sentence.text)],
    reading: sentence.text,
    expected: toRomaji(sentence.text),
  }
}

// ---------------------------------------------------------------------------
// Stage 9 : composer une phrase avec des étiquettes
// ---------------------------------------------------------------------------

const kanaChars = new Set(KANA.map((k) => k.char))

/** Kana d'un caractère qui se confondent avec `ch` : même base (か/が, は/ば/ぱ) ou forme proche (ぬ/め). */
function lookAlikeChars(ch: string): string[] {
  const alikes = new Set<string>()
  for (const other of kanaChars) {
    if (other.length === 1 && other !== ch && charsLookAlike(ch, other)) alikes.add(other)
  }
  return [...alikes]
}

/**
 * Intrus pour les étiquettes : un mot de la phrase avec un kana remplacé par un
 * kana proche (おこった → おごった). Jamais une autre étiquette juste, ni un mot qui
 * donnerait la même lecture (ず/づ, じ/ぢ : le romaji ne permettrait pas de choisir).
 */
export function tileDistractors(text: string, count: number, rng: Rng): string[] {
  const words = text.split(' ')
  const reading = toRomaji(text)
  const candidates = new Set<string>()
  words.forEach((word, wordIndex) => {
    const chars = [...word]
    chars.forEach((ch, i) => {
      for (const alt of lookAlikeChars(ch)) {
        const variant = [...chars.slice(0, i), alt, ...chars.slice(i + 1)].join('')
        if (words.includes(variant) || !tokenize(variant)) continue
        const sentence = words.map((w, j) => (j === wordIndex ? variant : w)).join(' ')
        if (tokenize(sentence) && toRomaji(sentence) !== reading) candidates.add(variant)
      }
    })
  })
  return shuffle([...candidates], rng).slice(0, count)
}

/** Nombre d'intrus : de 2 à 4 selon la longueur de la phrase. */
function distractorCount(wordCount: number): number {
  return Math.min(4, Math.max(2, Math.ceil(wordCount / 3)))
}

export function composeQuestion(sentence: Sentence, rng: Rng): ComposeQuestion {
  const words = sentence.text.split(' ')
  const distractors = tileDistractors(sentence.text, distractorCount(words.length), rng)
  return {
    kind: 'compose',
    stage: 9,
    prompt: {
      type: 'romajiSentence',
      text: toRomaji(sentence.text),
      meaning: sentence.meaning,
      original: sentence.original,
      source: sentenceSource(sentence),
    },
    kanaIds: [...kanaIdsOf(sentence.text)],
    reading: sentence.text,
    tiles: shuffle([...words, ...distractors], rng),
  }
}

/** Stage 5 : kana à dessiner d'après son romaji (précisé si un autre kana se lit pareil). */
function kanaDrawQuestion(target: Kana): DrawQuestion {
  const homophone = kanaOfScript(target.script).some((k) => k.id !== target.id && ambiguous(k, target))
  return {
    kind: 'draw',
    stage: 5,
    prompt: {
      type: 'draw',
      text: target.romaji[0]!,
      script: target.script,
      ...(homophone ? { note: `groupe ${getGroup(target.groupId)!.label}` } : {}),
    },
    kanaIds: [target.id],
    target: target.char,
    chars: [...target.char],
  }
}

/** Question sur un kana précis ; `pool` sert de vivier prioritaire de distracteurs. */
export function kanaQuestion(stage: Exclude<StageId, 6 | 7 | 8 | 9>, target: Kana, pool: readonly Kana[], rng: Rng): Question {
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
      return kanaDrawQuestion(target)
  }
}

/** Questions d'une session pour un stage, à partir des kana sélectionnés. */
export function generateQuestions(
  stage: StageId,
  pool: readonly Kana[],
  count: number,
  rng: Rng = Math.random,
  sentenceFilter: SentenceFilter = 'all',
): Question[] {
  if (stage === 6) return drawCycling(wordsForPool(pool), count, rng).map(wordQuestion)
  if (stage === 7) return drawCycling(wordsForPool(pool), count, rng).map(wordDrawQuestion)
  if (stage === 8) return drawCycling(sentencesForPool(pool, sentenceFilter), count, rng).map(sentenceQuestion)
  if (stage === 9) {
    return drawCycling(sentencesForPool(pool, sentenceFilter), count, rng).map((s) => composeQuestion(s, rng))
  }
  return drawCycling(pool, count, rng).map((target) => kanaQuestion(stage, target, pool, rng))
}

/** Réponse texte ; un dessin est évalué trait par trait ailleurs (session.submitDrawing). */
export function checkAnswer(question: Question, answer: string): boolean {
  switch (question.kind) {
    case 'choice':
      return answer === question.answerId
    case 'input':
      return matchesReading(question.reading, answer)
    case 'compose':
      return answer === question.reading
    case 'draw':
      return false
  }
}

/** Bonne réponse en clair, pour la correction. */
export function correctAnswerLabel(question: Question): string {
  switch (question.kind) {
    case 'input':
      return question.expected
    case 'draw':
      return question.target
    case 'compose':
      return question.reading
    case 'choice':
      return question.choices.find((c) => c.id === question.answerId)!.label
  }
}
