import { useState, type FormEvent } from 'react'
import { Button } from '@/components/Button'
import { Dialog } from '@/components/Dialog'
import { Icon } from '@/components/Icon'
import { ProfileSeal } from '@/components/ProfileSeal'
import { Sheet } from '@/components/Sheet'
import { TextField } from '@/components/TextField'
import type { Profile } from '@/db/db'
import { createProfile, deleteProfile, renameProfile } from '@/db/profiles'
import { useProfileStreaks, useProfiles } from '@/lib/useProfiles'
import { useProfileStore } from '@/stores/profileStore'

const MAX_NAME_LENGTH = 30

function streakLine(days: number): string {
  if (days === 0) return 'pas de série en cours'
  return `série de ${days} jour${days > 1 ? 's' : ''}`
}

const capitalize = (s: string) => s.charAt(0).toLocaleUpperCase('fr-FR') + s.slice(1)

/** Profils dans Réglages : une ligne par profil (actions dans une feuille), puis « Nouveau profil ». */
export function ProfileSettings() {
  const profiles = useProfiles()
  const streaks = useProfileStreaks()
  const profileId = useProfileStore((s) => s.profileId)
  const setProfileId = useProfileStore((s) => s.setProfileId)
  const [openId, setOpenId] = useState<number | null>(null)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const open = profiles.find((p) => p.id === openId)

  const add = async (e: FormEvent) => {
    e.preventDefault()
    const name = newName.trim()
    if (!name) return
    setProfileId(await createProfile(name))
    setNewName('')
    setCreating(false)
  }

  return (
    <>
      <ul className="border-t border-hairline">
        {profiles.map((p) => {
          const active = p.id === profileId
          const streak = streakLine(streaks.get(p.id) ?? 0)
          return (
            <li key={p.id} className="border-b border-hairline">
              <button
                type="button"
                onClick={() => setOpenId(p.id)}
                className="flex min-h-14 w-full items-center gap-3 py-2 text-left active:brightness-90"
              >
                <ProfileSeal name={p.name} />
                <span className="min-w-0 flex-1">
                  <b className="block truncate font-semibold">{p.name}</b>
                  <small className="block text-[13px] leading-[18px] text-ink-muted">
                    {active ? `Profil actif · ${streak}` : capitalize(streak)}
                  </small>
                </span>
                <Icon name="chevronRight" className="size-5 shrink-0 text-ink-muted" />
              </button>
            </li>
          )
        })}
      </ul>

      {creating ? (
        <form onSubmit={add} className="mt-3 flex gap-2">
          <TextField
            variant="ui"
            className="min-w-0 flex-1"
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            maxLength={MAX_NAME_LENGTH}
            placeholder="Prénom"
            aria-label="Nom du nouveau profil"
          />
          <Button type="submit" size="sm" fullWidth={false} disabled={!newName.trim()}>
            Créer
          </Button>
        </form>
      ) : (
        <Button
          variant="text"
          size="sm"
          fullWidth={false}
          icon="plus"
          iconPosition="start"
          className="mt-1 -ml-3"
          onClick={() => setCreating(true)}
        >
          Nouveau profil
        </Button>
      )}

      {open && (
        <ProfileActions
          profile={open}
          active={open.id === profileId}
          deletable={profiles.length > 1}
          onClose={() => setOpenId(null)}
          onSelect={() => {
            setProfileId(open.id)
            setOpenId(null)
          }}
          onDelete={async () => {
            const other = profiles.find((o) => o.id !== open.id)
            if (open.id === profileId && other) setProfileId(other.id)
            setOpenId(null)
            await deleteProfile(open.id)
          }}
        />
      )}
    </>
  )
}

interface ProfileActionsProps {
  profile: Profile
  active: boolean
  deletable: boolean
  onClose: () => void
  onSelect: () => void
  onDelete: () => void
}

function ProfileActions({ profile, active, deletable, onClose, onSelect, onDelete }: ProfileActionsProps) {
  const [name, setName] = useState(profile.name)
  const [confirm, setConfirm] = useState(false)

  const save = async (e: FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (trimmed && trimmed !== profile.name) await renameProfile(profile.id, trimmed)
    onClose()
  }

  return (
    <>
      <Sheet open={!confirm} onClose={onClose} title={profile.name}>
        <form onSubmit={save}>
          <label className="mb-1.5 block text-[13px] leading-[18px] font-semibold text-ink-muted" htmlFor="profile-name">
            Nom
          </label>
          <div className="flex gap-2">
            <TextField
              id="profile-name"
              variant="ui"
              className="min-w-0 flex-1"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={MAX_NAME_LENGTH}
            />
            <Button type="submit" variant="line" size="sm" fullWidth={false} disabled={!name.trim()}>
              Renommer
            </Button>
          </div>
        </form>
        <div className="mt-4 flex flex-col gap-1">
          {!active && <Button onClick={onSelect}>Passer à ce profil</Button>}
          {deletable && (
            <Button variant="text" icon="trash" iconPosition="start" onClick={() => setConfirm(true)}>
              Supprimer le profil
            </Button>
          )}
        </div>
      </Sheet>
      <Dialog
        open={confirm}
        title={`Supprimer « ${profile.name} » ?`}
        safeLabel="Annuler"
        onSafe={() => setConfirm(false)}
        riskyLabel="Supprimer"
        onRisky={onDelete}
        irreversible
      >
        Toute sa progression, ses listes et ses résultats seront effacés de cet appareil.
      </Dialog>
    </>
  )
}
