import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { Icon } from '@/components/Icon'
import { KanaGuideLines } from '@/components/KanaGuideLines'
import { STROKE_VIEWBOX } from '@/data/strokes'
import { distance, toSvgPoints, type Point } from '@/features/writing/geometry'
import {
  applyVerdict,
  createWritingState,
  isComplete,
  shouldShowHint,
  totalMistakes,
  type WritingState,
} from '@/features/writing/session'
import { evaluateStroke, prepareStroke, type MatchMode } from '@/features/writing/strokeMatch'
import { useIsDark } from '@/lib/useIsDark'

const INK_WIDTH = 4.5
const INK_LIGHT = '#0f172a' // slate-900
const INK_DARK = '#f1f5f9' // slate-100
const ERROR_COLOR = '#dc2626' // red-600
const FLASH_MS = 500
const TOOL_BUTTON =
  'flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-white text-sm font-medium shadow-sm active:scale-95 dark:bg-slate-900'
/** Écart minimal entre deux points enregistrés (unités KanjiVG) : évite d'accumuler du bruit. */
const MIN_POINT_GAP = 0.4

export interface WritingResult {
  mistakes: number
  /** Traits tels que dessinés (validés, plus le dernier refusé s'il y en a un). */
  drawn: Point[][]
  /** Vrai si l'utilisateur a demandé le modèle avant d'avoir fini. */
  revealed: boolean
}

interface WritingPadProps {
  strokes: Point[][]
  mode: MatchMode
  onComplete: (result: WritingResult) => void
}

/**
 * Tracé au doigt, validé trait par trait. Le canvas ne porte que l'encre en cours
 * (ou le dernier trait refusé, en rouge) ; modèle, traits validés et indices sont
 * dans un SVG en dessous. En mode `trace`, un trait validé est remplacé par celui
 * du modèle ; en mode `free`, il reste tel que dessiné (comparaison à la fin).
 */
export function WritingPad({ strokes, mode, onComplete }: WritingPadProps) {
  const prepared = useMemo(() => strokes.map(prepareStroke), [strokes])
  const [session, setSession] = useState(() => createWritingState(strokes.length))
  const [hintFor, setHintFor] = useState<number | null>(null)
  const [flash, setFlash] = useState<number | null>(null)
  const [errorStroke, setErrorStroke] = useState<Point[] | null>(null)
  const [drawn, setDrawn] = useState<Point[][]>([])
  const [size, setSize] = useState(0)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const current = useRef<Point[] | null>(null)
  const activePointer = useRef<number | null>(null)

  const dark = useIsDark()
  const ink = dark ? INK_DARK : INK_LIGHT
  const complete = isComplete(session)
  const showHint = !complete && (hintFor === session.done || shouldShowHint(session))
  const next = strokes[session.done]

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const observer = new ResizeObserver(([entry]) => setSize(entry?.contentRect.width ?? 0))
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [])

  // Redessin complet : taille, thème ou trait refusé changés.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || size === 0) return
    const px = Math.round(size * (window.devicePixelRatio || 1))
    if (canvas.width !== px) {
      canvas.width = px
      canvas.height = px
    }
    const ctx = context(canvas)
    if (!ctx) return
    clear(ctx)
    if (errorStroke) drawPolyline(ctx, errorStroke, ERROR_COLOR)
    if (current.current) drawPolyline(ctx, current.current, ink)
  }, [size, ink, errorStroke])

  useEffect(() => {
    if (flash === null) return
    const timer = setTimeout(() => setFlash(null), FLASH_MS)
    return () => clearTimeout(timer)
  }, [flash])

  const onPointerDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (complete || activePointer.current !== null) return
    if (e.pointerType === 'mouse' && e.button !== 0) return
    e.currentTarget.setPointerCapture(e.pointerId)
    activePointer.current = e.pointerId
    const p = toModel(e.currentTarget, e.clientX, e.clientY)
    current.current = [p]
    setErrorStroke(null)
    const ctx = context(e.currentTarget)
    if (ctx) {
      clear(ctx)
      drawPolyline(ctx, [p], ink)
    }
  }

  const onPointerMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const points = current.current
    if (e.pointerId !== activePointer.current || !points) return
    const canvas = e.currentTarget
    const ctx = context(canvas)
    // Événements regroupés : le tracé suit fidèlement le doigt même quand le rendu prend du retard.
    const coalesced = e.nativeEvent.getCoalescedEvents?.() ?? []
    for (const ev of coalesced.length > 0 ? coalesced : [e.nativeEvent]) {
      const p = toModel(canvas, ev.clientX, ev.clientY)
      const last = points[points.length - 1]!
      if (distance(last, p) < MIN_POINT_GAP) continue
      points.push(p)
      if (ctx) drawPolyline(ctx, [last, p], ink)
    }
  }

  const onPointerUp = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (e.pointerId !== activePointer.current) return
    activePointer.current = null
    const points = current.current
    current.current = null
    if (!points) return

    const verdict = evaluateStroke(points, prepared, session.done, mode)
    const nextState = applyVerdict(session, verdict)
    setSession(nextState)
    if (verdict.ok) {
      const ctx = context(e.currentTarget)
      if (ctx) clear(ctx)
      const nextDrawn = [...drawn, points]
      setDrawn(nextDrawn)
      setFlash(session.done)
      if (isComplete(nextState)) onComplete({ mistakes: totalMistakes(nextState), drawn: nextDrawn, revealed: false })
    } else {
      setErrorStroke(points)
      navigator.vibrate?.(40)
    }
  }

  const onPointerCancel = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (e.pointerId !== activePointer.current) return
    activePointer.current = null
    current.current = null
    const ctx = context(e.currentTarget)
    if (ctx) clear(ctx)
  }

  const reset = () => {
    setSession(createWritingState(strokes.length))
    setHintFor(null)
    setErrorStroke(null)
    setDrawn([])
    setFlash(null)
    current.current = null
    const canvas = canvasRef.current
    const ctx = canvas && context(canvas)
    if (ctx) clear(ctx)
  }

  const compare = () =>
    onComplete({
      mistakes: totalMistakes(session),
      drawn: errorStroke ? [...drawn, errorStroke] : drawn,
      revealed: true,
    })

  const feedback = feedbackOf(session)
  // Traits validés : ceux du modèle (calque) ou ceux réellement dessinés (libre).
  const doneStrokes = mode === 'trace' ? strokes.slice(0, session.done) : drawn

  return (
    <div>
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-slate-900">
        <svg
          viewBox={`0 0 ${STROKE_VIEWBOX} ${STROKE_VIEWBOX}`}
          className="pointer-events-none absolute inset-0 size-full"
          aria-hidden="true"
        >
          <KanaGuideLines />
          <g fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth={INK_WIDTH}>
            {mode === 'trace' &&
              strokes.map((points, i) => (
                <polyline
                  key={`model-${i}`}
                  points={toSvgPoints(points)}
                  className="stroke-slate-200 dark:stroke-slate-700"
                />
              ))}
            {doneStrokes.map((points, i) => (
              <polyline
                key={`done-${i}`}
                points={toSvgPoints(points)}
                className={`transition-colors duration-300 ${
                  i === flash ? 'stroke-emerald-600' : 'stroke-slate-900 dark:stroke-slate-100'
                }`}
              />
            ))}
            {showHint && next && (
              <polyline
                key={`hint-${session.done}`}
                points={toSvgPoints(next)}
                pathLength={1}
                strokeDasharray="1 1"
                className="stroke-sky-500/70"
                style={{ animation: 'stroke-draw 1.4s ease-in-out infinite' }}
              />
            )}
          </g>
          {next && (mode === 'trace' || showHint) && (
            <circle cx={next[0]![0]} cy={next[0]![1]} r={2.6} className="fill-sky-500" />
          )}
        </svg>
        <canvas
          ref={canvasRef}
          aria-label="Zone de tracé"
          className={`absolute inset-0 size-full touch-none select-none ${complete ? '' : 'cursor-crosshair'}`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
          onContextMenu={(e) => e.preventDefault()}
        />
      </div>

      <div className="mt-3 flex min-h-11 items-center justify-between gap-3">
        <p aria-live="polite" className={`text-sm font-medium ${feedback.className}`}>
          {feedback.text}
        </p>
        <span className="shrink-0 text-xs text-slate-400 dark:text-slate-500">
          {Math.min(session.done + 1, strokes.length)} / {strokes.length}
        </span>
      </div>

      {!complete && (
        <div className={`mt-1 grid gap-2 ${mode === 'free' ? 'grid-cols-3' : 'grid-cols-2'}`}>
          <button type="button" onClick={reset} className={TOOL_BUTTON}>
            <Icon name="replay" className="size-5" />
            {mode === 'free' ? 'Effacer' : 'Recommencer'}
          </button>
          <button
            type="button"
            onClick={() => setHintFor(session.done)}
            disabled={showHint}
            className={`${TOOL_BUTTON} disabled:opacity-40`}
          >
            <Icon name="lightbulb" className="size-5" />
            Indice
          </button>
          {mode === 'free' && (
            <button type="button" onClick={compare} className={TOOL_BUTTON}>
              <Icon name="eye" className="size-5" />
              Comparer
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function feedbackOf(session: WritingState): { text: string; className: string } {
  const last = session.last
  const neutral = 'text-slate-500 dark:text-slate-400'
  if (isComplete(session)) return { text: 'Kana terminé !', className: 'text-emerald-600' }
  if (!last) return { text: 'Tracez le premier trait.', className: neutral }
  if (last.ok) return { text: 'Bien ! Trait suivant.', className: 'text-emerald-600' }
  const error = 'text-red-600'
  switch (last.fault) {
    case 'order':
      return {
        text: `Mauvais ordre : c'est le trait ${(last.matchedIndex ?? 0) + 1}. Tracez d'abord le trait ${session.done + 1}.`,
        className: error,
      }
    case 'direction':
      return { text: 'Bon trait, mais dans le mauvais sens.', className: error }
    case 'position':
      return { text: 'Bonne forme, mais mal placée.', className: error }
    case 'shape':
      return { text: 'Forme incorrecte, réessayez.', className: error }
  }
}

function toModel(canvas: HTMLCanvasElement, clientX: number, clientY: number): Point {
  const rect = canvas.getBoundingClientRect()
  return [((clientX - rect.left) / rect.width) * STROKE_VIEWBOX, ((clientY - rect.top) / rect.height) * STROKE_VIEWBOX]
}

/** Contexte 2D exprimé dans le repère KanjiVG. */
function context(canvas: HTMLCanvasElement): CanvasRenderingContext2D | null {
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  const k = canvas.width / STROKE_VIEWBOX
  ctx.setTransform(k, 0, 0, k, 0, 0)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.lineWidth = INK_WIDTH
  return ctx
}

function clear(ctx: CanvasRenderingContext2D) {
  ctx.clearRect(0, 0, STROKE_VIEWBOX, STROKE_VIEWBOX)
}

function drawPolyline(ctx: CanvasRenderingContext2D, points: readonly Point[], color: string) {
  const [first, ...rest] = points
  if (!first) return
  ctx.strokeStyle = color
  ctx.beginPath()
  ctx.moveTo(first[0], first[1])
  // Un seul point : segment nul, rendu en rond grâce à lineCap.
  if (rest.length === 0) ctx.lineTo(first[0], first[1])
  for (const p of rest) ctx.lineTo(p[0], p[1])
  ctx.stroke()
}
