import { Suspense, lazy, useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router'
import { Icon } from '@/components/Icon'
import { getKana, groupGlyph } from '@/data/kana'
import { generateQuestions } from '@/features/quiz/questions'
import { currentQuestion, score, type SessionState } from '@/features/quiz/session'
import { getStage } from '@/features/quiz/stages'
import type { ChoiceQuestion, InputQuestion, Question } from '@/features/quiz/types'
import { useQuizPool } from '@/features/quiz/useQuizPool'
import { useQuizSettingsStore } from '@/stores/quizSettingsStore'
import { useQuizSessionStore } from '@/stores/quizSessionStore'

const AUTO_ADVANCE_MS = 700

// Chunk séparé (tracés KanjiVG) : hors du bundle principal, précaché comme le reste.
const QuizDrawing = lazy(() => import('@/components/QuizDrawing').then((m) => ({ default: m.QuizDrawing })))

// Couleurs de correction volontairement identiques en clair et en sombre.
const WRONG_CLASS = 'border-red-600 bg-red-600 text-white'
const RIGHT_CLASS = 'border-emerald-600 bg-emerald-600 text-white'

export function QuizPage() {
  const session = useQuizSessionStore((s) => s.session)
  if (!session) return <Navigate to="/learn" replace />
  if (session.finished) return <QuizSummary session={session} />
  return <QuizRunner session={session} />
}

function QuizRunner({ session }: { session: SessionState }) {
  const { submit, submitDrawing, reveal, next, quit } = useQuizSessionStore()
  const navigate = useNavigate()
  const question = currentQuestion(session)!
  const { status, options } = session
  const settled = status !== 'pending'
  const isAuto = useQuizSessionStore((s) => s.auto !== null)

  // Bonne réponse : passage automatique à la question suivante, sauf s'il y a
  // quelque chose à regarder (comparaison d'un dessin, traduction d'un mot).
  const isDrawing = question.kind === 'draw'
  const stayAfterAnswer = isDrawing || question.prompt.type === 'word'
  useEffect(() => {
    if (status !== 'correct' || stayAfterAnswer) return
    const timer = setTimeout(next, AUTO_ADVANCE_MS)
    return () => clearTimeout(timer)
  }, [status, next, session.index, stayAfterAnswer])

  // Chrono : à expiration, la réponse est révélée (compte comme une erreur).
  useEffect(() => {
    if (!options.timerSeconds || status !== 'pending') return
    const remaining = session.questionStartedAt + options.timerSeconds * 1000 - Date.now()
    const timer = setTimeout(reveal, Math.max(0, remaining))
    return () => clearTimeout(timer)
  }, [options.timerSeconds, status, reveal, session.questionStartedAt])

  // Clavier physique : Entrée pour continuer, chiffres pour les choix.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return
      if (e.key === 'Enter' && settled) next()
      const n = Number(e.key)
      if (question.kind === 'choice' && !settled && n >= 1 && n <= question.choices.length) {
        submit(question.choices[n - 1]!.id)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [question, settled, next, submit])

  const exit = () => {
    quit()
    navigate('/learn', { replace: true })
  }

  return (
    <div className="flex min-h-full flex-col">
      <header className="flex items-center gap-3">
        <button
          type="button"
          onClick={exit}
          aria-label="Quitter le quiz"
          className="-ml-2 flex size-11 items-center justify-center text-slate-500 dark:text-slate-400"
        >
          <Icon name="close" />
        </button>
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
          <div
            className="h-full rounded-full bg-accent-500 transition-[width]"
            style={{ width: `${(session.index / session.plannedCount) * 100}%` }}
          />
        </div>
        <span className="text-xs tabular-nums text-slate-500 dark:text-slate-400">
          {session.index + 1}/{session.plannedCount}
        </span>
      </header>

      <div className="mt-2 h-1">
        {options.timerSeconds > 0 && status === 'pending' && (
          <div
            key={session.index}
            className="h-full origin-left rounded-full bg-amber-500"
            style={{ animation: `timer-shrink ${options.timerSeconds}s linear forwards` }}
          />
        )}
      </div>

      <UnlockBanner />

      <p className="mt-3 text-center text-xs font-medium text-slate-400 dark:text-slate-500">
        {isAuto && 'Auto · '}Stage {question.stage} · {getStage(question.stage).description}
      </p>

      <div className={`flex flex-col justify-center ${isDrawing ? 'py-4' : 'flex-1 py-6'}`}>
        <PromptView key={session.index} question={question} settled={settled} />
      </div>

      {question.kind === 'choice' && <ChoiceAnswers question={question} session={session} onPick={submit} />}
      {question.kind === 'input' && (
        <InputAnswer key={session.index} question={question} session={session} onSubmit={submit} onNext={next} />
      )}
      {question.kind === 'draw' && (
        <>
          <Suspense>
            <QuizDrawing key={session.index} question={question} settled={settled} onDone={submitDrawing} />
          </Suspense>
          {settled && (
            <p className={`mt-3 text-center text-sm font-medium ${status === 'correct' ? 'text-emerald-600' : 'text-red-600'}`}>
              {status === 'correct' ? 'Parfait, sans erreur !' : 'À revoir : comparez avec le modèle.'}{' '}
              <span className="font-jp text-base text-slate-900 dark:text-slate-100">{question.target}</span>
            </p>
          )}
        </>
      )}

      <div className="mt-4 min-h-12">
        {settled ? (
          <button
            type="button"
            onClick={next}
            // Neutre : l'accent rose se confondrait avec le rouge des erreurs.
            className="min-h-12 w-full rounded-xl bg-slate-900 font-semibold text-white active:scale-[0.98] dark:bg-slate-100 dark:text-slate-900"
          >
            {session.index + 1 >= session.plannedCount ? 'Voir le résultat' : 'Suivant'}
          </button>
        ) : (
          <button
            type="button"
            onClick={reveal}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-medium text-slate-500 dark:text-slate-400"
          >
            <Icon name="eye" className="size-4" />
            Afficher la réponse
          </button>
        )}
      </div>
    </div>
  )
}

const UNLOCK_BANNER_MS = 3500

/** Annonce les groupes débloqués pendant la session (mode auto). */
function UnlockBanner() {
  const unlocked = useQuizSessionStore((s) => s.unlockedThisSession)
  const [visibleCount, setVisibleCount] = useState(0)
  const [hidden, setHidden] = useState(true)

  useEffect(() => {
    if (unlocked.length <= visibleCount) return
    setVisibleCount(unlocked.length)
    setHidden(false)
    const timer = setTimeout(() => setHidden(true), UNLOCK_BANNER_MS)
    return () => clearTimeout(timer)
  }, [unlocked.length, visibleCount])

  const group = unlocked.at(-1)
  if (hidden || !group) return null
  return (
    <p role="status" className="mt-3 rounded-xl bg-amber-100 px-3 py-2 text-center text-sm font-medium text-amber-900 dark:bg-amber-500/20 dark:text-amber-200">
      Nouveau groupe débloqué : <span className="font-jp">{groupGlyph(group)}</span> {group.label}
    </p>
  )
}

function PromptView({ question, settled }: { question: Question; settled: boolean }) {
  const { prompt } = question
  switch (prompt.type) {
    case 'kana':
      return <p className="text-center font-jp text-8xl leading-none">{prompt.text}</p>
    case 'romaji':
      return <p className="text-center text-6xl font-semibold tracking-wide">{prompt.text}</p>
    case 'word':
      return (
        <div className="text-center">
          <p className="font-jp text-6xl leading-tight break-keep">{prompt.text}</p>
          {/* Traduction révélée après la réponse ; hauteur réservée pour éviter un saut. */}
          <p className="mt-3 min-h-5 text-sm text-slate-500 dark:text-slate-400">
            {settled && <span style={{ animation: 'fade-in 0.2s' }}>{prompt.meaning}</span>}
          </p>
        </div>
      )
    case 'sentence':
      return (
        <div className="text-center">
          {/* Un bloc par mot : le japonais se couperait sinon au milieu d'un mot. */}
          <p className="flex flex-wrap justify-center gap-x-[0.4em] font-jp text-3xl leading-relaxed">
            {prompt.text.split(' ').map((word, i) => (
              <span key={i}>{word}</span>
            ))}
          </p>
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">{prompt.meaning}</p>
        </div>
      )
    case 'draw':
      return (
        <div className="text-center">
          <p className="text-4xl font-semibold tracking-wide">{prompt.text}</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            En {prompt.script}
            {prompt.note && ` · ${prompt.note}`}
            {prompt.meaning && ` · ${prompt.meaning}`}
          </p>
          {/[āīūēō]/.test(prompt.text) && (
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">ā, ī, ū, ē, ō : voyelle longue (ー)</p>
          )}
        </div>
      )
  }
}

interface ChoiceAnswersProps {
  question: ChoiceQuestion
  session: SessionState
  onPick: (id: string) => void
}

function ChoiceAnswers({ question, session, onPick }: ChoiceAnswersProps) {
  const settled = session.status !== 'pending'
  const isKana = question.choiceType === 'kana'

  return (
    <div className="grid grid-cols-2 gap-2">
      {question.choices.map((choice) => {
        const wrong = session.wrongAnswers.includes(choice.id)
        const right = settled && choice.id === question.answerId
        const stateClass = wrong
          ? WRONG_CLASS
          : right
            ? RIGHT_CLASS
            : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900'
        return (
          <button
            key={choice.id}
            type="button"
            disabled={settled || wrong}
            onClick={() => onPick(choice.id)}
            className={`rounded-xl border-2 font-medium transition-transform enabled:active:scale-95 ${stateClass} ${
              question.choices.length > 4 ? 'min-h-14' : 'min-h-16'
            } ${isKana ? 'font-jp text-3xl' : 'text-xl'} ${settled && !wrong && !right ? 'opacity-50' : ''}`}
          >
            {choice.label}
          </button>
        )
      })}
    </div>
  )
}

interface InputAnswerProps {
  question: InputQuestion
  session: SessionState
  onSubmit: (value: string) => void
  onNext: () => void
}

function InputAnswer({ question, session, onSubmit, onNext }: InputAnswerProps) {
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const { status, wrongAnswers } = session
  const lastWrong = wrongAnswers.at(-1)
  const showWrong = status === 'failed' || (lastWrong !== undefined && value === lastWrong)

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (status !== 'pending') return onNext()
    if (!value.trim()) return
    onSubmit(value)
    inputRef.current?.select()
  }

  const stateClass =
    status === 'correct'
      ? RIGHT_CLASS
      : showWrong
        ? WRONG_CLASS
        : 'border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900'

  return (
    <form onSubmit={handleSubmit}>
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        readOnly={status !== 'pending'}
        autoFocus
        autoCapitalize="none"
        autoCorrect="off"
        autoComplete="off"
        spellCheck={false}
        enterKeyHint={status === 'pending' ? 'done' : 'next'}
        placeholder={status === 'pending' ? 'romaji' : ''}
        aria-label="Votre réponse en romaji"
        className={`min-h-14 w-full rounded-xl border-2 px-4 text-center outline-none ${
          question.stage === 8 ? 'text-lg' : 'text-2xl'
        } placeholder:text-slate-400 focus:ring-2 focus:ring-accent-500/40 ${stateClass}`}
      />
      <p className="mt-2 min-h-5 text-center text-sm">
        {status === 'failed' && (
          <span>
            Réponse : <strong className="text-emerald-700 dark:text-emerald-400">{question.expected}</strong>
          </span>
        )}
        {status === 'pending' && lastWrong !== undefined && (
          <span className="text-red-600 dark:text-red-400">Pas tout à fait, réessayez.</span>
        )}
      </p>
    </form>
  )
}

function QuizSummary({ session }: { session: SessionState }) {
  const { start, startAuto, quit, autoParams, unlockedThisSession } = useQuizSessionStore()
  const settings = useQuizSettingsStore()
  const pool = useQuizPool()
  const navigate = useNavigate()
  const { correct, total } = score(session)
  const percent = total ? Math.round((correct / total) * 100) : 0

  // Questions ratées, sans doublon.
  const missed = new Map<string, Question>()
  session.questions.forEach((q, i) => {
    if (!session.outcomes[i]?.correct) missed.set(missedKey(q), q)
  })
  const missedKanaIds = [...new Set([...missed.values()].flatMap((q) => q.kanaIds))]

  const restart = () => {
    if (autoParams) return void startAuto(autoParams)
    start(generateQuestions(settings.stage, pool, settings.questionCount, Math.random, settings.sentenceFilter), {
      retry: settings.retry,
      timerSeconds: settings.timerSeconds,
    })
  }

  return (
    <div className="flex min-h-full flex-col">
      <div className="py-8 text-center">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {autoParams ? 'Session auto terminée' : `Stage ${session.questions[0]?.stage} terminé`}
        </p>
        <p className="mt-2 text-6xl font-bold tabular-nums">
          {correct}
          <span className="text-3xl text-slate-400">/{total}</span>
        </p>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{percent} % du premier coup</p>
      </div>

      {unlockedThisSession.length > 0 && (
        <section className="mb-4 rounded-2xl bg-amber-100 p-4 text-amber-900 dark:bg-amber-500/20 dark:text-amber-200">
          <h2 className="text-sm font-semibold">Nouveaux groupes débloqués</h2>
          <p className="mt-1 text-lg">
            {unlockedThisSession.map((g) => (
              <span key={g.id} className="mr-3">
                <span className="font-jp">{groupGlyph(g)}</span> {g.label}
              </span>
            ))}
          </p>
        </section>
      )}

      {missed.size > 0 && (
        <section className="rounded-2xl bg-white p-4 shadow-sm dark:bg-slate-900">
          <h2 className="mb-3 text-sm font-semibold text-slate-500 dark:text-slate-400">À revoir</h2>
          <ul className="flex flex-wrap gap-2">
            {[...missed.entries()].map(([key, q]) => (
              <li key={key} className="flex items-baseline gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1.5 dark:bg-slate-800">
                <span className="font-jp text-lg">{missedKey(q)}</span>
                <span className="text-xs text-slate-500 dark:text-slate-400">{missedReading(q)}</span>
              </li>
            ))}
          </ul>
          <Link
            to={`/learn/custom/new?kana=${missedKanaIds.join(',')}`}
            className="mt-3 flex min-h-11 items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 text-sm font-medium text-slate-600 dark:border-slate-700 dark:text-slate-300"
          >
            <Icon name="plus" className="size-4" />
            Créer une liste avec ces kana
          </Link>
        </section>
      )}

      <div className="mt-auto grid gap-2 pt-6">
        <button
          type="button"
          onClick={restart}
          className="min-h-12 rounded-xl bg-accent-600 font-semibold text-white active:scale-[0.98]"
        >
          Recommencer
        </button>
        <button
          type="button"
          onClick={() => {
            quit()
            navigate('/learn', { replace: true })
          }}
          className="min-h-12 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300"
        >
          Retour aux réglages
        </button>
      </div>
    </div>
  )
}

/** Texte en kana d'une question, pour la liste « À revoir ». */
function missedKey(q: Question): string {
  if (q.kind === 'input') return q.reading
  if (q.kind === 'draw') return q.target
  return getKana(q.kanaIds[0]!)!.char
}

function missedReading(q: Question): string {
  if (q.kind === 'input') return q.expected
  if (q.kind === 'draw' && q.prompt.type === 'draw') return q.prompt.text
  return getKana(q.kanaIds[0]!)!.romaji[0]!
}
