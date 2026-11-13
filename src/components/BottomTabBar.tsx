import { Link, useLocation } from 'react-router'
import { TABS, isTabActive } from '@/app/tabs'
import { Icon } from '@/components/Icon'

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
          ? 'flex w-[92px] shrink-0 flex-col items-center gap-1 border-r border-hairline bg-paper pt-[max(1rem,env(safe-area-inset-top))]'
          : 'border-t border-hairline bg-paper pb-[env(safe-area-inset-bottom)]'
      }
    >
      <ul className={rail ? 'flex flex-col gap-1' : 'mx-auto grid max-w-lg grid-cols-4'}>
        {TABS.map((tab) => {
          const active = isTabActive(tab, pathname)
          return (
            <li key={tab.path}>
              <Link
                to={tab.path}
                aria-current={active ? 'page' : undefined}
                className={`flex flex-col items-center justify-center gap-[3px] text-[11.5px] leading-[14px] font-semibold transition-colors duration-200 ${
                  rail ? 'min-h-15 w-[84px] border-l-2' : '-mt-px min-h-14 border-t-2'
                } ${active ? 'border-accent text-accent' : 'border-transparent text-ink-muted active:text-ink'}`}
              >
                {typeof tab.icon === 'object' ? (
                  <span className="font-jp text-[21px] leading-[22px]" aria-hidden="true">
                    {tab.icon.glyph}
                  </span>
                ) : (
                  <Icon name={tab.icon} className="size-[22px]" />
                )}
                <span>{tab.label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
