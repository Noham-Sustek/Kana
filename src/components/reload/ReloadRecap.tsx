import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { MASTERY_LABELS } from '@/components/MasterySteps'
import { SegmentText } from '@/components/SegmentText'
import { SessionProgress } from '@/components/SessionProgress'
import { ReloadGuide } from '@/components/reload/ReloadGuide'
import type { MasteryLevel } from '@/engine/scheduler'
import type { Line } from '@/lib/segments'
import { playSound } from '@/lib/sound'

export interface RecapGain {
  key: string
  glyph: string
  from: MasteryLevel
  to: MasteryLevel
  stageName: string
}

export interface RecapMissed {
  key: string
  glyph: string
  reading: string
  note: Line
  onOpen?: () => void
}

export interface RecapAction {
  title: Line
  detail: string
  onClick: () => void
}

interface ReloadRecapProps {
  title: string
  correct: number
  total: number
  ticks: readonly ('done' | 'missed')[]
  duration: string
  perAnswer: string
  streak: { days: number; extended: boolean } | null
  gains: readonly RecapGain[]
  moreGains: number
  gainsAside: string
  path: { headline: Line; detail: Line } | null
  missed: readonly RecapMissed[]
  missedAside: string
  onMakeList: () => void
  actions: readonly RecapAction[]
  onFinish: () => void
}

// Rythme d'entrée, d'après l'écran de victoire : titre, panneaux, puis chaque bandeau cyan
// se replie en en-tête et les valeurs glissent dessous.
const HEADER_START = 520
const HEADER_STEP = 260

/** Fin de session, style Reload : grand « RÉSULTATS » en relief, panneaux bleus inclinés,
 *  en-têtes cyan en escalier (comme EXP / ITEM), valeurs en italique. */
export function ReloadRecap(props: ReloadRecapProps) {
  const { title, correct, total, onFinish } = props
  const shown = useCountUp(correct, HEADER_START + 380)

  useEffect(() => {
    const id = window.setTimeout(() => playSound('panelIn'), 140)
    return () => window.clearTimeout(id)
  }, [])

  // Entrée ou Échap ferment le récapitulatif, sauf sur un bouton (Entrée l'active déjà).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return
      const target = e.target as HTMLElement | null
      if (target?.closest('button, a, input, dialog')) return
      if (e.key === 'Enter' || e.key === 'Escape') {
        e.preventDefault()
        onFinish()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onFinish])

  const sections: { id: string; node: (delay: number, indent: number) => ReactNode }[] = [
    { id: 'score', node: (d, i) => <ScoreSection {...props} shown={shown} delay={d} indent={i} /> },
  ]
  if (props.gains.length > 0 || props.path) {
    sections.push({ id: 'gains', node: (d, i) => <GainsSection {...props} delay={d} indent={i} /> })
  }
  if (props.missed.length > 0) {
    sections.push({ id: 'missed', node: (d, i) => <MissedSection {...props} delay={d} indent={i} /> })
  }
  sections.push({ id: 'next', node: (d, i) => <NextSection actions={props.actions} delay={d} indent={i} /> })

  return (
    <div className="relative isolate flex min-h-full flex-1 flex-col">
      <Backdrop />

      <div aria-hidden="true" className="rl-res-title pointer-events-none relative -mx-4 -mt-4 h-[140px] [perspective:640px]">
        <span className="rl-res-word absolute top-[16px] -left-2 origin-[0_100%] text-[104px]">RÉSULTATS</span>
      </div>
      <h1 className="sr-only">
        Résultats · {title} terminée · {correct} sur {total} justes du premier coup
      </h1>
      <p
        aria-hidden="true"
        className="rl-cond rl-res-in relative -mt-3 ml-1 text-[15px] font-bold tracking-[0.06em] text-[#a9c4ff] uppercase"
        style={{ '--d': '360ms' } as CSSProperties}
      >
        {title} · terminée
      </p>

      <div className="relative mx-auto mt-5 flex w-full max-w-[560px] flex-col gap-7 pb-2">
        {sections.map((s, i) => (
          <div key={s.id}>{s.node(HEADER_START + i * HEADER_STEP, Math.min(i, 3) * 22)}</div>
        ))}
      </div>

      <ReloadGuide
        title={`${title} terminée.`}
        caption="Commande"
        actions={[{ label: 'Terminer', kind: 'primary', onClick: onFinish, keyHint: 'Entrée' }]}
      />
    </div>
  )
}

/** Mer de nuit, rais pâles et deux grands panneaux inclinés qui entrent par la droite. */
function Backdrop() {
  return (
    <>
      <span
        aria-hidden="true"
        className="absolute -top-4 right-[calc(50%-50vw)] bottom-0 left-[calc(50%-50vw)] -z-10 bg-[radial-gradient(ellipse_360px_280px_at_78%_18%,rgba(60,110,255,0.32),rgba(60,110,255,0)_70%),linear-gradient(172deg,#0a1668_0%,#06104a_42%,#030826_100%)]"
      />
      <span aria-hidden="true" className="absolute -top-4 right-[calc(50%-50vw)] bottom-0 left-[calc(50%-50vw)] -z-10 overflow-hidden">
        <span
          className="rl-res-panel absolute top-[150px] left-[calc(50vw-265px)] h-[300px] w-[max(600px,60vw)] -rotate-[13deg] bg-[#12309f]/80"
          style={{ '--d': '120ms' } as CSSProperties}
        />
        <span
          className="rl-res-panel absolute top-[330px] left-[calc(50vw-109px)] h-[2400px] w-[max(560px,50vw)] -rotate-[13deg] bg-[#1636d8]"
          style={{ '--d': '220ms' } as CSSProperties}
        />
        <span className="absolute top-[96px] left-[calc(50vw-140px)] h-[2px] w-[360px] -rotate-[13deg] bg-[#5ce1ff]/25" />
      </span>
    </>
  )
}

/** En-tête : un bandeau cyan passe, se replie en bloc, le mot apparaît et le filet se trace. */
function ResultHeader({ label, aside, delay, indent }: { label: string; aside?: string; delay: number; indent: number }) {
  return (
    <div className="rl-rh relative flex items-end" style={{ '--d': `${delay}ms`, marginLeft: indent } as CSSProperties}>
      <h2 className="rl-rh-label">{label}</h2>
      <span aria-hidden="true" className="rl-rh-line" />
      {aside && (
        <span
          className="rl-cond rl-res-in mb-1 ml-2 shrink-0 text-[14px] leading-none font-bold text-white"
          style={{ '--d': `${delay + 620}ms` } as CSSProperties}
        >
          {aside}
        </span>
      )}
    </div>
  )
}

function inDelay(delay: number, step = 0): CSSProperties {
  return { '--d': `${delay + 480 + step * 70}ms` } as CSSProperties
}

function ScoreSection({
  shown,
  total,
  correct,
  ticks,
  duration,
  perAnswer,
  streak,
  delay,
  indent,
}: ReloadRecapProps & { shown: number; delay: number; indent: number }) {
  return (
    <section>
      <ResultHeader label="SCORE" delay={delay} indent={indent} />
      <div aria-hidden="true" className="rl-res-in mt-2 flex items-end gap-1.5 pl-6" style={inDelay(delay)}>
        <span className="rl-display text-[76px] leading-[0.82] text-white tabular-nums [text-shadow:-5px_5px_0_#0a1a7a]">{shown}</span>
        <span className="rl-display mb-1 text-[30px] leading-none text-white/80">/{total}</span>
        <span className="rl-display mb-1.5 ml-1 text-[15px] leading-none text-[#5ce1ff]">{correct > 1 ? 'JUSTES' : 'JUSTE'}</span>
      </div>
      <p className="rl-res-in mt-1 pl-6 text-[13.5px] font-semibold text-[#a9c4ff]" style={inDelay(delay, 1)}>
        du premier coup
      </p>
      <div className="rl-res-in mt-3" style={inDelay(delay, 2)}>
        <SessionProgress showCount={false} ticks={ticks} />
      </div>
      <dl className="mt-2">
        <StatRow label="Durée" value={duration} style={inDelay(delay, 3)} />
        <StatRow label="Par réponse" value={perAnswer} style={inDelay(delay, 4)} />
        {streak && (
          <StatRow
            label="Série"
            value={`${streak.days} j`}
            extra={streak.extended ? '+1' : undefined}
            style={inDelay(delay, 5)}
          />
        )}
      </dl>
    </section>
  )
}

function StatRow({ label, value, extra, style }: { label: string; value: string; extra?: string; style: CSSProperties }) {
  return (
    <div className="rl-res-in flex min-h-11 items-center justify-between gap-3 border-b border-white/15" style={style}>
      <dt className="rl-cond text-[18px] font-semibold text-white">{label}</dt>
      <dd className="flex items-baseline gap-2">
        {extra && <span className="rl-cond text-[15px] font-bold text-[#5ce1ff]">{extra}</span>}
        <span className="rl-display text-[22px] text-white tabular-nums">{value}</span>
      </dd>
    </div>
  )
}

function GainsSection({
  gains,
  moreGains,
  gainsAside,
  path,
  delay,
  indent,
}: ReloadRecapProps & { delay: number; indent: number }) {
  return (
    <section>
      <ResultHeader label="MAÎTRISE" aside={gains.length > 0 ? gainsAside : undefined} delay={delay} indent={indent} />
      {gains.length > 0 && (
        <ul className="mt-2">
          {gains.map((g, i) => (
            <Row key={g.key} glyph={g.glyph} style={inDelay(delay, i)}>
              <b className="block text-[15px] leading-5 font-semibold text-white">
                {MASTERY_LABELS[g.from]} → {MASTERY_LABELS[g.to]}
              </b>
              <small className="block text-[12.5px] leading-[17px] text-[#a9c4ff]">{g.stageName}</small>
              <Pips from={g.from} to={g.to} />
            </Row>
          ))}
        </ul>
      )}
      {moreGains > 0 && (
        <p className="rl-res-in mt-2 text-[13px] text-[#a9c4ff]" style={inDelay(delay, gains.length)}>
          Et {moreGains} autre{moreGains > 1 ? 's' : ''} progrès.
        </p>
      )}
      {path && (
        <p className="rl-res-in mt-3 text-[14px] leading-[20px] text-white" style={inDelay(delay, gains.length + 1)}>
          <strong className="font-bold">
            <SegmentText line={path.headline} />
          </strong>{' '}
          <span className="text-[#cfdcff]">
            <SegmentText line={path.detail} />
          </span>
        </p>
      )}
    </section>
  )
}

/** Trois crans de maîtrise (En cours, Acquis, Solide) : acquis avant en blanc, gagnés en cyan. */
function Pips({ from, to }: { from: MasteryLevel; to: MasteryLevel }) {
  return (
    <span role="img" aria-label={MASTERY_LABELS[to]} className="absolute top-1/2 right-0 flex -translate-y-1/2 gap-[3px]">
      {[1, 2, 3].map((n) => (
        <i
          key={n}
          className={`h-3.5 w-2.5 -skew-x-[14deg] ${n <= from ? 'bg-white' : n <= to ? 'bg-[#5ce1ff]' : 'bg-white/15'}`}
        />
      ))}
    </span>
  )
}

function MissedSection({
  missed,
  missedAside,
  onMakeList,
  delay,
  indent,
}: ReloadRecapProps & { delay: number; indent: number }) {
  return (
    <section>
      <ResultHeader label="À REVOIR" aside={missedAside} delay={delay} indent={indent} />
      <ul className="mt-2">
        {missed.map((m, i) => (
          <Row key={m.key} glyph={m.glyph} onClick={m.onOpen} style={inDelay(delay, i)}>
            <b className="block text-[15px] leading-5 font-semibold text-white">{m.reading}</b>
            {m.note.length > 0 && (
              <small className="block text-[12.5px] leading-[17px] text-[#a9c4ff]">
                <SegmentText line={m.note} />
              </small>
            )}
          </Row>
        ))}
      </ul>
      <button
        type="button"
        onClick={onMakeList}
        data-tap-sound="forward"
        className="rl-cond rl-res-in mt-3 flex min-h-11 items-center gap-2 text-[18px] font-bold text-[#5ce1ff] active:translate-x-[3px]"
        style={inDelay(delay, missed.length)}
      >
        <span aria-hidden="true" className="h-[18px] w-2.5 -skew-x-[14deg] bg-[#5ce1ff]" />
        En faire une liste
      </button>
    </section>
  )
}

function NextSection({ actions, delay, indent }: { actions: readonly RecapAction[]; delay: number; indent: number }) {
  return (
    <section>
      <ResultHeader label="ET MAINTENANT" delay={delay} indent={indent} />
      <ul className="mt-2">
        {actions.map((a, i) => (
          <li key={i} className="rl-res-in" style={inDelay(delay, i)}>
            <button
              type="button"
              onClick={a.onClick}
              data-tap-sound="launch"
              className="group flex min-h-14 w-full items-center gap-3 border-b border-white/15 py-2 text-left active:translate-x-[3px]"
            >
              <span className="min-w-0 flex-1">
                <b className="rl-cond block text-[20px] leading-6 font-bold text-white">
                  <SegmentText line={a.title} />
                </b>
                <small className="block text-[12.5px] leading-[17px] text-[#a9c4ff]">{a.detail}</small>
              </span>
              <svg viewBox="0 0 24 24" className="size-4 shrink-0" aria-hidden="true">
                <path d="M6 4l12 8-12 8z" fill="#5ce1ff" />
              </svg>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

/** Ligne de liste, comme les objets gagnés : kana dans un cadre cyan, texte, flèche si elle s'ouvre. */
function Row({
  glyph,
  onClick,
  style,
  children,
}: {
  glyph: string
  onClick?: () => void
  style: CSSProperties
  children: ReactNode
}) {
  const long = glyph.length > 2
  const content = (
    <>
      <span
        className={`font-jp shrink-0 text-white ${
          long
            ? 'max-w-[50%] text-[17px] leading-snug'
            : 'flex size-11 items-center justify-center bg-[#0a1660] text-[25px] leading-none shadow-[inset_0_0_0_1.5px_#5ce1ff] [clip-path:polygon(10%_0,100%_0,90%_100%,0_100%)]'
        }`}
      >
        {glyph}
      </span>
      <span className="relative min-w-0 flex-1 pr-12">{children}</span>
      {onClick && (
        <svg viewBox="0 0 24 24" className="size-4 shrink-0" aria-hidden="true">
          <path d="M6 4l12 8-12 8z" fill="#5ce1ff" />
        </svg>
      )}
    </>
  )
  const cls = 'flex min-h-14 w-full items-center gap-3 border-b border-white/15 py-1.5 text-left'
  return (
    <li className="rl-res-in" style={style}>
      {onClick ? (
        <button type="button" onClick={onClick} data-tap-sound="forward" className={`${cls} active:translate-x-[3px]`}>
          {content}
        </button>
      ) : (
        <div className={cls}>{content}</div>
      )}
    </li>
  )
}

/** Le score monte de 0 à sa valeur, une fois les panneaux en place (immédiat en mouvement réduit). */
function useCountUp(target: number, delay: number): number {
  const [value, setValue] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? target : 0,
  )
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || target === 0) {
      setValue(target)
      return
    }
    let frame = 0
    const duration = Math.min(700, 120 + target * 60)
    const start = performance.now() + delay
    const step = (now: number) => {
      const p = Math.min(1, Math.max(0, (now - start) / duration))
      setValue(Math.round(target * (1 - (1 - p) ** 3)))
      if (p < 1) frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [target, delay])
  return value
}
