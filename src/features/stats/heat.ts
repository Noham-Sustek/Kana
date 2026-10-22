import type { KanaStat } from '@/features/stats/stats'

/** 0 : jamais vu ; 1 à 4 : taux de réussite récent croissant. */
export type HeatLevel = 0 | 1 | 2 | 3 | 4

/** Bornes basses des niveaux 2, 3 et 4. */
export const HEAT_THRESHOLDS = [0.5, 0.75, 0.9] as const

export function heatLevel(stat: KanaStat | undefined): HeatLevel {
  if (!stat) return 0
  const [mid, good, great] = HEAT_THRESHOLDS
  if (stat.recentRate >= great) return 4
  if (stat.recentRate >= good) return 3
  if (stat.recentRate >= mid) return 2
  return 1
}
