import type { ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { BackupSettings } from '@/components/BackupSettings'
import { Icon } from '@/components/Icon'
import { IconButton } from '@/components/IconButton'
import { ProfileSettings } from '@/components/ProfileSettings'
import { ReloadSettings } from '@/components/reload/ReloadSettings'
import { SegmentedControl } from '@/components/SegmentedControl'
import { Switch } from '@/components/Switch'
import { haptic } from '@/lib/haptic'
import { useInstallPrompt } from '@/lib/installPrompt'
import { playSound } from '@/lib/sound'
import { LAYOUT_LABELS } from '@/lib/keyboard'
import { detectedLayout } from '@/lib/useAppKeyboard'
import {
  useSettingsStore,
  type KeyboardLayoutSetting,
  type StrokeCheck,
  type KeyboardMode,
  type Theme,
  type UiStyle,
} from '@/stores/settingsStore'

const UI_OPTIONS: { value: UiStyle; label: string }[] = [
  { value: 'reload', label: 'Reload' },
  { value: 'papier', label: 'Papier' },
  { value: 'wii', label: 'Wii' },
]

const KEYBOARD_OPTIONS: { value: KeyboardMode; label: string }[] = [
  { value: 'app', label: 'Intégré' },
  { value: 'system', label: 'Du téléphone' },
]

const STROKE_CHECK_OPTIONS: { value: StrokeCheck; label: string }[] = [
  { value: 'char', label: 'À la fin du kana' },
  { value: 'stroke', label: 'À chaque trait' },
]

const THEME_OPTIONS: { value: Theme; label: string }[] = [
  { value: 'light', label: 'Clair' },
  { value: 'dark', label: 'Sombre' },
  { value: 'system', label: 'Système' },
]

export function SettingsPage() {
  const navigate = useNavigate()
  // Retour à l'écran d'où l'on vient (Réglages s'ouvre depuis l'en-tête de chaque onglet).
  const back = () => ((window.history.state as { idx?: number } | null)?.idx ? navigate(-1) : navigate('/home'))
  const theme = useSettingsStore((s) => s.theme)
  const setTheme = useSettingsStore((s) => s.setTheme)
  const ui = useSettingsStore((s) => s.ui)
  const setUi = useSettingsStore((s) => s.setUi)
  const vibrations = useSettingsStore((s) => s.vibrations)
  const setVibrations = useSettingsStore((s) => s.setVibrations)
  const sounds = useSettingsStore((s) => s.sounds)
  const setSounds = useSettingsStore((s) => s.setSounds)
  const keyboard = useSettingsStore((s) => s.keyboard)
  const setKeyboard = useSettingsStore((s) => s.setKeyboard)
  const keyboardLayout = useSettingsStore((s) => s.keyboardLayout)
  const strokeCheck = useSettingsStore((s) => s.strokeCheck)
  const setStrokeCheck = useSettingsStore((s) => s.setStrokeCheck)
  const setKeyboardLayout = useSettingsStore((s) => s.setKeyboardLayout)
  const install = useInstallPrompt()
  const layoutOptions: { value: KeyboardLayoutSetting; label: string }[] = [
    { value: 'auto', label: 'Auto' },
    { value: 'azerty', label: 'AZERTY' },
    { value: 'qwerty', label: 'QWERTY' },
    { value: 'qwertz', label: 'QWERTZ' },
  ]

  const appearance = (
    <>
      <SegmentedControl label="Style" options={UI_OPTIONS} value={ui} onChange={setUi} />
      <div className="mt-4">
        <SegmentedControl label="Thème" options={THEME_OPTIONS} value={theme} onChange={setTheme} />
      </div>
      <div className="mt-2">
        <Switch
          label="Vibrations"
          description="Une vibration brève à chaque réponse (Android)."
          checked={vibrations}
          onChange={(on) => {
            setVibrations(on)
            // Petite vibration de confirmation à l'activation.
            if (on) haptic('toggle')
          }}
        />
        {(ui === 'wii' || ui === 'reload') && (
          <Switch
            label="Sons"
            description="Petits sons au toucher et à chaque réponse."
            checked={sounds}
            onChange={(on) => {
              setSounds(on)
              // Au toucher les sons étaient coupés : on confirme l'activation.
              if (on) playSound('chipOn')
            }}
          />
        )}
      </div>
          </>
  )
  const input = (
    <>
      <SegmentedControl label="Clavier pour le romaji" options={KEYBOARD_OPTIONS} value={keyboard} onChange={setKeyboard} />
      <p className="mt-2 text-[13px] leading-[18px] text-ink-muted">
        {keyboard === 'app'
          ? 'Un clavier dans l’application : rien ne se décale à l’écran pendant la saisie.'
          : 'Le clavier du téléphone s’ouvre et l’écran se réduit pendant la saisie.'}
      </p>
      {keyboard === 'app' && (
        <div className="mt-4">
          <SegmentedControl label="Disposition" options={layoutOptions} value={keyboardLayout} onChange={setKeyboardLayout} />
          <p className="mt-2 text-[13px] leading-[18px] text-ink-muted">
            Auto : {LAYOUT_LABELS[detectedLayout()]}, d’après la langue du téléphone.
          </p>
        </div>
      )}
      <div className="mt-4">
        <SegmentedControl label="Vérification du tracé" options={STROKE_CHECK_OPTIONS} value={strokeCheck} onChange={setStrokeCheck} />
        <p className="mt-2 text-[13px] leading-[18px] text-ink-muted">
          {strokeCheck === 'char'
            ? 'De mémoire et au quiz, le kana est vérifié une fois tous ses traits posés : un trait raté, remarqué tout de suite, s’annule sans compter.'
            : 'De mémoire et au quiz, chaque trait est vérifié dès qu’on lève le doigt.'}
        </p>
      </div>
    </>
  )
  const backupContent = (
    <>
      <BackupSettings />
          </>
  )
  const application = (
    <>
      <ul className="border-t border-hairline">
        {install && (
          <Row title="Installer sur l’écran d’accueil" detail="Ouverture plus rapide, en plein écran" onClick={install} />
        )}
        <Row
          title="À propos et crédits"
          detail="Sans compte, sans publicité · tout fonctionne hors ligne"
          onClick={() => navigate('/settings/about')}
        />
      </ul>
          </>
  )

  if (ui === 'reload') {
    return (
      <ReloadSettings
        sections={[
          { id: 'appearance', word: 'APPARENCE', title: 'Apparence', detail: 'Style, thème, vibrations, sons.', content: appearance },
          { id: 'input', word: 'SAISIE', title: 'Saisie', detail: 'Clavier pour le romaji, vérification du tracé.', content: input },
          { id: 'profiles', word: 'PROFILS', title: 'Profils', detail: 'Qui apprend sur cet appareil.', content: <ProfileSettings /> },
          { id: 'backup', word: 'SAUVEGARDE', title: 'Sauvegarde', detail: 'Exporter ou importer toute la progression.', content: backupContent },
          { id: 'app', word: 'À PROPOS', title: 'Application', detail: 'Installation, crédits, fonctionnement hors ligne.', content: application },
        ]}
      />
    )
  }

  return (
    <div className="pb-6">
      <header className="-ml-2 flex items-center gap-0.5">
        <IconButton icon="chevronLeft" label="Retour" onClick={back} />
        <h1 className="font-serif text-[21px] leading-tight font-medium">Réglages</h1>
      </header>

      <div className="lg:grid lg:grid-cols-2 lg:items-start lg:gap-x-10">
        <div>
          <Section title="Apparence" first>
            {appearance}
          </Section>

          <Section title="Saisie">
            {input}
          </Section>

          <Section title="Profils">
            <ProfileSettings />
          </Section>
        </div>

        <div>
          <Section title="Sauvegarde" className="lg:mt-3 lg:border-t-0 lg:pt-0">
            {backupContent}
          </Section>

          <Section title="Application">
            {application}
          </Section>
        </div>
      </div>
    </div>
  )
}

function Section({
  title,
  first,
  className = '',
  children,
}: {
  title: string
  first?: boolean
  className?: string
  children: ReactNode
}) {
  return (
    <section className={`${first ? 'mt-3' : 'mt-5 border-t border-hairline pt-5'} ${className}`}>
      <h2 className="mb-2.5 text-[11px] leading-[14px] font-bold tracking-[0.12em] text-ink-muted uppercase">{title}</h2>
      {children}
    </section>
  )
}

function Row({ title, detail, onClick }: { title: string; detail: string; onClick: () => void }) {
  return (
    <li className="border-b border-hairline">
      <button type="button" onClick={onClick} className="flex min-h-14 w-full items-center gap-3 py-2 text-left active:brightness-90">
        <span className="min-w-0 flex-1">
          <b className="block font-semibold">{title}</b>
          <small className="block text-[13px] leading-[18px] text-ink-muted">{detail}</small>
        </span>
        <Icon name="chevronRight" className="size-5 shrink-0 text-ink-muted" />
      </button>
    </li>
  )
}
