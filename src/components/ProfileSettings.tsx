import { useState, type FormEvent } from 'react'
import { Icon } from '@/components/Icon'
import { createProfile, deleteProfile, renameProfile } from '@/db/profiles'
import type { Profile } from '@/db/db'
import { useProfiles } from '@/lib/useProfiles'
import { useProfileStore } from '@/stores/profileStore'

const MAX_NAME_LENGTH = 30

/** Liste des profils : choix du profil actif, ajout, renommage, suppression. */
export function ProfileSettings() {
  const profiles = useProfiles()
  const profileId = useProfileStore((s) => s.profileId)
  const setProfileId = useProfileStore((s) => s.setProfileId)
  const [newName, setNewName] = useState('')

  const add = async (e: FormEvent) => {
    e.preventDefault()
    const name = newName.trim()
    if (!name) return
    setProfileId(await createProfile(name))
    setNewName('')
  }

  return (
    <>
      <p className="mb-2 text-sm text-slate-600 dark:text-slate-300">
        Chaque profil a sa propre progression, ses listes et ses stats.
      </p>
      <ul className="divide-y divide-slate-100 dark:divide-slate-800">
        {profiles.map((p) => (
          <ProfileRow
            key={p.id}
            profile={p}
            active={p.id === profileId}
            deletable={profiles.length > 1}
            onSelect={() => setProfileId(p.id)}
            onDelete={async () => {
              const other = profiles.find((o) => o.id !== p.id)
              if (p.id === profileId && other) setProfileId(other.id)
              await deleteProfile(p.id)
            }}
          />
        ))}
      </ul>
      <form onSubmit={add} className="mt-3 flex gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          maxLength={MAX_NAME_LENGTH}
          placeholder="Nouveau profil"
          aria-label="Nom du nouveau profil"
          className="min-h-11 min-w-0 flex-1 rounded-xl border border-slate-200 bg-transparent px-3 text-base dark:border-slate-700"
        />
        <button
          type="submit"
          disabled={!newName.trim()}
          aria-label="Ajouter le profil"
          className="flex size-11 items-center justify-center rounded-xl bg-accent-600 text-white disabled:bg-slate-300 dark:disabled:bg-slate-700"
        >
          <Icon name="plus" className="size-5" />
        </button>
      </form>
    </>
  )
}

interface ProfileRowProps {
  profile: Profile
  active: boolean
  deletable: boolean
  onSelect: () => void
  onDelete: () => void
}

function ProfileRow({ profile, active, deletable, onSelect, onDelete }: ProfileRowProps) {
  const [mode, setMode] = useState<'view' | 'rename' | 'delete'>('view')
  const [name, setName] = useState(profile.name)

  const saveName = async (e: FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (trimmed) await renameProfile(profile.id, trimmed)
    setMode('view')
  }

  if (mode === 'rename') {
    return (
      <li className="py-2">
        <form onSubmit={saveName} className="flex gap-2">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={MAX_NAME_LENGTH}
            aria-label="Nom du profil"
            className="min-h-11 min-w-0 flex-1 rounded-xl border border-slate-200 bg-transparent px-3 text-base dark:border-slate-700"
          />
          <button
            type="submit"
            aria-label="Enregistrer"
            className="flex size-11 items-center justify-center rounded-xl bg-accent-600 text-white"
          >
            <Icon name="check" className="size-5" />
          </button>
        </form>
      </li>
    )
  }

  if (mode === 'delete') {
    return (
      <li className="py-2 text-sm">
        <p>
          Supprimer <b>{profile.name}</b> et toute sa progression ?
        </p>
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={() => setMode('view')}
            className="min-h-11 flex-1 rounded-xl border border-slate-200 font-medium dark:border-slate-700"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="min-h-11 flex-1 rounded-xl bg-red-600 font-semibold text-white"
          >
            Supprimer
          </button>
        </div>
      </li>
    )
  }

  return (
    <li className="flex items-center gap-1">
      <button
        type="button"
        role="radio"
        aria-checked={active}
        onClick={onSelect}
        className="flex min-h-12 flex-1 items-center gap-3 text-left"
      >
        <span
          className={`flex size-5 items-center justify-center rounded-full border-2 ${
            active ? 'border-accent-500' : 'border-slate-300 dark:border-slate-600'
          }`}
        >
          {active && <span className="size-2.5 rounded-full bg-accent-500" />}
        </span>
        <span className={`truncate ${active ? 'font-semibold' : ''}`}>{profile.name}</span>
      </button>
      <button
        type="button"
        onClick={() => {
          setName(profile.name)
          setMode('rename')
        }}
        aria-label={`Renommer ${profile.name}`}
        className="flex size-11 items-center justify-center text-slate-500 dark:text-slate-400"
      >
        <Icon name="writing" className="size-4" />
      </button>
      {deletable && (
        <button
          type="button"
          onClick={() => setMode('delete')}
          aria-label={`Supprimer ${profile.name}`}
          className="flex size-11 items-center justify-center text-slate-500 dark:text-slate-400"
        >
          <Icon name="trash" className="size-4" />
        </button>
      )}
    </li>
  )
}
