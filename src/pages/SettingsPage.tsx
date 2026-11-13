import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import { BackupSettings } from '@/components/BackupSettings'
import { Icon, type IconName } from '@/components/Icon'
import { PageHeader } from '@/components/PageHeader'
import { ProfileSettings } from '@/components/ProfileSettings'
import { Switch } from '@/components/Switch'
import { useSettingsStore, type Theme } from '@/stores/settingsStore'

const THEME_OPTIONS: { value: Theme; label: string; icon: IconName }[] = [
  { value: 'light', label: 'Clair', icon: 'sun' },
  { value: 'dark', label: 'Sombre', icon: 'moon' },
  { value: 'system', label: 'Système', icon: 'monitor' },
]

export function SettingsPage() {
  const navigate = useNavigate()
  // Retour à l'écran d'où l'on vient (Réglages s'ouvre depuis l'en-tête de chaque onglet).
  const back = () => ((window.history.state as { idx?: number } | null)?.idx ? navigate(-1) : navigate('/home'))
  const theme = useSettingsStore((s) => s.theme)
  const setTheme = useSettingsStore((s) => s.setTheme)
  const vibrations = useSettingsStore((s) => s.vibrations)
  const setVibrations = useSettingsStore((s) => s.setVibrations)

  return (
    <>
      <button
        type="button"
        onClick={back}
        className="-ml-2 mb-2 flex min-h-11 items-center gap-1 px-2 text-sm font-medium text-ink-muted"
      >
        <Icon name="chevronLeft" className="size-5" />
        Retour
      </button>
      <PageHeader title="Réglages" />

      <div className="lg:grid lg:grid-cols-2 lg:items-start lg:gap-x-4">
        <Section title="Apparence">
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
          <div className="mt-2">
            <Switch
              label="Vibrations"
              description="Une vibration brève à chaque réponse (Android)."
              checked={vibrations}
              onChange={setVibrations}
            />
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
