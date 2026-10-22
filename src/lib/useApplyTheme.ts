import { useEffect } from 'react'
import { useSettingsStore } from '@/stores/settingsStore'

const DARK_QUERY = '(prefers-color-scheme: dark)'

/** Synchronise la classe .dark de <html> et la meta theme-color avec le réglage de thème. */
export function useApplyTheme() {
  const theme = useSettingsStore((s) => s.theme)

  useEffect(() => {
    const media = window.matchMedia(DARK_QUERY)
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && media.matches)
      document.documentElement.classList.toggle('dark', dark)
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute('content', dark ? '#0f172a' : '#f8fafc')
    }
    apply()
    if (theme !== 'system') return
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [theme])
}
