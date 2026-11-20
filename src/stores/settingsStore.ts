import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Theme = 'light' | 'dark' | 'system'
/** Habillage de l'interface : « Reload » (par défaut : menus de jeu de rôle, mer bleue), « Papier et encre »
 *  ou « Wii » (rond, brillant, flottant). */
export type UiStyle = 'reload' | 'papier' | 'wii'
/** Saisie du romaji : clavier intégré à l'application (écrans tactiles) ou clavier du système. */
export type KeyboardMode = 'app' | 'system'
/** Disposition du clavier intégré ; `auto` = d'après la langue du système. */
export type KeyboardLayoutSetting = 'auto' | 'azerty' | 'qwerty' | 'qwertz'

interface SettingsState {
  theme: Theme
  ui: UiStyle
  /** Retour haptique (Android ; sans effet sur iPhone). */
  vibrations: boolean
  /** Sons de l'interface et des réponses (styles Wii et Reload). */
  sounds: boolean
  keyboard: KeyboardMode
  keyboardLayout: KeyboardLayoutSetting
  /** Dernier export de la sauvegarde (rappel sur l'Accueil). */
  lastBackupAt: number | null
  /** Rappel de sauvegarde masqué à cette date. */
  backupReminderDismissedAt: number | null
  /** Accueil du premier lancement vu (ou passé). */
  onboarded: boolean
  setTheme: (theme: Theme) => void
  setUi: (ui: UiStyle) => void
  setVibrations: (vibrations: boolean) => void
  setSounds: (sounds: boolean) => void
  setKeyboard: (keyboard: KeyboardMode) => void
  setKeyboardLayout: (keyboardLayout: KeyboardLayoutSetting) => void
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
      ui: 'reload',
      vibrations: true,
      sounds: true,
      keyboard: 'app',
      keyboardLayout: 'auto',
      lastBackupAt: null,
      backupReminderDismissedAt: null,
      onboarded: false,
      setTheme: (theme) => set({ theme }),
      setUi: (ui) => set({ ui }),
      setVibrations: (vibrations) => set({ vibrations }),
      setSounds: (sounds) => set({ sounds }),
      setKeyboard: (keyboard) => set({ keyboard }),
      setKeyboardLayout: (keyboardLayout) => set({ keyboardLayout }),
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
