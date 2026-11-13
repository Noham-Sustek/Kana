import { useSettingsStore } from '@/stores/settingsStore'

/** Motifs de vibration (ms, alternance vibration / pause), cf. docs/design/animations.md. */
export const HAPTIC = {
  correct: [10],
  wrong: [30, 40, 30],
  strokeOk: [8],
  unlock: [20, 60, 20, 60, 40],
  record: [20],
  timeout: [40],
} as const satisfies Record<string, readonly number[]>

export type HapticKind = keyof typeof HAPTIC

/** Vibre si l'appareil le permet (Android) et si le réglage Vibrations est actif.
 *  Rien ne doit en dépendre : iPhone n'a pas `navigator.vibrate`. */
export function haptic(kind: HapticKind) {
  if (!useSettingsStore.getState().vibrations) return
  if (typeof navigator === 'undefined' || !('vibrate' in navigator)) return
  try {
    navigator.vibrate([...HAPTIC[kind]])
  } catch {
    // Certains navigateurs refusent sans geste récent de l'utilisateur.
  }
}
