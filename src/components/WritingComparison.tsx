import type { ReactNode } from 'react'
import { KanaGuideLines } from '@/components/KanaGuideLines'
import { STROKE_VIEWBOX } from '@/data/strokes'
import { toSvgPoints, type Point } from '@/features/writing/geometry'

const INK_WIDTH = 4.5

interface WritingComparisonProps {
  /** Traits dessinés par l'utilisateur, tels quels. */
  drawn: Point[][]
  model: Point[][]
  /** Tracé réussi : contour vert autour de « Votre tracé ». */
  ok?: boolean
}

/** Tracé de l'utilisateur et modèle côte à côte, dans le même repère. */
export function WritingComparison({ drawn, model, ok = false }: WritingComparisonProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Panel label="Votre tracé" frame={ok ? 'border-2 border-correct' : undefined}>
        {drawn.map((points, i) => (
          <polyline key={i} points={toSvgPoints(points)} className="stroke-ink" />
        ))}
      </Panel>
      <Panel
        label="Modèle"
        overlay={model.map((points, i) => {
          const [x, y] = points[0]!
          return (
            <g key={i}>
              <circle cx={x} cy={y} r={2.2} className="fill-accent" />
              <text x={x - 4} y={y - 3} fontSize={7} textAnchor="end" className="fill-accent font-sans font-semibold">
                {i + 1}
              </text>
            </g>
          )
        })}
      >
        {model.map((points, i) => (
          <polyline key={i} points={toSvgPoints(points)} className="stroke-ink" />
        ))}
      </Panel>
    </div>
  )
}

function Panel({
  label,
  children,
  overlay,
  frame = 'border-[1.5px] border-ink',
}: {
  label: string
  children: ReactNode
  overlay?: ReactNode
  frame?: string
}) {
  return (
    <figure>
      <svg
        viewBox={`0 0 ${STROKE_VIEWBOX} ${STROKE_VIEWBOX}`}
        className={`k-pad aspect-square w-full rounded-sm bg-paper-raised ${frame}`}
        role="img"
        aria-label={label}
      >
        <KanaGuideLines />
        <g fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth={INK_WIDTH}>
          {children}
        </g>
        {overlay}
      </svg>
      <figcaption className="mt-1 text-center text-[12.5px] leading-4 font-semibold text-ink-muted">
        {label}
      </figcaption>
    </figure>
  )
}
