import { useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import { Banner } from '@/components/Banner'
import { ProfileSheet } from '@/components/ProfileSheet'
import { SegmentText } from '@/components/SegmentText'
import { ReloadGuide } from '@/components/reload/ReloadGuide'
import { ReloadMenu, type ReloadMenuItem } from '@/components/reload/ReloadMenu'
import { getKana } from '@/data/kana'
import type { SessionCta } from '@/features/home/home'
import type { HomeData } from '@/features/home/useHome'
import { useMediaQuery } from '@/lib/useMediaQuery'
import { useProfiles } from '@/lib/useProfiles'
import { useProfileStore } from '@/stores/profileStore'

interface ReloadHomeProps {
  home: HomeData
  script: string
  cta: SessionCta
  freeLine: string
  reminder: string | null
  onStartDaily: () => void
  onExport: () => void
  onDismissReminder: () => void
}

interface Entry {
  id: string
  label: string
  title: string
  detail: string
  cta: string
  to?: string
}

const DAY_LETTERS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
const DAY_NAMES = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']

// Position, taille et inclinaison de chaque mot (téléphone, puis grand écran) : chacun penche
// à sa façon, comme dans le menu de pause de référence.
const PHONE: Omit<ReloadMenuItem, 'id' | 'label'>[] = [
  { size: 32, angle: -12, x: 24, y: 106, color: '#6de6ff' },
  { size: 30, angle: -8, x: 50, y: 150, color: '#78f6ff' },
  { size: 24, angle: -14, x: 18, y: 200, color: '#7affff' },
  { size: 34, angle: -7, x: 56, y: 244, color: '#22ccff' },
  { size: 26, angle: -10, x: 28, y: 288, color: 'rgba(110, 175, 255, 0.92)' },
  { size: 24, angle: 7, x: 46, y: 320, color: '#1fd0ff' },
]
const WIDE: Omit<ReloadMenuItem, 'id' | 'label'>[] = [
  { size: 46, angle: -12, x: 150, y: 190, color: '#6de6ff' },
  { size: 42, angle: -8, x: 196, y: 262, color: '#78f6ff' },
  { size: 34, angle: -14, x: 140, y: 350, color: '#7affff' },
  { size: 48, angle: -7, x: 206, y: 420, color: '#22ccff' },
  { size: 36, angle: -10, x: 158, y: 490, color: 'rgba(110, 175, 255, 0.92)' },
  { size: 34, angle: 7, x: 190, y: 548, color: '#1fd0ff' },
]

/** Accueil du style Reload : profil, série et parcours en haut, menu de pause au centre
 *  (il remplace les onglets), kana à consolider dessous, guide de la commande choisie en bas. */
export function ReloadHome({ home, script, cta, freeLine, reminder, onStartDaily, onExport, onDismissReminder }: ReloadHomeProps) {
  const navigate = useNavigate()
  const wide = useMediaQuery('(min-width: 1024px)')
  const [selected, setSelected] = useState(0)
  const [profileOpen, setProfileOpen] = useState(false)
  const profiles = useProfiles()
  const profileId = useProfileStore((s) => s.profileId)
  const profile = profiles.find((p) => p.id === profileId)
  const { streak, path, weak } = home

  const entries: Entry[] = [
    { id: 'session', label: 'SESSION', title: cta.label, detail: cta.detail, cta: 'Commencer' },
    { id: 'libre', label: 'LIBRE', title: 'Session libre', detail: freeLine, cta: 'Composer', to: '/learn/libre' },
    {
      id: 'learn',
      label: 'S’ENTRAÎNER',
      title: 'S’entraîner',
      detail: 'Reconnaître, écrire, lire : un exercice au choix, la révision ciblée, vos listes.',
      cta: 'Ouvrir',
      to: '/learn',
    },
    { id: 'kana', label: 'KANA', title: 'Kana', detail: 'Les lignes et le tableau des kana. Chaque kana ouvre sa fiche.', cta: 'Ouvrir', to: '/kana' },
    { id: 'progress', label: 'PROGRÈS', title: 'Progrès', detail: 'Série, réussite, activité, kana les plus ratés.', cta: 'Voir', to: '/progress' },
    { id: 'settings', label: 'RÉGLAGES', title: 'Réglages', detail: 'Apparence, saisie, profils, sauvegarde.', cta: 'Ouvrir', to: '/settings' },
  ]
  const layout = wide ? WIDE : PHONE
  const items: ReloadMenuItem[] = entries.map((e, i) => ({
    id: e.id,
    label: e.label,
    ...layout[i]!,
    sound: e.id === 'session' ? 'launch' : 'forward',
    aria: e.id === 'session' ? `${cta.label}, ${cta.detail}` : e.title,
  }))
  const current = entries[selected]!
  const activate = (i: number) => {
    const e = entries[i]!
    if (e.id === 'session') onStartDaily()
    else if (e.to) navigate(e.to)
  }

  const name = profile?.name ?? ''
  const initial = name.trim().charAt(0).toLocaleUpperCase('fr-FR') || '?'

  return (
    <div className="relative flex flex-1 flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_26rem] lg:grid-rows-[auto_auto_1fr] lg:gap-x-10">
      <h1 className="sr-only">Accueil</h1>
      {/* Prénom en très grand, à la verticale sur le bord gauche (le personnage du menu de pause). */}
      <span
        aria-hidden="true"
        className="rl-word rl-name pointer-events-none absolute -left-11 -rotate-90 text-[#05081f] lg:-left-16"
        style={{
          top: 'calc(100% - 24px)',
          fontSize: wide ? 150 : Math.min(104, Math.round(560 / Math.max(4, name.length))),
          textShadow: '3px 3px 0 rgba(255,255,255,0.75)',
          transformOrigin: '0 0',
        }}
      >
        {name.toLocaleUpperCase('fr-FR')}
      </span>

      <div className="relative z-10 lg:col-start-2 lg:row-start-1">
        <div className="flex items-start justify-between gap-3">
          <button
            type="button"
            onClick={() => setProfileOpen(true)}
            aria-label={profile ? `Profil : ${profile.name}. Changer de profil` : 'Changer de profil'}
            className="flex min-h-11 items-center gap-2 border-2 border-[#05081f] bg-white py-1 pr-3 pl-1.5 text-[#05081f] active:translate-x-[2px]"
            data-tap-sound="open"
          >
            <span aria-hidden="true" className="rl-cond grid size-7 place-items-center border-[1.5px] border-[#05081f] text-[17px] font-extrabold">
              {initial}
            </span>
            <span className="flex flex-col items-start leading-none">
              <span className="rl-cond max-w-[9rem] truncate text-[19px] font-extrabold">{name} ▾</span>
              <span className="rl-cond text-[10px] font-semibold">profil actif</span>
            </span>
          </button>
          <div className="rl-topink flex flex-col items-end">
            <p className="flex items-end gap-1">
              <span className="rl-display text-[44px] leading-[0.8]">{streak.days}</span>
              <span className="rl-cond pb-0.5 text-[16px] font-extrabold">{streak.days > 1 ? 'jours' : 'jour'}</span>
            </p>
            <span className="rl-cond text-[10px] font-extrabold tracking-[0.06em]">SÉRIE</span>
            <div role="img" aria-label={`${streak.week.filter((d) => d === 'on').length} jours sur 7 cette semaine`} className="mt-1 flex gap-[3px]">
              {streak.week.map((d, i) => (
                <span key={DAY_NAMES[i]} className="flex flex-col items-center gap-0.5">
                  <span className="rl-cond text-[9px] font-extrabold">{DAY_LETTERS[i]}</span>
                  <span
                    className={`size-3.5 -skew-x-12 ${
                      d === 'on' ? 'rl-topfill' : d === 'today' ? 'border-2 border-dashed border-current' : 'border-[1.5px] border-current opacity-30'
                    }`}
                  />
                </span>
              ))}
            </div>
          </div>
        </div>

        <section aria-label="Parcours" className="rl-panel relative z-10 -mx-4 mt-3 py-2 pr-9 pl-4 lg:mx-0">
          <div className="rl-cond flex justify-between text-[12px] font-extrabold tracking-[0.04em]">
            <span className="text-[#9af4ff]">PARCOURS · {script.toLocaleUpperCase('fr-FR')}</span>
            <span>
              {path.doneCount} ligne{path.doneCount > 1 ? 's' : ''} sur {path.total}
            </span>
          </div>
          <ul className="rl-stagger mt-1.5 flex gap-[3px]">
            {path.tiles.map((tile) => {
              const size = tile.group.kanaIds.length
              const label =
                tile.state === 'done'
                  ? `Ligne ${tile.glyph}, acquise`
                  : tile.state === 'locked'
                    ? `Ligne ${tile.glyph}, verrouillée`
                    : `Ligne ${tile.glyph}, ${Math.round(tile.fill * size)} kana acquis sur ${size}`
              return (
                <li
                  key={tile.group.id}
                  aria-label={label}
                  className={`relative grid h-8 w-[30px] -skew-x-[10deg] place-items-center overflow-hidden ${
                    tile.state === 'done'
                      ? 'bg-[#5ce1ff] text-[#05081f]'
                      : tile.state === 'current'
                        ? 'bg-white text-[#05081f]'
                        : 'text-white/45 shadow-[inset_0_0_0_1.5px_rgba(255,255,255,0.35)]'
                  }`}
                >
                  {tile.state === 'current' && (
                    <span aria-hidden="true" className="absolute inset-x-0 bottom-0 bg-[#5ce1ff]/70" style={{ height: `${tile.fill * 100}%` }} />
                  )}
                  <span className="relative skew-x-[10deg] font-jp text-[17px]">{tile.glyph}</span>
                </li>
              )
            })}
          </ul>
          <p className="mt-1.5 text-[13px] leading-[18px] font-semibold">
            <strong className="text-[#5ce1ff]">
              <SegmentText line={path.headline} />
            </strong>{' '}
            <SegmentText line={path.detail} />
          </p>
        </section>
      </div>

      <ReloadMenu
        label="Menu principal"
        items={items}
        selected={selected}
        onSelect={setSelected}
        onActivate={activate}
        maxRight={wide ? 660 : 330}
        height={wide ? 600 : 340}
        className="mt-1 lg:col-start-1 lg:row-span-3 lg:row-start-1 lg:mt-0 lg:self-center"
      />

      <div className="relative lg:col-start-2 lg:row-start-2">
        <Section
          title="À consolider"
          aside={weak.length > 0 ? <Link to="/progress" className="-my-3 inline-flex min-h-11 items-center underline">Tout voir</Link> : undefined}
        >
          {weak.length > 0 ? (
            <ul className="rl-stagger flex gap-1">
              {weak.slice(0, 4).map(({ kanaId, recentRate }) => {
                const kana = getKana(kanaId)!
                const pct = Math.round(recentRate * 100)
                return (
                  <li key={kanaId} className="min-w-0 flex-1">
                    <Link
                      to={`/kana/${kanaId}`}
                      data-tap-sound="forward"
                      aria-label={`${kana.char}, ${kana.romaji[0]}, réussite récente ${pct} %. Ouvrir la fiche`}
                      className="flex h-[52px] items-center gap-1.5 bg-[#05081f] pr-1.5 pl-1 [clip-path:polygon(8%_0,100%_0,92%_100%,0_100%)] active:bg-white active:text-[#05081f]"
                    >
                      <span className="grid size-[34px] shrink-0 place-items-center bg-white font-jp text-[21px] text-[#05081f] [clip-path:polygon(10%_0,100%_0,90%_100%,0_100%)]">
                        {kana.char}
                      </span>
                      <span className="flex min-w-0 flex-col gap-[3px]">
                        <span className="rl-cond truncate text-[15px] leading-none font-bold">{kana.romaji[0]}</span>
                        <span className="h-1 w-8 -skew-x-[24deg] bg-white/20">
                          <span className="block h-full bg-[#f2c300]" style={{ width: `${pct}%` }} />
                        </span>
                        <span className="rl-cond text-[10px] leading-none font-bold text-[#f2c300]">{pct} %</span>
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="text-[13.5px] leading-[19px] font-semibold text-white/85">Rien pour l’instant. Les kana qui vous résistent apparaîtront ici.</p>
          )}
        </Section>
        {reminder && (
          <Banner icon="download" actionLabel="Exporter maintenant" onAction={onExport} onDismiss={onDismissReminder} className="mt-3">
            <strong className="font-semibold">{reminder}</strong>
          </Banner>
        )}
      </div>

      <ReloadGuide
        caption="Commande"
        title={current.title}
        detail={current.detail}
        className="lg:col-start-2 lg:row-start-3"
        actions={[
          current.id === 'session'
            ? { label: current.cta, kind: 'primary', onClick: onStartDaily, keyHint: 'Entrée', sound: 'launch' }
            : { label: current.cta, kind: 'primary', to: current.to, keyHint: 'Entrée', sound: 'forward' },
        ]}
      />
      <ProfileSheet open={profileOpen} onClose={() => setProfileOpen(false)} />
    </div>
  )
}

function Section({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="mt-2">
      <div className="rl-cond mb-1 flex items-baseline justify-between text-[12px] font-extrabold tracking-[0.04em]">
        <h2 className="rl-shadow">{title.toLocaleUpperCase('fr-FR')}</h2>
        {aside && <span className="text-[13px]">{aside}</span>}
      </div>
      {children}
    </section>
  )
}
