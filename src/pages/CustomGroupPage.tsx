import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { Button } from '@/components/Button'
import { Dialog } from '@/components/Dialog'
import { Icon } from '@/components/Icon'
import { IconButton } from '@/components/IconButton'
import { KANA_CELL_CLASS, KanaCellContent, KanaGrid } from '@/components/KanaGrid'
import { ScriptToggle } from '@/components/ScriptToggle'
import { TextField } from '@/components/TextField'
import { KANA, getKana, type Script } from '@/data/kana'
import { db, type CustomGroup } from '@/db/db'
import { deleteCustomGroup, saveCustomGroup } from '@/db/customGroups'
import { activeProfileId } from '@/stores/profileStore'
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
  const [confirmDelete, setConfirmDelete] = useState(false)
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
    const savedId = await saveCustomGroup(activeProfileId(), { id: existing?.id, name: name.trim(), kanaIds: ordered })
    // Une nouvelle liste est cochée d'office pour le prochain quiz.
    if (!existing && !selectedCustomIds.includes(savedId)) toggleCustomGroup(savedId)
    navigate('/learn', { replace: true })
  }

  const remove = async () => {
    if (!existing) return
    await deleteCustomGroup(existing.id)
    if (selectedCustomIds.includes(existing.id)) toggleCustomGroup(existing.id)
    navigate('/learn', { replace: true })
  }

  return (
    <div className="flex min-h-full flex-col">
      <header className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate('/learn', { replace: true })}
          className="-ml-2 flex min-h-11 items-center gap-1 px-2 text-sm font-medium text-ink-muted"
        >
          <Icon name="chevronLeft" className="size-5" />
          S’entraîner
        </button>
        {existing && (
          <IconButton icon="trash" label="Supprimer la liste" onClick={() => setConfirmDelete(true)} />
        )}
      </header>

      <h1 className="mb-4 font-serif text-[28px] leading-tight font-medium">{existing ? 'Modifier la liste' : 'Nouvelle liste'}</h1>

      <label className="mb-4 block">
        <span className="mb-1.5 block text-sm font-medium">Nom</span>
        <TextField
          variant="ui"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex. : kana difficiles"
          maxLength={40}
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
                selected ? 'bg-accent text-on-accent' : 'bg-paper-raised'
              }`}
            >
              <KanaCellContent kana={kana} />
            </button>
          )
        }}
      />

      <div className="sticky -bottom-4 z-10 -mx-4 mt-auto bg-paper px-4 pt-3 pb-5">
        <Button onClick={save} disabled={!canSave}>
          Enregistrer ({kanaIds.length} kana)
        </Button>
      </div>

      {existing && (
        <Dialog
          open={confirmDelete}
          title="Supprimer la liste ?"
          safeLabel="Annuler"
          onSafe={() => setConfirmDelete(false)}
          riskyLabel="Supprimer"
          onRisky={remove}
          irreversible
        >
          « {existing.name} » sera supprimée. Les kana et leur progression ne changent pas.
        </Dialog>
      )}
    </div>
  )
}
