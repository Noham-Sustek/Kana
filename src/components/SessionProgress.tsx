export type TickState = 'todo' | 'current' | 'done' | 'missed'

interface SessionProgressProps {
  ticks: readonly TickState[]
  /** Compteur « 4 / 12 » à droite (masqué dans le récapitulatif). */
  showCount?: boolean
  className?: string
}

const TICK: Record<TickState, string> = {
  todo: 'bg-hairline',
  current: 'bg-ink',
  done: 'bg-accent',
  // Entaille : une question ratée se distingue par la forme, pas seulement la teinte.
  missed: 'bg-ink-muted [clip-path:polygon(0_0,100%_0,100%_100%,60%_100%,50%_30%,40%_100%,0_100%)]',
}

/** Barre de session : un segment par question, suivie du compteur « 4 / 12 ». */
export function SessionProgress({ ticks, showCount = true, className = '' }: SessionProgressProps) {
  // Position de la question en cours (« 4 / 12 ») ; une fois tout répondu, le nombre de réponses.
  const current = ticks.indexOf('current')
  const answered = current >= 0 ? current + 1 : ticks.filter((t) => t === 'done' || t === 'missed').length
  return (
    <div className={`flex flex-1 items-center gap-2 ${className}`}>
      <div className="flex flex-1 gap-[3px]" aria-hidden="true">
        {ticks.map((t, i) => (
          <i key={i} className={`k-tick k-tick--${t} h-[5px] flex-1 rounded-[1px] transition-colors duration-200 ${TICK[t]}`} />
        ))}
      </div>
      {showCount && (
        <span className="text-[12.5px] leading-4 font-semibold text-ink-muted tabular-nums">
          {answered} / {ticks.length}
        </span>
      )}
    </div>
  )
}
