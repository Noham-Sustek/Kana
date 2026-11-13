import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo } from 'react'
import type { AnswerRecord } from '@/db/db'
import { loadProfileAnswers } from '@/db/answers'
import { loadWritingResults } from '@/db/writing'
import { kanaStats, type KanaStat } from '@/features/stats/stats'
import { writingLevels } from '@/features/writing/progress'
import { useProfileStore } from '@/stores/profileStore'

export interface KanaProgress {
  answers: AnswerRecord[]
  /** Lentille Lecture : réussite récente par kana. */
  perKana: Map<string, KanaStat>
  /** Lentille Écriture : niveau atteint par kana (absent = jamais tracé). */
  writing: Map<string, 1 | 2>
}

/** Progression du profil actif, kana par kana (en direct) ; `undefined` pendant le chargement. */
export function useKanaProgress(): KanaProgress | undefined {
  const profileId = useProfileStore((s) => s.profileId)
  const data = useLiveQuery(
    async () => ({ answers: await loadProfileAnswers(profileId), results: await loadWritingResults(profileId) }),
    [profileId],
  )
  return useMemo(() => {
    if (!data) return undefined
    return {
      answers: data.answers,
      perKana: kanaStats(data.answers),
      writing: writingLevels(data.results, data.answers),
    }
  }, [data])
}
