import type { DayState } from '@/components/WeekStrip'
import { getKana, groupGlyph, type KanaGroup } from '@/data/kana'
import { UNLOCK_RATIO, activeKanaIds, isAcquired, type CardState } from '@/engine/scheduler'
import type { StageId } from '@/features/quiz/types'
import { dayKey } from '@/features/stats/stats'
import { jp, t, type Line } from '@/lib/segments'

// Accueil : où j'en suis, que faire maintenant. Fonctions pures (`now` injecté,
// jours locaux), la page ne fait qu'afficher.

// ---------------------------------------------------------------------------
// Série
// ---------------------------------------------------------------------------

export interface StreakView {
  days: number
  /** Semaine en cours, lundi → dimanche. */
  week: DayState[]
  message: string
}

/** `days` = série courante (jusqu'à aujourd'hui, ou hier si rien encore aujourd'hui). */
export function streakView(
  answers: readonly { answeredAt: number }[],
  streak: { current: number; today: boolean },
  now: number,
): StreakView {
  const active = new Set(answers.map((a) => dayKey(a.answeredAt)))
  const todayKey = dayKey(now)
  const date = new Date(now)
  // Lundi de la semaine en cours (getDay : 0 = dimanche).
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate() - ((date.getDay() + 6) % 7), 12)
  const week = Array.from({ length: 7 }, (_, i): DayState => {
    const key = dayKey(new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i, 12).getTime())
    if (active.has(key)) return 'on'
    return key === todayKey ? 'today' : 'off'
  })

  let message: string
  if (streak.today) message = 'Session faite aujourd’hui. À demain.'
  else if (streak.current > 0) message = `Une session aujourd’hui la porte à ${streak.current + 1}.`
  else if (active.size > 0) message = 'Une session aujourd’hui relance votre série.'
  else message = 'Votre série commence avec la première session.'

  return { days: streak.current, week, message }
}

// ---------------------------------------------------------------------------
// Parcours
// ---------------------------------------------------------------------------

export interface PathTile {
  group: KanaGroup
  glyph: string
  state: 'done' | 'current' | 'locked'
  /** Part des kana de la ligne acquis (case en cours). */
  fill: number
}

export interface PathView {
  /** Lignes entièrement acquises, sur le total du parcours. */
  doneCount: number
  total: number
  tiles: PathTile[]
  /** Phrase sous les cases : la première partie en gras. */
  headline: Line
  detail: Line
  /** Ligne sur laquelle porte la session (première ligne ouverte non acquise). */
  focus: KanaGroup | undefined
}

/** Cases montrées au plus : les dernières lignes, la ligne verrouillée suivante comprise. */
export const MAX_PATH_TILES = 10

export function pathView(
  path: readonly KanaGroup[],
  unlocked: number,
  progress: ReadonlyMap<string, CardState>,
  stages: readonly StageId[],
  hasHistory: boolean,
): PathView {
  const acquiredIn = (g: KanaGroup) => g.kanaIds.filter((id) => isAcquired(progress, id, stages)).length
  const open = path.slice(0, unlocked)
  const next = path[unlocked]

  const tiles: PathTile[] = open.map((group) => {
    const acquired = acquiredIn(group)
    return {
      group,
      glyph: groupGlyph(group),
      state: acquired === group.kanaIds.length ? 'done' : 'current',
      fill: acquired / group.kanaIds.length,
    }
  })
  if (next) tiles.push({ group: next, glyph: groupGlyph(next), state: 'locked', fill: 0 })

  const doneCount = path.filter((g) => acquiredIn(g) === g.kanaIds.length).length
  const focus = open.find((g) => acquiredIn(g) < g.kanaIds.length)

  let headline: Line
  let detail: Line
  if (!focus) {
    headline = [t('Toutes les lignes ouvertes sont acquises.')]
    detail = next ? [t('La ligne '), jp(groupGlyph(next)), t(' s’ouvre à la prochaine session.')] : [t('Révisez pour les garder.')]
  } else {
    const size = focus.kanaIds.length
    const acquired = acquiredIn(focus)
    if (acquired === 0 && !hasHistory) {
      headline = [t('Ligne '), jp(groupGlyph(focus)), t(` : ${size} kana à découvrir.`)]
      detail = [t(`${focus.kanaIds.map((id) => getKana(id)!.romaji[0]).join(', ')}.`)]
    } else if (acquired === 0) {
      headline = [t('Ligne '), jp(groupGlyph(focus)), t(' ouverte.')]
      detail = [t(`${size} kana à découvrir.`)]
    } else {
      headline = [t('Ligne '), jp(groupGlyph(focus)), t(` : ${acquired} kana acquis sur ${size}.`)]
      const active = activeKanaIds(path, unlocked)
      const activeAcquired = active.filter((id) => isAcquired(progress, id, stages)).length
      const needed = Math.ceil(active.length * UNLOCK_RATIO) - activeAcquired
      detail =
        next && needed > 0
          ? [t(needed === 1 ? 'Encore un et la ligne ' : `Encore ${needed} et la ligne `), jp(groupGlyph(next)), t(' s’ouvre.')]
          : next
            ? [t('La ligne '), jp(groupGlyph(next)), t(' s’ouvre à la prochaine session.')]
            : [t('Dernière ligne du parcours.')]
    }
  }

  return { doneCount, total: path.length, tiles: tiles.slice(-MAX_PATH_TILES), headline, detail, focus }
}

// ---------------------------------------------------------------------------
// Action principale
// ---------------------------------------------------------------------------

/** Durée moyenne d'une question, pour annoncer la durée d'une session. */
const SECONDS_PER_QUESTION = 15

export function estimateMinutes(questionCount: number): number {
  return Math.max(1, Math.round((questionCount * SECONDS_PER_QUESTION) / 60))
}

export interface SessionCta {
  label: string
  detail: string
  /** Session déjà faite aujourd'hui : bouton en contour, l'accent n'est plus nécessaire. */
  secondary: boolean
}

export function sessionCta(input: {
  hasHistory: boolean
  doneToday: boolean
  questionCount: number
  focus: KanaGroup | undefined
}): SessionCta {
  const { hasHistory, doneToday, questionCount, focus } = input
  const minutes = `environ ${estimateMinutes(questionCount)} min`
  if (!hasHistory) {
    const size = focus?.kanaIds.length ?? 0
    return { label: 'Première session', detail: `${size} kana à découvrir · ${minutes}`, secondary: false }
  }
  if (doneToday) {
    const line = focus ? `Ligne ${groupGlyph(focus)} · ` : ''
    return { label: 'Encore une session', detail: `${line}${questionCount} questions`, secondary: true }
  }
  return { label: 'Session du jour', detail: `${questionCount} questions · ${minutes}`, secondary: false }
}

// ---------------------------------------------------------------------------
// Rappel de sauvegarde
// ---------------------------------------------------------------------------

const DAY_MS = 24 * 60 * 60 * 1000
/** Rappel quand la dernière sauvegarde (ou le début, sans sauvegarde) date de plus de… */
export const BACKUP_REMINDER_DAYS = 30
/** Rappel masqué : il ne revient pas avant… */
export const BACKUP_SNOOZE_DAYS = 7

/**
 * Message du rappel de sauvegarde, ou `null`. `firstAnswerAt` : plus ancienne réponse
 * de l'appareil (pas de rappel tant qu'il n'y a rien à perdre).
 */
export function backupReminder(input: {
  now: number
  firstAnswerAt: number | undefined
  lastBackupAt: number | null
  dismissedAt: number | null
}): string | null {
  const { now, firstAnswerAt, lastBackupAt, dismissedAt } = input
  if (firstAnswerAt === undefined) return null
  if (dismissedAt !== null && now - dismissedAt < BACKUP_SNOOZE_DAYS * DAY_MS) return null
  const since = lastBackupAt ?? firstAnswerAt
  const days = Math.floor((now - since) / DAY_MS)
  if (days < BACKUP_REMINDER_DAYS) return null
  return lastBackupAt === null
    ? 'Aucune sauvegarde de votre progression pour l’instant.'
    : `Dernière sauvegarde il y a ${days} jours.`
}
