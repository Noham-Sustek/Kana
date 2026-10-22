import { useLayoutEffect, useRef, type UIEvent } from 'react'
import { Outlet, useLocation } from 'react-router'
import { BottomTabBar } from '@/components/BottomTabBar'

export function AppLayout() {
  const { mainRef, onScroll } = useScrollRestoration()

  return (
    <div className="mx-auto flex h-full max-w-lg flex-col">
      <main ref={mainRef} onScroll={onScroll} className="flex-1 overflow-y-auto px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-4">
        <Outlet />
      </main>
      <BottomTabBar />
    </div>
  )
}

// <main> est le conteneur qui défile (pas la fenêtre) : on mémorise sa position
// par entrée d'historique, pour revenir au même endroit du tableau après un détail.
function useScrollRestoration() {
  const mainRef = useRef<HTMLElement>(null)
  const positions = useRef(new Map<string, number>())
  const { key } = useLocation()
  const keyRef = useRef(key)

  useLayoutEffect(() => {
    keyRef.current = key
    if (mainRef.current) mainRef.current.scrollTop = positions.current.get(key) ?? 0
  }, [key])

  // Enregistré au fil du défilement : au moment du changement de route, le DOM a
  // déjà été remplacé et la position éventuellement rognée.
  const onScroll = (e: UIEvent<HTMLElement>) => {
    positions.current.set(keyRef.current, e.currentTarget.scrollTop)
  }

  return { mainRef, onScroll }
}
