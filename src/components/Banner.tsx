import type { ReactNode } from 'react'
import { Icon, type IconName } from '@/components/Icon'
import { IconButton } from '@/components/IconButton'

interface BannerProps {
  icon: IconName
  children: ReactNode
  actionLabel: string
  onAction: () => void
  onDismiss: () => void
  className?: string
}

/** Message discret, non bloquant (rappel de sauvegarde, invitation à installer). Un seul à la fois. */
export function Banner({ icon, children, actionLabel, onAction, onDismiss, className = '' }: BannerProps) {
  return (
    <div
      className={`k-banner flex items-start gap-2.5 rounded-md border border-control bg-paper-raised py-2.5 pr-1 pl-3 text-[13.5px] leading-[19px] ${className}`}
    >
      <Icon name={icon} className="mt-px size-5 text-ink-muted" />
      <div className="min-w-0 flex-1">
        {children}
        <button
          type="button"
          onClick={onAction}
          className="block min-h-8 pt-1.5 font-semibold text-accent underline underline-offset-[3px]"
        >
          {actionLabel}
        </button>
      </div>
      <IconButton icon="close" label="Masquer" onClick={onDismiss} className="-my-2" />
    </div>
  )
}
