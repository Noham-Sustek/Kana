interface ReloadLRProps {
  side: 'L' | 'R'
  label: string
  onClick: () => void
  /** Sur fond blanc : lettre en encre. */
  onLight?: boolean
  className?: string
}

/** Gâchette L / R des écrans Reload : change d'onglet, de kana ou d'écriture. */
export function ReloadLR({ side, label, onClick, onLight = false, className = '' }: ReloadLRProps) {
  const chevron = (
    <svg viewBox="0 0 12 20" className="h-4 w-2.5 shrink-0" aria-hidden="true">
      <path d={side === 'L' ? 'M10 2L2 10l8 8' : 'M2 2l8 8-8 8'} fill="none" stroke="var(--r-red)" strokeWidth="3" />
    </svg>
  )
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      data-tap-sound={side === 'L' ? 'prev' : 'next'}
      className={`flex min-h-11 min-w-11 items-center gap-0.5 ${side === 'R' ? 'justify-end' : ''} ${className}`}
    >
      {side === 'L' && chevron}
      <span
        className={`rl-display text-[30px] ${onLight ? 'text-[#05081f]' : 'text-white'}`}
        style={onLight ? undefined : { textShadow: '2px 2px 0 #10206e, -1px -1px 0 #10206e, 1px -1px 0 #10206e, -1px 1px 0 #10206e' }}
      >
        {side}
      </span>
      {side === 'R' && chevron}
    </button>
  )
}
