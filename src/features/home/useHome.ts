import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo } from 'react'
import type { Script } from '@/data/kana'
import { loadProfileAnswers } from '@/db/answers'
import { loadAnswersForScript, loadUnlockedGroups } from '@/db/autoState'
import { pathView, streakView, type PathView, type StreakView } from '@/features/home/home'
import { createAutoContext } from '@/features/quiz/auto'
import type { StageId } from '@/features/quiz/types'
import { computeStreak, kanaStats, mostMissed, type KanaStat } from '@/features/stats/stats'
import { useProfileStore } from '@/stores/profileStore'

/** Kana « à consolider » montrés sur l'Accueil (une rangée). */
const WEAK_LIMIT = 5

export interface HomeData {
  streak: StreakView
  doneToday: boolean
  hasHistory: boolean
  firstAnswerAt: number | undefined
  path: PathView
  weak: KanaStat[]
}

/** Données de l'Accueil pour le profil actif (en direct) ; `undefined` pendant le chargement. */
export function useHome(script: Script, stages: StageId[]): HomeData | undefined {
  const profileId = useProfileStore((s) => s.profileId)
  const data = useLiveQuery(
    async () => ({
      all: await loadProfileAnswers(profileId),
      scriptHistory: await loadAnswersForScript(profileId, script),
      unlocked: await loadUnlockedGroups(profileId, script),
    }),
    [profileId, script],
  )

  const stagesKey = stages.join(',')
  return useMemo(() => {
    if (!data) return undefined
    const now = Date.now()
    const streak = computeStreak(data.all, now)
    const ctx = createAutoContext(script, stages, data.scriptHistory, data.unlocked)
    const hasHistory = data.all.length > 0
    return {
      streak: streakView(data.all, streak, now),
      doneToday: streak.today,
      hasHistory,
      firstAnswerAt: data.all.reduce<number | undefined>((min, a) => (min === undefined || a.answeredAt < min ? a.answeredAt : min), undefined),
      path: pathView(ctx.path, ctx.unlocked, ctx.progress, stages, hasHistory),
      weak: mostMissed(kanaStats(data.all), WEAK_LIMIT),
    }
    // Clé texte plutôt que le tableau, recréé à chaque rendu par l'appelant.
  }, [data, script, stagesKey])
}
