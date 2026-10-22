import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router'
import { Icon } from '@/components/Icon'
import { getKana } from '@/data/kana'
import { useKanaAudio } from '@/features/audio/useKanaAudio'
import { generateQuestions } from '@/features/quiz/questions'
import { currentQuestion, score, type SessionState } from '@/features/quiz/session'
import { getStage } from '@/features/quiz/stages'
import type { ChoiceQuestion, InputQuestion, Question } from '@/features/quiz/types'
import { useQuizPool } from '@/features/quiz/useQuizPool'
import { useQuizSettingsStore } from '@/stores/quizSettingsStore'
import { useQuizSessionStore } from '@/stores/quizSessionStore'

const AUTO_ADVANCE_MS = 700

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
  const { submit, reveal, next, quit } = useQuizSessionStore()
  const navigate = useNavigate()
  const question = currentQuestion(session)!
  const { status, options } = session
  const settled = status !== 'pending'

  // Bonne réponse : passage automatique à la question suivante.
  useEffect(() => {
    if (status !== 'correct') return
    const timer = setTimeout(next, AUTO_ADVANCE_MS)
    return () => clearTimeout(timer)
  }, [status, next, session.index])

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
            style={{ width: `${(session.index / session.questions.length) * 100}%` }}
          />
        </div>
        <span className="text-xs tabular-nums text-slate-500 dark:text-slate-400">
          {session.index + 1}/{session.questions.length}
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

      <p className="mt-3 text-center text-xs font-medium text-slate-400 dark:text-slate-500">
        Stage {question.stage} · {getStage(question.stage).description}
      </p>

      <div className="flex flex-1 flex-col justify-center py-6">
        <PromptView key={session.index} question={question} />
      </div>

      {question.kind === 'choice' ? (
        <ChoiceAnswers question={question} session={session} onPick={submit} />
      ) : (
        <InputAnswer key={session.index} question={question} session={session} onSubmit={submit} onNext={next} />
      )}

      <div className="mt-4 min-h-12">
        {settled ? (
          <button
            type="button"
            onClick={next}
            // Neutre : l'accent rose se confondrait avec le rouge des erreurs.
            className="min-h-12 w-full rounded-xl bg-slate-900 font-semibold text-white active:scale-[0.98] dark:bg-slate-100 dark:text-slate-900"
          >
            {session.index + 1 === session.questions.length ? 'Voir le résultat' : 'Suivant'}
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

function PromptView({ question }: { question: Question }) {
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
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">{prompt.meaning}</p>
        </div>
      )
    case 'audio':
      return <AudioPrompt text={prompt.text} />
  }
}

function AudioPrompt({ text }: { text: string }) {
  const { available, play } = useKanaAudio()

  useEffect(() => {
    play(text)
  }, [text, play])

  if (!available) {
    return <p className="text-center text-sm text-slate-500">Audio indisponible sur cet appareil.</p>
  }
  return (
    <button
      type="button"
      onClick={() => play(text)}
      aria-label="Rejouer le son"
      className="mx-auto flex size-28 items-center justify-center rounded-full bg-accent-500 text-white shadow-lg active:scale-95"
    >
      <Icon name="volume" className="size-12" />
    </button>
  )
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
        className={`min-h-14 w-full rounded-xl border-2 px-4 text-center text-2xl outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-accent-500/40 ${stateClass}`}
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
  const { start, quit } = useQuizSessionStore()
  const settings = useQuizSettingsStore()
  const pool = useQuizPool()
  const navigate = useNavigate()
  const { correct, total } = score(session)
  const percent = total ? Math.round((correct / total) * 100) : 0

  // Questions ratées, sans doublon.
  const missed = new Map<string, Question>()
  session.questions.forEach((q, i) => {
    if (!session.outcomes[i]?.correct) missed.set(q.kind === 'input' ? q.reading : q.kanaIds[0]!, q)
  })
  const missedKanaIds = [...new Set([...missed.values()].flatMap((q) => q.kanaIds))]

  const restart = () => {
    start(generateQuestions(settings.stage, pool, settings.questionCount), {
      retry: settings.retry,
      timerSeconds: settings.timerSeconds,
    })
  }

  return (
    <div className="flex min-h-full flex-col">
      <div className="py-8 text-center">
        <p className="text-sm text-slate-500 dark:text-slate-400">Stage {session.questions[0]?.stage} terminé</p>
        <p className="mt-2 text-6xl font-bold tabular-nums">
          {correct}
          <span className="text-3xl text-slate-400">/{total}</span>
        </p>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{percent} % du premier coup</p>
      </div>

      {missed.size > 0 && (
        <section className="rounded-2xl bg-white p-4 shadow-sm dark:bg-slate-900">
          <h2 className="mb-3 text-sm font-semibold text-slate-500 dark:text-slate-400">À revoir</h2>
          <ul className="flex flex-wrap gap-2">
            {[...missed.entries()].map(([key, q]) => (
              <li key={key} className="flex items-baseline gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1.5 dark:bg-slate-800">
                <span className="font-jp text-lg">
                  {q.kind === 'input' ? q.reading : getKana(q.kanaIds[0]!)!.char}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {q.kind === 'input' ? q.expected : getKana(q.kanaIds[0]!)!.romaji[0]}
                </span>
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
