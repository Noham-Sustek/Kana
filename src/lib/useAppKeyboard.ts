import { useSyncExternalStore } from 'react'
import { layoutForLanguages, type KeyboardLayout } from '@/lib/keyboard'
import { useSettingsStore } from '@/stores/settingsStore'

const COARSE = '(pointer: coarse)'

function subscribe(onChange: () => void) {
  const media = window.matchMedia(COARSE)
  media.addEventListener('change', onChange)
  return () => media.removeEventListener('change', onChange)
}
const isTouch = () => window.matchMedia(COARSE).matches

/** Disposition détectée d'après les langues du système. */
export function detectedLayout(): KeyboardLayout {
  return layoutForLanguages(typeof navigator === 'undefined' ? [] : (navigator.languages ?? [navigator.language]))
}

/** Clavier intégré à afficher sous les champs de réponse : réglage « Intégré » et écran tactile
 *  (avec un clavier physique, on tape directement). Renvoie la disposition, ou null. */
export function useAppKeyboard(): KeyboardLayout | null {
  const mode = useSettingsStore((s) => s.keyboard)
  const layout = useSettingsStore((s) => s.keyboardLayout)
  const touch = useSyncExternalStore(subscribe, isTouch, () => false)
  if (mode !== 'app' || !touch) return null
  return layout === 'auto' ? detectedLayout() : layout
}
