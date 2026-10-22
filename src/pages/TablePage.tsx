import { Link, useSearchParams } from 'react-router'
import { KANA_CELL_CLASS, KanaCellContent, KanaGrid } from '@/components/KanaGrid'
import { PageHeader } from '@/components/PageHeader'
import { ScriptToggle } from '@/components/ScriptToggle'
import type { Script } from '@/data/kana'

export function TablePage() {
  const [params, setParams] = useSearchParams()
  const script: Script = params.get('script') === 'katakana' ? 'katakana' : 'hiragana'

  return (
    <>
      <PageHeader title="Tableau" subtitle="Touchez un kana pour le voir en détail." />
      <ScriptToggle value={script} onChange={(s) => setParams({ script: s }, { replace: true })} />
      <KanaGrid
        script={script}
        renderCell={(kana) => (
          <Link to={`/table/${kana.id}`} className={`${KANA_CELL_CLASS} bg-white dark:bg-slate-900`}>
            <KanaCellContent kana={kana} />
          </Link>
        )}
      />
    </>
  )
}
