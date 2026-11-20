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

/** Meilleur score de lecture chronométrée du profil (toutes écritures), avec sa durée en secondes. */
export function bestChronoRecord(
  best: Readonly<Record<string, number>>,
  profileId: number,
): { score: number; duration: number } | null {
  let record: { score: number; duration: number } | null = null
  for (const [key, score] of Object.entries(best)) {
    const [profile, , duration] = key.split(':')
    if (Number(profile) !== profileId) continue
    if (!record || score > record.score) record = { score, duration: Number(duration) }
  }
  return record
}

/** Meilleur score de lecture chronométrée du profil, toutes écritures et durées confondues. */
export function bestChronoScore(best: Readonly<Record<string, number>>, profileId: number): number | null {
  return bestChronoRecord(best, profileId)?.score ?? null
}

export type StageStatus = 'new' | 'progress' | 'done'

export interface StageMastery {
  /** Kana déjà travaillés à cet exercice. */
  seen: number
  /** Kana maîtrisés à cet exercice. */
  mastered: number
  status: StageStatus
}

/** Kana à travailler au moins avant de dire un exercice acquis. */
export const STAGE_DONE_MIN = 20

/** Maîtrise d'un exercice (style Reload, liste des exercices) : Nouveau sans réponse,
 *  Acquis quand 80 % des kana vus (et au moins STAGE_DONE_MIN) sont maîtrisés, sinon En cours. */
export function stageMastery(progress: Progress, stage: StageId): StageMastery {
  let seen = 0
  let mastered = 0
  for (const kana of KANA) {
    const card = progress.get(cardKey(kana.id, stage))
    if (!card) continue
    seen++
    if (isMastered(card)) mastered++
  }
  const status: StageStatus =
    seen === 0 ? 'new' : seen >= STAGE_DONE_MIN && mastered / seen >= 0.8 ? 'done' : 'progress'
  return { seen, mastered, status }
}

/** Ligne de détail d'un exercice selon sa maîtrise. */
export function stageMasteryLine({ seen, mastered, status }: StageMastery): string {
  if (status === 'new') return 'Pas encore commencé.'
  const kana = (n: number) => `${n} kana`
  return `${kana(mastered)} maîtrisé${mastered > 1 ? 's' : ''} sur ${kana(seen)} travaillé${seen > 1 ? 's' : ''}.`
}
