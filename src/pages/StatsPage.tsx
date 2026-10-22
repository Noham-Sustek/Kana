import { useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { HEAT_CLASSES, HeatmapLegend } from '@/components/HeatmapLegend'
import { KANA_CELL_CLASS, KanaCellContent, KanaGrid } from '@/components/KanaGrid'
import { PageHeader } from '@/components/PageHeader'
import { ProfileSwitcher } from '@/components/ProfileSwitcher'
import { ScriptToggle } from '@/components/ScriptToggle'
import { getKana, type Script } from '@/data/kana'
import { heatLevel } from '@/features/stats/heat'
import { mostMissed, type DayActivity, type KanaStat } from '@/features/stats/stats'
import { ACTIVITY_DAYS, useProfileStats } from '@/features/stats/useProfileStats'

const MISSED_LIMIT = 8

const percent = new Intl.NumberFormat('fr-FR', { style: 'percent', maximumFractionDigits: 0 })
const seconds = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1, minimumFractionDigits: 1 })

export function StatsPage() {
  const stats = useProfileStats()
  const [script, setScript] = useState<Script>('hiragana')

  return (
    <>
      <PageHeader title="Stats" subtitle="Ta progression en un coup d'œil." />
      <ProfileSwitcher />

      {stats && stats.summary.questions === 0 && (
        <p className="rounded-2xl border border-dashed border-slate-300 px-6 py-12 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
          Aucune réponse enregistrée pour ce profil. Lancez un quiz dans l’onglet <b>Apprendre</b> !
        </p>
      )}

      {stats && stats.summary.questions > 0 && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <Tile
              label="Série"
              value={`${stats.streak.current} j`}
              detail={`Record : ${stats.streak.best} j${stats.streak.today ? '' : ' · rien aujourd’hui'}`}
            />
            <Tile
              label="Réussite"
              value={percent.format(stats.summary.successRate)}
              detail={`${stats.summary.questions} question${stats.summary.questions > 1 ? 's' : ''}`}
            />
            <Tile
              label="Temps moyen"
              value={
                stats.summary.averageResponseMs === null
                  ? '—'
                  : `${seconds.format(stats.summary.averageResponseMs / 1000)} s`
              }
              detail="par réponse"
            />
            <Tile label="Kana vus" value={String(stats.perKana.size)} detail="au moins une fois" />
          </div>

          <Card title={`Activité (${ACTIVITY_DAYS} derniers jours)`}>
            <ActivityChart days={stats.activity} />
          </Card>

          <Card title="Kana les plus ratés">
            <MissedList missed={mostMissed(stats.perKana, MISSED_LIMIT)} />
          </Card>

          <Card title="Réussite par kana">
            <ScriptToggle value={script} onChange={setScript} />
            <HeatmapLegend />
            <KanaGrid
              script={script}
              renderCell={(kana) => (
                <Link
                  to={`/table/${kana.id}`}
                  className={`${KANA_CELL_CLASS} ${HEAT_CLASSES[heatLevel(stats.perKana.get(kana.id))]}`}
                >
                  <KanaCellContent kana={kana} />
                </Link>
              )}
            />
          </Card>
        </>
      )}
    </>
  )
}

function Tile({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-slate-900">
      <span className="block text-xs font-semibold text-slate-500 dark:text-slate-400">{label}</span>
      <span className="mt-1 block text-2xl font-bold tabular-nums">{value}</span>
      <span className="block text-xs text-slate-500 dark:text-slate-400">{detail}</span>
    </div>
  )
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-4 rounded-2xl bg-white p-4 shadow-sm dark:bg-slate-900">
      <h2 className="mb-3 text-sm font-semibold text-slate-500 dark:text-slate-400">{title}</h2>
      {children}
    </section>
  )
}

function ActivityChart({ days }: { days: DayActivity[] }) {
  const max = Math.max(1, ...days.map((d) => d.questions))
  return (
    <div>
      <div className="flex h-24 items-end gap-1" role="img" aria-label="Questions par jour, réussies en vert">
        {days.map((d) => (
          <div key={d.day} className="flex h-full flex-1 flex-col justify-end">
            {d.questions > 0 ? (
              <div className="flex flex-col overflow-hidden rounded-sm" style={{ height: `${(d.questions / max) * 100}%` }}>
                <div className="bg-red-600" style={{ flexGrow: d.questions - d.correct }} />
                <div className="bg-emerald-600" style={{ flexGrow: d.correct }} />
              </div>
            ) : (
              <div className="h-0.5 rounded-sm bg-slate-200 dark:bg-slate-800" />
            )}
          </div>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-xs text-slate-400 dark:text-slate-500">
        <span>{shortDay(days[0]?.day)}</span>
        <span>Aujourd’hui</span>
      </div>
    </div>
  )
}

function shortDay(day: string | undefined): string {
  if (!day) return ''
  const [, m, d] = day.split('-')
  return `${d}/${m}`
}

function MissedList({ missed }: { missed: KanaStat[] }) {
  if (missed.length === 0) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">Rien à signaler : continuez comme ça !</p>
  }
  return (
    <ul className="divide-y divide-slate-100 dark:divide-slate-800">
      {missed.map((s) => {
        const kana = getKana(s.kanaId)
        if (!kana) return null
        const errors = s.attempts - s.correct
        return (
          <li key={s.kanaId}>
            <Link to={`/table/${kana.id}`} className="flex min-h-14 items-center gap-3">
              <span className="w-12 text-center font-jp text-3xl">{kana.char}</span>
              <span className="flex-1">
                <span className="block font-medium">{kana.romaji[0]}</span>
                <span className="block text-xs text-slate-500 dark:text-slate-400">
                  {errors} erreur{errors > 1 ? 's' : ''} sur {s.attempts} réponses
                </span>
              </span>
              <span className="text-sm font-semibold tabular-nums text-red-600">{percent.format(s.recentRate)}</span>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
