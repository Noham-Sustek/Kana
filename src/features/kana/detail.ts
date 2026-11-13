import { KANA, type Kana } from '@/data/kana'
import { CONFUSABLE_SETS } from '@/data/confusables'
import { WORDS, type Word } from '@/data/words'
import { cardKey, masteryLevel, type MasteryLevel, type Progress } from '@/engine/scheduler'
import { stagePresentation, type StageFamily } from '@/features/quiz/stages'
import type { StageId } from '@/features/quiz/types'

const ALL_STAGES: StageId[] = [1, 2, 3, 4, 5, 6, 7, 8, 9]

/** Maîtrise d'un kana par famille d'exercice : le meilleur niveau parmi les stages de la famille. */
export function familyMastery(progress: Progress, kanaId: string): Record<StageFamily, MasteryLevel> {
  const result: Record<StageFamily, MasteryLevel> = { recognize: 0, write: 0, read: 0 }
  for (const stage of ALL_STAGES) {
    const family = stagePresentation(stage).family
    const level = masteryLevel(progress.get(cardKey(kanaId, stage)))
    if (level > result[family]) result[family] = level
  }
  return result
}

/** Kana visuellement proches, de la même écriture (familles de `confusables.ts`). */
export function confusablesOf(kana: Kana): Kana[] {
  const others: Kana[] = []
  for (const set of CONFUSABLE_SETS) {
    if (!set.includes(kana.char)) continue
    for (const char of set) {
      const other = KANA.find((k) => k.char === char && k.script === kana.script)
      if (other && other.id !== kana.id && !others.includes(other)) others.push(other)
    }
  }
  return others
}

/** Mots qui contiennent le kana : les plus courts d'abord, ceux qui ont un kanji usuel en tête à longueur égale. */
export function wordsWithKana(kana: Kana, limit: number): Word[] {
  return WORDS.filter((w) => w.kana.includes(kana.char))
    .map((w, i) => ({ w, i }))
    .sort((a, b) => a.w.kana.length - b.w.kana.length || Number(!a.w.kanji) - Number(!b.w.kanji) || a.i - b.i)
    .slice(0, limit)
    .map(({ w }) => w)
}
