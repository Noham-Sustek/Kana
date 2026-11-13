export type TickState = 'todo' | 'current' | 'done' | 'missed'

interface SessionProgressProps {
  ticks: readonly TickState[]
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
export function SessionProgress({ ticks, className = '' }: SessionProgressProps) {
  const answered = ticks.filter((t) => t === 'done' || t === 'missed').length
  return (
    <div className={`flex flex-1 items-center gap-2 ${className}`}>
      <div className="flex flex-1 gap-[3px]" aria-hidden="true">
        {ticks.map((t, i) => (
          <i key={i} className={`h-[5px] flex-1 rounded-[1px] transition-colors duration-200 ${TICK[t]}`} />
        ))}
      </div>
      <span className="text-[12.5px] leading-4 font-semibold text-ink-muted tabular-nums">
        {answered} / {ticks.length}
      </span>
    </div>
  )
}
