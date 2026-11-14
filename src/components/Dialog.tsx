import { useId, type ReactNode } from 'react'
import { Button } from '@/components/Button'
import { useModalDialog } from '@/lib/useModalDialog'

interface DialogProps {
  open: boolean
  /** Une question : « Quitter la session ? ». */
  title: string
  /** La conséquence, en une phrase. */
  children: ReactNode
  /** Action sûre, à droite sous le pouce (« Continuer », « Annuler ») ; aussi Échap et Retour. */
  safeLabel: string
  onSafe: () => void
  /** Action risquée, nommée par son verbe (« Quitter », « Supprimer »), jamais « OK ». */
  riskyLabel: string
  onRisky: () => void
  /** Action irréversible (suppression, import) : bouton en encre, l'action sûre en contour. */
  irreversible?: boolean
}

/** Confirmation intégrée, à la place de `confirm()`. Pas de rouge : il reste réservé aux réponses. */
export function Dialog({ open, title, children, safeLabel, onSafe, riskyLabel, onRisky, irreversible }: DialogProps) {
  const ref = useModalDialog(open, onSafe)
  const titleId = useId()
  const descId = useId()

  return (
    <dialog
      ref={ref}
      role="alertdialog"
      aria-labelledby={titleId}
      aria-describedby={descId}
      className="k-dialog m-auto w-[calc(100%-48px)] max-w-[340px] rounded-2xl border border-hairline bg-paper px-5 pt-[22px] pb-4 text-ink shadow-[0_-8px_32px_rgba(30,27,23,0.16)] open:animate-dialog-in dark:shadow-none"
    >
      {open && (
        <>
          <h2 id={titleId} className="font-serif text-[21px] leading-tight font-medium">
            {title}
          </h2>
          <p id={descId} className="mt-2 mb-[18px] text-[13.5px] leading-[19px] text-ink-muted">
            {children}
          </p>
          <div className="flex gap-3">
            <Button size="sm" variant={irreversible ? 'ink' : 'line'} className="flex-1" onClick={onRisky}>
              {riskyLabel}
            </Button>
            <Button size="sm" variant={irreversible ? 'line' : 'primary'} className="flex-1" onClick={onSafe} autoFocus>
              {safeLabel}
            </Button>
          </div>
        </>
      )}
    </dialog>
  )
}
