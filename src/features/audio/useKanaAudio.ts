import { useCallback, useSyncExternalStore } from 'react'

/**
 * `checking` : liste des voix pas encore chargée ; `missing` : aucune voix japonaise ;
 * `unsupported` : pas de synthèse vocale dans ce navigateur.
 */
export type VoiceStatus = 'checking' | 'ready' | 'missing' | 'unsupported'

export interface KanaAudio {
  /** Vrai si un son peut être joué sur cet appareil. */
  available: boolean
  status: VoiceStatus
  /** Nom de la voix utilisée, pour l'affichage. */
  voiceName: string | null
  /** Prononce un texte en kana. */
  play: (text: string) => void
}

// Point d'entrée unique pour l'audio des kana : synthèse vocale de l'appareil
// (Web Speech API). Aucune requête réseau : une voix japonaise doit être installée
// (Google ou Samsung TTS, fonctionnent hors ligne une fois les données téléchargées).

/** Délai au-delà duquel une liste de voix vide signifie « aucune voix ». */
const VOICES_TIMEOUT_MS = 2500

interface VoiceState {
  status: VoiceStatus
  voice: SpeechSynthesisVoice | null
}

let state: VoiceState = { status: 'checking', voice: null }
const listeners = new Set<() => void>()
let initialized = false

function findJapaneseVoice(): SpeechSynthesisVoice | null {
  // Android rapporte parfois « ja_JP » au lieu de « ja-JP ».
  const voices = speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().replace('_', '-').startsWith('ja'))
  return voices.find((v) => v.localService) ?? voices[0] ?? null
}

function setState(next: VoiceState) {
  if (next.status === state.status && next.voice === state.voice) return
  state = next
  for (const l of listeners) l()
}

function refresh(final: boolean) {
  const voice = findJapaneseVoice()
  if (voice) setState({ status: 'ready', voice })
  // Liste encore vide : on ne conclut qu'après le délai (chargement asynchrone).
  else if (final || speechSynthesis.getVoices().length > 0) setState({ status: 'missing', voice: null })
}

function init() {
  if (initialized) return
  initialized = true
  if (typeof speechSynthesis === 'undefined') {
    state = { status: 'unsupported', voice: null }
    return
  }
  refresh(false)
  speechSynthesis.addEventListener('voiceschanged', () => refresh(false))
  setTimeout(() => {
    if (state.status === 'checking') refresh(true)
  }, VOICES_TIMEOUT_MS)
  // Une voix installée pendant que l'app est en arrière-plan apparaît au retour.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && state.status !== 'checking') refresh(true)
  })
}

function subscribe(listener: () => void) {
  init()
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot(): VoiceState {
  init()
  return state
}

/** Relance la détection (bouton « Vérifier à nouveau »). */
export function recheckVoices() {
  if (typeof speechSynthesis === 'undefined') return
  setState({ status: 'checking', voice: null })
  speechSynthesis.getVoices()
  setTimeout(() => refresh(true), 500)
}

export function useKanaAudio(): KanaAudio {
  const { status, voice } = useSyncExternalStore(subscribe, getSnapshot)

  const play = useCallback(
    (text: string) => {
      if (!voice) return
      speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.voice = voice
      utterance.lang = voice.lang
      utterance.rate = 0.8
      speechSynthesis.speak(utterance)
    },
    [voice],
  )

  return { available: voice !== null, status, voiceName: voice?.name ?? null, play }
}
