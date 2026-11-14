import type { ButtonHTMLAttributes } from 'react'
import { SignalBadge } from '@/components/SignalBadge'

export type WordTileState = 'idle' | 'gone' | 'correct' | 'wrong'

interface WordTileProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  state?: WordTileState
}

const STATES: Record<WordTileState, string> = {
  idle: 'border-control bg-paper-raised active:-translate-y-[3px] active:-rotate-2 active:border-accent',
  // L'emplacement d'une étiquette posée reste visible : rien ne saute dans la réserve.
  gone: 'border-dashed border-hairline text-transparent',
  correct: 'border-correct bg-correct-tint',
  wrong: 'border-error bg-error-tint text-error-ink',
}

/** Étiquette d'un mot en kana (composer une phrase). Bord bas de 3 px : un objet qu'on prend. */
export function WordTile({ state = 'idle', type = 'button', disabled, className = '', children, ...rest }: WordTileProps) {
  return (
    <button
      type={type}
      disabled={state === 'gone' || disabled}
      className={`k-word k-word--${state} relative inline-flex min-h-12 items-center rounded-sm border-[1.5px] border-b-[3px] px-[13px] font-jp text-[22px] leading-none transition-transform duration-100 ${STATES[state]} ${className}`}
      {...rest}
    >
      {children}
      {state === 'wrong' && <SignalBadge signal="wrong" className="absolute -top-2.5 -right-2.5" />}
    </button>
  )
}
