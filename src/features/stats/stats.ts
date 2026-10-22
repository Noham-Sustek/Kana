// Statistiques calculées à partir de l'historique des réponses. Pur : l'heure
// courante est fournie par l'appelant, les jours sont ceux du fuseau local.

/** Ce dont les stats ont besoin d'une réponse (sous-ensemble d'AnswerRecord). */
export interface StatsAnswer {
  kanaId: string
  correct: boolean
  revealed: boolean
  responseMs: number
  answeredAt: number
}

/** Nombre de réponses récentes prises en compte pour le taux de réussite d'un kana. */
export const RECENT_WINDOW = 10
/** En dessous, un kana n'apparaît pas dans les plus ratés (pas assez de données). */
export const MIN_ATTEMPTS_FOR_MISSED = 3
/** Plafond d'un temps de réponse : au-delà, l'utilisateur a probablement quitté l'écran. */
export const MAX_RESPONSE_MS = 30_000

/** Jour local au format AAAA-MM-JJ. */
export function dayKey(ts: number): string {
  const d = new Date(ts)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

/** Jour précédent (calculé sur la date locale : robuste aux changements d'heure). */
function previousDay(ts: number): number {
  const d = new Date(ts)
  d.setDate(d.getDate() - 1)
  return d.getTime()
}

/**
 * Une question = une ou plusieurs lignes (stage 6 : une par kana du mot), toutes
 * enregistrées au même instant. On regroupe donc par horodatage.
 */
export function questionsOf<T extends StatsAnswer>(answers: readonly T[]): T[] {
  const seen = new Set<number>()
  return answers.filter((a) => (seen.has(a.answeredAt) ? false : (seen.add(a.answeredAt), true)))
}

export interface Streak {
  /** Jours consécutifs jusqu'à aujourd'hui (ou hier, si rien encore aujourd'hui). */
  current: number
  best: number
  /** Vrai si au moins une réponse aujourd'hui. */
  today: boolean
}

export function computeStreak(answers: readonly Pick<StatsAnswer, 'answeredAt'>[], now: number): Streak {
  const days = new Set(answers.map((a) => dayKey(a.answeredAt)))
  const today = days.has(dayKey(now))

  let current = 0
  let cursor = today ? now : previousDay(now)
  while (days.has(dayKey(cursor))) {
    current++
    cursor = previousDay(cursor)
  }

  let best = 0
  for (const day of days) {
    // Début de série uniquement : le jour précédent n'est pas actif.
    const ts = dayStart(day)
    if (days.has(dayKey(previousDay(ts)))) continue
    let length = 0
    let c = ts
    while (days.has(dayKey(c))) {
      length++
      const d = new Date(c)
      d.setDate(d.getDate() + 1)
      c = d.getTime()
    }
    best = Math.max(best, length)
  }

  return { current, best, today }
}

function dayStart(key: string): number {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y!, m! - 1, d!, 12).getTime()
}

export interface KanaStat {
  kanaId: string
  attempts: number
  correct: number
  /** Taux de réussite sur les RECENT_WINDOW dernières réponses, 0 à 1. */
  recentRate: number
}

/** Statistiques par kana (une réponse « Afficher la réponse » compte comme un échec). */
export function kanaStats(answers: readonly StatsAnswer[]): Map<string, KanaStat> {
  const byKana = new Map<string, StatsAnswer[]>()
  for (const a of answers) {
    const list = byKana.get(a.kanaId)
    if (list) list.push(a)
    else byKana.set(a.kanaId, [a])
  }

  const result = new Map<string, KanaStat>()
  for (const [kanaId, list] of byKana) {
    list.sort((a, b) => a.answeredAt - b.answeredAt)
    const recent = list.slice(-RECENT_WINDOW)
    result.set(kanaId, {
      kanaId,
      attempts: list.length,
      correct: list.filter((a) => a.correct).length,
      recentRate: recent.filter((a) => a.correct).length / recent.length,
    })
  }
  return result
}

/** Kana les plus ratés : taux récent le plus bas d'abord, puis le plus d'erreurs. */
export function mostMissed(stats: ReadonlyMap<string, KanaStat>, limit: number): KanaStat[] {
  return [...stats.values()]
    .filter((s) => s.attempts >= MIN_ATTEMPTS_FOR_MISSED && s.correct < s.attempts && s.recentRate < 1)
    .sort((a, b) => a.recentRate - b.recentRate || b.attempts - b.correct - (a.attempts - a.correct))
    .slice(0, limit)
}

export interface Summary {
  questions: number
  /** Part des questions réussies au premier essai, 0 à 1 (0 sans question). */
  successRate: number
  /** Temps moyen de réponse en ms (hors « Afficher la réponse »), `null` sans donnée. */
  averageResponseMs: number | null
}

export function summarize(answers: readonly StatsAnswer[]): Summary {
  const questions = questionsOf(answers)
  const timed = questions.filter((q) => !q.revealed)
  return {
    questions: questions.length,
    successRate: questions.length === 0 ? 0 : questions.filter((q) => q.correct).length / questions.length,
    averageResponseMs:
      timed.length === 0
        ? null
        : timed.reduce((sum, q) => sum + Math.min(q.responseMs, MAX_RESPONSE_MS), 0) / timed.length,
  }
}

export interface DayActivity {
  day: string
  questions: number
  correct: number
}

/** Activité des `days` derniers jours (le plus ancien en premier, aujourd'hui en dernier). */
export function dailyActivity(answers: readonly StatsAnswer[], now: number, days: number): DayActivity[] {
  const byDay = new Map<string, DayActivity>()
  let cursor = now
  for (let i = 0; i < days; i++) {
    const day = dayKey(cursor)
    byDay.set(day, { day, questions: 0, correct: 0 })
    cursor = previousDay(cursor)
  }
  for (const q of questionsOf(answers)) {
    const entry = byDay.get(dayKey(q.answeredAt))
    if (!entry) continue
    entry.questions++
    if (q.correct) entry.correct++
  }
  return [...byDay.values()].reverse()
}
