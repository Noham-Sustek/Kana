import type { ButtonHTMLAttributes, ReactNode } from 'react'

export type ChipState = 'off' | 'on' | 'partial'

interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  state?: ChipState
  /** Kana de tête (ligne あ…), en Klee One 20 px. */
  glyph?: string
  /** Petit texte après le libellé : romaji, compte « 3/5 », nombre de kana d'une liste. */
  detail?: ReactNode
}

const STATES: Record<ChipState, string> = {
  off: 'border-[1.5px] border-control bg-paper-raised text-ink',
  on: 'border-[1.5px] border-accent bg-accent text-on-accent',
  partial: 'border-2 border-accent bg-accent-tint text-ink px-[11.5px]',
}

/** Puce à cocher (lignes de kana, listes). */
export function Chip({ state = 'off', glyph, detail, type = 'button', className = '', children, ...rest }: ChipProps) {
  return (
    <button
      type={type}
      aria-pressed={state === 'on' ? true : state === 'partial' ? 'mixed' : false}
      className={`k-chip k-chip--${state} inline-flex min-h-11 items-center gap-1.5 rounded-md px-3 text-[13.5px] leading-none font-semibold active:brightness-90 disabled:opacity-40 ${STATES[state]} ${className}`}
      {...rest}
    >
      {glyph && <span className="font-jp text-xl">{glyph}</span>}
      {children}
      {detail !== undefined && (
        <small className={`text-[13px] font-normal ${state === 'on' ? 'text-on-accent' : 'text-ink-muted'}`}>{detail}</small>
      )}
    </button>
  )
}
