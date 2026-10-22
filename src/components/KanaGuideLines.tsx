import { STROKE_VIEWBOX } from '@/data/strokes'

const MID = STROKE_VIEWBOX / 2

/** Croix de repère en pointillés, à placer dans un <svg> de viewBox STROKE_VIEWBOX. */
export function KanaGuideLines() {
  return (
    <g className="stroke-slate-200 dark:stroke-slate-800" strokeWidth={0.6} strokeDasharray="2 2">
      <line x1={MID} y1={0} x2={MID} y2={STROKE_VIEWBOX} />
      <line x1={0} y1={MID} x2={STROKE_VIEWBOX} y2={MID} />
    </g>
  )
}
