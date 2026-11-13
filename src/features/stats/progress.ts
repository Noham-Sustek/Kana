import { KANA, type Script } from '@/data/kana'
import { isAcquired, type Progress } from '@/engine/scheduler'
import { familyMastery } from '@/features/kana/detail'
import type { StageFamily } from '@/features/quiz/stages'
import type { StageId } from '@/features/quiz/types'
import { dayKey, type DayActivity } from '@/features/stats/stats'

// Page Progrès : agrégats purs (heure courante fournie par l'appelant, jours locaux).

export type Period = 7 | 30 | 'all'

export const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: 7, label: '7 jours' },
  { value: 30, label: '30 jours' },
  { value: 'all', label: 'Tout' },
]

/** Début (minuit local) de la période : les `n` derniers jours, aujourd'hui compris. */
export function periodStart(period: Period, now: number): number {
  if (period === 'all') return -Infinity
  const d = new Date(now)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - (period - 1))
  return d.getTime()
}

export function inPeriod<T extends { answeredAt: number }>(answers: readonly T[], period: Period, now: number): T[] {
  const start = periodStart(period, now)
  return answers.filter((a) => a.answeredAt >= start)
}

export interface AcquiredCount {
  acquired: number
  total: number
}

/** Kana acquis (maîtrisés au premier stage du parcours), par écriture. */
export function acquiredByScript(progress: Progress, stages: readonly StageId[]): Record<Script, AcquiredCount> {
  const result: Record<Script, AcquiredCount> = {
    hiragana: { acquired: 0, total: 0 },
    katakana: { acquired: 0, total: 0 },
  }
  for (const kana of KANA) {
    const entry = result[kana.script]
    entry.total++
    if (isAcquired(progress, kana.id, stages)) entry.acquired++
  }
  return result
}

/** Kana acquis par famille d'exercice, parmi les kana déjà travaillés. */
export function acquiredByFamily(progress: Progress, seenKanaIds: Iterable<string>): { counts: Record<StageFamily, number>; seen: number } {
  const counts: Record<StageFamily, number> = { recognize: 0, write: 0, read: 0 }
  let seen = 0
  for (const id of seenKanaIds) {
    seen++
    const mastery = familyMastery(progress, id)
    for (const family of Object.keys(counts) as StageFamily[]) if (mastery[family] >= 2) counts[family]++
  }
  return { counts, seen }
}

const WEEKDAYS = ['Dim.', 'Lun.', 'Mar.', 'Mer.', 'Jeu.', 'Ven.', 'Sam.']
const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']

function dateOf(day: string): Date {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(y!, m! - 1, d!)
}

/** « 7 nov. » */
export function shortDate(day: string): string {
  const d = dateOf(day)
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`
}

/** « 4 min 10 », « 45 s » */
export function formatSpent(ms: number): string {
  const total = Math.round(ms / 1000)
  if (total < 60) return `${total} s`
  const m = Math.floor(total / 60)
  const s = total % 60
  return s === 0 ? `${m} min` : `${m} min ${String(s).padStart(2, '0')}`
}

/** Bulle d'une barre d'activité : « Sam. 7 nov. · 36 réponses » / « 31 justes · 86 % · 4 min 10 ». */
export function activityTip(d: DayActivity, now: number): { title: string; detail: string } {
  const date = dateOf(d.day)
  const label = d.day === dayKey(now) ? 'Aujourd’hui' : `${WEEKDAYS[date.getDay()]} ${shortDate(d.day)}`
  if (d.questions === 0) return { title: `${label} · aucune réponse`, detail: 'Pas de session ce jour-là' }
  const rate = Math.round((d.correct / d.questions) * 100)
  return {
    title: `${label} · ${d.questions} réponse${d.questions > 1 ? 's' : ''}`,
    detail: `${d.correct} juste${d.correct > 1 ? 's' : ''} · ${rate} % · ${formatSpent(d.timeMs)}`,
  }
}
