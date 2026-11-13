import { useLocation } from 'react-router'

/** Écran d'où la session a été lancée (Accueil ou S'entraîner), où revenir en la quittant. */
export function useQuizOrigin(): string {
  const state: unknown = useLocation().state
  return state && typeof state === 'object' && 'from' in state && typeof state.from === 'string' ? state.from : '/learn'
}
