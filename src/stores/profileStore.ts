import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { DEFAULT_PROFILE_ID } from '@/db/db'

interface ProfileState {
  /** Profil actif sur cet appareil (id Dexie). */
  profileId: number
  setProfileId: (id: number) => void
}

export const useProfileStore = create<ProfileState>()(
  persist(
    (set) => ({
      profileId: DEFAULT_PROFILE_ID,
      setProfileId: (profileId) => set({ profileId }),
    }),
    { name: 'kana-profile', version: 1 },
  ),
)

/** Profil actif, pour le code hors composants (stores, accès Dexie). */
export function activeProfileId(): number {
  return useProfileStore.getState().profileId
}
