import { HEAT_THRESHOLDS, type HeatLevel } from '@/features/stats/heat'

/** Couleurs de la heatmap, identiques dans les deux thèmes (comme les couleurs de correction). */
export const HEAT_CLASSES: Record<HeatLevel, string> = {
  0: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
  1: 'bg-red-600 text-white',
  2: 'bg-orange-500 text-white',
  3: 'bg-amber-400 text-slate-900',
  4: 'bg-emerald-600 text-white',
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
    <ul className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5 text-xs text-slate-500 dark:text-slate-400">
      {ITEMS.map(({ level, label }) => (
        <li key={level} className="flex items-center gap-1.5">
          <span className={`size-3.5 rounded ${HEAT_CLASSES[level]}`} />
          {label}
        </li>
      ))}
    </ul>
  )
}
