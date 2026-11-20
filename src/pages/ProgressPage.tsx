import { useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { Button } from '@/components/Button'
import { EmptyState } from '@/components/EmptyState'
import { Icon } from '@/components/Icon'
import { ProgressBar } from '@/components/ProgressBar'
import { SegmentedControl } from '@/components/SegmentedControl'
import { getKana } from '@/data/kana'
import { buildProgress } from '@/engine/scheduler'
import { useKanaProgress } from '@/features/kana/useKanaProgress'
import { bestChronoRecord } from '@/features/learn/learn'
import { AUTO_STAGES } from '@/features/quiz/auto'
import { FAMILIES, type StageFamily } from '@/features/quiz/stages'
import { formatResponseTime } from '@/features/quiz/summary'
import {
  PERIOD_OPTIONS,
  acquiredByFamily,
  acquiredByScript,
  activityTip,
  inPeriod,
  shortDate,
  type Period,
} from '@/features/stats/progress'
import { computeStreak, dailyActivity, kanaStats, mostMissed, summarize, type DayActivity } from '@/features/stats/stats'
import { useStartDailySession } from '@/lib/useStartDailySession'
import { useChronoSettingsStore } from '@/stores/chronoSettingsStore'
import { useProfileStore } from '@/stores/profileStore'
import { ReloadGuide } from '@/components/reload/ReloadGuide'
import { useUiStyle } from '@/lib/useUiStyle'

const ACTIVITY_DAYS = 14
const MISSED_LIMIT = 5
const FAMILY_ORDER: StageFamily[] = ['recognize', 'write', 'read']

/** Onglet Progrès : série, réussite, kana acquis, activité, familles, les plus ratés, lecture et écriture. */
export function ProgressPage() {
  const navigate = useNavigate()
  const data = useKanaProgress()
  const profileId = useProfileStore((s) => s.profileId)
  const chronoBest = useChronoSettingsStore((s) => s.best)
  const chrono = bestChronoRecord(chronoBest, profileId)
  const startDaily = useStartDailySession('/progress')
  const [period, setPeriod] = useState<Period>(30)
  const reload = useUiStyle() === 'reload'

  const view = useMemo(() => {
    if (!data) return null
    const now = Date.now()
    const recent = inPeriod(data.answers, period, now)
    const progress = buildProgress(data.answers)
    return {
      now,
      streak: computeStreak(data.answers, now),
      summary: summarize(recent),
      scripts: acquiredByScript(progress, AUTO_STAGES),
      families: acquiredByFamily(progress, data.perKana.keys()),
      activity: dailyActivity(data.answers, now, ACTIVITY_DAYS),
      missed: mostMissed(kanaStats(recent), MISSED_LIMIT),
      traced: [...data.writing.values()].filter((l) => l >= 1).length,
      fromMemory: [...data.writing.values()].filter((l) => l === 2).length,
    }
  }, [data, period])

  if (!data || !view) return null

  if (data.answers.length === 0) {
    return (
      <div className="flex min-h-[70dvh] flex-col justify-center">
        <h1 className="sr-only">Progrès</h1>
        <EmptyState
          icon="stats"
          title="Vos progrès apparaîtront ici"
          action={
            <Button size="sm" fullWidth={false} onClick={startDaily}>
              Session du jour
            </Button>
          }
        >
          Série, réussite, kana acquis : une première session suffit pour commencer à les suivre.
        </EmptyState>
        {reload && <ReloadGuide title="Progrès" actions={[{ label: 'Retour', kind: 'back', to: '/home', keyHint: 'Échap' }]} />}
      </div>
    )
  }

  const periodLabel = PERIOD_OPTIONS.find((p) => p.value === period)!.label
  const acquired = view.scripts.hiragana.acquired + view.scripts.katakana.acquired
  const total = view.scripts.hiragana.total + view.scripts.katakana.total

  return (
    <div className={reload ? 'flex flex-1 flex-col' : 'pb-6'}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <h1 className="sr-only font-serif text-[28px] leading-tight font-medium lg:not-sr-only">Progrès</h1>
        <div className="lg:w-80">
          <SegmentedControl label="Période" options={PERIOD_OPTIONS} value={period} onChange={setPeriod} />
        </div>
      </div>

      <div className="lg:mt-2 lg:grid lg:grid-cols-2 lg:items-start lg:gap-x-10">
        <div>
          <dl className="mt-5 grid grid-cols-3 gap-3">
            <Stat value={`${view.streak.current} j`} label={`Série · record ${view.streak.best}`} />
            <Stat
              value={view.summary.questions === 0 ? '—' : `${Math.round(view.summary.successRate * 100)} %`}
              label="Réussite"
            />
            <Stat
              value={view.summary.averageResponseMs === null ? '—' : formatResponseTime(view.summary.averageResponseMs)}
              label="Temps moyen"
            />
          </dl>

          <Section title="Activité · réponses par jour" aside={`${ACTIVITY_DAYS} derniers jours`}>
            <ActivityChart days={view.activity} now={view.now} />
          </Section>
        </div>

        <div>
          <Section title="Kana acquis" aside={`${acquired} sur ${total}`} className="lg:mt-5 lg:border-t-0 lg:pt-0">
            <ProgressBar value={acquired / total} label="Kana acquis" />
            <p className="mt-2 flex justify-between text-[13px] leading-[18px] text-ink-muted tabular-nums">
              <span>
                Hiragana {view.scripts.hiragana.acquired} / {view.scripts.hiragana.total}
              </span>
              <span>
                Katakana {view.scripts.katakana.acquired} / {view.scripts.katakana.total}
              </span>
            </p>
          </Section>

          <Section title="Kana acquis par famille" aside={`sur ${view.families.seen} travaillés`}>
            {FAMILY_ORDER.map((family) => {
              const count = view.families.counts[family]
              return (
                <div key={family} className="grid min-h-9 grid-cols-[7.5rem_1fr_3.5rem] items-center gap-2.5 text-[13.5px]">
                  <span className="flex items-center gap-1.5">
                    <Icon name={FAMILIES[family].icon} className="size-4 text-ink-muted" />
                    {FAMILIES[family].label}
                  </span>
                  <ProgressBar value={view.families.seen ? count / view.families.seen : 0} label={FAMILIES[family].label} />
                  <span className="text-right font-semibold tabular-nums">
                    {count} / {view.families.seen}
                  </span>
                </div>
              )
            })}
          </Section>

          <Section title="Les plus ratés" aside={periodLabel}>
            {view.missed.length === 0 ? (
              <p className="text-[14.5px] leading-5 text-ink-muted">Rien à signaler sur cette période.</p>
            ) : (
              <>
                <ul className="border-t border-hairline">
                  {view.missed.map((s) => {
                    const kana = getKana(s.kanaId)!
                    const errors = s.attempts - s.correct
                    return (
                      <li key={s.kanaId}>
                        <button
                          type="button"
                          onClick={() => navigate(`/kana/${kana.id}`)}
                          className="flex min-h-14 w-full items-center gap-3 border-b border-hairline py-2 text-left active:brightness-90"
                        >
                          <span className="w-9 shrink-0 text-center font-jp text-[28px] leading-none">{kana.char}</span>
                          <span className="min-w-0 flex-1">
                            <b className="block font-semibold">
                              {kana.romaji[0]} · {Math.round(s.recentRate * 100)} %
                            </b>
                            <small className="block text-[13px] leading-[18px] text-ink-muted">
                              {errors} erreur{errors > 1 ? 's' : ''} sur {s.attempts} réponses
                            </small>
                          </span>
                          <Icon name="chevronRight" className="size-5 shrink-0 text-ink-muted" />
                        </button>
                      </li>
                    )
                  })}
                </ul>
                <Button
                  variant="line"
                  size="sm"
                  fullWidth={false}
                  icon="list"
                  iconPosition="start"
                  className="mt-3"
                  onClick={() => navigate(`/learn/custom/new?kana=${view.missed.map((s) => s.kanaId).join(',')}`)}
                >
                  En faire une liste
                </Button>
              </>
            )}
          </Section>

          <Section title="Lecture et écriture">
            <dl className="grid grid-cols-2 gap-3">
              <Stat
                value={chrono ? String(chrono.score) : '—'}
                label={chrono ? `kana/min · record ${chrono.duration / 60} min` : 'Lecture chronométrée : pas encore'}
              />
              <Stat value={`${view.traced} · ${view.fromMemory}`} label="kana au calque · de mémoire" />
            </dl>
          </Section>
        </div>
      </div>
      {reload && <ReloadGuide title="Progrès" actions={[{ label: 'Retour', kind: 'back', to: '/home', keyHint: 'Échap' }]} />}
    </div>
  )
}

function ActivityChart({ days, now }: { days: DayActivity[]; now: number }) {
  // Dernier jour sélectionné par défaut ; une barre touchée montre son détail.
  const [selected, setSelected] = useState(days.length - 1)
  const [asTable, setAsTable] = useState(false)
  const max = Math.max(1, ...days.map((d) => d.questions))
  const current = days[selected]
  const tip = current ? activityTip(current, now) : null

  return (
    <>
      {tip && (
        <p className="mb-2 rounded-sm bg-ink px-2.5 py-1.5 text-[12.5px] leading-[17px] font-semibold text-paper" aria-live="polite">
          {tip.title}
          <small className="block font-normal opacity-85">{tip.detail}</small>
        </p>
      )}
      <div
        className="flex h-32 items-end gap-0.5 border-b border-control bg-[linear-gradient(to_bottom,var(--k-hairline)_1px,transparent_1px)] bg-[length:100%_50%]"
        role="group"
        aria-label="Réponses par jour"
      >
        {days.map((d, i) => (
          <button
            key={d.day}
            type="button"
            onClick={() => setSelected(i)}
            aria-label={`${activityTip(d, now).title}`}
            aria-pressed={i === selected}
            className="flex h-full flex-1 items-end"
          >
            <span
              className={`block w-full ${d.questions === 0 ? 'h-0.5 bg-control' : `rounded-t-[4px] ${i === selected ? 'bg-ink' : 'bg-accent'}`}`}
              style={d.questions === 0 ? undefined : { height: `${Math.max(2, (d.questions / max) * 100)}%` }}
            />
          </button>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[11.5px] leading-4 font-medium text-ink-muted">
        <span>{shortDate(days[0]!.day)}</span>
        <span>{max} max</span>
        <span>{shortDate(days.at(-1)!.day)}</span>
      </div>
      <Button variant="text" size="sm" fullWidth={false} className="mt-1 -ml-3" onClick={() => setAsTable(!asTable)}>
        {asTable ? 'Masquer le tableau' : 'Voir en tableau'}
      </Button>
      {asTable && (
        <table className="mt-1 w-full text-[13px] tabular-nums">
          <thead className="text-left text-ink-muted">
            <tr>
              <th className="py-1 font-semibold">Jour</th>
              <th className="py-1 text-right font-semibold">Réponses</th>
              <th className="py-1 text-right font-semibold">Justes</th>
            </tr>
          </thead>
          <tbody>
            {[...days].reverse().map((d) => (
              <tr key={d.day} className="border-t border-hairline">
                <td className="py-1.5">{shortDate(d.day)}</td>
                <td className="py-1.5 text-right">{d.questions}</td>
                <td className="py-1.5 text-right">{d.correct}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  )
}

function Section({
  title,
  aside,
  className = '',
  children,
}: {
  title: string
  aside?: ReactNode
  className?: string
  children: ReactNode
}) {
  return (
    <section className={`mt-5 border-t border-hairline pt-5 ${className}`}>
      <div className="mb-2.5 flex items-baseline justify-between gap-3">
        <h2 className="text-[11px] leading-[14px] font-bold tracking-[0.12em] text-ink-muted uppercase">{title}</h2>
        {aside && <span className="text-[12.5px] leading-[14px] font-semibold text-accent">{aside}</span>}
      </div>
      {children}
    </section>
  )
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <dd className="font-serif text-[22px] leading-7 font-medium tabular-nums">{value}</dd>
      <dt className="text-[12.5px] leading-4 text-ink-muted">{label}</dt>
    </div>
  )
}
