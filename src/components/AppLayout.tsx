import { useLayoutEffect, useRef, type UIEvent } from 'react'
import { Outlet, useLocation } from 'react-router'
import { TABS } from '@/app/tabs'
import { AppHeader } from '@/components/AppHeader'
import { BottomTabBar } from '@/components/BottomTabBar'

const TAB_PATHS = TABS.map((t) => t.path)

export function AppLayout() {
  const { mainRef, onScroll } = useScrollRestoration()
  const { pathname } = useLocation()
  // Plein écran pendant un quiz ou la lecture : plus de place pour le clavier, pas de sortie accidentelle.
  const immersive = pathname.startsWith('/learn/quiz') || pathname.startsWith('/learn/reading')
  // Racine d'un onglet : en-tête profil / réglages, et largeur accrue sur grand écran.
  const tabRoot = TAB_PATHS.includes(pathname)
  // Pages en min-h-full (accueil, quiz, détail d'un kana, exercice d'écriture, liste, session libre) :
  // le conteneur doit avoir une hauteur fixée pour qu'elles occupent tout l'écran.
  const fill =
    immersive ||
    pathname === '/home' ||
    pathname.startsWith('/kana/') ||
    pathname.startsWith('/writing/') ||
    pathname.startsWith('/learn/custom/') ||
    pathname === '/learn/libre'

  return (
    <div className="flex h-full flex-col min-[840px]:flex-row">
      {!immersive && (
        <div className="hidden min-[840px]:flex">
          <BottomTabBar rail />
        </div>
      )}
      <main
        ref={mainRef}
        onScroll={onScroll}
        className="flex-1 overflow-y-auto px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-4"
      >
        <div
          className={`mx-auto flex max-w-lg flex-col ${fill ? 'h-full' : ''} ${
            tabRoot && pathname !== '/home' ? 'lg:max-w-5xl' : immersive ? 'lg:max-w-2xl' : ''
          }`}
        >
          {tabRoot && <AppHeader />}
          <div className={fill ? 'min-h-0 flex-1' : ''}>
            <Outlet />
          </div>
        </div>
      </main>
      {!immersive && (
        <div className="min-[840px]:hidden">
          <BottomTabBar />
        </div>
      )}
    </div>
  )
}

// <main> est le conteneur qui défile (pas la fenêtre) : on mémorise sa position
// par entrée d'historique, pour revenir au même endroit de la grille après une fiche.
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
