import achievement from '@/assets/sounds/deck_ui_achievement_toast.mp3'
import bumper from '@/assets/sounds/deck_ui_bumper_end_02.mp3'
import activation from '@/assets/sounds/deck_ui_default_activation.mp3'
import hideModal from '@/assets/sounds/deck_ui_hide_modal.mp3'
import intoDetail from '@/assets/sounds/deck_ui_into_game_detail.mp3'
import launch from '@/assets/sounds/deck_ui_launch_game.mp3'
import misc from '@/assets/sounds/deck_ui_misc_10.mp3'
import navigation from '@/assets/sounds/deck_ui_navigation.mp3'
import outOfDetail from '@/assets/sounds/deck_ui_out_of_game_detail.mp3'
import showModal from '@/assets/sounds/deck_ui_show_modal.mp3'
import flyIn from '@/assets/sounds/deck_ui_side_menu_fly_in.mp3'
import flyOut from '@/assets/sounds/deck_ui_side_menu_fly_out.mp3'
import sliderDown from '@/assets/sounds/deck_ui_slider_down.mp3'
import sliderUp from '@/assets/sounds/deck_ui_slider_up.mp3'
import toggleOff from '@/assets/sounds/deck_ui_switch_toggle_off.mp3'
import toggleOn from '@/assets/sounds/deck_ui_switch_toggle_on.mp3'
import tabTransition from '@/assets/sounds/deck_ui_tab_transition_01.mp3'
import toast from '@/assets/sounds/deck_ui_toast.mp3'
import volume from '@/assets/sounds/deck_ui_volume.mp3'
import type { SoundKind } from '@/lib/sound'

/** Échantillon de chaque son du style Reload (fichiers embarqués, précachés : aucun accès réseau). */
export const RELOAD_SAMPLES: Record<SoundKind, string> = {
  tap: navigation,
  select: navigation,
  tapTab: tabTransition,
  tabSwitch: tabTransition,
  prev: sliderDown,
  next: sliderUp,
  tapBack: outOfDetail,
  backward: outOfDetail,
  forward: intoDetail,
  tapPrimary: activation,
  launch,
  key: volume,
  strokeOk: volume,
  chipOn: toggleOn,
  chipOff: toggleOff,
  toggle: toggleOn,
  open: showModal,
  close: hideModal,
  panelIn: flyIn,
  panelOut: flyOut,
  correct: toast,
  wrong: bumper,
  timeout: misc,
  unlock: achievement,
  record: achievement,
}

/** Volume relatif : les sons longs (glissements, fanfares) restent en retrait des touchers. */
const GAIN: Partial<Record<SoundKind, number>> = {
  forward: 0.45,
  backward: 0.45,
  tapBack: 0.45,
  panelIn: 0.5,
  panelOut: 0.5,
  unlock: 0.7,
  record: 0.7,
  key: 0.5,
}

let ctx: AudioContext | null = null
const buffers = new Map<string, Promise<AudioBuffer | null>>()

function context(): AudioContext | null {
  if (typeof window === 'undefined' || typeof window.AudioContext !== 'function') return null
  ctx ??= new AudioContext()
  // Créé ou suspendu hors d'un geste : reprend au premier son déclenché par un toucher.
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

function load(c: AudioContext, url: string): Promise<AudioBuffer | null> {
  let p = buffers.get(url)
  if (!p) {
    p = fetch(url)
      .then((r) => r.arrayBuffer())
      .then((data) => c.decodeAudioData(data))
      .catch(() => null)
    buffers.set(url, p)
  }
  return p
}

/** Décode tous les échantillons d'avance (au premier son), pour que les suivants partent sans délai. */
function preload(c: AudioContext) {
  for (const url of new Set(Object.values(RELOAD_SAMPLES))) void load(c, url)
}

/** Joue l'échantillon d'un son, transposé de `rate` (1 = hauteur d'origine). */
export function playSample(kind: SoundKind, rate = 1) {
  const c = context()
  if (!c) return
  if (buffers.size === 0) preload(c)
  void load(c, RELOAD_SAMPLES[kind]).then((buffer) => {
    if (!buffer) return
    const src = c.createBufferSource()
    src.buffer = buffer
    src.playbackRate.value = rate
    const gain = c.createGain()
    gain.gain.value = 0.55 * (GAIN[kind] ?? 1)
    src.connect(gain).connect(c.destination)
    src.start()
  })
}
