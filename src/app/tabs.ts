import type { IconName } from '@/components/Icon'

export interface Tab {
  path: string
  label: string
  /** Icône, ou caractère (onglet Kana : あ en Klee One). */
  icon: IconName | { glyph: string }
  /** Autres préfixes de route qui rendent l'onglet actif (sous-écrans). */
  matches?: string[]
}

export const TABS: Tab[] = [
  { path: '/home', label: 'Accueil', icon: 'home' },
  { path: '/learn', label: 'S’entraîner', icon: 'target' },
  { path: '/kana', label: 'Kana', icon: { glyph: 'あ' }, matches: ['/writing'] },
  { path: '/progress', label: 'Progrès', icon: 'stats' },
]

export function isTabActive(tab: Tab, pathname: string) {
  return [tab.path, ...(tab.matches ?? [])].some((p) => pathname === p || pathname.startsWith(`${p}/`))
}
