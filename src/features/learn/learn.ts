import { KANA, type KanaGroup } from '@/data/kana'
import { cardKey, isMastered, type Progress } from '@/engine/scheduler'
import type { SentenceFilter } from '@/features/quiz/questions'
import { stagePresentation } from '@/features/quiz/stages'
import type { StageId } from '@/features/quiz/types'

export const isWordStage = (stage: StageId) => stage === 6 || stage === 7
export const isSentenceStage = (stage: StageId) => stage === 8 || stage === 9
export const isDrawStage = (stage: StageId) => stage === 5 || stage === 7

/** Options de la session libre qui s'appliquent à l'exercice : on ne montre que celles-là. */
export function applicableOptions(stage: StageId): { drawingCheck: boolean; sentences: boolean } {
  return { drawingCheck: isDrawStage(stage), sentences: isSentenceStage(stage) }
}

const plural = (n: number, word: string, plural = `${word}s`) => `${n} ${n > 1 ? plural : word}`

/** Résumé des options repliées : « 20 questions · sans chrono · réessai ». */
export function optionsSummary(o: { questionCount: number; timerSeconds: number; retry: boolean }): string {
  return [
    `${o.questionCount} questions`,
    o.timerSeconds > 0 ? `${o.timerSeconds} s par question` : 'sans chrono',
    o.retry ? 'réessai' : 'sans réessai',
  ].join(' · ')
}

/** « 4 lignes de hiragana », « 2 lignes de hiragana et 1 de katakana », « 1 liste »… */
export function selectionSummary(groups: readonly KanaGroup[], listCount: number): string {
  const hira = groups.filter((g) => g.script === 'hiragana').length
  const kata = groups.length - hira
  const parts: string[] = []
  if (hira > 0 && kata > 0) parts.push(`${plural(hira, 'ligne')} de hiragana et ${kata} de katakana`)
  else if (hira > 0) parts.push(`${plural(hira, 'ligne')} de hiragana`)
  else if (kata > 0) parts.push(`${plural(kata, 'ligne')} de katakana`)
  if (listCount > 0) parts.push(plural(listCount, 'liste'))
  return parts.join(', ')
}

/** Résumé du choix des kana : « 20 kana · 4 lignes de hiragana ». */
export function kanaSummary(poolSize: number, groups: readonly KanaGroup[], listCount: number): string {
  if (poolSize === 0) return 'Aucun kana choisi'
  return `${poolSize} kana · ${selectionSummary(groups, listCount)}`
}

/** Carte « Session libre » de S'entraîner : « Quel son ? · 3 lignes · 20 questions ». */
export function freeSessionLine(stage: StageId, groupCount: number, listCount: number, questionCount: number): string {
  const scope = [groupCount > 0 ? plural(groupCount, 'ligne') : '', listCount > 0 ? plural(listCount, 'liste') : '']
    .filter(Boolean)
    .join(', ')
  return [stagePresentation(stage).name, scope, `${questionCount} questions`].filter(Boolean).join(' · ')
}

const SENTENCE_FILTER_LABELS: Record<SentenceFilter, string> = {
  all: 'Toutes les phrases',
  hiragana: 'Hiragana',
  katakana: 'Katakana',
  mixed: 'Mixte',
}

/** Source des phrases : « Hiragana et Dragon Ball ». */
export function sentenceSourceLabel(filter: SentenceFilter, anime: boolean): string {
  return anime ? `${SENTENCE_FILTER_LABELS[filter]} et Dragon Ball` : SENTENCE_FILTER_LABELS[filter]
}

export interface FreeSessionInput {
  stage: StageId
  poolSize: number
  wordCount: number
  sentenceCount: number
  sentenceFilter: SentenceFilter
  anime: boolean
  questionCount: number
}

/** Seconde ligne du bouton Commencer : « 20 kana · 20 questions ». */
export function startDetail(i: FreeSessionInput): string {
  const scope = isSentenceStage(i.stage)
    ? sentenceSourceLabel(i.sentenceFilter, i.anime)
    : isWordStage(i.stage)
      ? plural(i.wordCount, 'mot')
      : `${i.poolSize} kana`
  return `${scope} · ${i.questionCount} questions`
}

/** Pourquoi la session ne peut pas commencer (`null` = elle peut). */
export function unavailableReason(i: FreeSessionInput): string | null {
  // Les répliques d'anime ne dépendent pas des kana choisis.
  if (isSentenceStage(i.stage) && i.anime) return null
  if (i.poolSize === 0) return 'Choisissez au moins une ligne ou une liste.'
  if (isWordStage(i.stage) && i.wordCount === 0) return 'Aucun mot ne s’écrit avec ces kana : ajoutez des lignes.'
  if (isSentenceStage(i.stage) && i.sentenceCount === 0) {
    return 'Aucune phrase ne s’écrit avec ces kana : ajoutez des lignes ou changez d’écriture.'
  }
  return null
}

export interface ReviewSelection {
  /** Kana à revoir : une carte pas encore acquise, ou acquise mais arrivée à échéance. */
  due: string[]
  /** Kana déjà travaillés (au moins une réponse sur l'un des stages). */
  seen: number
}

/** Kana de la Révision ciblée, dans l'ordre du tableau. */
export function reviewSelection(progress: Progress, stages: readonly StageId[], now: number): ReviewSelection {
  const due: string[] = []
  let seen = 0
  for (const kana of KANA) {
    const cards = stages.map((s) => progress.get(cardKey(kana.id, s))).filter((c) => c !== undefined)
    if (cards.length === 0) continue
    seen++
    if (cards.some((c) => !isMastered(c) || c.dueAt <= now)) due.push(kana.id)
  }
  return { due, seen }
}

/** Carte « Révision ciblée » : « 14 kana à revoir parmi vos 46 kana ». */
export function reviewDetail({ due, seen }: ReviewSelection): string {
  if (seen === 0) return 'Après vos premières sessions'
  if (due.length === 0) return `Rien à revoir parmi vos ${seen} kana`
  return `${due.length} kana à revoir parmi vos ${seen} kana`
}

/** Meilleur score de lecture chronométrée du profil, toutes écritures et durées confondues. */
export function bestChronoScore(best: Readonly<Record<string, number>>, profileId: number): number | null {
  const prefix = `${profileId}:`
  const scores = Object.entries(best)
    .filter(([key]) => key.startsWith(prefix))
    .map(([, score]) => score)
  return scores.length > 0 ? Math.max(...scores) : null
}
