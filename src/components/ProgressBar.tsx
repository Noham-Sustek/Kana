interface ProgressBarProps {
  /** Proportion de 0 à 1. */
  value: number
  /** Nom accessible (« Kana acquis »). La valeur doit aussi être écrite en clair à côté. */
  label: string
  className?: string
}

/** Barre de 6 px pour une proportion (kana acquis sur le total). */
export function ProgressBar({ value, label, className = '' }: ProgressBarProps) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100)
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      className={`k-bar h-1.5 overflow-hidden rounded-[1px] bg-hairline ${className}`}
    >
      <div className="k-bar__fill h-full bg-accent transition-[width] duration-200" style={{ width: `${pct}%` }} />
    </div>
  )
}
