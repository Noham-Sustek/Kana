import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import { Banner } from '@/components/Banner'
import { Button } from '@/components/Button'
import { KanaTile } from '@/components/KanaTile'
import { SegmentText } from '@/components/SegmentText'
import { WeekStrip } from '@/components/WeekStrip'
import { ReloadHome } from '@/components/reload/ReloadHome'
import { KANA_GROUPS, getKana } from '@/data/kana'
import { backupReminder, sessionCta, type PathTile } from '@/features/home/home'
import { useHome } from '@/features/home/useHome'
import { freeSessionLine } from '@/features/learn/learn'
import { AUTO_STAGES } from '@/features/quiz/auto'
import { useCustomGroups } from '@/features/quiz/useQuizPool'
import { downloadBackup } from '@/lib/backupFile'
import { useStartDailySession } from '@/lib/useStartDailySession'
import { useUiStyle } from '@/lib/useUiStyle'
import { useQuizSettingsStore } from '@/stores/quizSettingsStore'
import { useSettingsStore } from '@/stores/settingsStore'

/** Accueil : où j'en suis (série, parcours, kana à consolider), que faire maintenant (Session du jour). */
export function HomePage() {
  const script = useQuizSettingsStore((s) => s.autoScript)
  const questionCount = useQuizSettingsStore((s) => s.questionCount)
  const home = useHome(script, AUTO_STAGES)
  const startDaily = useStartDailySession()
  const navigate = useNavigate()
  const lastBackupAt = useSettingsStore((s) => s.lastBackupAt)
  const dismissedAt = useSettingsStore((s) => s.backupReminderDismissedAt)
  const dismissReminder = useSettingsStore((s) => s.dismissBackupReminder)
  const reload = useUiStyle() === 'reload'
  const quiz = useQuizSettingsStore()
  const lists = useCustomGroups()

  // Rien tant que la base n'est pas lue (un instant au démarrage) : pas d'état vide trompeur.
  if (!home) return null

  const { streak, path, weak } = home
  const cta = sessionCta({
    hasHistory: home.hasHistory,
    doneToday: home.doneToday,
    questionCount,
    focus: path.focus,
  })
  // Rappel seulement une fois la session faite : il ne détourne pas de l'action du jour.
  const reminder = home.doneToday
    ? backupReminder({ now: Date.now(), firstAnswerAt: home.firstAnswerAt, lastBackupAt, dismissedAt })
    : null

  if (reload) {
    const groupCount = KANA_GROUPS.filter((g) => quiz.groupIds.includes(g.id)).length
    const listCount = lists.filter((l) => quiz.customGroupIds.includes(l.id)).length
    return (
      <ReloadHome
        home={home}
        script={script}
        cta={cta}
        freeLine={freeSessionLine(quiz.stage, groupCount, listCount, quiz.questionCount)}
        reminder={reminder}
        onStartDaily={startDaily}
        onExport={() => void downloadBackup()}
        onDismissReminder={() => dismissReminder(Date.now())}
      />
    )
  }

  return (
    // Grand écran : parcours et kana à consolider à gauche, série et action du jour à droite.
    <div className="flex min-h-full flex-col lg:grid lg:min-h-0 lg:grid-cols-[minmax(0,1fr)_22rem] lg:grid-rows-[auto_1fr] lg:items-start lg:gap-x-14 lg:pt-4">
      <section className="lg:col-start-2 lg:row-start-1">
        <Overline>Série</Overline>
        <div className="mt-3 flex items-end justify-between gap-4">
          <p className="font-serif text-[64px] leading-[0.9] font-medium tracking-[-0.02em] tabular-nums">
            {streak.days}
            <small className="ml-1.5 text-[17px] leading-none tracking-normal text-ink-muted">
              {streak.days > 1 ? 'jours' : 'jour'}
            </small>
          </p>
          <WeekStrip days={streak.week} />
        </div>
        <p className="mt-2 text-[13.5px] leading-[19px] text-ink-muted">{streak.message}</p>
      </section>

      <hr className="my-5 border-hairline lg:hidden" />

      <div className="lg:col-start-1 lg:row-span-2 lg:row-start-1">
        <section>
          <Overline aside={`${path.doneCount} ligne${path.doneCount > 1 ? 's' : ''} sur ${path.total}`}>
            Parcours · {script}
          </Overline>
        <ul className="mt-2.5 grid grid-cols-5 gap-2 lg:grid-cols-8">
          {path.tiles.map((tile) => (
            <li key={tile.group.id}>
              <KanaTile
                kana={tile.glyph}
                variant={tile.state}
                fill={tile.fill}
                label={tileLabel(tile)}
                className="w-full"
              />
            </li>
          ))}
        </ul>
        <p className="mt-2.5 text-[13.5px] leading-[19px]">
          <strong className="font-semibold">
            <SegmentText line={path.headline} />
          </strong>{' '}
          <SegmentText line={path.detail} />
        </p>
      </section>

      <hr className="my-5 border-hairline" />

      <section>
        <Overline aside={weak.length > 0 ? <Link to="/progress">Tout voir</Link> : undefined}>À consolider</Overline>
        {weak.length > 0 ? (
          <ul className="mt-2 grid grid-cols-5 gap-2 lg:grid-cols-8">
            {weak.map(({ kanaId, recentRate }) => {
              const kana = getKana(kanaId)!
              return (
                <li key={kanaId}>
                  <KanaTile
                    kana={kana.char}
                    romaji={kana.romaji[0]}
                    label={`${kana.char}, ${kana.romaji[0]}, réussite récente ${Math.round(recentRate * 100)} %. Ouvrir la fiche`}
                    onClick={() => navigate(`/kana/${kanaId}`)}
                    className="w-full"
                  />
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="mt-2 text-[13.5px] leading-[19px] text-ink-muted">
            Rien pour l’instant. Les kana qui vous résistent apparaîtront ici.
          </p>
        )}
      </section>

      {reminder && (
        <Banner
          icon="download"
          actionLabel="Exporter maintenant"
          onAction={() => void downloadBackup()}
          onDismiss={() => dismissReminder(Date.now())}
          className="mt-5"
        >
          <strong className="font-semibold">{reminder}</strong>
        </Banner>
      )}
      </div>

      <div className="sticky -bottom-4 z-10 -mx-4 mt-auto bg-paper px-4 pt-6 pb-5 lg:static lg:col-start-2 lg:row-start-2 lg:mx-0 lg:mt-0 lg:px-0">
        <Button variant={cta.secondary ? 'line' : 'primary'} detail={cta.detail} icon="arrow" onClick={startDaily}>
          {cta.label}
        </Button>
        <Link
          to="/learn/libre"
          className="mt-1 flex min-h-11 items-center justify-center text-[14.5px] font-semibold text-accent"
        >
          Session libre
        </Link>
      </div>
    </div>
  )
}

/** Surtitre de section, avec à droite un compteur ou un lien. */
function Overline({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h2 className="text-[11px] leading-[14px] font-bold tracking-[0.12em] text-ink-muted uppercase">{children}</h2>
      {aside && (
        <span className="text-[12.5px] leading-[14px] font-semibold text-accent [&_a]:-my-[15px] [&_a]:inline-flex [&_a]:min-h-11 [&_a]:items-center">
          {aside}
        </span>
      )}
    </div>
  )
}

function tileLabel(tile: PathTile): string {
  const size = tile.group.kanaIds.length
  if (tile.state === 'done') return `Ligne ${tile.glyph}, acquise`
  if (tile.state === 'locked') return `Ligne ${tile.glyph}, verrouillée`
  return `Ligne ${tile.glyph}, ${Math.round(tile.fill * size)} kana acquis sur ${size}`
}
