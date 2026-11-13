import type { ButtonHTMLAttributes } from 'react'
import { Icon, type IconName } from '@/components/Icon'

interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'> {
  icon: IconName
  /** Obligatoire : seul nom accessible du bouton. */
  label: string
}

/** Bouton icône seule, 44 × 44. */
export function IconButton({ icon, label, type = 'button', className = '', ...rest }: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      className={`grid size-11 shrink-0 place-items-center rounded-md text-ink-muted active:brightness-90 disabled:opacity-40 ${className}`}
      {...rest}
    >
      <Icon name={icon} className="size-[22px]" />
    </button>
  )
}
