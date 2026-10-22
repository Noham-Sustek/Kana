import { useEffect, useRef } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router'
import { Icon } from '@/components/Icon'
import { KanaNavButton } from '@/components/KanaNavButton'
import { GROUP_KIND_LABELS, counterpartOf, getGroup, getKana, kanaOfScript, type Kana } from '@/data/kana'

const SWIPE_THRESHOLD_PX = 60

export function KanaDetailPage() {
  const { kanaId = '' } = useParams()
  const navigate = useNavigate()
  const kana = getKana(kanaId)
  const touchStartX = useRef<number | null>(null)

  const siblings = kana ? kanaOfScript(kana.script) : []
  const index = kana ? siblings.findIndex((k) => k.id === kana.id) : -1
  const prev = siblings[index - 1]
  const next = siblings[index + 1]

  // replace : le bouton retour d'Android ramène toujours au tableau.
  const goTo = (target: Kana | undefined) => {
    if (target) navigate(`/table/${target.id}`, { replace: true })
  }

  // Retour d'historique quand on vient du tableau (conserve écriture et défilement),
  // sinon (lien direct) navigation vers le tableau de la bonne écriture.
  const goBackToTable = (current: Kana) => {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0
    if (idx > 0) navigate(-1)
    else navigate(`/table?script=${current.script}`, { replace: true })
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goTo(prev)
      if (e.key === 'ArrowRight') goTo(next)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (!kana) return <Navigate to="/table" replace />

  const group = getGroup(kana.groupId)!
  const counterpart = counterpartOf(kana)
  const [primary, ...variants] = kana.romaji

  return (
    <div
      className="flex min-h-full flex-col"
      onTouchStart={(e) => (touchStartX.current = e.touches[0]?.clientX ?? null)}
      onTouchEnd={(e) => {
        const start = touchStartX.current
        const end = e.changedTouches[0]?.clientX
        touchStartX.current = null
        if (start == null || end == null) return
        const dx = end - start
        if (dx > SWIPE_THRESHOLD_PX) goTo(prev)
        else if (dx < -SWIPE_THRESHOLD_PX) goTo(next)
      }}
    >
      <header className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => goBackToTable(kana)}
          className="-ml-2 flex min-h-11 items-center gap-1 px-2 text-sm font-medium text-slate-600 dark:text-slate-300"
        >
          <Icon name="chevronLeft" className="size-5" />
          Tableau
        </button>
        <span className="text-xs text-slate-400 dark:text-slate-500">
          {index + 1} / {siblings.length}
        </span>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
        <span className="font-jp text-[9rem] leading-none">{kana.char}</span>
        <span className="mt-6 text-4xl font-semibold tracking-wide">{primary}</span>
        {variants.length > 0 && (
          <span className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Aussi accepté : {variants.join(', ')}
          </span>
        )}

        <dl className="mt-8 grid w-full grid-cols-2 gap-2 text-sm">
          <div className="rounded-xl bg-white p-3 shadow-sm dark:bg-slate-900">
            <dt className="text-xs text-slate-500 dark:text-slate-400">Groupe</dt>
            <dd className="mt-1 font-medium">
              {GROUP_KIND_LABELS[group.kind]} · {group.label}
            </dd>
          </div>
          <div className="rounded-xl bg-white p-3 shadow-sm dark:bg-slate-900">
            <dt className="text-xs text-slate-500 dark:text-slate-400">
              {kana.script === 'hiragana' ? 'Katakana' : 'Hiragana'}
            </dt>
            <dd className="mt-1 font-medium">
              {counterpart ? (
                <Link to={`/table/${counterpart.id}`} replace className="font-jp text-lg text-accent-600 dark:text-accent-500">
                  {counterpart.char}
                </Link>
              ) : (
                '—'
              )}
            </dd>
          </div>
        </dl>
      </div>

      <nav className="grid grid-cols-2 gap-3" aria-label="Kana précédent et suivant">
        <KanaNavButton target={prev} direction="prev" onClick={() => goTo(prev)} />
        <KanaNavButton target={next} direction="next" onClick={() => goTo(next)} />
      </nav>
    </div>
  )
}
