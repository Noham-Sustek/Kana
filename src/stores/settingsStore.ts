import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Theme = 'light' | 'dark' | 'system'
/** Habillage de l'interface : « Papier et encre » (par défaut) ou « Wii » (rond, brillant, flottant). */
export type UiStyle = 'papier' | 'wii'

interface SettingsState {
  theme: Theme
  ui: UiStyle
  /** Retour haptique (Android ; sans effet sur iPhone). */
  vibrations: boolean
  /** Dernier export de la sauvegarde (rappel sur l'Accueil). */
  lastBackupAt: number | null
  /** Rappel de sauvegarde masqué à cette date. */
  backupReminderDismissedAt: number | null
  /** Accueil du premier lancement vu (ou passé). */
  onboarded: boolean
  setTheme: (theme: Theme) => void
  setUi: (ui: UiStyle) => void
  setVibrations: (vibrations: boolean) => void
  markBackedUp: (at: number) => void
  dismissBackupReminder: (at: number) => void
  setOnboarded: () => void
}

// Préférences d'interface : persistées en localStorage (lecture synchrone, utilisée
// par le script inline d'index.html pour éviter le flash de thème). La clé
// 'kana-settings' doit rester synchronisée avec ce script.
export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'system',
      ui: 'papier',
      vibrations: true,
      lastBackupAt: null,
      backupReminderDismissedAt: null,
      onboarded: false,
      setTheme: (theme) => set({ theme }),
      setUi: (ui) => set({ ui }),
      setVibrations: (vibrations) => set({ vibrations }),
      markBackedUp: (at) => set({ lastBackupAt: at }),
      dismissBackupReminder: (at) => set({ backupReminderDismissedAt: at }),
      setOnboarded: () => set({ onboarded: true }),
    }),
    {
      name: 'kana-settings',
      version: 2,
      // Réglages déjà enregistrés = application déjà utilisée : pas d'accueil du premier lancement.
      migrate: (state, version) => (version < 2 ? { ...(state as object), onboarded: true } : state) as SettingsState,
    },
  ),
)
