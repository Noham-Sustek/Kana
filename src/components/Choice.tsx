import type { ButtonHTMLAttributes } from 'react'
import { SignalBadge } from '@/components/SignalBadge'

export type ChoiceState = 'idle' | 'correct' | 'wrong' | 'revealed' | 'dim'

interface ChoiceProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  state?: ChoiceState
  /** Libellé en kana (Klee One 34 px) plutôt qu'en romaji (Newsreader 25 px). */
  jp?: boolean
  /** Grille de 8 réponses : 52 px de haut au lieu de 62. */
  compact?: boolean
}

const STATES: Record<ChoiceState, string> = {
  idle: 'border-[1.5px] border-control bg-paper-raised',
  correct: 'border-2 border-correct bg-correct-tint text-correct-ink animate-pop',
  // Texte barré : la réponse fausse se lit sans la couleur.
  wrong: 'border-2 border-error bg-paper-raised text-error-ink line-through decoration-[1.5px] animate-shake',
  revealed: 'border-2 border-ink bg-paper-raised',
  dim: 'border-[1.5px] border-control bg-paper-raised opacity-45',
}

const BADGE = { correct: 'correct', wrong: 'wrong', revealed: 'revealed' } as const

/** Bouton de réponse des questions à choix (grille 2 × 2 ou 2 × 4). */
export function Choice({ state = 'idle', jp, compact, type = 'button', className = '', children, ...rest }: ChoiceProps) {
  const badge = state === 'correct' || state === 'wrong' || state === 'revealed' ? BADGE[state] : null
  return (
    <button
      type={type}
      className={`k-choice k-choice--${state} relative flex items-center justify-center rounded-md px-2 text-center transition-[transform,filter] duration-75 active:translate-y-px active:brightness-90 ${
        compact ? 'min-h-13' : 'min-h-[62px]'
      } ${jp ? 'font-jp text-[34px] leading-none' : `font-serif leading-none font-medium ${compact ? 'text-[22px]' : 'text-[25px]'}`} ${
        STATES[state]
      } ${className}`}
      {...rest}
    >
      {children}
      {badge && <SignalBadge signal={badge} className="absolute -top-2.5 -right-2.5" />}
    </button>
  )
}
