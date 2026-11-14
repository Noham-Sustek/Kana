import { useState } from 'react'
import { Link, useLocation } from 'react-router'
import { TABS, isTabActive } from '@/app/tabs'
import { Icon } from '@/components/Icon'
import { ProfileSeal } from '@/components/ProfileSeal'
import { ProfileSheet } from '@/components/ProfileSheet'
import { useActiveProfile } from '@/lib/useProfiles'

interface BottomTabBarProps {
  /** Rail vertical à gauche (écran large, ≥ 840 px) au lieu de la barre du bas. */
  rail?: boolean
}

/** Quatre onglets. Actif : accent et un trait de 2 px (au-dessus, ou à gauche sur le rail). */
export function BottomTabBar({ rail }: BottomTabBarProps) {
  const { pathname } = useLocation()

  return (
    <nav
      aria-label="Navigation principale"
      className={
        rail
          ? 'k-rail flex w-[92px] shrink-0 flex-col items-center gap-1 border-r border-hairline bg-paper pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]'
          : 'k-tabbar border-t border-hairline bg-paper pb-[env(safe-area-inset-bottom)]'
      }
    >
      {rail && <RailProfile />}
      <ul className={rail ? 'flex flex-col gap-1' : 'mx-auto grid max-w-lg grid-cols-4'}>
        {TABS.map((tab) => {
          const active = isTabActive(tab, pathname)
          return (
            <li key={tab.path}>
              <Link
                to={tab.path}
                aria-current={active ? 'page' : undefined}
                className={`k-tab flex flex-col items-center justify-center gap-[3px] text-[11.5px] leading-[14px] font-semibold transition-colors duration-200 ${
                  rail ? 'min-h-15 w-[84px] border-l-2' : '-mt-px min-h-14 border-t-2'
                } ${active ? 'border-accent text-accent' : 'border-transparent text-ink-muted active:text-ink'}`}
              >
                <span className="k-tab__icon grid place-items-center">
                  {typeof tab.icon === 'object' ? (
                    <span className="font-jp text-[21px] leading-[22px]" aria-hidden="true">
                      {tab.icon.glyph}
                    </span>
                  ) : (
                    <Icon name={tab.icon} className="size-[22px]" />
                  )}
                </span>
                <span className="k-tab__label">{tab.label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
      {rail && (
        <Link
          to="/settings"
          aria-label="Réglages"
          aria-current={pathname.startsWith('/settings') ? 'page' : undefined}
          className={`mt-auto grid size-11 place-items-center rounded-md active:brightness-90 ${
            pathname.startsWith('/settings') ? 'text-accent' : 'text-ink-muted'
          }`}
        >
          <Icon name="settings" className="size-[22px]" />
        </Link>
      )}
    </nav>
  )
}

/** Sceau du profil actif en tête du rail : ouvre « Qui apprend ? ». */
function RailProfile() {
  const profile = useActiveProfile()
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={profile ? `Profil : ${profile.name}. Changer de profil` : 'Changer de profil'}
        className="mb-3 grid size-11 place-items-center"
      >
        {profile && <ProfileSeal name={profile.name} className="size-9" />}
      </button>
      <ProfileSheet open={open} onClose={() => setOpen(false)} />
    </>
  )
}
