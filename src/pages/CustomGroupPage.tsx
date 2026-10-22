import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { Icon } from '@/components/Icon'
import { KANA_CELL_CLASS, KanaCellContent, KanaGrid } from '@/components/KanaGrid'
import { ScriptToggle } from '@/components/ScriptToggle'
import { KANA, getKana, type Script } from '@/data/kana'
import { db, type CustomGroup } from '@/db/db'
import { deleteCustomGroup, saveCustomGroup } from '@/db/customGroups'
import { useQuizSettingsStore } from '@/stores/quizSettingsStore'

/** Création (`/learn/custom/new[?kana=h-a,h-i]`) ou modification (`/learn/custom/:id`) d'une liste. */
export function CustomGroupPage() {
  const { groupId } = useParams()
  const id = groupId === undefined ? undefined : Number(groupId)
  // undefined = chargement en cours, null = introuvable.
  const existing = useLiveQuery(
    async () => (id === undefined ? null : ((await db.customGroups.get(id)) ?? null)),
    [id],
  )

  if (id !== undefined && existing === undefined) return null
  // `key` : réinitialise le formulaire quand la liste chargée change.
  return <CustomGroupForm key={existing?.id ?? 'new'} existing={existing ?? null} />
}

function CustomGroupForm({ existing }: { existing: CustomGroup | null }) {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const toggleCustomGroup = useQuizSettingsStore((s) => s.toggleCustomGroup)
  const selectedCustomIds = useQuizSettingsStore((s) => s.customGroupIds)

  const initialIds = existing?.kanaIds ?? (params.get('kana')?.split(',').filter((k) => getKana(k)) ?? [])
  const [name, setName] = useState(existing?.name ?? '')
  const [kanaIds, setKanaIds] = useState<string[]>(initialIds)
  const [script, setScript] = useState<Script>(
    initialIds[0] && getKana(initialIds[0])?.script === 'katakana' ? 'katakana' : 'hiragana',
  )

  const toggleKana = (kanaId: string) =>
    setKanaIds((ids) => (ids.includes(kanaId) ? ids.filter((k) => k !== kanaId) : [...ids, kanaId]))

  const canSave = name.trim() !== '' && kanaIds.length > 0

  const save = async () => {
    if (!canSave) return
    // Ordre canonique pour un affichage stable.
    const ordered = KANA.filter((k) => kanaIds.includes(k.id)).map((k) => k.id)
    const savedId = await saveCustomGroup({ id: existing?.id, name: name.trim(), kanaIds: ordered })
    // Une nouvelle liste est cochée d'office pour le prochain quiz.
    if (!existing && !selectedCustomIds.includes(savedId)) toggleCustomGroup(savedId)
    navigate('/learn', { replace: true })
  }

  const remove = async () => {
    if (!existing || !window.confirm(`Supprimer la liste « ${existing.name} » ?`)) return
    await deleteCustomGroup(existing.id)
    if (selectedCustomIds.includes(existing.id)) toggleCustomGroup(existing.id)
    navigate('/learn', { replace: true })
  }

  return (
    <div className="pb-20">
      <header className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate('/learn', { replace: true })}
          className="-ml-2 flex min-h-11 items-center gap-1 px-2 text-sm font-medium text-slate-600 dark:text-slate-300"
        >
          <Icon name="chevronLeft" className="size-5" />
          Apprendre
        </button>
        {existing && (
          <button
            type="button"
            onClick={remove}
            aria-label="Supprimer la liste"
            className="flex size-11 items-center justify-center text-red-600 dark:text-red-400"
          >
            <Icon name="trash" className="size-5" />
          </button>
        )}
      </header>

      <h1 className="mb-4 text-2xl font-bold tracking-tight">{existing ? 'Modifier la liste' : 'Nouvelle liste'}</h1>

      <label className="mb-4 block">
        <span className="mb-1.5 block text-sm font-medium">Nom</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex. : kana difficiles"
          maxLength={40}
          className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 outline-none focus:ring-2 focus:ring-accent-500/40 dark:border-slate-700 dark:bg-slate-900"
        />
      </label>

      <ScriptToggle value={script} onChange={setScript} />

      <KanaGrid
        script={script}
        renderCell={(kana) => {
          const selected = kanaIds.includes(kana.id)
          return (
            <button
              type="button"
              aria-pressed={selected}
              onClick={() => toggleKana(kana.id)}
              className={`${KANA_CELL_CLASS} ${
                selected ? 'bg-accent-500 text-white' : 'bg-white dark:bg-slate-900'
              }`}
            >
              <KanaCellContent kana={kana} />
            </button>
          )
        }}
      />

      <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-10 mx-auto max-w-lg px-4 pb-3">
        <button
          type="button"
          onClick={save}
          disabled={!canSave}
          className="min-h-12 w-full rounded-xl bg-accent-600 font-semibold text-white shadow-lg active:scale-[0.98] disabled:bg-slate-400 disabled:shadow-none dark:disabled:bg-slate-700"
        >
          Enregistrer ({kanaIds.length} kana)
        </button>
      </div>
    </div>
  )
}
