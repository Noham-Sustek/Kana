import { Link, useSearchParams } from 'react-router'
import { HEAT_CLASSES, HeatmapLegend } from '@/components/HeatmapLegend'
import { KANA_CELL_CLASS, KanaCellContent, KanaGrid } from '@/components/KanaGrid'
import { PageHeader } from '@/components/PageHeader'
import { ScriptToggle } from '@/components/ScriptToggle'
import { SegmentedControl } from '@/components/SegmentedControl'
import { Switch } from '@/components/Switch'
import type { GroupKind, Script } from '@/data/kana'
import { heatLevel } from '@/features/stats/heat'
import { useProfileStats } from '@/features/stats/useProfileStats'

type Lens = 'lecture' | 'ecriture'

const LENS_OPTIONS: { value: Lens; label: string }[] = [
  { value: 'lecture', label: 'Lecture' },
  { value: 'ecriture', label: 'Écriture' },
]

// Les yōon et katakana étendus s'écrivent avec des kana déjà travaillés seuls.
const WRITABLE_KINDS: GroupKind[] = ['gojuon', 'dakuten', 'handakuten']

/** Onglet Kana : une grille, deux lentilles. Lecture → fiche du kana (heatmap facultative),
 *  Écriture → exercice de tracé. État dans l'URL (`?script=katakana&lens=ecriture&heat=1`). */
export function KanaPage() {
  const [params, setParams] = useSearchParams()
  const script: Script = params.get('script') === 'katakana' ? 'katakana' : 'hiragana'
  const lens: Lens = params.get('lens') === 'ecriture' ? 'ecriture' : 'lecture'
  const heat = params.get('heat') === '1'
  const stats = useProfileStats()

  const update = (next: { script?: Script; lens?: Lens; heat?: boolean }) => {
    const p: Record<string, string> = { script: next.script ?? script }
    if ((next.lens ?? lens) === 'ecriture') p.lens = 'ecriture'
    if (next.heat ?? heat) p.heat = '1'
    setParams(p, { replace: true })
  }

  return (
    <>
      <PageHeader
        title="Kana"
        subtitle={
          lens === 'lecture'
            ? 'Touchez un kana pour voir sa fiche.'
            : 'Touchez un kana pour vous entraîner à l’écrire : ordre des traits, calque, puis de mémoire.'
        }
      />
      <div className="grid gap-2">
        <ScriptToggle value={script} onChange={(s) => update({ script: s })} />
        <SegmentedControl label="Lentille" options={LENS_OPTIONS} value={lens} onChange={(l) => update({ lens: l })} />
      </div>

      {lens === 'lecture' && (
        <>
          <div className="mt-2">
            <Switch
              label="Colorer selon ma réussite"
              description="Taux de réussite sur les 10 dernières réponses de chaque kana."
              checked={heat}
              onChange={(h) => update({ heat: h })}
            />
          </div>
          {heat && <HeatmapLegend />}
        </>
      )}

      <KanaGrid
        script={script}
        kinds={lens === 'ecriture' ? WRITABLE_KINDS : undefined}
        renderCell={(kana) => (
          <Link
            to={lens === 'ecriture' ? `/writing/${kana.id}` : `/kana/${kana.id}`}
            className={`${KANA_CELL_CLASS} ${
              lens === 'lecture' && heat ? HEAT_CLASSES[heatLevel(stats?.perKana.get(kana.id))] : 'bg-paper-raised'
            }`}
          >
            <KanaCellContent kana={kana} />
          </Link>
        )}
      />
    </>
  )
}
