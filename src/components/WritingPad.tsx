import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { Icon } from '@/components/Icon'
import { KanaGuideLines } from '@/components/KanaGuideLines'
import { haptic } from '@/lib/haptic'
import { STROKE_VIEWBOX } from '@/data/strokes'
import { distance, toSvgPoints, type Point } from '@/features/writing/geometry'
import {
  applyVerdict,
  createWritingState,
  undoStroke,
  isComplete,
  shouldShowHint,
  totalMistakes,
  type WritingState,
} from '@/features/writing/session'
import { evaluateStroke, prepareStroke, type MatchMode } from '@/features/writing/strokeMatch'
import { useIsDark } from '@/lib/useIsDark'
import { useUiStyle } from '@/lib/useUiStyle'

const INK_WIDTH = 4.5
// Le canvas ne lit pas les classes : valeurs des jetons ink (clair / sombre) et error.
const INK_LIGHT = '#1e1b17'
const INK_DARK = '#ede6d8'
const ERROR_COLOR = '#c8321f'
// Style Reload (skin-reload.css) : encre blanche sur la case marine, trait refusé en rose.
const INK_RELOAD = '#ffffff'
const ERROR_RELOAD = '#ff6fa0'
const FLASH_MS = 500
// Outils sous la zone : icône au-dessus du libellé ; l'action du niveau porte un contour.
const TOOL_BUTTON =
  'k-padtool flex min-h-[52px] min-w-[68px] flex-col items-center justify-center gap-0.5 rounded-md px-2 text-[12px] leading-[14px] font-semibold text-ink active:brightness-90 disabled:opacity-40'
const MAIN_TOOL = 'border-[1.5px] border-control bg-paper-raised'
/** Écart minimal entre deux points enregistrés (unités KanjiVG) : évite d'accumuler du bruit. */
const MIN_POINT_GAP = 0.4

export interface WritingResult {
  mistakes: number
  /** Traits tels que dessinés (validés, plus le dernier refusé s'il y en a un). */
  drawn: Point[][]
  /** Vrai si l'utilisateur a demandé le modèle avant d'avoir fini. */
  revealed: boolean
  /** Vrai si un indice a été affiché (demandé, ou automatique après des erreurs). */
  hinted: boolean
  /** Traits refusés, par trait du modèle (vide sans validation). */
  strokeMistakes: number[]
  /** Traits validés (tous quand le kana est terminé ; moins après « Comparer »). */
  done: number
}

interface WritingPadProps {
  strokes: Point[][]
  mode: MatchMode
  onComplete: (result: WritingResult) => void
  /** Bouton « Comparer » (mode libre) ; masqué quand l'appelant gère l'abandon. */
  showCompare?: boolean
  /**
   * Faux : aucun trait n'est vérifié, l'utilisateur dessine librement puis termine
   * lui-même (il juge ensuite son tracé face au modèle).
   */
  validate?: boolean
}

/**
 * Tracé au doigt, validé trait par trait. Le canvas ne porte que l'encre en cours
 * (ou le dernier trait refusé, en rouge) ; modèle, traits validés et indices sont
 * dans un SVG en dessous. En mode `trace`, un trait validé est remplacé par celui
 * du modèle ; en mode `free`, il reste tel que dessiné (comparaison à la fin).
 */
export function WritingPad({ strokes, mode, onComplete, showCompare = true, validate = true }: WritingPadProps) {
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
  const reload = useUiStyle() === 'reload'
  const ink = reload ? INK_RELOAD : dark ? INK_DARK : INK_LIGHT
  const errorColor = reload ? ERROR_RELOAD : ERROR_COLOR
  const complete = validate && isComplete(session)
  const showHint = validate && !complete && (hintFor === session.done || shouldShowHint(session))
  const hinted = useRef(false)
  if (showHint) hinted.current = true
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
    if (errorStroke) drawPolyline(ctx, errorStroke, errorColor)
    if (current.current) drawPolyline(ctx, current.current, ink)
  }, [size, ink, errorColor, errorStroke])

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

    if (!validate) {
      const ctx = context(e.currentTarget)
      if (ctx) clear(ctx)
      setDrawn([...drawn, points])
      return
    }

    const verdict = evaluateStroke(points, prepared, session.done, mode)
    const nextState = applyVerdict(session, verdict)
    setSession(nextState)
    if (verdict.ok) {
      const ctx = context(e.currentTarget)
      if (ctx) clear(ctx)
      const nextDrawn = [...drawn, points]
      setDrawn(nextDrawn)
      setFlash(session.done)
      haptic('strokeOk')
      if (isComplete(nextState)) {
        onComplete({
          mistakes: totalMistakes(nextState),
          drawn: nextDrawn,
          revealed: false,
          hinted: hinted.current,
          strokeMistakes: nextState.mistakes,
          done: nextState.done,
        })
      }
    } else {
      setErrorStroke(points)
      haptic('wrong')
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
    hinted.current = false
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
      hinted: hinted.current,
      strokeMistakes: session.mistakes,
      done: session.done,
    })

  const undo = () => {
    setDrawn(drawn.slice(0, -1))
    if (validate) {
      setSession(undoStroke(session))
      setErrorStroke(null)
    }
  }
  const finish = () => onComplete({ mistakes: 0, drawn, revealed: false, hinted: false, strokeMistakes: [], done: drawn.length })

  const feedback: PadFeedback = validate
    ? feedbackOf(session)
    : { text: `Dessinez librement, puis touchez Terminé · ${drawn.length} trait${drawn.length > 1 ? 's' : ''}`, className: 'text-ink-muted' }
  // Traits validés : ceux du modèle (calque) ou ceux réellement dessinés (libre).
  const doneStrokes = mode === 'trace' ? strokes.slice(0, session.done) : drawn

  return (
    <div>
      <div className="k-pad relative aspect-square w-full overflow-hidden rounded-sm border-[1.5px] border-ink bg-paper-raised">
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
                  className="stroke-hairline"
                />
              ))}
            {doneStrokes.map((points, i) => (
              <polyline
                key={`done-${i}`}
                points={toSvgPoints(points)}
                className={`transition-colors duration-300 ${
                  i === flash ? 'stroke-correct' : 'stroke-ink'
                }`}
              />
            ))}
            {showHint && next && (
              <polyline
                key={`hint-${session.done}`}
                points={toSvgPoints(next)}
                pathLength={1}
                strokeDasharray="1 1"
                className="stroke-accent"
                style={{ animation: 'stroke-draw 1.4s ease-in-out infinite' }}
              />
            )}
          </g>
          {next && (mode === 'trace' || showHint) && (
            <circle cx={next[0]![0]} cy={next[0]![1]} r={2.6} className="fill-accent" />
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

      <p aria-live="polite" className={`mt-2.5 flex min-h-5 items-center justify-center gap-1 text-center text-[12.5px] leading-4 font-semibold ${feedback.className}`}>
        {feedback.ok && <Icon name="check" strokeWidth={3} className="size-3.5 shrink-0" />}
        {feedback.text}
      </p>

      <div className="mt-1.5 flex justify-center gap-2">
        {(!validate || !complete) && (
          <>
            <button type="button" onClick={reset} disabled={drawn.length === 0 && !errorStroke} className={TOOL_BUTTON}>
              <Icon name="replay" className="size-5" />
              Effacer
            </button>
            <button type="button" onClick={undo} disabled={drawn.length === 0} className={TOOL_BUTTON}>
              <Icon name="undo" className="size-5" />
              Annuler
            </button>
          </>
        )}
        {validate && !complete && (
          <button type="button" onClick={() => setHintFor(session.done)} disabled={showHint} className={TOOL_BUTTON}>
            <Icon name="lightbulb" className="size-5" />
            Indice
          </button>
        )}
        {validate && !complete && mode === 'free' && showCompare && (
          <button type="button" onClick={compare} className={`${TOOL_BUTTON} ${MAIN_TOOL}`}>
            <Icon name="eye" className="size-5" />
            Comparer
          </button>
        )}
        {!validate && (
          <button type="button" onClick={finish} disabled={drawn.length === 0} className={`${TOOL_BUTTON} ${MAIN_TOOL}`}>
            <Icon name="check" className="size-5" />
            Terminé
          </button>
        )}
      </div>
    </div>
  )
}

interface PadFeedback {
  text: string
  className: string
  ok?: boolean
}

function feedbackOf(session: WritingState): PadFeedback {
  const last = session.last
  const neutral = 'text-ink-muted'
  const total = session.strokeCount
  if (isComplete(session)) return { text: 'Kana terminé', className: 'text-correct-ink', ok: true }
  if (!last) {
    return { text: session.done === 0 ? `Tracez le premier trait · ${total} au total` : `Trait ${session.done + 1} sur ${total}`, className: neutral }
  }
  if (last.ok) return { text: `Trait ${session.done} : forme, sens, position`, className: 'text-correct-ink', ok: true }
  const error = 'text-error-ink'
  switch (last.fault) {
    case 'order':
      return {
        text: `Ce n’est pas encore ce trait : tracez d’abord le trait ${session.done + 1}`,
        className: error,
      }
    case 'direction':
      return { text: 'Sens inversé', className: error }
    case 'position':
      return { text: 'Bonne forme, mal placée', className: error }
    case 'shape':
      return { text: 'Forme à reprendre', className: error }
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
