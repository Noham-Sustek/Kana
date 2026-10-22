import { HashRouter, Navigate, Route, Routes } from 'react-router'
import { AppLayout } from '@/components/AppLayout'
import { useApplyTheme } from '@/lib/useApplyTheme'
import { LearnPage } from '@/pages/LearnPage'
import { QuizPage } from '@/pages/QuizPage'
import { CustomGroupPage } from '@/pages/CustomGroupPage'
import { TablePage } from '@/pages/TablePage'
import { KanaDetailPage } from '@/pages/KanaDetailPage'
import { WritingPage } from '@/pages/WritingPage'
import { StatsPage } from '@/pages/StatsPage'
import { SettingsPage } from '@/pages/SettingsPage'

export function App() {
  useApplyTheme()

  return (
    // HashRouter : aucune config serveur, fonctionne hors ligne et sur n'importe quel hébergeur statique.
    <HashRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/learn" replace />} />
          <Route path="learn" element={<LearnPage />} />
          <Route path="learn/quiz" element={<QuizPage />} />
          <Route path="learn/custom/new" element={<CustomGroupPage />} />
          <Route path="learn/custom/:groupId" element={<CustomGroupPage />} />
          <Route path="table" element={<TablePage />} />
          <Route path="table/:kanaId" element={<KanaDetailPage />} />
          <Route path="writing" element={<WritingPage />} />
          <Route path="stats" element={<StatsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/learn" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
