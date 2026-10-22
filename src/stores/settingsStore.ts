import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Theme = 'light' | 'dark' | 'system'

interface SettingsState {
  theme: Theme
  setTheme: (theme: Theme) => void
}

// Préférences d'interface : persistées en localStorage (lecture synchrone, utilisée
// par le script inline d'index.html pour éviter le flash de thème). La clé
// 'kana-settings' doit rester synchronisée avec ce script.
export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'system',
      setTheme: (theme) => set({ theme }),
    }),
    { name: 'kana-settings', version: 1 },
  ),
)
