import { useNavigate, useSearchParams } from 'react-router'
import { Button } from '@/components/Button'
import { KanaGrid } from '@/components/KanaGrid'
import { HEAT_TILE, KanaTile } from '@/components/KanaTile'
import { SegmentedControl } from '@/components/SegmentedControl'
import { ReloadGuide } from '@/components/reload/ReloadGuide'
import { ReloadKanaLines } from '@/components/reload/ReloadKanaLines'
import { ReloadLR } from '@/components/reload/ReloadLR'
import { groupGlyph, type Script } from '@/data/kana'
import { useKanaProgress } from '@/features/kana/useKanaProgress'
import { HEAT_THRESHOLDS, heatLevel, type HeatLevel } from '@/features/stats/heat'
import { WRITABLE_KINDS, nextLineToTrace } from '@/features/writing/progress'
import { useUiStyle } from '@/lib/useUiStyle'

type Lens = 'lecture' | 'ecriture'
/** Style Reload : vue par lignes (défaut) ou tableau. */
type View = 'lignes' | 'tableau'

const SCRIPT_OPTIONS: { value: Script; label: string }[] = [
  { value: 'hiragana', label: 'Hiragana' },
  { value: 'katakana', label: 'Katakana' },
]

const LENS_OPTIONS: { value: Lens; label: string }[] = [
  { value: 'lecture', label: 'Lecture' },
  { value: 'ecriture', label: 'Écriture' },
]

const pct = (r: number) => Math.round(r * 100)
const [mid, good, great] = HEAT_THRESHOLDS

const HEAT_LEGEND: { level: HeatLevel; label: string }[] = [
  { level: 0, label: 'jamais vu' },
  { level: 1, label: `< ${pct(mid)} %` },
  { level: 2, label: `${pct(mid)}–${pct(good)}` },
  { level: 3, label: `${pct(good)}–${pct(great)}` },
  { level: 4, label: `≥ ${pct(great)} %` },
]

const WRITING_LEGEND: { level: 0 | 1 | 2; label: string }[] = [
  { level: 0, label: 'jamais tracé' },
  { level: 1, label: 'calque réussi' },
  { level: 2, label: 'de mémoire' },
]

const WRITING_LABELS = ['jamais tracé', 'calque réussi', 'réussi de mémoire'] as const

/** Onglet Kana : une grille, deux lentilles. Lecture (réussite récente) → fiche du kana,
 *  Écriture (calque, de mémoire) → exercice de tracé. État dans l'URL (`?script=katakana&lens=ecriture`). */
export function KanaPage() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const script: Script = params.get('script') === 'katakana' ? 'katakana' : 'hiragana'
  const lens: Lens = params.get('lens') === 'ecriture' ? 'ecriture' : 'lecture'
  const reload = useUiStyle() === 'reload'
  // La lentille Écriture (ancienne adresse /writing) ouvre directement le tableau.
  const view: View = params.get('view') === 'tableau' || params.get('lens') === 'ecriture' ? 'tableau' : 'lignes'
  const progress = useKanaProgress()
  const line = lens === 'ecriture' && progress ? nextLineToTrace(script, progress.writing) : null

  const update = (next: { script?: Script; lens?: Lens; view?: View }) => {
    const p: Record<string, string> = { script: next.script ?? script }
    if ((next.lens ?? lens) === 'ecriture') p.lens = 'ecriture'
    if (reload && (next.view ?? view) === 'tableau') p.view = 'tableau'
    setParams(p, { replace: true })
  }

  return (
    <div className={`relative flex flex-col ${reload ? 'flex-1' : ''}`}>
      <h1 className="sr-only">Kana</h1>
      {reload && (
        <>
          <span aria-hidden="true" className="rl-ghost -top-5 -left-6 text-[96px]">
            {script === 'katakana' ? 'KATAKANA' : 'HIRAGANA'}
          </span>
          <div className="relative z-10 mt-[58px] flex items-center justify-between">
            <ReloadLR
              side="L"
              label={script === 'katakana' ? 'Passer aux hiragana' : 'Passer aux katakana'}
              onClick={() => update({ script: script === 'katakana' ? 'hiragana' : 'katakana' })}
            />
            <div role="tablist" aria-label="Affichage" className="flex h-[34px] bg-[#05081f] p-0.5 [clip-path:polygon(6%_0,100%_0,94%_100%,0_100%)]">
              {(['lignes', 'tableau'] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  role="tab"
                  aria-selected={view === v}
                  data-tap-sound="tabSwitch"
                  onClick={() => update({ view: v, lens: v === 'lignes' ? 'lecture' : lens })}
                  className={`rl-cond min-w-[88px] text-[16px] font-bold [clip-path:polygon(8%_0,100%_0,92%_100%,0_100%)] ${
                    view === v ? 'bg-white text-[#05081f]' : 'text-[#7fe9ff]'
                  }`}
                >
                  {v === 'lignes' ? 'Lignes' : 'Tableau'}
                </button>
              ))}
            </div>
            <ReloadLR
              side="R"
              label={script === 'katakana' ? 'Passer aux hiragana' : 'Passer aux katakana'}
              onClick={() => update({ script: script === 'katakana' ? 'hiragana' : 'katakana' })}
            />
          </div>
        </>
      )}
      {reload && view === 'lignes' ? (
        <ReloadKanaLines key={script} script={script} progress={progress} />
      ) : (
        <>
      <div className={`grid gap-2 ${reload ? 'relative mt-3' : ''}`}>
        {!reload && (
          <SegmentedControl label="Écriture" options={SCRIPT_OPTIONS} value={script} onChange={(s) => update({ script: s })} />
        )}
        <SegmentedControl label="Lentille" options={LENS_OPTIONS} value={lens} onChange={(l) => update({ lens: l })} />
      </div>

      <ul className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5 text-[12.5px] leading-4 text-ink-muted">
        {lens === 'lecture'
          ? HEAT_LEGEND.map(({ level, label }) => (
              <li key={level} className="flex items-center gap-1.5">
                <span className={`relative size-4 overflow-hidden rounded-[3px] border-[1.5px] ${HEAT_TILE[level]}`}>
                  {level === 1 && (
                    <span className="absolute bottom-0 left-0 border-[3px] border-ink border-t-transparent border-r-transparent" />
                  )}
                </span>
                {label}
              </li>
            ))
          : WRITING_LEGEND.map(({ level, label }) => (
              <li key={level} className="flex items-center gap-1.5">
                <span className="relative size-4 rounded-[3px] border border-control bg-paper-raised">
                  {level > 0 && (
                    <span
                      className={`absolute right-0.5 bottom-0.5 size-[7px] rounded-[1px] border-[1.5px] border-accent ${level === 2 ? 'bg-accent' : ''}`}
                    />
                  )}
                </span>
                {label}
              </li>
            ))}
      </ul>

      <KanaGrid
        script={script}
        kinds={lens === 'ecriture' ? WRITABLE_KINDS : undefined}
        renderCell={(kana) => {
          const romaji = kana.romaji[0]
          if (lens === 'ecriture') {
            const level = progress?.writing.get(kana.id) ?? 0
            return (
              <KanaTile
                kana={kana.char}
                writing={level}
                label={`${kana.char}, ${romaji}, ${WRITING_LABELS[level]}`}
                onClick={() => navigate(`/writing/${kana.id}`)}
                className="w-full text-2xl!"
              />
            )
          }
          const stat = progress?.perKana.get(kana.id)
          const heat = progress ? heatLevel(stat) : undefined
          return (
            <KanaTile
              kana={kana.char}
              heat={heat}
              label={`${kana.char}, ${romaji}${stat ? `, réussite ${pct(stat.recentRate)} %${heat === 1 ? ', à revoir' : ''}` : ', jamais vu'}`}
              onClick={() => navigate(`/kana/${kana.id}`)}
              className="w-full text-2xl!"
            />
          )
        }}
      />

      {line && !reload && (
        <div className="sticky -bottom-4 z-10 -mx-4 mt-4 bg-paper px-4 pt-3 pb-5">
          <Button
            icon="arrow"
            detail={`${line.kanaIds.length} kana à la suite · environ ${line.minutes} min`}
            onClick={() => navigate(`/writing/${line.kanaIds[0]}`)}
          >
            Tracer la ligne <span className="font-jp">{groupGlyph(line.group)}</span>
          </Button>
        </div>
      )}
      {reload && (
        <ReloadGuide
          title={lens === 'ecriture' ? 'Quel kana voulez-vous tracer\u00a0?' : 'Quel kana voulez-vous ouvrir\u00a0?'}
          actions={[
            { label: 'Retour', kind: 'back', to: '/home', keyHint: 'Échap' },
            ...(line
              ? [
                  {
                    label: <>Tracer la ligne <span className="font-jp not-italic">{groupGlyph(line.group)}</span></>,
                    kind: 'primary' as const,
                    to: `/writing/${line.kanaIds[0]}`,
                  },
                ]
              : []),
          ]}
        />
      )}
        </>
      )}
    </div>
  )
}
