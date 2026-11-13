import { getKana } from '@/data/kana'
import { cardKey, masteryLevel, type CardRef, type MasteryLevel, type Progress } from '@/engine/scheduler'
import type { SessionState } from '@/features/quiz/session'
import { stagePresentation } from '@/features/quiz/stages'
import type { Question, StageId } from '@/features/quiz/types'
import { dayKey } from '@/features/stats/stats'
import { jp, t, type Line } from '@/lib/segments'

// Récapitulatif de fin de session (docs/design/components/FinDeSession). Pur.

/** Session du jour (parcours), Révision ciblée (kana choisis, mode auto), Session libre (un exercice). */
export type SessionKind = 'daily' | 'targeted' | 'free'

export function sessionTitle(kind: SessionKind, stage: StageId | undefined): string {
  if (kind === 'daily') return 'Session du jour'
  if (kind === 'targeted') return 'Révision ciblée'
  return stage ? `Session libre · ${stagePresentation(stage).name}` : 'Session libre'
}

/** « 2:48 » (minutes:secondes), « 1:02:05 » au-delà d'une heure. */
export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = String(total % 60).padStart(2, '0')
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`
}

/** « 2,1 s » : une décimale sous 10 s, à la française. */
export function formatResponseTime(ms: number): string {
  const s = ms / 1000
  return `${(s < 10 ? s.toFixed(1) : Math.round(s).toString()).replace('.', ',')} s`
}

export interface SessionTimes {
  durationMs: number
  /** Temps moyen par réponse, hors réponses affichées ; `null` sans réponse donnée. */
  averageMs: number | null
}

export function sessionTimes(session: SessionState): SessionTimes {
  const answered = session.outcomes.filter((o) => o && !o.revealed)
  const end = session.finishedAt ?? session.questionStartedAt
  return {
    durationMs: end - session.startedAt,
    averageMs: answered.length ? answered.reduce((sum, o) => sum + o!.responseMs, 0) / answered.length : null,
  }
}

/** Vrai si la session est la première du jour : elle a allongé la série. */
export function extendedStreak(answers: readonly { answeredAt: number }[], startedAt: number): boolean {
  const today = dayKey(startedAt)
  return !answers.some((a) => a.answeredAt < startedAt && dayKey(a.answeredAt) === today)
}

// ---------------------------------------------------------------------------
// Maîtrise gagnée
// ---------------------------------------------------------------------------

export interface MasteryGain {
  kanaId: string
  stage: StageId
  from: MasteryLevel
  to: MasteryLevel
}

/** Cartes (kana, stage) de la session qui ont gagné au moins un niveau ; les plus hauts d'abord. */
export function masteryGains(before: Progress, after: Progress, cards: readonly CardRef[]): MasteryGain[] {
  const seen = new Set<string>()
  const gains: MasteryGain[] = []
  for (const { kanaId, stage } of cards) {
    const key = cardKey(kanaId, stage)
    if (seen.has(key)) continue
    seen.add(key)
    const from = masteryLevel(before.get(key))
    const to = masteryLevel(after.get(key))
    if (to > from) gains.push({ kanaId, stage, from, to })
  }
  return gains.sort((a, b) => b.to - a.to || b.to - b.from - (a.to - a.from))
}

// ---------------------------------------------------------------------------
// À revoir
// ---------------------------------------------------------------------------

export interface MissedItem {
  /** Texte en kana de la question (kana, mot, phrase). */
  text: string
  /** Lecture ou romaji de référence. */
  reading: string
  /** Kana seul (stages 1 à 5) : l'élément ouvre sa fiche. */
  kanaId?: string
  /** Ce qui s'est passé : réponse donnée, réponse affichée, tracé. */
  note: Line
}

/** Questions ratées de la session, sans doublon, dans l'ordre. */
export function missedItems(session: SessionState): MissedItem[] {
  const items = new Map<string, MissedItem>()
  session.questions.forEach((q, i) => {
    const outcome = session.outcomes[i]
    if (!outcome || outcome.correct) return
    const text = questionText(q)
    if (items.has(text)) return
    let note: Line = []
    if (outcome.revealed) note = [t('Réponse affichée')]
    else if (q.kind === 'draw') note = [t('Tracé à revoir')]
    else if (outcome.given !== undefined) note = givenNote(q, outcome.given)
    items.set(text, {
      text,
      reading: questionReading(q),
      ...(q.stage <= 5 && q.kanaIds.length === 1 ? { kanaId: q.kanaIds[0]! } : {}),
      note,
    })
  })
  return [...items.values()]
}

function givenNote(q: Question, given: string): Line {
  switch (q.kind) {
    case 'choice': {
      const picked = getKana(given)
      if (!picked) return []
      return q.choiceType === 'romaji'
        ? [t(`Vous avez répondu « ${picked.romaji[0]} » (`), jp(picked.char), t(')')]
        : [t('Vous avez choisi '), jp(picked.char), t(` (${picked.romaji[0]})`)]
    }
    case 'input':
      return [t(`Vous avez tapé « ${given.trim()} »`)]
    case 'compose':
      return [t('Vous avez composé '), jp(given)]
    default:
      return []
  }
}

/** Texte en kana d'une question. */
export function questionText(q: Question): string {
  if (q.kind === 'input' || q.kind === 'compose') return q.reading
  if (q.kind === 'draw') return q.target
  return getKana(q.kanaIds[0]!)!.char
}

function questionReading(q: Question): string {
  if (q.kind === 'input') return q.expected
  if (q.kind === 'draw' && q.prompt.type === 'draw') return q.prompt.text
  if (q.kind === 'compose') return q.prompt.text
  return getKana(q.kanaIds[0]!)!.romaji[0]!
}
