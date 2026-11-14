import { useEffect } from 'react'
import { Capacitor, SystemBars, SystemBarsStyle } from '@capacitor/core'
import { useSettingsStore } from '@/stores/settingsStore'

const DARK_QUERY = '(prefers-color-scheme: dark)'

/** Fond de la barre d'état (meta theme-color) selon le style et le thème. */
const THEME_COLORS = {
  papier: { light: '#f5f0e6', dark: '#000000' },
  wii: { light: '#ffffff', dark: '#0e1a26' },
} as const

/** Synchronise la classe .dark, l'attribut data-ui (style) de <html> et la meta theme-color avec les réglages. */
export function useApplyTheme() {
  const theme = useSettingsStore((s) => s.theme)
  const ui = useSettingsStore((s) => s.ui)

  useEffect(() => {
    const media = window.matchMedia(DARK_QUERY)
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && media.matches)
      document.documentElement.classList.toggle('dark', dark)
      document.documentElement.dataset.ui = ui
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute('content', THEME_COLORS[ui][dark ? 'dark' : 'light'])
      // Application Android : icônes de la barre d'état lisibles sur le fond du thème choisi.
      if (Capacitor.isNativePlatform()) {
        void SystemBars.setStyle({ style: dark ? SystemBarsStyle.Dark : SystemBarsStyle.Light })
      }
    }
    apply()
    if (theme !== 'system') return
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [theme, ui])
}
