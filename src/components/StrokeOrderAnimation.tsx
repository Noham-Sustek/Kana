import { KanaGuideLines } from '@/components/KanaGuideLines'
import { STROKE_VIEWBOX } from '@/data/strokes'
import { pathLength, toSvgPoints, type Point } from '@/features/writing/geometry'

const GAP_S = 0.3

/** Durée de tracé d'un trait, proportionnelle à sa longueur. */
function strokeDuration(points: readonly Point[]): number {
  return 0.35 + pathLength(points) / 80
}

interface StrokeOrderAnimationProps {
  strokes: Point[][]
  /** Pas à pas : les traits précédents sont posés, seul ce trait (index) s'anime. Absent : tous, l'un après l'autre. */
  step?: number
  className?: string
}

/** Anime les traits un par un, numérotés. Changer la `key` du composant relance l'animation. */
export function StrokeOrderAnimation({ strokes, step, className = '' }: StrokeOrderAnimationProps) {
  let delay = 0.3
  const timeline = strokes.map((points, i) => {
    if (step !== undefined && i !== step) return { points, start: 0, duration: 0, shown: i < step }
    const start = delay
    const duration = strokeDuration(points)
    delay += duration + GAP_S
    return { points, start, duration, shown: true }
  })

  return (
    <svg
      viewBox={`0 0 ${STROKE_VIEWBOX} ${STROKE_VIEWBOX}`}
      className={`aspect-square w-full rounded-sm border-[1.5px] border-ink bg-paper-raised ${className}`}
      role="img"
      aria-label={
        step === undefined
          ? `Ordre des traits : ${strokes.length} trait${strokes.length > 1 ? 's' : ''}`
          : `Trait ${step + 1} sur ${strokes.length}`
      }
    >
      <KanaGuideLines />
      <g fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth={4.5}>
        {strokes.map((points, i) => (
          <polyline key={`ghost-${i}`} points={toSvgPoints(points)} className="stroke-hairline" />
        ))}
        {timeline.map(({ points, start, duration, shown }, i) =>
          !shown ? null : duration === 0 ? (
            <polyline key={i} points={toSvgPoints(points)} className="stroke-ink" />
          ) : (
            <polyline
              key={i}
              points={toSvgPoints(points)}
              pathLength={1}
              strokeDasharray="1 1"
              className="stroke-ink"
              style={{ animation: `stroke-draw ${duration}s ease-in-out ${start}s both` }}
            />
          ),
        )}
      </g>
      {timeline.map(({ points, start, shown }, i) => {
        if (!shown) return null
        const [x, y] = points[0]!
        return (
          <g key={`n-${i}`} style={{ animation: `fade-in 0.2s ${start}s both` }}>
            <circle cx={x} cy={y} r={2.2} className="fill-accent" />
            <text x={x - 4} y={y - 3} fontSize={7} textAnchor="end" className="fill-accent font-sans font-semibold">
              {i + 1}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
