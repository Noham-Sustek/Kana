import type { ButtonHTMLAttributes } from 'react'
import { Icon, type IconName } from '@/components/Icon'

interface ActionCardProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: IconName
  title: string
  /** Une ligne d'état sous le titre (« Record : 42 kana par minute »). */
  detail: string
}

/** Carte qui mène quelque part (S'entraîner) : icône, titre, état en une ligne, flèche. */
export function ActionCard({ icon, title, detail, type = 'button', className = '', ...rest }: ActionCardProps) {
  return (
    <button
      type={type}
      className={`k-card flex min-h-[68px] w-full items-center gap-3 rounded-md border-[1.5px] border-control bg-paper-raised py-2.5 pr-2 pl-3.5 text-left active:brightness-95 disabled:opacity-60 ${className}`}
      {...rest}
    >
      <Icon name={icon} className="size-[22px] shrink-0 text-accent" />
      <span className="min-w-0 flex-1">
        <b className="block text-[15.5px] font-semibold">{title}</b>
        <small className="block text-[13px] leading-[18px] text-ink-muted">{detail}</small>
      </span>
      <Icon name="chevronRight" className="size-5 shrink-0 text-ink-muted" />
    </button>
  )
}
