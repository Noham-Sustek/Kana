import { NavLink } from 'react-router'
import { TABS } from '@/app/tabs'
import { Icon } from '@/components/Icon'

export function BottomTabBar() {
  return (
    <nav
      aria-label="Navigation principale"
      className="border-t border-hairline bg-paper-raised/90 pb-[env(safe-area-inset-bottom)] backdrop-blur"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-5">
        {TABS.map((tab) => (
          <li key={tab.path}>
            <NavLink
              to={tab.path}
              className={({ isActive }) =>
                `flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-medium transition-colors ${
                  isActive
                    ? 'text-accent'
                    : 'text-ink-muted active:text-ink'
                }`
              }
            >
              <Icon name={tab.icon} />
              <span>{tab.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
