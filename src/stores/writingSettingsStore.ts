import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/** 1 : animation de l'ordre des traits ; 2 : tracé sur le modèle en transparence ; 3 : tracé sur canvas vide. */
export type WritingLevel = 1 | 2 | 3

interface WritingSettingsState {
  level: WritingLevel
  setLevel: (level: WritingLevel) => void
}

export const useWritingSettingsStore = create<WritingSettingsState>()(
  persist(
    (set) => ({
      level: 1,
      setLevel: (level) => set({ level }),
    }),
    { name: 'kana-writing-settings', version: 1 },
  ),
)
