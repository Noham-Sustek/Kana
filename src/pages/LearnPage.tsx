import type { ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { ActionCard } from '@/components/ActionCard'
import { Button } from '@/components/Button'
import { EmptyState } from '@/components/EmptyState'
import { ReloadLearn } from '@/components/reload/ReloadLearn'
import { KANA_GROUPS, getKana, groupGlyph } from '@/data/kana'
import { bestChronoScore, freeSessionLine, reviewDetail } from '@/features/learn/learn'
import { useLearnHub } from '@/features/learn/useLearnHub'
import { AUTO_STAGES } from '@/features/quiz/auto'
import { useCustomGroups } from '@/features/quiz/useQuizPool'
import { useUiStyle } from '@/lib/useUiStyle'
import { useChronoSettingsStore } from '@/stores/chronoSettingsStore'
import { useProfileStore } from '@/stores/profileStore'
import { useQuizSettingsStore } from '@/stores/quizSettingsStore'
import { useQuizSessionStore } from '@/stores/quizSessionStore'

/** Onglet S'entraîner : des cartes qui mènent chacune à un exercice, puis les listes. */
export function LearnPage() {
  const navigate = useNavigate()
  const settings = useQuizSettingsStore()
  const lists = useCustomGroups()
  const hub = useLearnHub(settings.autoScript)
  const profileId = useProfileStore((s) => s.profileId)
  const record = useChronoSettingsStore((s) => bestChronoScore(s.best, profileId))
  const startAuto = useQuizSessionStore((s) => s.startAuto)
  const reload = useUiStyle() === 'reload'

  const groupCount = KANA_GROUPS.filter((g) => settings.groupIds.includes(g.id)).length
  const listCount = lists.filter((l) => settings.customGroupIds.includes(l.id)).length
  const due = hub?.review.due ?? []

  const startReview = async () => {
    if (due.length === 0) return
    await startAuto({
      script: getKana(due[0]!)!.script,
      kanaIds: due,
      stages: AUTO_STAGES,
      questionCount: settings.questionCount,
      options: { retry: settings.retry, timerSeconds: settings.timerSeconds, drawingCheck: settings.drawingCheck },
    })
    navigate('/learn/quiz', { state: { from: '/learn' } })
  }

  // Écriture enchaînée : depuis la ligne en cours du parcours, kana après kana.
  const focus = hub?.focus
  const writingStart = focus?.kanaIds[0] ?? (settings.autoScript === 'katakana' ? 'k-a' : 'h-a')

  if (reload) return <ReloadLearn />

  return (
    <div className="flex flex-col gap-2.5 pb-4">
      <h1 className="sr-only">S’entraîner</h1>
      <Overline first>Quiz</Overline>
      <ActionCard
        icon="target"
        title="Session libre"
        detail={freeSessionLine(settings.stage, groupCount, listCount, settings.questionCount)}
        onClick={() => navigate('/learn/libre')}
      />
      <ActionCard
        icon="replay"
        title="Révision ciblée"
        detail={hub ? reviewDetail(hub.review) : ' '}
        disabled={due.length === 0}
        onClick={startReview}
      />

      <Overline>Lecture et écriture</Overline>
      <ActionCard
        icon="timer"
        title="Lecture chronométrée"
        detail={record === null ? 'Le roman, mot par mot, contre la montre' : `Record : ${record} kana par minute`}
        onClick={() => navigate('/learn/reading')}
      />
      <ActionCard
        icon="writing"
        title="Écriture enchaînée"
        detail={focus ? `Ligne ${groupGlyph(focus)}, kana après kana` : 'Tous les kana, trait par trait'}
        onClick={() => navigate(`/writing/${writingStart}`)}
      />

      <Overline>Mes listes</Overline>
      {lists.length === 0 ? (
        <EmptyState
          icon="plus"
          title="Aucune liste pour l’instant"
          action={
            <Button size="sm" fullWidth={false} onClick={() => navigate('/learn/custom/new')}>
              Créer une liste
            </Button>
          }
        >
          Regroupez les kana qui vous résistent pour les travailler ensemble. Un récapitulatif de session peut aussi en
          créer une pour vous.
        </EmptyState>
      ) : (
        <>
          {lists.map((list) => (
            <ActionCard
              key={list.id}
              icon="list"
              title={list.name}
              detail={`${list.kanaIds.length} kana · ${list.kanaIds
                .slice(0, 8)
                .map((id) => getKana(id)?.char)
                .join(' ')}${list.kanaIds.length > 8 ? ' …' : ''}`}
              onClick={() => navigate(`/learn/custom/${list.id}`)}
            />
          ))}
          <Button
            variant="text"
            size="sm"
            icon="plus"
            iconPosition="start"
            fullWidth={false}
            className="self-start"
            onClick={() => navigate('/learn/custom/new')}
          >
            Nouvelle liste
          </Button>
        </>
      )}
    </div>
  )
}

function Overline({ children, first = false }: { children: ReactNode; first?: boolean }) {
  return (
    <h2
      className={`px-1 text-[11px] leading-[14px] font-bold tracking-[0.12em] text-ink-muted uppercase ${first ? 'mt-1' : 'mt-2'}`}
    >
      {children}
    </h2>
  )
}
