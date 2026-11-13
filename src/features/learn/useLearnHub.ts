import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo } from 'react'
import type { KanaGroup, Script } from '@/data/kana'
import { loadProfileAnswers } from '@/db/answers'
import { buildProgress } from '@/engine/scheduler'
import { useHome } from '@/features/home/useHome'
import { reviewSelection, type ReviewSelection } from '@/features/learn/learn'
import { AUTO_STAGES } from '@/features/quiz/auto'
import { useProfileStore } from '@/stores/profileStore'

export interface LearnHub {
  review: ReviewSelection
  /** Ligne en cours du parcours (écriture enchaînée), s'il en reste une. */
  focus: KanaGroup | undefined
}

/** Données des cartes de S'entraîner pour le profil actif ; `undefined` pendant le chargement. */
export function useLearnHub(script: Script): LearnHub | undefined {
  const profileId = useProfileStore((s) => s.profileId)
  const home = useHome(script, AUTO_STAGES)
  const answers = useLiveQuery(() => loadProfileAnswers(profileId), [profileId])
  const review = useMemo(
    () => (answers ? reviewSelection(buildProgress(answers), AUTO_STAGES, Date.now()) : undefined),
    [answers],
  )
  if (!home || !review) return undefined
  return { review, focus: home.path.focus }
}
