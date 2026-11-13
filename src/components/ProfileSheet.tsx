import { useState, type FormEvent } from 'react'
import { Button } from '@/components/Button'
import { Icon } from '@/components/Icon'
import { ProfileSeal } from '@/components/ProfileSeal'
import { Sheet } from '@/components/Sheet'
import { TextField } from '@/components/TextField'
import { createProfile } from '@/db/profiles'
import { useProfiles } from '@/lib/useProfiles'
import { useProfileStore } from '@/stores/profileStore'

interface ProfileSheetProps {
  open: boolean
  onClose: () => void
}

/** Feuille « Qui apprend ? » : changer de profil ou en créer un (renommer, supprimer : Réglages). */
export function ProfileSheet({ open, onClose }: ProfileSheetProps) {
  const profiles = useProfiles()
  const profileId = useProfileStore((s) => s.profileId)
  const setProfileId = useProfileStore((s) => s.setProfileId)
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')

  const close = () => {
    setCreating(false)
    setName('')
    onClose()
  }

  const create = async (e: FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    setProfileId(await createProfile(trimmed))
    close()
  }

  return (
    <Sheet open={open} onClose={close} title="Qui apprend ?">
      <ul role="radiogroup" aria-label="Profil actif" className="border-t border-hairline">
        {profiles.map((p) => {
          const active = p.id === profileId
          return (
            <li key={p.id} className="border-b border-hairline">
              <button
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => {
                  setProfileId(p.id)
                  close()
                }}
                className="flex min-h-14 w-full items-center gap-3 py-2 text-left"
              >
                <ProfileSeal name={p.name} />
                <span className="min-w-0 flex-1 truncate font-semibold">{p.name}</span>
                <span
                  className={`grid size-[22px] shrink-0 place-items-center rounded-full border-[1.5px] ${
                    active ? 'border-accent bg-accent text-on-accent' : 'border-control'
                  }`}
                >
                  {active && <Icon name="check" strokeWidth={3} className="size-[13px]" />}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
      {creating ? (
        <form onSubmit={create} className="mt-3 flex gap-2">
          <TextField
            variant="ui"
            className="min-w-0 flex-1"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={30}
            placeholder="Prénom"
            aria-label="Nom du nouveau profil"
          />
          <Button type="submit" size="sm" disabled={!name.trim()}>
            Créer
          </Button>
        </form>
      ) : (
        <Button variant="text" icon="plus" iconPosition="start" className="mt-1 -ml-3" onClick={() => setCreating(true)}>
          Nouveau profil
        </Button>
      )}
    </Sheet>
  )
}
