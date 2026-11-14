import type { HapticKind } from '@/lib/haptic'
import { useSettingsStore } from '@/stores/settingsStore'

/** Une note synthétisée : départ (s, depuis le début du son), fréquence (Hz, glissant vers `to`
 *  si donnée), durée (s), forme d'onde et volume relatif. */
export interface Note {
  at: number
  freq: number
  to?: number
  dur: number
  wave?: OscillatorType
  gain?: number
}

export type SoundKind = HapticKind | 'tap'

/** Sons du style Wii : courts, doux, aigus et ronds (sinusoïdes, triangles). Aucun fichier :
 *  tout est synthétisé par Web Audio, donc hors ligne et sans asset. Cf. docs/design/animations.md. */
export const SOUNDS: Record<SoundKind, readonly Note[]> = {
  // Bulle qui éclate : petit glissando vers l'aigu.
  tap: [{ at: 0, freq: 620, to: 1180, dur: 0.06, gain: 0.5 }],
  toggle: [
    { at: 0, freq: 880, dur: 0.07, gain: 0.6 },
    { at: 0.06, freq: 1320, dur: 0.09, gain: 0.6 },
  ],
  // Deux notes qui montent (mi, la), avec une octave légère en triangle.
  correct: [
    { at: 0, freq: 1318.5, dur: 0.11 },
    { at: 0.085, freq: 1760, dur: 0.2 },
    { at: 0.085, freq: 3520, dur: 0.14, wave: 'triangle', gain: 0.18 },
  ],
  // Deux notes graves qui descendent, sans dureté.
  wrong: [
    { at: 0, freq: 392, dur: 0.12, wave: 'triangle', gain: 0.8 },
    { at: 0.11, freq: 293.7, dur: 0.22, wave: 'triangle', gain: 0.8 },
  ],
  strokeOk: [{ at: 0, freq: 1568, dur: 0.06, gain: 0.45 }],
  // Arpège do-mi-sol-do puis éclat.
  unlock: [
    { at: 0, freq: 1046.5, dur: 0.1 },
    { at: 0.08, freq: 1318.5, dur: 0.1 },
    { at: 0.16, freq: 1568, dur: 0.1 },
    { at: 0.24, freq: 2093, dur: 0.32 },
    { at: 0.24, freq: 4186, dur: 0.22, wave: 'triangle', gain: 0.15 },
  ],
  record: [
    { at: 0, freq: 1568, dur: 0.09 },
    { at: 0.07, freq: 2093, dur: 0.24 },
  ],
  timeout: [{ at: 0, freq: 660, to: 330, dur: 0.28, wave: 'triangle', gain: 0.7 }],
}

const MASTER = 0.22

let ctx: AudioContext | null = null

function audio(): AudioContext | null {
  if (typeof window === 'undefined' || typeof window.AudioContext !== 'function') return null
  ctx ??= new AudioContext()
  // Créé ou suspendu hors d'un geste : reprend au premier son déclenché par un toucher.
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

/** Les sons sont-ils actifs (style Wii et réglage Sons) ? */
export function soundsEnabled(): boolean {
  const { ui, sounds } = useSettingsStore.getState()
  return ui === 'wii' && sounds
}

/** Joue un son du style Wii si le réglage le permet. Rien ne doit en dépendre. */
export function playSound(kind: SoundKind) {
  if (!soundsEnabled()) return
  try {
    const ac = audio()
    if (!ac) return
    const t0 = ac.currentTime + 0.005
    for (const n of SOUNDS[kind]) {
      const osc = ac.createOscillator()
      const env = ac.createGain()
      osc.type = n.wave ?? 'sine'
      const start = t0 + n.at
      const end = start + n.dur
      osc.frequency.setValueAtTime(n.freq, start)
      if (n.to) osc.frequency.exponentialRampToValueAtTime(n.to, end)
      // Attaque de 5 ms puis décroissance exponentielle : pas de clic.
      const peak = MASTER * (n.gain ?? 1)
      env.gain.setValueAtTime(0.0001, start)
      env.gain.exponentialRampToValueAtTime(peak, start + 0.005)
      env.gain.exponentialRampToValueAtTime(0.0001, end)
      osc.connect(env).connect(ac.destination)
      osc.start(start)
      osc.stop(end + 0.02)
    }
  } catch {
    // Audio indisponible (WebView restreinte…) : silence.
  }
}

/** Contrôles qui font « bulle » au toucher. Les réponses (Choice, étiquettes, cases d'un tracé)
 *  ont leur propre son de résultat : pas de son de toucher en plus. */
const TAP_TARGETS = '.k-btn, .k-iconbtn, .k-card, .k-chip, .k-tab, .k-seg__opt, [role="switch"], button.k-tile, [data-tap-sound]'

/** Son de toucher sur les contrôles (écoute globale, installée une fois par l'application). */
export function installTapSounds(): () => void {
  const onDown = (e: PointerEvent) => {
    if (!soundsEnabled() || !(e.target instanceof Element)) return
    const el = e.target.closest(TAP_TARGETS)
    if (el && !(el as HTMLButtonElement).disabled) playSound('tap')
  }
  document.addEventListener('pointerdown', onDown, { passive: true })
  return () => document.removeEventListener('pointerdown', onDown)
}
