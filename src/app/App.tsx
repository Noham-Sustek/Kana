import { Suspense, lazy } from 'react'
import { HashRouter, Navigate, Route, Routes, useLocation, useParams } from 'react-router'
import { AppLayout } from '@/components/AppLayout'
import { useApplyTheme } from '@/lib/useApplyTheme'
import { useEnsureActiveProfile } from '@/lib/useProfiles'
import { FreeSessionPage } from '@/pages/FreeSessionPage'
import { LearnPage } from '@/pages/LearnPage'
import { QuizPage } from '@/pages/QuizPage'
import { CustomGroupPage } from '@/pages/CustomGroupPage'
import { HomePage } from '@/pages/HomePage'
import { KanaPage } from '@/pages/KanaPage'
import { KanaDetailPage } from '@/pages/KanaDetailPage'
import { ProgressPage } from '@/pages/ProgressPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { AboutPage } from '@/pages/AboutPage'
import { OnboardingPage } from '@/pages/OnboardingPage'
import { OnboardingGate } from '@/app/OnboardingGate'

// Chunk séparé (tracés KanjiVG, ~150 Ko) : précaché par le service worker comme le reste.
const WritingExercisePage = lazy(() =>
  import('@/pages/WritingExercisePage').then((m) => ({ default: m.WritingExercisePage })),
)

// Chunk séparé : la lecture chronométrée n'est chargée qu'à l'ouverture.
const ChronoPage = lazy(() => import('@/pages/ChronoPage').then((m) => ({ default: m.ChronoPage })))

// Galerie du design system : serveur de dev uniquement (absente du build).
const ComponentsPage = import.meta.env.DEV
  ? lazy(() => import('@/pages/ComponentsPage').then((m) => ({ default: m.ComponentsPage })))
  : null

export function App() {
  useApplyTheme()
  useEnsureActiveProfile()

  return (
    // HashRouter : aucune config serveur, fonctionne hors ligne et sur n'importe quel hébergeur statique.
    <HashRouter>
      <OnboardingGate />
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/home" replace />} />
          <Route path="home" element={<HomePage />} />
          <Route path="bienvenue" element={<OnboardingPage />} />
          <Route path="learn" element={<LearnPage />} />
          <Route path="learn/libre" element={<FreeSessionPage />} />
          <Route path="learn/quiz" element={<QuizPage />} />
          <Route
            path="learn/reading"
            element={
              <Suspense>
                <ChronoPage />
              </Suspense>
            }
          />
          <Route path="learn/custom/new" element={<CustomGroupPage />} />
          <Route path="learn/custom/:groupId" element={<CustomGroupPage />} />
          <Route path="kana" element={<KanaPage />} />
          <Route path="kana/:kanaId" element={<KanaDetailPage />} />
          <Route
            path="writing/:kanaId"
            element={
              <Suspense>
                <WritingExercisePage />
              </Suspense>
            }
          />
          <Route path="progress" element={<ProgressPage />} />
          {/* Anciennes adresses (favoris, raccourcis) : Tableau et Écriture fusionnent dans Kana. */}
          <Route path="table" element={<Redirect to="/kana" />} />
          <Route path="table/:kanaId" element={<KanaIdRedirect />} />
          <Route path="writing" element={<Redirect to="/kana" extra="lens=ecriture" />} />
          <Route path="stats" element={<Redirect to="/progress" />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="settings/about" element={<AboutPage />} />
          {ComponentsPage && (
            <Route
              path="dev/composants"
              element={
                <Suspense>
                  <ComponentsPage />
                </Suspense>
              }
            />
          )}
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}

/** Redirection qui garde les paramètres (`?script=katakana&heat=1`). */
function Redirect({ to, extra }: { to: string; extra?: string }) {
  const { search } = useLocation()
  const params = [search.replace(/^\?/, ''), extra].filter(Boolean).join('&')
  return <Navigate to={params ? `${to}?${params}` : to} replace />
}

function KanaIdRedirect() {
  const { kanaId = '' } = useParams()
  return <Navigate to={`/kana/${kanaId}`} replace />
}
