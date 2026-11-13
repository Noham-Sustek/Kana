import { HEAT_THRESHOLDS, type HeatLevel } from '@/features/stats/heat'

/** Heatmap : rampe d'une seule teinte (jamais rouge / vert, réservés au retour de réponse).
 *  Le niveau le plus faible porte en plus un contour pour se distinguer de « jamais vu ». */
export const HEAT_CLASSES: Record<HeatLevel, string> = {
  0: 'bg-paper-raised text-ink-muted',
  1: 'bg-heat-1 text-ink ring-1 ring-control ring-inset',
  2: 'bg-heat-2 text-ink',
  3: 'bg-heat-3 text-on-heat-3',
  4: 'bg-accent text-on-accent',
}

const pct = (r: number) => `${Math.round(r * 100)} %`
const [mid, good, great] = HEAT_THRESHOLDS

const ITEMS: { level: HeatLevel; label: string }[] = [
  { level: 0, label: 'Jamais vu' },
  { level: 1, label: `< ${pct(mid)}` },
  { level: 2, label: `${pct(mid)}–${pct(good)}` },
  { level: 3, label: `${pct(good)}–${pct(great)}` },
  { level: 4, label: `≥ ${pct(great)}` },
]

/** Légende de la heatmap : réussite sur les dernières réponses de chaque kana. */
export function HeatmapLegend() {
  return (
    <ul className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5 text-xs text-ink-muted">
      {ITEMS.map(({ level, label }) => (
        <li key={level} className="flex items-center gap-1.5">
          <span className={`size-3.5 rounded ${HEAT_CLASSES[level]}`} />
          {label}
        </li>
      ))}
    </ul>
  )
}
