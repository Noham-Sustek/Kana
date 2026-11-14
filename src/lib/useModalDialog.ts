import { useEffect, useRef } from 'react'
import { playSound } from '@/lib/sound'

/** Pilote un <dialog> natif en modal depuis un état React. `showModal` apporte le voile,
 *  le piège du focus, Échap et le geste Retour d'Android (Chrome) : tous passent par
 *  l'événement `cancel`, renvoyé à `onClose` pour que le parent garde la main sur l'état. */
export function useModalDialog(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDialogElement>(null)
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) {
      dialog.showModal()
      playSound('open')
    } else if (!open && dialog.open) {
      dialog.close()
      playSound('close')
    }
  }, [open])

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    const cancel = (e: Event) => {
      e.preventDefault()
      onCloseRef.current()
    }
    dialog.addEventListener('cancel', cancel)
    return () => dialog.removeEventListener('cancel', cancel)
  }, [])

  return ref
}
