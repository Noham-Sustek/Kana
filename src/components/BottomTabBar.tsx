import { NavLink } from 'react-router'
import { TABS } from '@/app/tabs'
import { Icon } from '@/components/Icon'

export function BottomTabBar() {
  return (
    <nav
      aria-label="Navigation principale"
      className="border-t border-slate-200 bg-white/90 pb-[env(safe-area-inset-bottom)] backdrop-blur dark:border-slate-800 dark:bg-slate-900/90"
    >
      <ul className="grid grid-cols-5">
        {TABS.map((tab) => (
          <li key={tab.path}>
            <NavLink
              to={tab.path}
              className={({ isActive }) =>
                `flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-medium transition-colors ${
                  isActive
                    ? 'text-accent-600 dark:text-accent-500'
                    : 'text-slate-500 active:text-slate-900 dark:text-slate-400 dark:active:text-slate-100'
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
