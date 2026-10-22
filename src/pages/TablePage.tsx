import { Link, useSearchParams } from 'react-router'
import { PageHeader } from '@/components/PageHeader'
import { ScriptToggle } from '@/components/ScriptToggle'
import {
  GOJUON_COLUMNS,
  GROUP_KIND_LABELS,
  YOON_COLUMNS,
  getKana,
  groupsOfScript,
  type GroupKind,
  type KanaGroup,
  type Script,
} from '@/data/kana'

const KIND_ORDER: GroupKind[] = ['gojuon', 'dakuten', 'handakuten', 'yoon', 'extended']

export function TablePage() {
  const [params, setParams] = useSearchParams()
  const script: Script = params.get('script') === 'katakana' ? 'katakana' : 'hiragana'
  const groups = groupsOfScript(script)

  return (
    <>
      <PageHeader title="Tableau" subtitle="Touchez un kana pour le voir en détail." />
      <ScriptToggle value={script} onChange={(s) => setParams({ script: s }, { replace: true })} />

      {KIND_ORDER.map((kind) => {
        const sectionGroups = groups.filter((g) => g.kind === kind)
        if (sectionGroups.length === 0) return null
        return <KanaSection key={kind} kind={kind} groups={sectionGroups} />
      })}
    </>
  )
}

interface KanaSectionProps {
  kind: GroupKind
  groups: KanaGroup[]
}

function KanaSection({ kind, groups }: KanaSectionProps) {
  const columns = kind === 'yoon' ? YOON_COLUMNS : GOJUON_COLUMNS
  const gridCols = kind === 'yoon' ? 'grid-cols-[2.5rem_repeat(3,1fr)]' : 'grid-cols-[2.5rem_repeat(5,1fr)]'

  return (
    <section className="mt-6">
      <h2 className="mb-2 text-sm font-semibold text-slate-500 dark:text-slate-400">
        {GROUP_KIND_LABELS[kind]}
      </h2>
      <div className={`grid ${gridCols} gap-1.5`}>
        <span />
        {columns.map((col) => (
          <span key={col} className="text-center text-xs text-slate-400 dark:text-slate-500">
            {col}
          </span>
        ))}
        {groups.flatMap((group) =>
          group.rows.map((row, rowIndex) => [
            <span
              key={`${group.id}-${rowIndex}-label`}
              className="self-center text-xs text-slate-400 dark:text-slate-500"
            >
              {rowIndex === 0 ? group.label : ''}
            </span>,
            ...row.map((id, colIndex) =>
              id ? (
                <KanaCell key={id} id={id} />
              ) : (
                <span key={`${group.id}-${rowIndex}-${colIndex}`} />
              ),
            ),
          ]),
        )}
      </div>
    </section>
  )
}

function KanaCell({ id }: { id: string }) {
  const kana = getKana(id)!
  return (
    <Link
      to={`/table/${id}`}
      className="flex aspect-square min-h-11 flex-col items-center justify-center rounded-xl bg-white shadow-sm transition-transform active:scale-95 dark:bg-slate-900"
    >
      <span className="font-jp text-2xl leading-none">{kana.char}</span>
      <span className="mt-1 text-[0.65rem] text-slate-500 dark:text-slate-400">{kana.romaji[0]}</span>
    </Link>
  )
}
