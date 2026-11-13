import { useState } from 'react'
import { Link } from 'react-router'
import { Icon } from '@/components/Icon'
import { ProfileSeal } from '@/components/ProfileSeal'
import { ProfileSheet } from '@/components/ProfileSheet'
import { useProfiles } from '@/lib/useProfiles'
import { useProfileStore } from '@/stores/profileStore'

/** En-tête des onglets : profil actif à gauche (ouvre « Qui apprend ? »), Réglages à droite. */
export function AppHeader() {
  const profiles = useProfiles()
  const profileId = useProfileStore((s) => s.profileId)
  const profile = profiles.find((p) => p.id === profileId)
  const [open, setOpen] = useState(false)

  return (
    <header className="-ml-1 mb-2 flex items-center justify-between">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={profile ? `Profil : ${profile.name}. Changer de profil` : 'Changer de profil'}
        className="flex min-h-11 min-w-0 items-center gap-2.5 pr-2 pl-1 font-semibold"
      >
        {/* Rien tant que les profils ne sont pas lus (un instant au démarrage). */}
        {profile && (
          <>
            <ProfileSeal name={profile.name} />
            <span className="truncate">{profile.name}</span>
            <Icon name="chevronDown" className="size-4 shrink-0 text-ink-muted" />
          </>
        )}
      </button>
      <Link
        to="/settings"
        aria-label="Réglages"
        className="-mr-2 grid size-11 shrink-0 place-items-center rounded-md text-ink-muted active:brightness-90"
      >
        <Icon name="settings" className="size-[22px]" />
      </Link>
      <ProfileSheet open={open} onClose={() => setOpen(false)} />
    </header>
  )
}
