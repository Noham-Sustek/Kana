import type { HapticKind } from '@/lib/haptic'
import { playSample } from '@/lib/reloadSound'
import { useSettingsStore } from '@/stores/settingsStore'

/** Timbres synthétisés, dans l'esprit des menus Wii (aucun échantillon : tout est calculé,
 *  hors ligne). bell : clochette FM (modulateur ×3,5) à longue queue · marimba : lame de bois FM
 *  (×4) brève · bubble : sinusoïde qui glisse (bulle qui éclate) · soft : triangle feutré. */
export type Instrument = 'bell' | 'marimba' | 'bubble' | 'soft'

/** Une note : départ (s), fréquence (Hz, glissant vers `to` si donnée), durée (s), timbre, volume relatif. */
export interface Note {
  at: number
  freq: number
  to?: number
  dur: number
  inst?: Instrument
  gain?: number
}

export type SoundKind =
  | HapticKind
  | 'tap'
  | 'tapTab'
  | 'tapBack'
  | 'tapPrimary'
  | 'chipOn'
  | 'chipOff'
  | 'open'
  | 'close'
  // Style Reload : déplacement dans un menu, lancement d'une session, entrée / sortie d'écran,
  // panneau latéral, changement d'onglet (L / R).
  | 'select'
  | 'launch'
  | 'forward'
  | 'backward'
  | 'panelIn'
  | 'panelOut'
  | 'tabSwitch'
  | 'prev'
  | 'next'

// Gamme pentatonique (do majeur) : toutes les notes vont ensemble, le hasard reste mélodieux.
const PENTA = [0, 2, 4, 7, 9]
const C6 = 1046.5
/** Fréquence du degré `step` de la pentatonique à partir de `base` (degrés négatifs acceptés). */
export function penta(step: number, base = C6): number {
  const octave = Math.floor(step / PENTA.length)
  const degree = PENTA[((step % PENTA.length) + PENTA.length) % PENTA.length]!
  return base * 2 ** (octave + degree / 12)
}

const n = (at: number, freq: number, dur: number, inst: Instrument = 'bell', gain = 1, to?: number): Note => ({
  at,
  freq,
  dur,
  inst,
  gain,
  ...(to ? { to } : {}),
})

/** Variantes de chaque son (une est tirée au hasard à chaque fois). Cf. docs/design/animations.md. */
export const SOUNDS: Record<SoundKind, readonly (readonly Note[])[]> = {
  // Toucher générique : une bulle (la hauteur est tirée dans la pentatonique, cf. playSound).
  tap: [[n(0, C6, 0.07, 'bubble', 0.55, C6 * 1.5)]],
  // Onglet : deux lames de marimba.
  tapTab: [
    [n(0, penta(2), 0.09, 'marimba', 0.8), n(0.055, penta(4), 0.12, 'marimba', 0.7)],
    [n(0, penta(1), 0.09, 'marimba', 0.8), n(0.055, penta(3), 0.12, 'marimba', 0.7)],
  ],
  // Touche du clavier intégré : clic de marimba très bref (hauteur au hasard, cf. playSound).
  key: [[n(0, penta(3), 0.035, 'marimba', 0.35)]],
  // Retour, fermer : bulle qui redescend.
  tapBack: [[n(0, penta(3), 0.09, 'bubble', 0.5, penta(-2))]],
  // Action principale : petit accord de clochettes.
  tapPrimary: [
    [n(0, penta(0), 0.2, 'bell', 0.55), n(0.04, penta(2), 0.22, 'bell', 0.5), n(0.08, penta(5), 0.26, 'bell', 0.45)],
    [n(0, penta(1), 0.2, 'bell', 0.55), n(0.04, penta(3), 0.22, 'bell', 0.5), n(0.08, penta(5), 0.26, 'bell', 0.45)],
  ],
  chipOn: [[n(0, penta(2), 0.07, 'marimba', 0.7), n(0.05, penta(5), 0.12, 'marimba', 0.7)]],
  chipOff: [[n(0, penta(5), 0.07, 'marimba', 0.6), n(0.05, penta(2), 0.1, 'marimba', 0.55)]],
  toggle: [[n(0, penta(3), 0.08, 'bell', 0.6), n(0.06, penta(6), 0.18, 'bell', 0.6)]],
  // Feuille ou fenêtre qui s'ouvre : souffle qui monte ; qui se ferme : qui descend.
  open: [[n(0, 520, 0.16, 'bubble', 0.35, 1400), n(0.08, penta(5), 0.22, 'bell', 0.3)]],
  close: [[n(0, 1200, 0.14, 'bubble', 0.3, 480)]],
  // Juste : trois motifs ascendants (transposés vers l'aigu à chaque bonne réponse d'affilée).
  correct: [
    [n(0, penta(2), 0.14), n(0.08, penta(4), 0.16), n(0.16, penta(7), 0.4)],
    [n(0, penta(4), 0.12), n(0.07, penta(5), 0.14), n(0.14, penta(7), 0.4)],
    [n(0, penta(0), 0.12), n(0.07, penta(4), 0.14), n(0.14, penta(5), 0.16), n(0.2, penta(7), 0.4)],
  ],
  // Pas encore : deux notes graves et rondes qui descendent, sans dureté.
  wrong: [
    [n(0, 392, 0.14, 'soft', 0.8), n(0.13, 311.1, 0.26, 'soft', 0.8)],
    [n(0, 349.2, 0.12, 'soft', 0.8), n(0.11, 293.7, 0.28, 'soft', 0.8)],
  ],
  // Trait validé : une goutte de marimba (de plus en plus aiguë au fil des traits, cf. playSound).
  strokeOk: [[n(0, penta(0), 0.1, 'marimba', 0.6)]],
  // Ligne débloquée : arpège de clochettes et pluie d'étincelles.
  unlock: [
    [
      n(0, penta(0), 0.16),
      n(0.09, penta(2), 0.16),
      n(0.18, penta(4), 0.16),
      n(0.27, penta(5), 0.18),
      n(0.36, penta(7), 0.6),
      n(0.42, penta(10), 0.3, 'bell', 0.35),
      n(0.5, penta(12), 0.3, 'bell', 0.3),
      n(0.58, penta(11), 0.3, 'bell', 0.25),
    ],
  ],
  record: [[n(0, penta(4), 0.14), n(0.08, penta(7), 0.14), n(0.16, penta(9), 0.14), n(0.24, penta(12), 0.45)]],
  timeout: [[n(0, 700, 0.32, 'soft', 0.7, 330)]],
  // Sons propres au style Reload (échantillons, cf. reloadSound.ts) : équivalents synthétisés en Wii.
  select: [[n(0, C6, 0.07, 'bubble', 0.55, C6 * 1.5)]],
  launch: [[n(0, penta(0), 0.1, 'marimba', 0.8), n(0.07, penta(2), 0.1, 'marimba', 0.8), n(0.14, penta(5), 0.22)]],
  forward: [[n(0, 520, 0.18, 'soft', 0.5, 1040)]],
  backward: [[n(0, 1040, 0.18, 'soft', 0.5, 520)]],
  panelIn: [[n(0, 520, 0.18, 'soft', 0.5, 1040)]],
  panelOut: [[n(0, 1040, 0.18, 'soft', 0.5, 520)]],
  tabSwitch: [[n(0, penta(2), 0.09, 'marimba', 0.8), n(0.055, penta(4), 0.12, 'marimba', 0.7)]],
  prev: [[n(0, penta(3), 0.08, 'marimba', 0.7), n(0.05, penta(1), 0.1, 'marimba', 0.6)]],
  next: [[n(0, penta(1), 0.08, 'marimba', 0.7), n(0.05, penta(3), 0.1, 'marimba', 0.6)]],
}

const MASTER = 0.2

interface Engine {
  ctx: AudioContext
  out: GainNode
}

let engine: Engine | null = null

/** Contexte audio et chaîne de sortie : sortie directe + écho feutré (le « halo » des menus Wii). */
function audio(): Engine | null {
  if (typeof window === 'undefined' || typeof window.AudioContext !== 'function') return null
  if (!engine) {
    const ctx = new AudioContext()
    const out = ctx.createGain()
    out.gain.value = MASTER
    out.connect(ctx.destination)
    const send = ctx.createGain()
    send.gain.value = 0.22
    const delay = ctx.createDelay(1)
    delay.delayTime.value = 0.13
    const feedback = ctx.createGain()
    feedback.gain.value = 0.3
    const tone = ctx.createBiquadFilter()
    tone.type = 'lowpass'
    tone.frequency.value = 2600
    out.connect(send).connect(delay).connect(tone).connect(feedback).connect(delay)
    tone.connect(ctx.destination)
    engine = { ctx, out }
  }
  // Créé ou suspendu hors d'un geste : reprend au premier son déclenché par un toucher.
  if (engine.ctx.state === 'suspended') void engine.ctx.resume()
  return engine
}

/** Joue une note sur la chaîne de sortie. */
function voice({ ctx, out }: Engine, note: Note, t0: number, ratio: number) {
  const start = t0 + note.at
  const freq = note.freq * ratio
  const inst = note.inst ?? 'bell'
  // Les clochettes résonnent plus longtemps que leur durée nominale.
  const tail = inst === 'bell' ? note.dur * 1.8 : note.dur
  const end = start + tail
  const peak = note.gain ?? 1

  const env = ctx.createGain()
  env.gain.setValueAtTime(0.0001, start)
  env.gain.exponentialRampToValueAtTime(peak, start + (inst === 'soft' ? 0.012 : 0.004))
  env.gain.exponentialRampToValueAtTime(0.0001, end)

  const carrier = ctx.createOscillator()
  carrier.type = inst === 'soft' ? 'triangle' : 'sine'
  carrier.frequency.setValueAtTime(freq, start)
  if (note.to) carrier.frequency.exponentialRampToValueAtTime(note.to * ratio, start + note.dur)

  let last: AudioNode = carrier
  if (inst === 'bell' || inst === 'marimba') {
    // Synthèse FM : le modulateur donne le timbre métallique (cloche) ou boisé (marimba), puis s'éteint.
    const mod = ctx.createOscillator()
    const depth = ctx.createGain()
    mod.frequency.value = freq * (inst === 'bell' ? 3.5 : 4)
    depth.gain.setValueAtTime(freq * (inst === 'bell' ? 1.6 : 1.1), start)
    depth.gain.exponentialRampToValueAtTime(freq * 0.02, start + (inst === 'bell' ? tail * 0.6 : 0.05))
    mod.connect(depth).connect(carrier.frequency)
    mod.start(start)
    mod.stop(end + 0.02)
  }
  if (inst === 'soft') {
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 1400
    carrier.connect(filter)
    last = filter
  }
  last.connect(env).connect(out)
  carrier.start(start)
  carrier.stop(end + 0.02)
}

/** Les sons sont-ils actifs (style Wii ou Reload, et réglage Sons) ? */
export function soundsEnabled(): boolean {
  const { ui, sounds } = useSettingsStore.getState()
  return (ui === 'wii' || ui === 'reload') && sounds
}

// Séries : chaque bonne réponse d'affilée (moins de 20 s d'écart) monte d'un degré, jusqu'à 7 ;
// chaque trait validé d'un même kana aussi. Une erreur remet la série à zéro.
const streak = { correct: 0, correctAt: 0, stroke: 0, strokeAt: 0 }

/** Transposition (rapport de fréquences) d'un son selon sa série et un léger hasard. */
function ratioFor(kind: SoundKind, now: number): number {
  if (kind === 'correct') {
    streak.correct = now - streak.correctAt < 20_000 ? Math.min(streak.correct + 1, 7) : 0
    streak.correctAt = now
    return penta(streak.correct, 1)
  }
  if (kind === 'wrong') streak.correct = 0
  if (kind === 'strokeOk') {
    streak.stroke = now - streak.strokeAt < 4000 ? Math.min(streak.stroke + 1, 9) : 0
    streak.strokeAt = now
    return penta(streak.stroke, 1)
  }
  // Toucher : une note au hasard de la pentatonique, jamais deux fois tout à fait la même.
  if (kind === 'tap' || kind === 'key') return penta(Math.floor(Math.random() * 6) - 1, 1)
  return 1
}

/** Joue un son du style Wii si le réglage le permet. Rien ne doit en dépendre. */
let lastPlayedAt = 0

/** Un son vient-il d'être joué (moins de `ms`) ? Évite de doubler un retour déjà sonorisé au toucher. */
export function playedWithin(ms: number): boolean {
  return Date.now() - lastPlayedAt < ms
}

export function playSound(kind: SoundKind) {
  if (!soundsEnabled()) return
  lastPlayedAt = Date.now()
  try {
    if (useSettingsStore.getState().ui === 'reload') {
      // Échantillons : la série de bonnes réponses (ou de traits) monte d'un demi-ton à chaque fois.
      const ratio = ratioFor(kind, Date.now())
      playSample(kind, kind === 'correct' || kind === 'strokeOk' ? Math.min(ratio, 1.5) ** 0.5 : 1)
      return
    }
    const e = audio()
    if (!e) return
    const variants = SOUNDS[kind]
    const notes = variants[Math.floor(Math.random() * variants.length)] ?? variants[0]!
    const ratio = ratioFor(kind, Date.now())
    const t0 = e.ctx.currentTime + 0.005
    for (const note of notes) voice(e, note, t0, ratio)
  } catch {
    // Audio indisponible (WebView restreinte…) : silence.
  }
}

/** Son de toucher d'un élément, ou null. Les réponses (Choice, étiquettes, tracé) ont leur propre son
 *  de résultat ; les liens et contrôles hors design system restent muets. */
export function tapSoundFor(el: Element): SoundKind | null {
  return tapKind(el.closest('.k-btn, .k-iconbtn, .k-card, .k-chip, .k-tab, .k-seg__opt, [role="switch"], button.k-tile, [data-tap-sound]'))
}

/** Ce qui compte d'un contrôle touché pour choisir son son (sous-ensemble d'Element, testable). */
export interface TapTarget {
  classList: { contains(name: string): boolean }
  getAttribute(name: string): string | null
  disabled?: boolean
}

/** Son du contrôle trouvé par tapSoundFor (pur). */
export function tapKind(target: TapTarget | null): SoundKind | null {
  if (!target || target.disabled) return null
  // Son explicite (menus du style Reload) : data-tap-sound="select", "launch"…
  const explicit = target.getAttribute('data-tap-sound')
  if (explicit && explicit in SOUNDS) return explicit as SoundKind
  if (target.classList.contains('k-tab')) return 'tapTab'
  if (target.classList.contains('k-chip')) return target.getAttribute('aria-pressed') === 'true' ? 'chipOff' : 'chipOn'
  if (target.classList.contains('k-btn--primary')) return 'tapPrimary'
  if (target.classList.contains('k-iconbtn')) {
    const label = target.getAttribute('aria-label') ?? ''
    if (/retour|fermer|quitter|masquer|précédent/i.test(label)) return 'tapBack'
  }
  if (target.getAttribute('role') === 'switch') return target.getAttribute('aria-checked') === 'true' ? 'chipOff' : 'chipOn'
  return 'tap'
}

/** Son de toucher sur les contrôles (écoute globale, installée une fois par l'application). */
export function installTapSounds(): () => void {
  const onDown = (e: PointerEvent) => {
    if (!soundsEnabled() || !(e.target instanceof Element)) return
    const kind = tapSoundFor(e.target)
    if (kind) playSound(kind)
  }
  document.addEventListener('pointerdown', onDown, { passive: true })
  return () => document.removeEventListener('pointerdown', onDown)
}
