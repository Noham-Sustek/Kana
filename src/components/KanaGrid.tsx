import type { ReactNode } from 'react'
import {
  GOJUON_COLUMNS,
  GROUP_KIND_LABELS,
  YOON_COLUMNS,
  getKana,
  groupsOfScript,
  type GroupKind,
  type Kana,
  type KanaGroup,
  type Script,
} from '@/data/kana'

const KIND_ORDER: GroupKind[] = ['gojuon', 'dakuten', 'handakuten', 'yoon', 'extended']

interface KanaGridProps {
  script: Script
  /** Contenu d'une case (lien, bouton à cocher…). */
  renderCell: (kana: Kana) => ReactNode
  /** Sections à afficher (toutes par défaut). */
  kinds?: readonly GroupKind[]
}

/** Tous les kana d'une écriture, en grilles gojūon par section. */
export function KanaGrid({ script, renderCell, kinds = KIND_ORDER }: KanaGridProps) {
  const groups = groupsOfScript(script)
  return (
    <>
      {KIND_ORDER.filter((kind) => kinds.includes(kind)).map((kind) => {
        const sectionGroups = groups.filter((g) => g.kind === kind)
        if (sectionGroups.length === 0) return null
        return <KanaSection key={kind} kind={kind} groups={sectionGroups} renderCell={renderCell} />
      })}
    </>
  )
}

interface KanaSectionProps {
  kind: GroupKind
  groups: KanaGroup[]
  renderCell: (kana: Kana) => ReactNode
}

function KanaSection({ kind, groups, renderCell }: KanaSectionProps) {
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
                <div key={id}>{renderCell(getKana(id)!)}</div>
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

/** Contenu standard d'une case : caractère + romaji. */
export function KanaCellContent({ kana }: { kana: Kana }) {
  return (
    <>
      <span className="font-jp text-2xl leading-none">{kana.char}</span>
      <span className="mt-1 text-[0.65rem] opacity-70">{kana.romaji[0]}</span>
    </>
  )
}

export const KANA_CELL_CLASS =
  'flex aspect-square w-full min-h-11 flex-col items-center justify-center rounded-xl shadow-sm transition-transform active:scale-95'
