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
}

/** Anime les traits un par un, numérotés. Changer la `key` du composant relance l'animation. */
export function StrokeOrderAnimation({ strokes }: StrokeOrderAnimationProps) {
  let delay = 0.3
  const timeline = strokes.map((points) => {
    const start = delay
    const duration = strokeDuration(points)
    delay += duration + GAP_S
    return { points, start, duration }
  })

  return (
    <svg
      viewBox={`0 0 ${STROKE_VIEWBOX} ${STROKE_VIEWBOX}`}
      className="aspect-square w-full rounded-md border border-hairline bg-paper-raised"
      role="img"
      aria-label={`Ordre des traits : ${strokes.length} trait${strokes.length > 1 ? 's' : ''}`}
    >
      <KanaGuideLines />
      <g fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth={4.5}>
        {strokes.map((points, i) => (
          <polyline key={`ghost-${i}`} points={toSvgPoints(points)} className="stroke-hairline" />
        ))}
        {timeline.map(({ points, start, duration }, i) => (
          <polyline
            key={i}
            points={toSvgPoints(points)}
            pathLength={1}
            strokeDasharray="1 1"
            className="stroke-ink"
            style={{ animation: `stroke-draw ${duration}s ease-in-out ${start}s both` }}
          />
        ))}
      </g>
      {timeline.map(({ points, start }, i) => {
        const [x, y] = points[0]!
        return (
          <g key={`n-${i}`} style={{ animation: `fade-in 0.2s ${start}s both` }}>
            <circle cx={x} cy={y} r={2.2} className="fill-sky-500" />
            <text
              x={x - 4}
              y={y - 3}
              fontSize={7}
              textAnchor="end"
              className="fill-sky-600 font-sans font-semibold dark:fill-sky-400"
            >
              {i + 1}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
