import { Suspense, lazy, useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router'
import { Icon } from '@/components/Icon'
import { getKana, groupGlyph } from '@/data/kana'
import { generateQuestions } from '@/features/quiz/questions'
import { currentQuestion, score, type SessionState } from '@/features/quiz/session'
import { getStage } from '@/features/quiz/stages'
import type { ChoiceQuestion, ComposeQuestion, InputQuestion, Question } from '@/features/quiz/types'
import { useQuizPool } from '@/features/quiz/useQuizPool'
import { effectiveSentenceFilter, useQuizSettingsStore } from '@/stores/quizSettingsStore'
import { useQuizSessionStore } from '@/stores/quizSessionStore'

const AUTO_ADVANCE_MS = 700

// Chunk séparé (tracés KanjiVG) : hors du bundle principal, précaché comme le reste.
const QuizDrawing = lazy(() => import('@/components/QuizDrawing').then((m) => ({ default: m.QuizDrawing })))

// Couleurs de correction volontairement identiques en clair et en sombre.
const WRONG_CLASS = 'border-error bg-error text-on-signal'
const RIGHT_CLASS = 'border-correct bg-correct text-on-signal'

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
  // Validation du dessin par l'utilisateur : index de la question dont le dessin est fini.
  const selfCheck = options.drawingCheck === 'self'
  const [drawnIndex, setDrawnIndex] = useState<number | null>(null)
  const awaitingVerdict = selfCheck && drawnIndex === session.index && !settled
  // Le verdict vaut réponse : on enchaîne directement, la comparaison a déjà été vue.
  const judge = (correct: boolean) => {
    submitDrawing(correct)
    next()
  }

  // Bonne réponse : passage automatique à la question suivante, sauf s'il y a
  // quelque chose à regarder (comparaison d'un dessin, traduction d'un mot ou
  // d'une phrase).
  const isDrawing = question.kind === 'draw'
  const { prompt } = question
  const stayAfterAnswer =
    isDrawing || prompt.type === 'word' || prompt.type === 'sentence' || prompt.type === 'romajiSentence'
  useEffect(() => {
    if (status !== 'correct' || stayAfterAnswer) return
    const timer = setTimeout(next, AUTO_ADVANCE_MS)
    return () => clearTimeout(timer)
  }, [status, next, session.index, stayAfterAnswer])

  // Chrono : à expiration, la réponse est révélée (compte comme une erreur).
  useEffect(() => {
    if (!options.timerSeconds || status !== 'pending' || awaitingVerdict) return
    const remaining = session.questionStartedAt + options.timerSeconds * 1000 - Date.now()
    const timer = setTimeout(reveal, Math.max(0, remaining))
    return () => clearTimeout(timer)
  }, [options.timerSeconds, status, reveal, session.questionStartedAt, awaitingVerdict])

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
          className="-ml-2 flex size-11 items-center justify-center text-ink-muted"
        >
          <Icon name="close" />
        </button>
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-hairline">
          <div
            className="h-full rounded-full bg-accent transition-[width]"
            style={{ width: `${(session.index / session.plannedCount) * 100}%` }}
          />
        </div>
        <span className="text-xs tabular-nums text-ink-muted">
          {session.index + 1}/{session.plannedCount}
        </span>
      </header>

      <div className="mt-2 h-1 short:mt-1">
        {options.timerSeconds > 0 && status === 'pending' && (
          <div
            key={session.index}
            className="h-full origin-left rounded-full bg-ink"
            style={{ animation: `timer-shrink ${options.timerSeconds}s linear forwards` }}
          />
        )}
      </div>

      <UnlockBanner />

      <p className="mt-3 text-center text-xs font-medium text-ink-muted short:mt-1">
        {isAuto && 'Auto · '}Stage {question.stage} · {getStage(question.stage).description}
      </p>

      <div className={`flex flex-col justify-center ${isDrawing ? 'py-4' : 'flex-1 py-6 short:py-2'}`}>
        <PromptView key={session.index} question={question} settled={settled} />
      </div>

      {question.kind === 'choice' && <ChoiceAnswers question={question} session={session} onPick={submit} />}
      {question.kind === 'input' && (
        <InputAnswer key={session.index} question={question} session={session} onSubmit={submit} onNext={next} />
      )}
      {question.kind === 'compose' && (
        <ComposeAnswer key={session.index} question={question} session={session} onSubmit={submit} />
      )}
      {question.kind === 'draw' && (
        <>
          <Suspense>
            <div className="lg:mx-auto lg:w-full lg:max-w-md">
              <QuizDrawing
                key={session.index}
                question={question}
                settled={settled}
                onDone={submitDrawing}
                selfCheck={selfCheck}
                onDrawn={() => setDrawnIndex(session.index)}
              />
            </div>
          </Suspense>
          {awaitingVerdict && (
            <p className="mt-3 text-center text-sm font-medium text-ink-muted">
              Votre tracé correspond-il au modèle ?{' '}
              <span className="font-jp text-base text-ink">
                {question.target}
                {question.kanji && ` · ${question.kanji}`}
              </span>
            </p>
          )}
          {settled && (
            <p
              className={`mt-3 text-center text-sm font-medium ${status === 'correct' ? 'text-correct-ink' : 'text-error-ink'}`}
            >
              {status === 'correct' ? 'Parfait, sans erreur !' : 'À revoir : comparez avec le modèle.'}{' '}
              <span className="font-jp text-base text-ink">
                {question.target}
                {question.kanji && ` · ${question.kanji}`}
              </span>
            </p>
          )}
        </>
      )}

      {/* Collé en bas : une longue phrase ou beaucoup d’étiquettes ne doivent pas le pousser hors de l’écran. */}
      <div className="sticky bottom-0 z-10 -mx-4 mt-2 bg-paper px-4 pt-2 pb-1 short:mt-0 short:pt-1">
        {awaitingVerdict ? (
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => judge(false)}
              className={`min-h-12 rounded-md border-2 font-semibold active:scale-[0.98] ${WRONG_CLASS}`}
            >
              À revoir
            </button>
            <button
              type="button"
              onClick={() => judge(true)}
              className={`min-h-12 rounded-md border-2 font-semibold active:scale-[0.98] ${RIGHT_CLASS}`}
            >
              C’est juste
            </button>
          </div>
        ) : settled ? (
          <button
            type="button"
            onClick={next}
            // Neutre : l'accent rose se confondrait avec le rouge des erreurs.
            className="min-h-12 w-full rounded-md bg-ink font-semibold text-paper active:scale-[0.98]"
          >
            {session.index + 1 >= session.plannedCount ? 'Voir le résultat' : 'Suivant'}
          </button>
        ) : (
          <button
            type="button"
            onClick={reveal}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-md text-sm font-medium text-ink-muted"
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
    <p
      role="status"
      className="mt-3 rounded-md border border-gold bg-paper-raised px-3 py-2 text-center text-sm font-medium text-gold"
    >
      Nouveau groupe débloqué : <span className="font-jp">{groupGlyph(group)}</span> {group.label}
    </p>
  )
}

function PromptView({ question, settled }: { question: Question; settled: boolean }) {
  const { prompt } = question
  switch (prompt.type) {
    case 'kana':
      return <p className="text-center font-jp text-8xl leading-none lg:text-9xl">{prompt.text}</p>
    case 'romaji':
      return <p className="text-center text-6xl font-semibold tracking-wide lg:text-7xl">{prompt.text}</p>
    case 'word':
      return (
        <div className="text-center">
          <p className={`font-jp leading-tight break-keep ${wordSizeClass(prompt.text)}`}>{prompt.text}</p>
          {/* Kanji et traduction révélés après la réponse ; hauteur réservée pour éviter un saut. */}
          <p className="mt-3 min-h-6 text-sm text-ink-muted short:mt-1 lg:text-base">
            {settled && (
              <span style={{ animation: 'fade-in 0.2s' }}>
                {prompt.kanji && (
                  <>
                    <span className="font-jp text-base text-ink lg:text-2xl">
                      {prompt.kanji}
                    </span>
                    {' · '}
                  </>
                )}
                {prompt.meaning}
              </span>
            )}
          </p>
        </div>
      )
    case 'sentence':
    case 'romajiSentence':
      return (
        <div className="text-center">
          {prompt.type === 'sentence' ? (
            // Un bloc par mot : le japonais se couperait sinon au milieu d'un mot.
            <p
              className={`flex flex-wrap justify-center gap-x-[0.4em] font-jp leading-relaxed short:leading-snug ${sentenceSizeClass(prompt.text)}`}
            >
              {prompt.text.split(' ').map((word, i) => (
                <span key={i}>{word}</span>
              ))}
            </p>
          ) : (
            <p className={`leading-snug font-semibold ${romajiSentenceSizeClass(prompt.text)}`}>{prompt.text}</p>
          )}
          {/* Traduction, provenance et réplique d'origine seulement après la réponse : la phrase seule d'abord. */}
          {settled && (
            <div style={{ animation: 'fade-in 0.2s' }}>
              <p className="mt-3 text-sm text-ink-muted short:mt-1 lg:text-base">
                {prompt.meaning}
              </p>
              {prompt.source && (
                <p className="mt-2 text-xs font-medium text-ink-muted">{prompt.source}</p>
              )}
              {prompt.original && (
                <p className="mt-2 font-jp text-base text-ink lg:text-lg">
                  {prompt.original}
                </p>
              )}
            </div>
          )}
        </div>
      )
    case 'draw':
      return (
        <div className="text-center">
          <p className={`font-semibold tracking-wide break-all ${romajiSizeClass(prompt.text)}`}>{prompt.text}</p>
          <p className="mt-1 text-sm text-ink-muted">
            En {prompt.script}
            {prompt.note && ` · ${prompt.note}`}
            {prompt.meaning && ` · ${prompt.meaning}`}
          </p>
          {/[āīūēō]/.test(prompt.text) && (
            <p className="mt-1 text-xs text-ink-muted">ā, ī, ū, ē, ō : voyelle longue (ー)</p>
          )}
        </div>
      )
  }
}

// Tailles choisies pour tenir sur une ligne à ~350 px de large (mots jusqu'à 10 kana),
// ~640 px sur grand écran.
function wordSizeClass(text: string): string {
  if (text.length <= 5) return 'text-6xl short:text-5xl lg:text-7xl'
  if (text.length <= 6) return 'text-5xl lg:text-6xl'
  if (text.length <= 8) return 'text-4xl lg:text-6xl'
  return 'text-3xl lg:text-5xl'
}

function romajiSizeClass(text: string): string {
  if (text.length <= 10) return 'text-4xl lg:text-5xl'
  if (text.length <= 14) return 'text-3xl lg:text-5xl'
  return 'text-2xl lg:text-4xl'
}

// Les répliques longues (discours) doivent tenir à l'écran avec le clavier ouvert.
function sentenceSizeClass(text: string): string {
  if (text.length <= 30) return 'text-3xl short:text-2xl lg:text-4xl'
  if (text.length <= 60) return 'text-2xl short:text-xl lg:text-3xl'
  return 'text-xl short:text-lg lg:text-2xl'
}

function romajiSentenceSizeClass(text: string): string {
  if (text.length <= 60) return 'text-2xl short:text-xl lg:text-3xl'
  if (text.length <= 120) return 'text-xl short:text-lg lg:text-2xl'
  return 'text-lg short:text-base lg:text-xl'
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
            : 'border-control bg-paper-raised'
        return (
          <button
            key={choice.id}
            type="button"
            disabled={settled || wrong}
            onClick={() => onPick(choice.id)}
            className={`rounded-md border-2 font-medium transition-transform enabled:active:scale-95 ${stateClass} ${
              question.choices.length > 4 ? 'min-h-14 lg:min-h-16' : 'min-h-16 lg:min-h-20'
            } ${isKana ? 'font-jp text-3xl lg:text-4xl' : 'text-xl lg:text-2xl'} ${settled && !wrong && !right ? 'opacity-50' : ''}`}
          >
            {choice.label}
          </button>
        )
      })}
    </div>
  )
}

interface ComposeAnswerProps {
  question: ComposeQuestion
  session: SessionState
  onSubmit: (value: string) => void
}

/** Stage 9 : la phrase se reconstruit en touchant les étiquettes dans l'ordre. */
function ComposeAnswer({ question, session, onSubmit }: ComposeAnswerProps) {
  // Indices des étiquettes posées, dans l'ordre.
  const [picked, setPicked] = useState<number[]>([])
  const { status, wrongAnswers } = session
  const settled = status !== 'pending'
  const wordCount = question.reading.split(' ').length
  const answerOf = (indices: number[]) => indices.map((i) => question.tiles[i]!).join(' ')
  const showWrong = status === 'failed' || (picked.length === wordCount && wrongAnswers.includes(answerOf(picked)))

  const pick = (index: number) => {
    if (settled || picked.length >= wordCount) return
    const next = [...picked, index]
    setPicked(next)
    // Phrase complète : vérifiée tout de suite, sans bouton à valider.
    if (next.length === wordCount) onSubmit(answerOf(next))
  }
  const unpick = (position: number) => {
    if (!settled) setPicked(picked.filter((_, p) => p !== position))
  }

  const placedClass =
    status === 'correct'
      ? RIGHT_CLASS
      : showWrong
        ? WRONG_CLASS
        : 'border-control bg-paper-raised'

  return (
    <div>
      <div
        aria-label="Votre phrase"
        className="flex min-h-16 flex-wrap content-start gap-1.5 rounded-md border-2 border-dashed border-control p-2"
      >
        {picked.map((tileIndex, position) => (
          <button
            key={position}
            type="button"
            onClick={() => unpick(position)}
            disabled={settled}
            className={`min-h-11 rounded-lg border-2 px-3 font-jp text-xl lg:text-2xl ${placedClass}`}
          >
            {question.tiles[tileIndex]}
          </button>
        ))}
      </div>

      <p className="mt-2 min-h-5 text-center text-sm lg:text-base">
        {status === 'failed' && (
          <span>
            Réponse : <strong className="font-jp text-correct-ink">{question.reading}</strong>
          </span>
        )}
        {status === 'pending' && showWrong && (
          <span className="text-error-ink">
            Pas tout à fait : touchez une étiquette pour la retirer.
          </span>
        )}
      </p>

      {/* Étiquettes posées gardées invisibles : la réserve ne se réorganise pas. */}
      <div className="mt-2 flex flex-wrap justify-center gap-2">
        {question.tiles.map((tile, index) => {
          const used = picked.includes(index)
          return (
            <button
              key={index}
              type="button"
              onClick={() => pick(index)}
              disabled={settled || used}
              className={`min-h-11 rounded-lg border-2 border-control bg-paper-raised px-3 font-jp text-xl enabled:active:scale-95 lg:text-2xl ${
                used ? 'invisible' : settled ? 'opacity-50' : ''
              }`}
            >
              {tile}
            </button>
          )
        })}
      </div>
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
        : 'border-control bg-paper-raised'

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
        className={`min-h-14 w-full rounded-md border-2 px-4 short:min-h-12 text-center outline-none ${
          question.stage === 8 ? 'text-lg lg:text-xl' : 'text-2xl lg:text-3xl'
        } lg:min-h-16 placeholder:text-ink-muted focus:ring-2 focus:ring-accent/40 ${stateClass}`}
      />
      <p className="mt-2 min-h-5 text-center text-sm short:mt-1 lg:text-base">
        {status === 'failed' && (
          <span>
            Réponse : <strong className="text-correct-ink">{question.expected}</strong>
          </span>
        )}
        {status === 'pending' && lastWrong !== undefined && (
          <span className="text-error-ink">Pas tout à fait, réessayez.</span>
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
    start(
      generateQuestions(settings.stage, pool, settings.questionCount, Math.random, effectiveSentenceFilter(settings)),
      {
        retry: settings.retry,
        timerSeconds: settings.timerSeconds,
        drawingCheck: settings.drawingCheck,
      },
    )
  }

  return (
    <div className="flex min-h-full flex-col">
      <div className="py-8 text-center">
        <p className="text-sm text-ink-muted">
          {autoParams ? 'Session auto terminée' : `Stage ${session.questions[0]?.stage} terminé`}
        </p>
        <p className="mt-2 text-6xl font-bold tabular-nums">
          {correct}
          <span className="text-3xl text-ink-muted">/{total}</span>
        </p>
        <p className="mt-1 text-sm text-ink-muted">{percent} % du premier coup</p>
      </div>

      {unlockedThisSession.length > 0 && (
        <section className="mb-4 rounded-md border border-gold bg-paper-raised p-4 text-gold">
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
        <section className="rounded-md border border-hairline p-4">
          <h2 className="mb-3 text-sm font-semibold text-ink-muted">À revoir</h2>
          <ul className="flex flex-wrap gap-2">
            {[...missed.entries()].map(([key, q]) => (
              <li
                key={key}
                className="flex items-baseline gap-1.5 rounded-lg bg-paper-raised px-2.5 py-1.5"
              >
                <span className="font-jp text-lg">{missedKey(q)}</span>
                <span className="text-xs text-ink-muted">{missedReading(q)}</span>
              </li>
            ))}
          </ul>
          <Link
            to={`/learn/custom/new?kana=${missedKanaIds.join(',')}`}
            className="mt-3 flex min-h-11 items-center justify-center gap-2 rounded-md border border-dashed border-control text-sm font-medium text-ink-muted"
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
          className="min-h-12 rounded-md bg-accent font-semibold text-on-accent active:scale-[0.98]"
        >
          Recommencer
        </button>
        <button
          type="button"
          onClick={() => {
            quit()
            navigate('/learn', { replace: true })
          }}
          className="min-h-12 rounded-md text-sm font-medium text-ink-muted"
        >
          Retour aux réglages
        </button>
      </div>
    </div>
  )
}

/** Texte en kana d'une question, pour la liste « À revoir ». */
function missedKey(q: Question): string {
  if (q.kind === 'input' || q.kind === 'compose') return q.reading
  if (q.kind === 'draw') return q.target
  return getKana(q.kanaIds[0]!)!.char
}

function missedReading(q: Question): string {
  if (q.kind === 'input') return q.expected
  if (q.kind === 'draw' && q.prompt.type === 'draw') return q.prompt.text
  if (q.kind === 'compose') return q.prompt.text
  return getKana(q.kanaIds[0]!)!.romaji[0]!
}
