import { useLayoutEffect, useRef, type InputHTMLAttributes, type Ref, type TextareaHTMLAttributes } from 'react'
import { SignalBadge } from '@/components/SignalBadge'

export type FieldState = 'idle' | 'correct' | 'wrong'

interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  state?: FieldState
  /** answer : romaji centré (Newsreader 25 px) · ui : nom de profil, de liste (Figtree 16 px). */
  variant?: 'answer' | 'ui'
  ref?: Ref<HTMLInputElement>
}

const STATES: Record<FieldState, string> = {
  // Focus en encre, ni accent ni vert ni rouge : il ne doit ressembler à aucun retour.
  idle: 'border-[1.5px] border-control bg-paper-raised focus:border-2 focus:border-ink',
  correct: 'border-2 border-correct bg-correct-tint text-correct-ink',
  wrong: 'border-2 border-error bg-error-tint text-error-ink animate-shake',
}

/** Champ de saisie : romaji d'une réponse courte, ou nom (profil, liste). Phrase : `LongTextField`. */
export function TextField({ state = 'idle', variant = 'answer', className = '', ref, ...rest }: TextFieldProps) {
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
            ? 'min-h-15 px-11 text-center font-serif text-[25px] font-medium placeholder:font-sans placeholder:text-base placeholder:font-normal'
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

interface LongTextFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  state?: FieldState
  ref?: Ref<HTMLTextAreaElement>
}

/** Réponse longue (phrase) : romaji aligné à gauche en 19 px, qui passe à la ligne et grandit avec le
 *  texte (docs/design « k-field--text »). Un <input> d'une ligne ne suit pas toujours le curseur sur
 *  mobile (saisie du clavier intégré) : la fin d'une longue phrase sortait du champ.
 *  Entrée valide le formulaire : aucun saut de ligne n'entre dans la valeur. */
export function LongTextField({
  state = 'idle',
  className = '',
  ref,
  value,
  onChange,
  onKeyDown,
  ...rest
}: LongTextFieldProps) {
  const innerRef = useRef<HTMLTextAreaElement | null>(null)

  // Hauteur au contenu : une ligne au départ, puis autant que la phrase en demande.
  useLayoutEffect(() => {
    const el = innerRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [value])

  const setRef = (el: HTMLTextAreaElement | null) => {
    innerRef.current = el
    if (typeof ref === 'function') ref(el)
    else if (ref) ref.current = el
  }

  return (
    <div className={`relative ${className}`}>
      <textarea
        ref={setRef}
        rows={1}
        autoCapitalize="off"
        autoCorrect="off"
        autoComplete="off"
        spellCheck={false}
        enterKeyHint="done"
        value={value}
        onChange={(e) => {
          if (/[\r\n]/.test(e.target.value)) {
            // Saut de ligne d'un clavier qui n'envoie pas de keydown Entrée : on valide.
            e.target.value = e.target.value.replace(/[\r\n]/g, '')
            e.target.form?.requestSubmit()
          }
          onChange?.(e)
        }}
        onKeyDown={(e) => {
          onKeyDown?.(e)
          if (e.key === 'Enter' && !e.defaultPrevented) {
            e.preventDefault()
            e.currentTarget.form?.requestSubmit()
          }
        }}
        className={`k-field k-field--${state} block min-h-15 w-full resize-none overflow-hidden rounded-md py-4 pr-11 pl-3.5 font-serif text-[19px] leading-[26px] font-medium break-words outline-none placeholder:font-sans placeholder:text-base placeholder:font-normal placeholder:text-ink-muted short:min-h-12 short:py-2.5 ${STATES[state]}`}
        {...rest}
      />
      {state !== 'idle' && (
        <SignalBadge signal={state} className="pointer-events-none absolute top-[18px] right-3 short:top-3" />
      )}
    </div>
  )
}
