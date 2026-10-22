import { useEffect, useRef } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Profile } from '@/db/db'
import { useProfileStore } from '@/stores/profileStore'

const NO_PROFILES: Profile[] = []

export function useProfiles(): Profile[] {
  return useLiveQuery(() => db.profiles.orderBy('id').toArray(), [], NO_PROFILES)
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
