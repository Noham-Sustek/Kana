import { Link, useSearchParams } from 'react-router'
import { HEAT_CLASSES, HeatmapLegend } from '@/components/HeatmapLegend'
import { KANA_CELL_CLASS, KanaCellContent, KanaGrid } from '@/components/KanaGrid'
import { PageHeader } from '@/components/PageHeader'
import { ScriptToggle } from '@/components/ScriptToggle'
import { Switch } from '@/components/Switch'
import type { Script } from '@/data/kana'
import { heatLevel } from '@/features/stats/heat'
import { useProfileStats } from '@/features/stats/useProfileStats'

export function TablePage() {
  const [params, setParams] = useSearchParams()
  const script: Script = params.get('script') === 'katakana' ? 'katakana' : 'hiragana'
  const heat = params.get('heat') === '1'
  const stats = useProfileStats()

  const update = (next: { script?: Script; heat?: boolean }) => {
    const s = next.script ?? script
    const h = next.heat ?? heat
    setParams(h ? { script: s, heat: '1' } : { script: s }, { replace: true })
  }

  return (
    <>
      <PageHeader title="Tableau" subtitle="Touchez un kana pour le voir en détail." />
      <ScriptToggle value={script} onChange={(s) => update({ script: s })} />
      <div className="mt-2">
        <Switch
          label="Colorer selon ma réussite"
          description="Taux de réussite sur les 10 dernières réponses de chaque kana."
          checked={heat}
          onChange={(h) => update({ heat: h })}
        />
      </div>
      {heat && <HeatmapLegend />}
      <KanaGrid
        script={script}
        renderCell={(kana) => (
          <Link
            to={`/table/${kana.id}`}
            className={`${KANA_CELL_CLASS} ${heat ? HEAT_CLASSES[heatLevel(stats?.perKana.get(kana.id))] : 'bg-white dark:bg-slate-900'}`}
          >
            <KanaCellContent kana={kana} />
          </Link>
        )}
      />
    </>
  )
}
