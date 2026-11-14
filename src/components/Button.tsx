import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Icon, type IconName } from '@/components/Icon'

export type ButtonVariant = 'primary' | 'ink' | 'line' | 'text' | 'quiet'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** primary (accent, une fois par écran) · ink (« Suivant » après une réponse) ·
   *  line (secondaire) · text (lien d'action) · quiet (« Afficher la réponse »). */
  variant?: ButtonVariant
  /** lg : 60 px, pleine largeur (action principale) ; sm : 44 px. */
  size?: 'lg' | 'sm'
  /** Seconde ligne sous le libellé (« 12 questions · environ 3 min ») : libellé à gauche, icône à droite. */
  detail?: ReactNode
  icon?: IconName
  iconPosition?: 'start' | 'end'
  fullWidth?: boolean
}

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-on-accent',
  ink: 'bg-ink text-paper',
  line: 'border-[1.5px] border-control bg-paper-raised text-ink',
  text: 'text-accent',
  quiet: 'text-ink-muted',
}

/** Bouton d'action du design system (docs/design/components/Button). */
export function Button({
  variant = 'primary',
  size = 'lg',
  detail,
  icon,
  iconPosition = 'end',
  fullWidth,
  type = 'button',
  className = '',
  children,
  ...rest
}: ButtonProps) {
  const textual = variant === 'text' || variant === 'quiet'
  const full = fullWidth ?? (size === 'lg' && !textual)
  const sizing = textual
    ? 'min-h-11 px-3 text-[14.5px] font-semibold'
    : size === 'lg'
      ? 'min-h-15 px-5 text-[17px] leading-[22px] font-bold'
      : 'min-h-11 px-4 text-[14.5px] font-semibold'
  const iconEl = icon && <Icon name={icon} className={size === 'lg' && !textual ? 'size-6' : 'size-[18px]'} />

  return (
    <button
      type={type}
      className={`k-btn k-btn--${variant} ${size === 'lg' && !textual ? 'k-btn--lg' : ''} flex items-center gap-2 rounded-md transition-[transform,filter] duration-75 select-none active:translate-y-px active:brightness-90 disabled:pointer-events-none disabled:opacity-40 ${
        detail ? 'justify-between text-left' : 'justify-center text-center'
      } ${full ? 'w-full' : ''} ${sizing} ${VARIANTS[variant]} ${className}`}
      {...rest}
    >
      {iconPosition === 'start' && iconEl}
      {detail ? (
        <span>
          {children}
          <small className="block text-[12.5px] leading-4 font-normal opacity-90">{detail}</small>
        </span>
      ) : (
        children
      )}
      {iconPosition === 'end' && iconEl}
    </button>
  )
}
