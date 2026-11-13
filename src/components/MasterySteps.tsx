export const MASTERY_LABELS = ['Nouveau', 'En cours', 'Acquis', 'Solide'] as const

interface MasteryStepsProps {
  /** 0 = Nouveau … 3 = Solide. */
  level: 0 | 1 | 2 | 3
  className?: string
}

/** Quatre petits carrés, de « Nouveau » à « Solide ». */
export function MasterySteps({ level, className = '' }: MasteryStepsProps) {
  return (
    <span role="img" aria-label={MASTERY_LABELS[level]} className={`inline-flex gap-[3px] align-middle ${className}`}>
      {[0, 1, 2, 3].map((i) => (
        <i
          key={i}
          className={`size-[9px] rounded-[1px] border-[1.5px] ${i <= level ? 'border-accent bg-accent' : 'border-control'}`}
        />
      ))}
    </span>
  )
}
