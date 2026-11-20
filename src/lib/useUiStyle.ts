import { useSettingsStore, type UiStyle } from '@/stores/settingsStore'

/** Style d'interface actif (Réglages → Apparence → Style). */
export function useUiStyle(): UiStyle {
  return useSettingsStore((s) => s.ui)
}
