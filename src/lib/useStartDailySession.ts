import { useNavigate } from 'react-router'
import { AUTO_STAGES } from '@/features/quiz/auto'
import { useQuizSessionStore } from '@/stores/quizSessionStore'
import { useQuizSettingsStore } from '@/stores/quizSettingsStore'

/** Lance la « Session du jour » (mode auto, parcours guidé) en un geste, puis ouvre le quiz.
 *  `from` : écran où revenir en quittant le quiz. */
export function useStartDailySession(from = '/home') {
  const navigate = useNavigate()
  const startAuto = useQuizSessionStore((s) => s.startAuto)

  return async () => {
    const s = useQuizSettingsStore.getState()
    await startAuto({
      script: s.autoScript,
      stages: AUTO_STAGES,
      questionCount: s.questionCount,
      options: { retry: s.retry, timerSeconds: s.timerSeconds, drawingCheck: s.drawingCheck },
    })
    navigate('/learn/quiz', { state: { from } })
  }
}
