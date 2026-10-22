import { useCallback, useEffect, useState } from 'react'

export interface KanaAudio {
  /** Vrai si un son peut être joué sur cet appareil. */
  available: boolean
  /** Prononce un texte en kana. */
  play: (text: string) => void
}

// Point d'entrée unique pour l'audio des kana. Implémentation provisoire en
// attendant les fichiers audio embarqués (roadmap étape 5) : synthèse vocale de
// l'appareil, disponible seulement si une voix japonaise est installée (sur
// Android, la voix japonaise de Google TTS fonctionne hors ligne une fois téléchargée).
export function useKanaAudio(): KanaAudio {
  const voice = useJapaneseVoice()

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

  return { available: voice !== null, play }
}

function findJapaneseVoice(): SpeechSynthesisVoice | null {
  if (typeof speechSynthesis === 'undefined') return null
  const voices = speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith('ja'))
  return voices.find((v) => v.localService) ?? voices[0] ?? null
}

function useJapaneseVoice(): SpeechSynthesisVoice | null {
  const [voice, setVoice] = useState(findJapaneseVoice)

  useEffect(() => {
    if (typeof speechSynthesis === 'undefined') return
    // Les voix se chargent de façon asynchrone sur Chrome.
    const update = () => setVoice(findJapaneseVoice())
    speechSynthesis.addEventListener('voiceschanged', update)
    return () => speechSynthesis.removeEventListener('voiceschanged', update)
  }, [])

  return voice
}
