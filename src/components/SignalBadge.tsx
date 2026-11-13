import { Icon } from '@/components/Icon'

export type Signal = 'correct' | 'wrong' | 'revealed'

const STYLES: Record<Signal, { bg: string; icon: 'check' | 'close' | 'eye'; label: string }> = {
  correct: { bg: 'bg-correct text-on-signal', icon: 'check', label: 'Juste' },
  wrong: { bg: 'bg-error text-on-signal', icon: 'close', label: 'Faux' },
  revealed: { bg: 'bg-ink text-paper', icon: 'eye', label: 'Réponse' },
}

interface SignalBadgeProps {
  signal: Signal
  /** sm : 24 px (sur un bouton, un champ) ; md : 30 px (panneau de retour). */
  size?: 'sm' | 'md'
  className?: string
}

/** Pastille ronde coche / croix / œil : la couleur n'est jamais le seul signal. */
export function SignalBadge({ signal, size = 'sm', className = '' }: SignalBadgeProps) {
  const s = STYLES[signal]
  return (
    <span
      role="img"
      aria-label={s.label}
      className={`grid shrink-0 place-items-center rounded-full no-underline animate-badge-in ${s.bg} ${
        size === 'sm' ? 'size-6' : 'size-[30px]'
      } ${className}`}
    >
      <Icon name={s.icon} strokeWidth={3} className={size === 'sm' ? 'size-3.5' : 'size-[18px]'} />
    </span>
  )
}
