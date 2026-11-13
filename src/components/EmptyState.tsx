import type { ReactNode } from 'react'
import { Icon, type IconName } from '@/components/Icon'

interface EmptyStateProps {
  /** Icône, ou kana (en Klee One) dans la case vide. */
  icon?: IconName
  glyph?: string
  title: string
  children: ReactNode
  /** Une seule action : le bouton (Button) qui remplit l'écran. */
  action?: ReactNode
  className?: string
}

/** État vide : une case en pointillés qui attend d'être remplie, un titre, une phrase, une action. */
export function EmptyState({ icon, glyph, title, children, action, className = '' }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center gap-2.5 px-6 py-6 text-center ${className}`}>
      <div className="mb-1.5 grid size-28 place-items-center rounded-sm border-[1.5px] border-dashed border-control text-ink-muted">
        {glyph ? (
          <span className="font-jp text-[64px] leading-none">{glyph}</span>
        ) : (
          icon && <Icon name={icon} strokeWidth={1.5} className="size-[30px]" />
        )}
      </div>
      <h2 className="font-serif text-xl leading-tight font-medium">{title}</h2>
      <p className="text-sm text-ink-muted">{children}</p>
      {action}
    </div>
  )
}
