const DAY_LETTERS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

export type DayState = 'off' | 'on' | 'today'

interface WeekStripProps {
  /** Lundi → dimanche. `today` = aujourd'hui, session pas encore faite (pointillés). */
  days: readonly DayState[]
  className?: string
}

const DAY: Record<DayState, string> = {
  off: 'border-hairline',
  on: 'border-accent bg-accent',
  today: 'border-dashed border-accent',
}

const DAY_NAMES = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']

/** Semaine en cours : jours faits pleins. */
export function WeekStrip({ days, className = '' }: WeekStripProps) {
  const done = days.filter((d) => d === 'on').length
  return (
    <div
      role="img"
      aria-label={`${done} jour${done > 1 ? 's' : ''} sur 7 cette semaine`}
      className={`grid grid-cols-[repeat(7,20px)] gap-[5px] text-center text-[10px] leading-[14px] font-semibold text-ink-muted ${className}`}
    >
      {days.map((d, i) => (
        <span key={DAY_NAMES[i]}>
          {DAY_LETTERS[i]}
          <i className={`mt-0.5 block h-5 rounded-[3px] border-[1.5px] transition-colors duration-200 ${DAY[d]}`} />
        </span>
      ))}
    </div>
  )
}
