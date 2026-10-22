import { Link } from 'react-router'
import { useProfiles } from '@/lib/useProfiles'
import { useProfileStore } from '@/stores/profileStore'

/** Choix du profil actif (pastilles) ; renvoie vers les réglages pour la gestion. */
export function ProfileSwitcher() {
  const profiles = useProfiles()
  const profileId = useProfileStore((s) => s.profileId)
  const setProfileId = useProfileStore((s) => s.setProfileId)

  return (
    <div className="mb-4 flex items-center gap-2 overflow-x-auto pb-1">
      {profiles.map((p) => {
        const selected = p.id === profileId
        return (
          <button
            key={p.id}
            type="button"
            aria-pressed={selected}
            onClick={() => setProfileId(p.id)}
            className={`flex min-h-11 shrink-0 items-center rounded-full border px-4 text-sm font-medium transition-colors ${
              selected
                ? 'border-accent-500 bg-accent-500 text-white'
                : 'border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300'
            }`}
          >
            {p.name}
          </button>
        )
      })}
      <Link
        to="/settings"
        className="flex min-h-11 shrink-0 items-center px-2 text-sm font-medium text-accent-600 dark:text-accent-500"
      >
        Gérer
      </Link>
    </div>
  )
}
