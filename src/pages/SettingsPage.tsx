import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { BackupSettings } from '@/components/BackupSettings'
import { Icon, type IconName } from '@/components/Icon'
import { PageHeader } from '@/components/PageHeader'
import { ProfileSettings } from '@/components/ProfileSettings'
import { useSettingsStore, type Theme } from '@/stores/settingsStore'

const THEME_OPTIONS: { value: Theme; label: string; icon: IconName }[] = [
  { value: 'light', label: 'Clair', icon: 'sun' },
  { value: 'dark', label: 'Sombre', icon: 'moon' },
  { value: 'system', label: 'Système', icon: 'monitor' },
]

export function SettingsPage() {
  const theme = useSettingsStore((s) => s.theme)
  const setTheme = useSettingsStore((s) => s.setTheme)

  return (
    <>
      <PageHeader title="Réglages" />

      <div className="lg:grid lg:grid-cols-2 lg:items-start lg:gap-x-4">
        <Section title="Thème">
          <div role="radiogroup" aria-label="Thème" className="grid grid-cols-3 gap-2">
            {THEME_OPTIONS.map((opt) => {
              const selected = theme === opt.value
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setTheme(opt.value)}
                  className={`flex min-h-20 flex-col items-center justify-center gap-2 rounded-md border text-sm font-medium transition-colors ${
                    selected
                      ? 'border-accent bg-accent-tint text-accent'
                      : 'border-control text-ink-muted'
                  }`}
                >
                  <Icon name={opt.icon} />
                  {opt.label}
                </button>
              )
            })}
          </div>
        </Section>

        <Section title="Profils">
          <ProfileSettings />
        </Section>

        <Section title="Sauvegarde">
          <BackupSettings />
        </Section>

        <Link
          to="/settings/about"
          className="flex min-h-14 items-center gap-3 rounded-md border border-control bg-paper-raised px-4 active:scale-[0.98]"
        >
          <Icon name="info" className="size-5 text-ink-muted" />
          <span className="flex-1 font-medium">À propos et crédits</span>
          <Icon name="chevronRight" className="size-5 text-ink-muted" />
        </Link>
      </div>
    </>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-4 rounded-md border border-hairline p-4">
      <h2 className="mb-3 text-sm font-semibold text-ink-muted">{title}</h2>
      {children}
    </section>
  )
}
