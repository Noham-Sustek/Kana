import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { Button } from '@/components/Button'
import { Icon } from '@/components/Icon'
import { ImportBackupButton } from '@/components/ImportBackupButton'
import { KanaTile } from '@/components/KanaTile'
import { ProfileSeal } from '@/components/ProfileSeal'
import { TextField } from '@/components/TextField'
import { getKana, pathGroups, type PathScript } from '@/data/kana'
import { renameProfile } from '@/db/profiles'
import { useActiveProfile } from '@/lib/useProfiles'
import { useStartDailySession } from '@/lib/useStartDailySession'
import { useProfileStore } from '@/stores/profileStore'
import { useQuizSettingsStore } from '@/stores/quizSettingsStore'
import { useSettingsStore } from '@/stores/settingsStore'

const STEPS = 4

const SCRIPTS: { value: PathScript; char: string; label: string; detail: string }[] = [
  {
    value: 'hiragana',
    char: 'あ',
    label: 'Hiragana',
    detail: 'L’écriture de base, celle des mots japonais. Recommandé pour débuter.',
  },
  { value: 'katakana', char: 'ア', label: 'Katakana', detail: 'Pour les mots venus d’ailleurs et les noms étrangers.' },
  { value: 'mixed', char: 'あア', label: 'Les deux', detail: 'Chaque ligne en hiragana, puis la même en katakana.' },
]

/** Accueil du premier lancement : bienvenue, écriture de départ, principe du parcours, profil. */
export function OnboardingPage() {
  const navigate = useNavigate()
  const setOnboarded = useSettingsStore((s) => s.setOnboarded)
  const script = useQuizSettingsStore((s) => s.autoScript)
  const setScript = useQuizSettingsStore((s) => s.setAutoScript)
  const profile = useActiveProfile()
  const profileId = useProfileStore((s) => s.profileId)
  const startDaily = useStartDailySession('/home')
  const [step, setStep] = useState(0)
  const [name, setName] = useState<string | null>(null)
  const shownName = name ?? profile?.name ?? ''

  const finish = async (then: 'home' | 'session') => {
    const trimmed = shownName.trim()
    if (trimmed && trimmed !== profile?.name) await renameProfile(profileId, trimmed)
    setOnboarded()
    if (then === 'session') await startDaily()
    else navigate('/home', { replace: true })
  }

  const skip = () => {
    setOnboarded()
    navigate('/home', { replace: true })
  }

  const firstLine = pathGroups(script)
    .filter((g) => g.kind === 'gojuon')
    .slice(0, 5)
  const first = firstLine[0]
  const firstKana = (first?.kanaIds ?? []).map((id) => getKana(id)!)

  return (
    <div className="flex min-h-full flex-col">
      <header className="-mr-3 flex min-h-11 justify-end">
        <Button variant="quiet" size="sm" fullWidth={false} onClick={skip}>
          Passer
        </Button>
      </header>

      {step === 0 && (
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <div className="relative grid size-[212px] place-items-center rounded-sm border-[1.5px] border-ink bg-paper-raised font-jp text-[148px] leading-none font-semibold">
            <span aria-hidden="true" className="absolute inset-y-2 left-1/2 border-l-[1.5px] border-dashed border-hairline" />
            <span aria-hidden="true" className="absolute inset-x-2 top-1/2 border-t-[1.5px] border-dashed border-hairline" />
            <span className="relative">あ</span>
          </div>
          <h1 className="mt-8 font-serif text-[26px] leading-tight font-medium">Les kana, une case à la fois</h1>
          <p className="mt-2 max-w-xs text-[15px] leading-[22px] text-ink-muted">
            Hiragana et katakana, quelques minutes par jour. Tout reste sur cet appareil : pas de compte, pas de
            connexion.
          </p>
        </div>
      )}

      {step === 1 && (
        <Body title="Par quelle écriture commencer ?" intro="Les deux notent les mêmes sons. Vous pourrez changer à tout moment.">
          <div role="radiogroup" aria-label="Écriture de départ" className="mt-4 flex flex-col gap-2.5">
            {SCRIPTS.map((s) => {
              const selected = s.value === script
              return (
                <button
                  key={s.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setScript(s.value)}
                  className={`flex items-center gap-3.5 rounded-md bg-paper-raised p-3.5 text-left ${
                    selected ? 'border-2 border-accent' : 'border-[1.5px] border-control'
                  }`}
                >
                  <span
                    className={`w-10 shrink-0 text-center font-jp leading-none ${s.char.length > 1 ? 'text-[20px] tracking-[-0.05em]' : 'text-[36px]'}`}
                  >
                    {s.char}
                  </span>
                  <span className="min-w-0 flex-1">
                    <b className="block font-semibold">{s.label}</b>
                    <small className="block text-[13px] leading-[18px] text-ink-muted">{s.detail}</small>
                  </span>
                  <span
                    className={`grid size-[22px] shrink-0 place-items-center rounded-full border-[1.5px] ${
                      selected ? 'border-accent bg-accent text-on-accent' : 'border-control'
                    }`}
                  >
                    {selected && <Icon name="check" strokeWidth={3} className="size-[13px]" />}
                  </span>
                </button>
              )
            })}
          </div>
        </Body>
      )}

      {step === 2 && (
        <Body title="Une ligne à la fois">
          <div className="mt-4 grid grid-cols-5 gap-2" aria-hidden="true">
            {firstLine.map((g, i) => (
              <KanaTile
                key={g.id}
                kana={getKana(g.kanaIds[0]!)!.char}
                variant={i === 0 ? 'current' : 'locked'}
                fill={0}
              />
            ))}
          </div>
          <ol className="mt-4 border-t border-hairline">
            <Point n={1} title="Vous découvrez cinq kana">
              La ligne <span className="font-jp">{firstKana[0]?.char}</span> :{' '}
              {firstKana.map((k) => k.romaji[0]).join(', ')}.
            </Point>
            <Point n={2} title="À quatre sur cinq, la suivante s’ouvre">
              Vous avancez à votre rythme, sans rien régler.
            </Point>
            <Point n={3} title="Les anciens reviennent au bon moment">
              Juste avant que vous ne les oubliiez.
            </Point>
          </ol>
        </Body>
      )}

      {step === 3 && (
        <Body
          title="Qui apprend ?"
          intro="Un prénom suffit. Chaque profil garde sa propre progression ; vous pourrez en ajouter pour vos proches."
        >
          <div className="mt-4 flex items-center gap-3">
            <ProfileSeal name={shownName} className="size-11 text-[22px]" />
            <TextField
              variant="ui"
              className="min-w-0 flex-1"
              value={shownName}
              onChange={(e) => setName(e.target.value)}
              maxLength={30}
              placeholder="Prénom"
              aria-label="Prénom"
              enterKeyHint="done"
            />
          </div>
        </Body>
      )}

      <div className="sticky bottom-0 z-10 -mx-4 mt-auto bg-paper px-4 pt-3 pb-1">
        <div className="mb-3 flex justify-center gap-1.5" aria-label={`Étape ${step + 1} sur ${STEPS}`} role="img">
          {Array.from({ length: STEPS }, (_, i) => (
            <i key={i} className={`h-1.5 rounded-[1px] ${i === step ? 'w-5 bg-ink' : 'w-1.5 bg-control'}`} />
          ))}
        </div>
        {step === 0 && (
          <div className="flex flex-col gap-1">
            <Button onClick={() => setStep(1)}>Commencer</Button>
            <ImportBackupButton variant="text">J’ai une sauvegarde à importer</ImportBackupButton>
          </div>
        )}
        {(step === 1 || step === 2) && (
          <div className="flex gap-3">
            <Button variant="line" fullWidth={false} icon="chevronLeft" iconPosition="start" onClick={() => setStep(step - 1)}>
              Retour
            </Button>
            <Button className="flex-1" onClick={() => setStep(step + 1)}>
              Continuer
            </Button>
          </div>
        )}
        {step === 3 && (
          <div className="flex flex-col gap-1">
            <Button
              icon="arrow"
              detail={`${firstKana.length} kana à découvrir · environ 3 min`}
              onClick={() => finish('session')}
            >
              Première session
            </Button>
            <Button variant="text" onClick={() => finish('home')}>
              Voir d’abord l’accueil
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

function Body({ title, intro, children }: { title: string; intro?: string; children: ReactNode }) {
  return (
    <div className="mt-2">
      <h1 className="font-serif text-[26px] leading-tight font-medium">{title}</h1>
      {intro && <p className="mt-2 text-[14.5px] leading-5 text-ink-muted">{intro}</p>}
      {children}
    </div>
  )
}

function Point({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <li className="flex min-h-14 items-center gap-3 border-b border-hairline py-2">
      <span className="grid size-8 shrink-0 place-items-center rounded-sm border-[1.5px] border-ink font-serif text-[15px] font-medium">
        {n}
      </span>
      <span className="min-w-0">
        <b className="block font-semibold">{title}</b>
        <small className="block text-[13px] leading-[18px] text-ink-muted">{children}</small>
      </span>
    </li>
  )
}
