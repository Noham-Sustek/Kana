import type { ReactNode } from 'react'
import { StrokeCell } from '@/components/StrokeCell'
import { isSmallKana } from '@/data/strokes'
import type { Point } from '@/features/writing/geometry'

interface WordComparisonProps {
  chars: string[]
  /** Traits dessinés, par caractère (absent = pas encore dessiné). */
  drawn: (Point[][] | undefined)[]
  model: Point[][][]
}

/** Mot dessiné et modèle, caractère par caractère, sur deux rangées alignées. */
export function WordComparison({ chars, drawn, model }: WordComparisonProps) {
  return (
    <div className="space-y-2">
      <Row label="Votre tracé">
        {chars.map((_, i) => (
          <StrokeCell key={i} strokes={drawn[i] ?? []} className="stroke-slate-900 dark:stroke-slate-100" />
        ))}
      </Row>
      <Row label="Modèle">
        {chars.map((c, i) => (
          <StrokeCell key={i} strokes={model[i] ?? []} className="stroke-emerald-600" caption={isSmallKana(c) ? 'petit' : undefined} />
        ))}
      </Row>
    </div>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
      <div className="flex justify-center gap-1.5">{children}</div>
    </div>
  )
}
