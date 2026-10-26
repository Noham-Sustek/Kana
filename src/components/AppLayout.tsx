import { useLayoutEffect, useRef, type UIEvent } from 'react'
import { Outlet, useLocation } from 'react-router'
import { BottomTabBar } from '@/components/BottomTabBar'

const WIDE_PATHS = ['/learn', '/table', '/writing', '/stats', '/settings']

export function AppLayout() {
  const { mainRef, onScroll } = useScrollRestoration()
  // Plein écran pendant un quiz : plus de place pour le clavier, pas de sortie accidentelle.
  const { pathname } = useLocation()
  const immersive = pathname.startsWith('/learn/quiz')
  // Sur grand écran, les pages d'onglet prennent de la largeur, le quiz un peu ;
  // écriture et détails restent en colonne.
  const wide = WIDE_PATHS.includes(pathname)
  // Pages en min-h-full (quiz, détail d'un kana, exercice d'écriture) : le conteneur doit
  // avoir une hauteur fixée pour qu'elles occupent tout l'écran.
  const fill = immersive || pathname.startsWith('/table/') || pathname.startsWith('/writing/')

  return (
    <div className="flex h-full flex-col">
      <main ref={mainRef} onScroll={onScroll} className="flex-1 overflow-y-auto px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-4">
        <div className={`mx-auto max-w-lg ${fill ? 'h-full' : ''} ${wide ? 'lg:max-w-5xl' : immersive ? 'lg:max-w-2xl' : ''}`}>
          <Outlet />
        </div>
      </main>
      {!immersive && <BottomTabBar />}
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
