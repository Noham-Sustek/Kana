import { useEffect, useLayoutEffect, useRef, type UIEvent } from 'react'
import { Outlet, useLocation, useNavigationType } from 'react-router'
import { TABS } from '@/app/tabs'
import { AppHeader } from '@/components/AppHeader'
import { BottomTabBar } from '@/components/BottomTabBar'
import { playSound, playedWithin } from '@/lib/sound'
import { useUiStyle } from '@/lib/useUiStyle'

const TAB_PATHS = TABS.map((t) => t.path)

export function AppLayout() {
  const { mainRef, onScroll } = useScrollRestoration()
  const { pathname } = useLocation()
  // Style Reload : pas d'onglets (le menu de l'Accueil les remplace), chaque écran entre en glissant.
  const reload = useUiStyle() === 'reload'
  useBackSound(reload)
  // Plein écran pendant un quiz ou la lecture : plus de place pour le clavier, pas de sortie accidentelle.
  const immersive =
    pathname.startsWith('/learn/quiz') || pathname.startsWith('/learn/reading') || pathname === '/bienvenue'
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
      {!immersive && !reload && (
        <div className="hidden min-[840px]:flex">
          <BottomTabBar rail />
        </div>
      )}
      <main
        ref={mainRef}
        onScroll={onScroll}
        className={`flex-1 overflow-y-auto px-4 pt-[max(1rem,env(safe-area-inset-top))] ${reload ? 'overflow-x-hidden pb-0' : 'pb-4'}`}
      >
        <div
          className={`mx-auto flex max-w-lg flex-col ${reload ? 'min-h-full' : fill ? 'h-full' : ''} ${
            tabRoot || (reload && pathname === '/settings') ? 'lg:max-w-5xl' : immersive ? 'lg:max-w-2xl' : ''
          }`}
        >
          {tabRoot && !reload && <AppHeader />}
          <div key={reload ? pathname : undefined} className={reload ? 'rl-enter flex flex-1 flex-col' : fill ? 'min-h-0 flex-1' : ''}>
            <Outlet />
          </div>
        </div>
      </main>
      {!immersive && !reload && (
        <div className="min-[840px]:hidden">
          <BottomTabBar />
        </div>
      )}
    </div>
  )
}

/** Style Reload : glissement « sortie » au retour arrière (bouton Retour d'Android, geste). */
function useBackSound(enabled: boolean) {
  const { key } = useLocation()
  const type = useNavigationType()
  const first = useRef(true)
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    if (enabled && type === 'POP' && !playedWithin(500)) playSound('backward')
  }, [key, type, enabled])
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
