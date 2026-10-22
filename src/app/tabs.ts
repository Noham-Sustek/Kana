import type { IconName } from '@/components/Icon'

export interface Tab {
  path: string
  label: string
  icon: IconName
}

export const TABS: Tab[] = [
  { path: '/learn', label: 'Apprendre', icon: 'learn' },
  { path: '/table', label: 'Tableau', icon: 'table' },
  { path: '/writing', label: 'Écriture', icon: 'writing' },
  { path: '/stats', label: 'Stats', icon: 'stats' },
  { path: '/settings', label: 'Réglages', icon: 'settings' },
]
