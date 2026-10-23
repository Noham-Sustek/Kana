import { KanaGuideLines } from '@/components/KanaGuideLines'
import { STROKE_VIEWBOX } from '@/data/strokes'
import { toSvgPoints, type Point } from '@/features/writing/geometry'

const INK_WIDTH = 5

interface StrokeCellProps {
  strokes: Point[][]
  className: string
  caption?: string
}

/** Petite case carrée affichant des traits (tracé de l'utilisateur ou modèle). */
export function StrokeCell({ strokes, className, caption }: StrokeCellProps) {
  return (
    <figure className="max-w-24 min-w-0 flex-1">
      <svg
        viewBox={`0 0 ${STROKE_VIEWBOX} ${STROKE_VIEWBOX}`}
        className="aspect-square w-full rounded-xl bg-white shadow-sm dark:bg-slate-900"
        aria-hidden="true"
      >
        <KanaGuideLines />
        <g fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth={INK_WIDTH} className={className}>
          {strokes.map((points, i) => (
            <polyline key={i} points={toSvgPoints(points)} />
          ))}
        </g>
      </svg>
      {caption && (
        <figcaption className="text-center text-[0.65rem] text-slate-500 dark:text-slate-400">{caption}</figcaption>
      )}
    </figure>
  )
}
