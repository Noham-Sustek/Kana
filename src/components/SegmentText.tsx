import { Fragment } from 'react'
import type { Line } from '@/lib/segments'

/** Ligne de texte dont les morceaux en kana passent en police japonaise. */
export function SegmentText({ line }: { line: Line }) {
  return line.map((s, i) =>
    s.jp ? (
      <span key={i} className="font-jp text-[1.1em]">
        {s.text}
      </span>
    ) : (
      <Fragment key={i}>{s.text}</Fragment>
    ),
  )
}
