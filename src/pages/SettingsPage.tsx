import { Icon, type IconName } from '@/components/Icon'
import { PageHeader } from '@/components/PageHeader'
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

      <section className="rounded-2xl bg-white p-4 shadow-sm dark:bg-slate-900">
        <h2 className="mb-3 text-sm font-semibold text-slate-500 dark:text-slate-400">Thème</h2>
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
                className={`flex min-h-20 flex-col items-center justify-center gap-2 rounded-xl border text-sm font-medium transition-colors ${
                  selected
                    ? 'border-accent-500 bg-accent-50 text-accent-600 dark:bg-accent-500/15 dark:text-accent-500'
                    : 'border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300'
                }`}
              >
                <Icon name={opt.icon} />
                {opt.label}
              </button>
            )
          })}
        </div>
      </section>
    </>
  )
}
