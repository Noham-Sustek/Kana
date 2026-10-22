import { Icon } from '@/components/Icon'
import type { Kana } from '@/data/kana'

interface KanaNavButtonProps {
  target: Kana | undefined
  direction: 'prev' | 'next'
  onClick: () => void
}

/** Bouton « kana précédent / suivant » (désactivé en bout de liste). */
export function KanaNavButton({ target, direction, onClick }: KanaNavButtonProps) {
  const isPrev = direction === 'prev'
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!target}
      aria-label={isPrev ? 'Kana précédent' : 'Kana suivant'}
      className={`flex min-h-14 items-center gap-2 rounded-xl bg-white px-4 shadow-sm transition-transform active:scale-95 disabled:opacity-30 dark:bg-slate-900 ${
        isPrev ? 'justify-start' : 'flex-row-reverse justify-start'
      }`}
    >
      <Icon name={isPrev ? 'chevronLeft' : 'chevronRight'} className="size-5" />
      {target && <span className="font-jp text-xl">{target.char}</span>}
      {target && <span className="text-xs text-slate-500 dark:text-slate-400">{target.romaji[0]}</span>}
    </button>
  )
}
