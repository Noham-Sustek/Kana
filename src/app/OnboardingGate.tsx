import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { db } from '@/db/db'
import { useSettingsStore } from '@/stores/settingsStore'

/** Premier lancement : ouvre l'accueil « Bienvenue », sauf si l'appareil a déjà des réponses
 *  (application utilisée avant que l'indicateur existe, sans réglage enregistré). */
export function OnboardingGate() {
  const onboarded = useSettingsStore((s) => s.onboarded)
  const navigate = useNavigate()
  const { pathname } = useLocation()

  useEffect(() => {
    if (onboarded || pathname === '/bienvenue') return
    let cancelled = false
    db.answers
      .count()
      .then((count) => {
        if (cancelled) return
        if (count > 0) useSettingsStore.getState().setOnboarded()
        else navigate('/bienvenue', { replace: true })
      })
      .catch((err: unknown) => console.error(err))
    return () => {
      cancelled = true
    }
  }, [onboarded, pathname, navigate])

  return null
}
