import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Theme = 'light' | 'dark' | 'system'

interface SettingsState {
  theme: Theme
  /** Retour haptique (Android ; sans effet sur iPhone). */
  vibrations: boolean
  /** Dernier export de la sauvegarde (rappel sur l'Accueil). */
  lastBackupAt: number | null
  /** Rappel de sauvegarde masqué à cette date. */
  backupReminderDismissedAt: number | null
  setTheme: (theme: Theme) => void
  setVibrations: (vibrations: boolean) => void
  markBackedUp: (at: number) => void
  dismissBackupReminder: (at: number) => void
}

// Préférences d'interface : persistées en localStorage (lecture synchrone, utilisée
// par le script inline d'index.html pour éviter le flash de thème). La clé
// 'kana-settings' doit rester synchronisée avec ce script.
export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'system',
      vibrations: true,
      lastBackupAt: null,
      backupReminderDismissedAt: null,
      setTheme: (theme) => set({ theme }),
      setVibrations: (vibrations) => set({ vibrations }),
      markBackedUp: (at) => set({ lastBackupAt: at }),
      dismissBackupReminder: (at) => set({ backupReminderDismissedAt: at }),
    }),
    { name: 'kana-settings', version: 1 },
  ),
)
