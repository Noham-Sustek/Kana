import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { Button } from '@/components/Button'
import { Icon } from '@/components/Icon'
import { IconButton } from '@/components/IconButton'
import { MASTERY_LABELS, MasterySteps } from '@/components/MasterySteps'
import { SegmentText } from '@/components/SegmentText'
import { SessionProgress } from '@/components/SessionProgress'
import { UnlockCelebration } from '@/components/UnlockCelebration'
import { getKana, groupGlyph } from '@/data/kana'
import { loadProfileAnswers } from '@/db/answers'
import { buildProgress } from '@/engine/scheduler'
import { pathView } from '@/features/home/home'
import { isSentenceStage } from '@/features/learn/learn'
import { generateQuestions } from '@/features/quiz/questions'
import { score, type SessionState } from '@/features/quiz/session'
import { stagePresentation } from '@/features/quiz/stages'
import {
  extendedStreak,
  formatDuration,
  formatResponseTime,
  masteryGains,
  missedItems,
  sessionTimes,
  sessionTitle,
  type SessionKind,
} from '@/features/quiz/summary'
import { useQuizPool } from '@/features/quiz/useQuizPool'
import { computeStreak } from '@/features/stats/stats'
import { jp, t, type Line } from '@/lib/segments'
import { useQuizOrigin } from '@/lib/useQuizOrigin'
import { useQuizSettingsStore } from '@/stores/quizSettingsStore'
import { useQuizSessionStore } from '@/stores/quizSessionStore'

/** Fin de session : la ligne débloquée (s'il y a lieu), puis le récapitulatif. */
export function QuizSummary({ session }: { session: SessionState }) {
  const unlocked = useQuizSessionStore((s) => s.unlockedThisSession)
  const [celebrated, setCelebrated] = useState(false)
  if (unlocked.length > 0 && !celebrated) {
    return <UnlockCelebration groups={unlocked} onContinue={() => setCelebrated(true)} />
  }
  return <Recap session={session} />
}

function Recap({ session }: { session: SessionState }) {
  const { start, startAuto, quit, autoParams, auto, profileId } = useQuizSessionStore()
  const settings = useQuizSettingsStore()
  const pool = useQuizPool()
  const navigate = useNavigate()
  const origin = useQuizOrigin()
  const answers = useLiveQuery(() => loadProfileAnswers(profileId), [profileId])

  const kind: SessionKind = autoParams ? (autoParams.kanaIds ? 'targeted' : 'daily') : 'free'
  const stage = session.questions[0]?.stage
  const title = sessionTitle(kind, stage)
  const { correct, total } = score(session)
  const times = sessionTimes(session)
  const missed = missedItems(session)
  const path = kind === 'daily' && auto ? pathView(auto.path, auto.unlocked, auto.progress, auto.stages, true) : null

  const progress = useMemo(() => {
    if (!answers) return null
    const fromSession = answers.filter((a) => a.answeredAt >= session.startedAt)
    return {
      gains: masteryGains(
        buildProgress(answers.filter((a) => a.answeredAt < session.startedAt)),
        buildProgress(answers),
        fromSession,
      ),
      streak: computeStreak(answers, Date.now()).current,
      extended: fromSession.length > 0 && extendedStreak(answers, session.startedAt),
    }
  }, [answers, session.startedAt])

  const finish = () => {
    quit()
    navigate(origin, { replace: true })
  }
  const restart = () => {
    if (autoParams) return void startAuto(autoParams)
    start(
      generateQuestions(
        settings.stage,
        pool,
        settings.questionCount,
        Math.random,
        settings.sentenceFilter,
        isSentenceStage(settings.stage) && settings.animeSentences,
      ),
      { retry: settings.retry, timerSeconds: settings.timerSeconds, drawingCheck: settings.drawingCheck },
    )
  }

  // Kana d'un caractère ratés : les tracer aide à ne plus les confondre.
  const toTrace = missed
    .map((m) => m.kanaId)
    .filter((id): id is string => id !== undefined && getKana(id)!.char.length === 1)
    .slice(0, 2)
  const againDetail =
    kind === 'daily' && path?.focus
      ? `Ligne ${groupGlyph(path.focus)} · ${session.plannedCount} questions`
      : `${kind === 'free' && stage ? stagePresentation(stage).name : title} · ${session.plannedCount} questions`
  const missedKanaIds = [...new Set(session.questions.filter((_, i) => !session.outcomes[i]?.correct).flatMap((q) => q.kanaIds))]

  return (
    <div className="flex min-h-full flex-col">
      <header className="-mr-2 flex items-center justify-between">
        <Overline>{title} · terminée</Overline>
        <IconButton icon="close" label="Fermer le récapitulatif" onClick={finish} />
      </header>

      <section className="mt-2">
        <p className="font-serif text-[64px] leading-[0.9] font-medium tracking-[-0.02em] tabular-nums">
          {correct}
          <small className="ml-1.5 text-[17px] leading-none tracking-normal text-ink-muted">
            sur {total} juste{correct > 1 ? 's' : ''} du premier coup
          </small>
        </p>
        <SessionProgress
          showCount={false}
          ticks={session.outcomes.map((o) => (o?.correct ? 'done' : 'missed'))}
          className="my-3.5"
        />
        <dl className="grid grid-cols-3 gap-3">
          <Stat value={formatDuration(times.durationMs)} label="Durée" />
          <Stat value={times.averageMs === null ? '—' : formatResponseTime(times.averageMs)} label="Par réponse" />
          {progress && <Stat value={`${progress.streak} j`} label={progress.extended ? 'Série · +1' : 'Série'} />}
        </dl>
      </section>

      {progress && (progress.gains.length > 0 || path) && (
        <>
          <hr className="my-5 border-hairline" />
          <section>
            {progress.gains.length > 0 && (
              <>
                <Overline aside={kanaCount(new Set(progress.gains.map((g) => g.kanaId)).size)}>Maîtrise gagnée</Overline>
                <ul className="mt-2 border-t border-hairline">
                  {progress.gains.slice(0, 6).map((g) => (
                    <Item key={`${g.kanaId}|${g.stage}`} glyph={getKana(g.kanaId)!.char}>
                      <b className="block font-semibold">
                        {MASTERY_LABELS[g.from]} → {MASTERY_LABELS[g.to]}
                      </b>
                      <small className="block text-[13px] leading-[18px] text-ink-muted">
                        <MasterySteps level={g.from} /> &nbsp;→&nbsp; <MasterySteps level={g.to} /> · {stagePresentation(g.stage).name}
                      </small>
                    </Item>
                  ))}
                </ul>
                {progress.gains.length > 6 && (
                  <p className="mt-2 text-[13px] leading-[18px] text-ink-muted">
                    Et {progress.gains.length - 6} autre{progress.gains.length - 6 > 1 ? 's' : ''} progrès.
                  </p>
                )}
              </>
            )}
            {path && (
              <p className={`text-[13.5px] leading-[19px] ${progress.gains.length > 0 ? 'mt-2.5' : ''}`}>
                <strong className="font-semibold">
                  <SegmentText line={path.headline} />
                </strong>{' '}
                <SegmentText line={path.detail} />
              </p>
            )}
          </section>
        </>
      )}

      {missed.length > 0 && (
        <>
          <hr className="my-5 border-hairline" />
          <section>
            <Overline aside={kanaCount(missed.length, missed.some((m) => !m.kanaId))}>À revoir</Overline>
            <ul className="mt-2 border-t border-hairline">
              {missed.map((m) => (
                <Item
                  key={m.text}
                  glyph={m.text}
                  onClick={m.kanaId ? () => navigate(`/kana/${m.kanaId}`) : undefined}
                >
                  <b className="block font-semibold">{m.reading}</b>
                  {m.note.length > 0 && (
                    <small className="block text-[13px] leading-[18px] text-ink-muted">
                      <SegmentText line={m.note} />
                    </small>
                  )}
                </Item>
              ))}
            </ul>
            <Button
              variant="line"
              size="sm"
              className="mt-3"
              onClick={() => navigate(`/learn/custom/new?kana=${missedKanaIds.join(',')}`)}
            >
              En faire une liste
            </Button>
          </section>
        </>
      )}

      <hr className="my-5 border-hairline" />
      <section className="pb-4">
        <Overline>Et maintenant</Overline>
        <ul className="mt-2 border-t border-hairline">
          {toTrace.length > 0 && (
            <ActionItem
              title={traceTitle(toTrace)}
              detail="L’écrire aide à ne plus les confondre"
              onClick={() => navigate(`/writing/${toTrace[0]}`)}
            />
          )}
          <ActionItem title={[t('Encore une session')]} detail={againDetail} onClick={restart} />
        </ul>
      </section>

      <div className="sticky bottom-0 z-10 -mx-4 mt-auto border-t border-hairline bg-paper px-4 pt-3 pb-1">
        <Button onClick={finish}>Terminer</Button>
      </div>
    </div>
  )
}

function kanaCount(n: number, mixed = false): string {
  // Mots et phrases ratés comptent comme des éléments, pas des kana.
  if (mixed) return `${n} élément${n > 1 ? 's' : ''}`
  return `${n} kana`
}

function traceTitle(ids: readonly string[]): Line {
  const chars = ids.map((id) => jp(getKana(id)!.char))
  return chars.length === 2 ? [t('Tracer '), chars[0]!, t(' et '), chars[1]!] : [t('Tracer '), chars[0]!]
}

function Overline({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h2 className="text-[11px] leading-[14px] font-bold tracking-[0.12em] text-ink-muted uppercase">{children}</h2>
      {aside && <span className="text-[12.5px] leading-[14px] font-semibold text-accent">{aside}</span>}
    </div>
  )
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <dd className="font-serif text-[22px] leading-7 font-medium tabular-nums">{value}</dd>
      <dt className="text-[12.5px] leading-4 text-ink-muted">{label}</dt>
    </div>
  )
}

/** Ligne de liste : kana à gauche, texte, flèche si l'élément s'ouvre. */
function Item({ glyph, onClick, children }: { glyph: string; onClick?: () => void; children: ReactNode }) {
  const content = (
    <>
      <span
        className={`font-jp ${glyph.length > 2 ? 'max-w-[55%] text-lg leading-snug' : 'w-9 shrink-0 text-center text-[28px] leading-none'}`}
      >
        {glyph}
      </span>
      <span className="min-w-0 flex-1">{children}</span>
      {onClick && <Icon name="chevronRight" className="size-5 shrink-0 text-ink-muted" />}
    </>
  )
  const className = 'flex min-h-14 w-full items-center gap-3 border-b border-hairline py-2 text-left'
  return (
    <li>
      {onClick ? (
        <button type="button" onClick={onClick} className={`${className} active:brightness-90`}>
          {content}
        </button>
      ) : (
        <div className={className}>{content}</div>
      )}
    </li>
  )
}

function ActionItem({ title, detail, onClick }: { title: Line; detail: string; onClick: () => void }) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="flex min-h-14 w-full items-center gap-3 border-b border-hairline py-2 text-left active:brightness-90"
      >
        <span className="min-w-0 flex-1">
          <b className="block font-semibold">
            <SegmentText line={title} />
          </b>
          <small className="block text-[13px] leading-[18px] text-ink-muted">{detail}</small>
        </span>
        <Icon name="chevronRight" className="size-5 shrink-0 text-ink-muted" />
      </button>
    </li>
  )
}
