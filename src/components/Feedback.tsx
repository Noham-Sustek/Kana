import type { ReactNode } from 'react'
import { SignalBadge, type Signal } from '@/components/SignalBadge'

interface FeedbackProps {
  signal: Signal
  /** « Juste », « Pas encore », « La réponse : nu ». Jamais « Bravo ! » ni « Faux ! ». */
  title: ReactNode
  /** Ce qui apporte quelque chose : mot d'exemple, kanji usuel, kana confondu, provenance. */
  children?: ReactNode
  className?: string
}

const STYLES: Record<Signal, { box: string; title: string }> = {
  correct: { box: 'border-correct bg-correct-tint', title: 'text-correct-ink' },
  wrong: { box: 'border-error bg-error-tint', title: 'text-error-ink' },
  revealed: { box: 'border-ink bg-paper-raised', title: '' },
}

/** Panneau de retour affiché sous la zone de réponse. */
export function Feedback({ signal, title, children, className = '' }: FeedbackProps) {
  const s = STYLES[signal]
  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex animate-rise items-center gap-[11px] rounded-md border-[1.5px] px-3 py-2.5 ${s.box} ${className}`}
    >
      <SignalBadge signal={signal} size="md" />
      <div className="min-w-0">
        <strong className={`block text-[14.5px] leading-[19px] ${s.title}`}>{title}</strong>
        {children && <div className="text-[13.5px] leading-[19px]">{children}</div>}
      </div>
    </div>
  )
}
