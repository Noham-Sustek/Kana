import { useEffect, useRef } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Profile } from '@/db/db'
import { computeStreak } from '@/features/stats/stats'
import { useProfileStore } from '@/stores/profileStore'

const NO_PROFILES: Profile[] = []

export function useProfiles(): Profile[] {
  return useLiveQuery(() => db.profiles.orderBy('id').toArray(), [], NO_PROFILES)
}

const NO_STREAKS = new Map<number, number>()

/** Série en cours de chaque profil (jours consécutifs avec au moins une réponse). */
export function useProfileStreaks(): Map<number, number> {
  return useLiveQuery(
    async () => {
      const profiles = await db.profiles.toArray()
      const now = Date.now()
      const entries = await Promise.all(
        profiles.map(async (p) => {
          const keys = await db.answers
            .where('[profileId+answeredAt]')
            .between([p.id, -Infinity], [p.id, Infinity])
            .keys()
          const answers = keys.map((k) => ({ answeredAt: (k as unknown as [number, number])[1] }))
          return [p.id, computeStreak(answers, now).current] as const
        }),
      )
      return new Map(entries)
    },
    [],
    NO_STREAKS,
  )
}

/** Profil actif ; `undefined` pendant le chargement. */
export function useActiveProfile(): Profile | undefined {
  const profileId = useProfileStore((s) => s.profileId)
  return useLiveQuery(() => db.profiles.get(profileId), [profileId])
}

/**
 * Au démarrage, ramène le profil actif sur un profil existant (préférence
 * orpheline). Vérification unique : pendant un import, la liste lue en direct
 * peut être périmée et écraser le profil restauré.
 */
export function useEnsureActiveProfile() {
  const checked = useRef(false)

  useEffect(() => {
    if (checked.current) return
    checked.current = true
    const { profileId, setProfileId } = useProfileStore.getState()
    db.profiles
      .orderBy('id')
      .toArray()
      .then((profiles) => {
        const first = profiles[0]
        if (first && !profiles.some((p) => p.id === profileId)) setProfileId(first.id)
      })
      .catch((err: unknown) => console.error(err))
  }, [])
}
