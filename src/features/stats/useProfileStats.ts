import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo } from 'react'
import { loadProfileAnswers } from '@/db/answers'
import {
  computeStreak,
  dailyActivity,
  kanaStats,
  summarize,
  type DayActivity,
  type KanaStat,
  type Streak,
  type Summary,
} from '@/features/stats/stats'
import { useProfileStore } from '@/stores/profileStore'

export const ACTIVITY_DAYS = 14

export interface ProfileStats {
  summary: Summary
  streak: Streak
  perKana: Map<string, KanaStat>
  activity: DayActivity[]
}

/** Statistiques du profil actif (se mettent à jour en direct) ; `undefined` pendant le chargement. */
export function useProfileStats(): ProfileStats | undefined {
  const profileId = useProfileStore((s) => s.profileId)
  const answers = useLiveQuery(() => loadProfileAnswers(profileId), [profileId])

  return useMemo(() => {
    if (!answers) return undefined
    const now = Date.now()
    return {
      summary: summarize(answers),
      streak: computeStreak(answers, now),
      perKana: kanaStats(answers),
      activity: dailyActivity(answers, now, ACTIVITY_DAYS),
    }
  }, [answers])
}
