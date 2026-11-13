import { Suspense, lazy, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router'
import { Button } from '@/components/Button'
import { Icon } from '@/components/Icon'
import { IconButton } from '@/components/IconButton'
import { KanaTile } from '@/components/KanaTile'
import { MASTERY_LABELS, MasterySteps } from '@/components/MasterySteps'
import { counterpartOf, getGroup, getKana, groupGlyph, kanaOfScript, type Kana } from '@/data/kana'
import { buildProgress } from '@/engine/scheduler'
import { confusablesOf, familyMastery, wordsWithKana } from '@/features/kana/detail'
import { useKanaProgress } from '@/features/kana/useKanaProgress'
import { toRomaji } from '@/features/quiz/reading'
import { formatResponseTime } from '@/features/quiz/summary'
import { FAMILIES, type StageFamily } from '@/features/quiz/stages'
import { summarize } from '@/features/stats/stats'
import { WRITABLE_KINDS, writingStatus } from '@/features/writing/progress'

// Les tracés KanjiVG restent hors du bundle principal.
const strokeModule = () => import('@/components/KanaStrokeCase')
const KanaStrokeCase = lazy(() => strokeModule().then((m) => ({ default: m.KanaStrokeCase })))

const SWIPE_THRESHOLD_PX = 60
const WORDS_SHOWN = 3
const WORDS_ALL = 12
const FAMILY_ORDER: StageFamily[] = ['recognize', 'write', 'read']

/** Fiche d'un kana : ordre des traits, lecture, vos résultats, kana proches, mots. */
export function KanaDetailPage() {
  const { kanaId = '' } = useParams()
  const navigate = useNavigate()
  const kana = getKana(kanaId)
  const touchStartX = useRef<number | null>(null)
  const [replay, setReplay] = useState(0)

  const group = kana ? getGroup(kana.groupId) : undefined
  const siblings = group?.kanaIds ?? []
  const index = kana ? siblings.indexOf(kana.id) : -1
  // Précédent / suivant dans l'ordre du tableau : aux extrémités d'une ligne, la ligne voisine.
  const all = kana ? kanaOfScript(kana.script) : []
  const flatIndex = kana ? all.findIndex((k) => k.id === kana.id) : -1
  const prev = all[flatIndex - 1]
  const next = all[flatIndex + 1]

  // replace : le bouton retour d'Android ramène toujours à la grille.
  const goTo = (target: Kana | undefined) => {
    if (target) navigate(`/kana/${target.id}`, { replace: true })
  }

  const goBack = (current: Kana) => {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0
    if (idx > 0) navigate(-1)
    else navigate(`/kana?script=${current.script}`, { replace: true })
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goTo(prev)
      if (e.key === 'ArrowRight') goTo(next)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (!kana || !group) return <Navigate to="/kana" replace />

  const counterpart = counterpartOf(kana)
  const [primary, ...variants] = kana.romaji
  const writable = WRITABLE_KINDS.includes(group.kind) && [...kana.char].length === 1

  return (
    <div
      className="flex min-h-full flex-col pb-6"
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
      <header className="-mx-2 flex items-center justify-between">
        <IconButton icon="chevronLeft" label="Retour à la grille" onClick={() => goBack(kana)} />
        <div className="flex items-center">
          <IconButton icon="chevronLeft" label="Kana précédent" disabled={!prev} onClick={() => goTo(prev)} />
          <span className="min-w-14 text-center text-[12.5px] font-semibold text-ink-muted tabular-nums">
            <span className="font-jp">{groupGlyph(group)}</span> {index + 1} / {siblings.length}
          </span>
          <IconButton icon="chevronRight" label="Kana suivant" disabled={!next} onClick={() => goTo(next)} />
        </div>
      </header>

      <div className="mx-auto mt-2 w-[min(212px,60vw)]">
        <Suspense fallback={<div className="aspect-square w-full rounded-sm border-[1.5px] border-ink bg-paper-raised" />}>
          <KanaStrokeCase kana={kana} replay={replay} />
        </Suspense>
      </div>

      <div className="mt-3 text-center">
        <h1 className="font-serif text-[40px] leading-tight font-medium">
          <span className="sr-only">{kana.char}, </span>
          {primary}
        </h1>
        <p className="text-[13px] leading-[18px] text-ink-muted">
          {kana.script === 'hiragana' ? 'Hiragana' : 'Katakana'} · ligne <span className="font-jp">{groupGlyph(group)}</span>
          <StrokeCount kana={kana} />
        </p>
        {variants.length > 0 && (
          <p className="text-[13px] leading-[18px] text-ink-muted">Aussi accepté : {variants.join(', ')}</p>
        )}
      </div>

      <div className="mt-4 flex justify-center gap-2">
        {writable && (
          <Button variant="line" size="sm" fullWidth={false} icon="replay" iconPosition="start" onClick={() => setReplay((n) => n + 1)}>
            Rejouer
          </Button>
        )}
        {counterpart && (
          <Button variant="line" size="sm" fullWidth={false} onClick={() => navigate(`/kana/${counterpart.id}`, { replace: true })}>
            <span className="font-jp text-lg leading-none">{counterpart.char}</span>
            En {counterpart.script}
          </Button>
        )}
      </div>

      <KanaResults kana={kana} writable={writable} />
    </div>
  )
}

function StrokeCount({ kana }: { kana: Kana }) {
  const [count, setCount] = useState<number | null>(null)
  useEffect(() => {
    let alive = true
    strokeModule().then((m) => alive && setCount(m.strokeCountOf(kana)))
    return () => {
      alive = false
    }
  }, [kana])
  if (count === null) return null
  return <> · {count} trait{count > 1 ? 's' : ''}</>
}

function KanaResults({ kana, writable }: { kana: Kana; writable: boolean }) {
  const navigate = useNavigate()
  const progress = useKanaProgress()
  const [allWords, setAllWords] = useState(false)

  const own = useMemo(() => progress?.answers.filter((a) => a.kanaId === kana.id) ?? [], [progress, kana.id])
  const mastery = useMemo(() => familyMastery(buildProgress(own), kana.id), [own, kana.id])
  const stat = progress?.perKana.get(kana.id)
  const average = summarize(own).averageResponseMs
  const writing = progress?.writing.get(kana.id) ?? 0
  const confusables = confusablesOf(kana).slice(0, 4)
  const words = wordsWithKana(kana, allWords ? WORDS_ALL : WORDS_SHOWN + 1)
  const hasMore = !allWords && words.length > WORDS_SHOWN

  return (
    <>
      {writable && (
        <div className="mt-4">
          <Button icon="arrow" detail={writingStatus(writing)} onClick={() => navigate(`/writing/${kana.id}`)}>
            S’entraîner à l’écrire
          </Button>
        </div>
      )}

      <Section title="Vos résultats">
        {stat ? (
          <dl className="grid grid-cols-3 gap-3">
            <Stat value={`${Math.round(stat.recentRate * 100)} %`} label="Réussite · 10 dern." />
            <Stat value={average === null ? '—' : formatResponseTime(average)} label="Temps moyen" />
            <Stat value={String(stat.attempts)} label={stat.attempts > 1 ? 'Réponses' : 'Réponse'} />
          </dl>
        ) : (
          <p className="text-[14.5px] leading-5 text-ink-muted">Pas encore de réponse pour ce kana.</p>
        )}
        <ul className="mt-2 border-t border-hairline">
          {FAMILY_ORDER.map((family) => (
            <li key={family} className="flex min-h-12 items-center gap-3 border-b border-hairline py-2">
              <Icon name={FAMILIES[family].icon} className="size-5 shrink-0 text-ink-muted" />
              <b className="flex-1 font-semibold">{FAMILIES[family].label}</b>
              <span className="flex items-center gap-2 text-[13px] text-ink-muted">
                {MASTERY_LABELS[mastery[family]]}
                <MasterySteps level={mastery[family]} />
              </span>
            </li>
          ))}
        </ul>
      </Section>

      {confusables.length > 0 && (
        <Section title="À ne pas confondre">
          <ul className="grid grid-cols-5 gap-2">
            {confusables.map((k) => (
              <li key={k.id}>
                <KanaTile
                  kana={k.char}
                  romaji={k.romaji[0]}
                  label={`${k.char}, ${k.romaji[0]} : voir sa fiche`}
                  onClick={() => navigate(`/kana/${k.id}`, { replace: true })}
                  className="w-full"
                />
              </li>
            ))}
          </ul>
        </Section>
      )}

      {words.length > 0 && (
        <Section
          title="Mots avec ce kana"
          aside={
            hasMore && (
              <button type="button" onClick={() => setAllWords(true)} className="-my-3 min-h-11 px-1 font-semibold text-accent">
                Tout voir
              </button>
            )
          }
        >
          <ul className="border-t border-hairline">
            {words.slice(0, allWords ? WORDS_ALL : WORDS_SHOWN).map((w) => (
              <li key={w.id} className="flex min-h-14 items-center gap-3 border-b border-hairline py-2">
                <span className="min-w-0 flex-1">
                  <b className="block font-jp text-lg leading-snug font-normal">
                    {[...w.kana].map((c, i) => (
                      <span key={i} className={c === kana.char ? 'text-accent' : undefined}>
                        {c}
                      </span>
                    ))}
                  </b>
                  <small className="block text-[13px] leading-[18px] text-ink-muted">
                    {toRomaji(w.kana, { macron: true })} — {w.meaning}
                  </small>
                </span>
                {w.kanji && <span className="font-jp text-lg text-ink-muted">{w.kanji}</span>}
              </li>
            ))}
          </ul>
        </Section>
      )}
    </>
  )
}

function Section({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="mt-6 border-t border-hairline pt-5">
      <div className="mb-2.5 flex items-baseline justify-between gap-3">
        <h2 className="text-[11px] leading-[14px] font-bold tracking-[0.12em] text-ink-muted uppercase">{title}</h2>
        {aside && <span className="text-[12.5px] leading-[14px]">{aside}</span>}
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
