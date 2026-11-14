import { useId, useRef, useState, type PointerEvent, type ReactNode } from 'react'
import { useModalDialog } from '@/lib/useModalDialog'

interface SheetProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}

// Au-delà de cette distance tirée vers le bas, la feuille se ferme.
const CLOSE_DRAG_PX = 80

/** Feuille qui monte du bas (profils, choix d'exercice, options). Se ferme en la tirant
 *  vers le bas, en touchant le voile, avec Échap ou le bouton Retour d'Android. */
export function Sheet({ open, onClose, title, children }: SheetProps) {
  const ref = useModalDialog(open, onClose)
  const titleId = useId()
  const [drag, setDrag] = useState(0)
  const start = useRef<number | null>(null)

  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    start.current = e.clientY
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (start.current !== null) setDrag(Math.max(0, e.clientY - start.current))
  }
  const onUp = () => {
    if (start.current === null) return
    start.current = null
    if (drag > CLOSE_DRAG_PX) onClose()
    setDrag(0)
  }

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      // Toucher le voile : le clic arrive sur le <dialog> lui-même, hors de son contenu.
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={drag ? { transform: `translateY(${drag}px)` } : undefined}
      className="k-sheet mx-auto mt-auto mb-0 max-h-[85dvh] w-full max-w-lg overflow-hidden rounded-t-2xl border-t border-hairline bg-paper p-0 text-ink shadow-[0_-8px_32px_rgba(30,27,23,0.16)] open:animate-sheet-in dark:shadow-none"
    >
      {open && (
        <div className="flex max-h-[85dvh] flex-col">
          <div
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
            className="flex shrink-0 touch-none justify-center pt-2 pb-3"
          >
            <span className="h-1 w-9 rounded-full bg-control" aria-hidden="true" />
          </div>
          <h2 id={titleId} className="shrink-0 px-5 font-serif text-[21px] leading-tight font-medium">
            {title}
          </h2>
          <div className="overflow-y-auto px-5 pt-3 pb-[max(18px,env(safe-area-inset-bottom))]">{children}</div>
        </div>
      )}
    </dialog>
  )
}
