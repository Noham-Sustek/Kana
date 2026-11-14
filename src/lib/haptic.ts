import { playSound } from '@/lib/sound'
import { useSettingsStore } from '@/stores/settingsStore'

/** Motifs de vibration (ms, alternance vibration / pause), cf. docs/design/animations.md. */
export const HAPTIC = {
  correct: [10],
  wrong: [30, 40, 30],
  strokeOk: [8],
  unlock: [20, 60, 20, 60, 40],
  record: [20],
  timeout: [40],
  toggle: [15],
} as const satisfies Record<string, readonly number[]>

export type HapticKind = keyof typeof HAPTIC

/** Retour d'un moment clé : vibration si l'appareil le permet (Android) et si le réglage
 *  Vibrations est actif, et son du style Wii (`playSound`, réglage Sons).
 *  Rien ne doit en dépendre : iPhone n'a pas `navigator.vibrate`. */
export function haptic(kind: HapticKind) {
  playSound(kind)
  if (!useSettingsStore.getState().vibrations) return
  if (typeof navigator === 'undefined' || !('vibrate' in navigator)) return
  try {
    navigator.vibrate([...HAPTIC[kind]])
  } catch {
    // Certains navigateurs refusent sans geste récent de l'utilisateur.
  }
}
