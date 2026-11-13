import { useSyncExternalStore } from 'react'

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

// Chrome n'émet `beforeinstallprompt` qu'une fois, tôt : on le capte dès le chargement
// du module (importé par main.tsx) pour pouvoir proposer l'installation dans Réglages.
let deferred: InstallPromptEvent | null = null
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((l) => l())

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferred = e as InstallPromptEvent
    notify()
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    notify()
  })
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Installation proposée par le navigateur, ou `null` (déjà installée, iPhone, navigateur sans support). */
export function useInstallPrompt(): (() => Promise<void>) | null {
  const available = useSyncExternalStore(subscribe, () => deferred !== null)
  if (!available) return null
  return async () => {
    const event = deferred
    if (!event) return
    await event.prompt()
    await event.userChoice
    deferred = null
    notify()
  }
}
