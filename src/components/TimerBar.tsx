interface TimerBarProps {
  /** Durée totale en ms : la barre se vide linéairement de droite à gauche. */
  durationMs: number
  /** Change pour relancer l'animation (id de la question). */
  runKey: string | number
  paused?: boolean
  className?: string
}

const DASHED_UNDER_MS = 3000

/** Chrono de question : 3 px d'encre, passe en pointillés sous 3 s (pas de rouge). */
export function TimerBar({ durationMs, runKey, paused, className = '' }: TimerBarProps) {
  const dashedDelay = Math.max(0, durationMs - DASHED_UNDER_MS)
  return (
    <div className={`h-[3px] overflow-hidden ${className}`} aria-hidden="true">
      <div
        key={runKey}
        className="h-full origin-left"
        style={{
          background: 'var(--k-ink)',
          animation: `timer-shrink ${durationMs}ms linear forwards, k-timer-dash 1ms ${dashedDelay}ms forwards`,
          animationPlayState: paused ? 'paused' : 'running',
        }}
      />
    </div>
  )
}
