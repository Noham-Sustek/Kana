import { Link, useSearchParams } from 'react-router'
import { KANA_CELL_CLASS, KanaCellContent, KanaGrid } from '@/components/KanaGrid'
import { PageHeader } from '@/components/PageHeader'
import { ScriptToggle } from '@/components/ScriptToggle'
import type { GroupKind, Script } from '@/data/kana'

// Les yōon et katakana étendus s'écrivent avec des kana déjà travaillés seuls.
const WRITABLE_KINDS: GroupKind[] = ['gojuon', 'dakuten', 'handakuten']

export function WritingPage() {
  const [params, setParams] = useSearchParams()
  const script: Script = params.get('script') === 'katakana' ? 'katakana' : 'hiragana'

  return (
    <>
      <PageHeader
        title="Écriture"
        subtitle="Ordre des traits, tracé sur le modèle, puis de mémoire. Touchez un kana pour commencer."
      />
      <ScriptToggle value={script} onChange={(s) => setParams({ script: s }, { replace: true })} />
      <KanaGrid
        script={script}
        kinds={WRITABLE_KINDS}
        renderCell={(kana) => (
          <Link to={`/writing/${kana.id}`} className={`${KANA_CELL_CLASS} bg-white dark:bg-slate-900`}>
            <KanaCellContent kana={kana} />
          </Link>
        )}
      />
    </>
  )
}
