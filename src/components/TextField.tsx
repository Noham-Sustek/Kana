import type { InputHTMLAttributes, Ref } from 'react'
import { SignalBadge } from '@/components/SignalBadge'

export type FieldState = 'idle' | 'correct' | 'wrong'

interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  state?: FieldState
  /** answer : romaji centré (Newsreader 25 px) · ui : nom de profil, de liste (Figtree 16 px). */
  variant?: 'answer' | 'ui'
  /** Réponse longue (phrase) : alignée à gauche, en 19 px. */
  long?: boolean
  ref?: Ref<HTMLInputElement>
}

const STATES: Record<FieldState, string> = {
  // Focus en encre, ni accent ni vert ni rouge : il ne doit ressembler à aucun retour.
  idle: 'border-[1.5px] border-control bg-paper-raised focus:border-2 focus:border-ink',
  correct: 'border-2 border-correct bg-correct-tint text-correct-ink',
  wrong: 'border-2 border-error bg-error-tint text-error-ink animate-shake',
}

/** Champ de saisie : romaji d'une réponse, ou nom (profil, liste). */
export function TextField({ state = 'idle', variant = 'answer', long, className = '', ref, ...rest }: TextFieldProps) {
  const answer = variant === 'answer'
  return (
    <div className={`relative ${className}`}>
      <input
        ref={ref}
        autoCapitalize="off"
        autoCorrect="off"
        autoComplete="off"
        spellCheck={false}
        enterKeyHint="done"
        className={`k-field k-field--${state} w-full rounded-md outline-none placeholder:text-ink-muted ${
          answer
            ? `min-h-15 font-serif font-medium placeholder:font-sans placeholder:text-base placeholder:font-normal ${
                long ? 'pr-11 pl-3.5 text-[19px]' : 'px-11 text-center text-[25px]'
              }`
            : 'min-h-11 px-3.5 text-base'
        } ${STATES[state]}`}
        {...rest}
      />
      {state !== 'idle' && (
        <SignalBadge signal={state} className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2" />
      )}
    </div>
  )
}
