import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ChronoDuration, ChronoScript } from '@/features/chrono/chrono'

interface ChronoSettingsState {
  duration: ChronoDuration
  script: ChronoScript
  /** Meilleur score (kana/min) par `profil:écriture:durée`. */
  best: Record<string, number>
  setDuration: (duration: ChronoDuration) => void
  setScript: (script: ChronoScript) => void
  /** Enregistre un score ; vrai si c'est un nouveau record. */
  recordScore: (key: string, kanaPerMinute: number) => boolean
}

export const bestScoreKey = (profileId: number, script: ChronoScript, duration: ChronoDuration) =>
  `${profileId}:${script}:${duration}`

export const useChronoSettingsStore = create<ChronoSettingsState>()(
  persist(
    (set, get) => ({
      duration: 60,
      script: 'hiragana',
      best: {},
      setDuration: (duration) => set({ duration }),
      setScript: (script) => set({ script }),
      recordScore: (key, kanaPerMinute) => {
        const previous = get().best[key] ?? 0
        if (kanaPerMinute <= previous) return false
        set({ best: { ...get().best, [key]: kanaPerMinute } })
        return true
      },
    }),
    { name: 'kana-chrono-settings', version: 1 },
  ),
)
