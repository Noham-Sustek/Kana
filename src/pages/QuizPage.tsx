import { Fragment, Suspense, lazy, useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import { Button } from '@/components/Button'
import { Choice, type ChoiceState } from '@/components/Choice'
import { Dialog } from '@/components/Dialog'
import { Feedback } from '@/components/Feedback'
import { Icon } from '@/components/Icon'
import { IconButton } from '@/components/IconButton'
import { SessionProgress, type TickState } from '@/components/SessionProgress'
import { TextField, type FieldState } from '@/components/TextField'
import { TimerBar } from '@/components/TimerBar'
import { WordTile, type WordTileState } from '@/components/WordTile'
import { getKana, groupGlyph } from '@/data/kana'
import { feedbackFor, type FeedbackContent, type Line } from '@/features/quiz/feedback'
import { generateQuestions } from '@/features/quiz/questions'
import { currentQuestion, score, type SessionState } from '@/features/quiz/session'
import { FAMILIES, stageKindLabel, stagePresentation } from '@/features/quiz/stages'
import type { ChoiceQuestion, ComposeQuestion, InputQuestion, Question, StageId } from '@/features/quiz/types'
import { useQuizPool } from '@/features/quiz/useQuizPool'
import { effectiveSentenceFilter, useQuizSettingsStore } from '@/stores/quizSettingsStore'
import { useQuizSessionStore } from '@/stores/quizSessionStore'

const AUTO_ADVANCE_MS = 700

// Chunk séparé (tracés KanjiVG) : hors du bundle principal, précaché comme le reste.
const QuizDrawing = lazy(() => import('@/components/QuizDrawing').then((m) => ({ default: m.QuizDrawing })))

export function QuizPage() {
  const session = useQuizSessionStore((s) => s.session)
  if (!session) return <Navigate to="/learn" replace />
  if (session.finished) return <QuizSummary session={session} />
  return <QuizRunner session={session} />
}

/** Écran d'où la session a été lancée (Accueil ou S'entraîner), où revenir en la quittant. */
function useQuizOrigin(): string {
  const state: unknown = useLocation().state
  return state && typeof state === 'object' && 'from' in state && typeof state.from === 'string' ? state.from : '/learn'
}

/** Un segment par question : juste, raté (entaillé), en cours, à venir. */
function sessionTicks(session: SessionState): TickState[] {
  return Array.from({ length: session.plannedCount }, (_, i) => {
    if (i === session.index) return 'current'
    if (i > session.index) return 'todo'
    return session.outcomes[i]?.correct ? 'done' : 'missed'
  })
}

/**
 * Écran de question (docs/design/README.md, Écrans de question), de haut en bas :
 * quitter et progression ; famille et consigne ; sujet ; réponse ; retour ; action.
 */
function QuizRunner({ session }: { session: SessionState }) {
  const { submit, submitDrawing, reveal, next, quit } = useQuizSessionStore()
  const navigate = useNavigate()
  const question = currentQuestion(session)!
  const { status, options } = session
  const settled = status !== 'pending'
  // Validation du dessin par l'utilisateur : index de la question dont le dessin est fini.
  const selfCheck = options.drawingCheck === 'self'
  const [drawnIndex, setDrawnIndex] = useState<number | null>(null)
  const awaitingVerdict = selfCheck && drawnIndex === session.index && !settled
  // Le verdict vaut réponse : on enchaîne directement, la comparaison a déjà été vue.
  const judge = (correct: boolean) => {
    submitDrawing(correct)
    next()
  }

  const origin = useQuizOrigin()
  const [confirmQuit, setConfirmQuit] = useState(false)
  const answered = session.outcomes.filter(Boolean).length
  const exit = () => {
    quit()
    navigate(origin, { replace: true })
  }
  // Rien n'est perdu en quittant, mais un ✕ touché par mégarde ne doit pas couper la session.
  const askQuit = () => (answered > 0 ? setConfirmQuit(true) : exit())

  // Bonne réponse : passage automatique à la question suivante, sauf s'il y a
  // quelque chose à regarder (comparaison d'un dessin, traduction d'un mot ou
  // d'une phrase).
  const isDrawing = question.kind === 'draw'
  const { prompt } = question
  const stayAfterAnswer =
    isDrawing || prompt.type === 'word' || prompt.type === 'sentence' || prompt.type === 'romajiSentence'
  useEffect(() => {
    if (status !== 'correct' || stayAfterAnswer || confirmQuit) return
    const timer = setTimeout(next, AUTO_ADVANCE_MS)
    return () => clearTimeout(timer)
  }, [status, next, session.index, stayAfterAnswer, confirmQuit])

  // Chrono : à expiration, la réponse est révélée (compte comme une erreur).
  useEffect(() => {
    if (!options.timerSeconds || status !== 'pending' || awaitingVerdict) return
    const remaining = session.questionStartedAt + options.timerSeconds * 1000 - Date.now()
    const timer = setTimeout(() => reveal(true), Math.max(0, remaining))
    return () => clearTimeout(timer)
  }, [options.timerSeconds, status, reveal, session.questionStartedAt, awaitingVerdict])

  // Clavier physique : Entrée pour continuer, chiffres pour les choix.
  useEffect(() => {
    if (confirmQuit) return
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
  }, [question, settled, next, submit, confirmQuit])

  const feedback = feedbackFor({
    question,
    status,
    wrongAnswers: session.wrongAnswers,
    revealed: session.outcomes[session.index]?.revealed ?? false,
  })

  return (
    <div className="flex min-h-full flex-col">
      <header className="-ml-2.5 flex items-center gap-1.5">
        <IconButton icon="close" label="Quitter la session" onClick={askQuit} />
        <SessionProgress ticks={sessionTicks(session)} />
      </header>
      {options.timerSeconds > 0 ? (
        <TimerBar
          durationMs={options.timerSeconds * 1000}
          runKey={session.index}
          paused={settled || awaitingVerdict}
          className="mt-1"
        />
      ) : (
        <div className="mt-1 h-[3px]" />
      )}

      <UnlockNotice />

      <QuestionHeading stage={question.stage} compact={isDrawing} />

      <div
        className={`flex flex-col items-center justify-center ${isDrawing ? 'py-3' : 'min-h-0 flex-1 py-5 short:py-2'}`}
      >
        <PromptView key={session.index} question={question} />
      </div>

      {question.kind === 'choice' && <ChoiceAnswers question={question} session={session} onPick={submit} />}
      {question.kind === 'input' && (
        <InputAnswer key={session.index} question={question} session={session} onSubmit={submit} onNext={next} />
      )}
      {question.kind === 'compose' && (
        <ComposeAnswer key={session.index} question={question} session={session} onSubmit={submit} />
      )}
      {question.kind === 'draw' && (
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
      )}

      {awaitingVerdict && (
        <p className="mt-3 text-center text-[14.5px] leading-5 font-semibold">
          Votre tracé correspond-il au modèle ?
        </p>
      )}
      {feedback && (
        <FeedbackPanel
          // Rejoue l'apparition à chaque nouveau retour (réessai compris).
          key={`${session.index}-${status}-${session.wrongAnswers.length}`}
          content={feedback}
          className="mt-3 short:mt-2"
        />
      )}

      {/* Collé en bas : une longue phrase ou beaucoup d’étiquettes ne doivent pas le pousser hors de l’écran. */}
      <div className="sticky bottom-0 z-10 -mx-4 mt-auto bg-paper px-4 pt-3 pb-1 short:pt-2">
        {awaitingVerdict ? (
          <div className="grid grid-cols-2 gap-3">
            <Button variant="line" onClick={() => judge(false)}>
              À revoir
            </Button>
            <Button variant="ink" onClick={() => judge(true)}>
              C’est juste
            </Button>
          </div>
        ) : settled ? (
          <Button variant="ink" icon="arrow" onClick={next} className="short:min-h-12">
            {session.index + 1 >= session.plannedCount ? 'Voir le résultat' : 'Suivant'}
          </Button>
        ) : (
          <Button variant="text" fullWidth icon="eye" iconPosition="start" onClick={() => reveal()}>
            Afficher la réponse
          </Button>
        )}
      </div>

      <Dialog
        open={confirmQuit}
        title="Quitter la session ?"
        safeLabel="Continuer"
        onSafe={() => setConfirmQuit(false)}
        riskyLabel="Quitter"
        onRisky={exit}
      >
        {answered === 1 ? 'Votre réponse est enregistrée.' : `Vos ${answered} réponses sont enregistrées.`}
      </Dialog>
    </div>
  )
}

/** Famille (icône + nom) et consigne. Version resserrée pour le dessin et clavier ouvert. */
function QuestionHeading({ stage, compact }: { stage: StageId; compact: boolean }) {
  const { family, ask } = stagePresentation(stage)
  return (
    <div className="text-center">
      <p
        className={`flex items-center justify-center gap-[7px] text-[12.5px] leading-4 font-semibold text-ink-muted ${
          compact ? 'mt-1' : 'mt-3.5 short:mt-1'
        }`}
      >
        <Icon name={FAMILIES[family].icon} className="size-4" />
        {stageKindLabel(stage)}
      </p>
      {ask && (
        <h1
          className={`px-5 font-serif leading-[1.15] font-medium ${
            compact ? 'mt-0.5 text-[19px]' : 'mt-1 text-2xl short:mt-0.5 short:text-[19px]'
          }`}
        >
          {ask}
        </h1>
      )}
    </div>
  )
}

function FeedbackPanel({ content, className }: { content: FeedbackContent; className?: string }) {
  return (
    <Feedback signal={content.signal} title={<Segments line={content.title} />} className={className}>
      {content.detail.length > 0 &&
        content.detail.map((line, i) => (
          <p key={i}>
            <Segments line={line} />
          </p>
        ))}
    </Feedback>
  )
}

function Segments({ line }: { line: Line }) {
  return line.map((s, i) =>
    s.jp ? (
      <span key={i} className="font-jp text-[1.1em]">
        {s.text}
      </span>
    ) : (
      <Fragment key={i}>{s.text}</Fragment>
    ),
  )
}

const UNLOCK_NOTICE_MS = 3500

/** Annonce une ligne débloquée pendant la session (mode auto). L'or est réservé à ce moment. */
function UnlockNotice() {
  const unlocked = useQuizSessionStore((s) => s.unlockedThisSession)
  const [visibleCount, setVisibleCount] = useState(0)
  const [hidden, setHidden] = useState(true)

  useEffect(() => {
    if (unlocked.length <= visibleCount) return
    setVisibleCount(unlocked.length)
    setHidden(false)
    const timer = setTimeout(() => setHidden(true), UNLOCK_NOTICE_MS)
    return () => clearTimeout(timer)
  }, [unlocked.length, visibleCount])

  const group = unlocked.at(-1)
  if (hidden || !group) return null
  return (
    <p
      role="status"
      className="mt-2 flex animate-unlock items-center justify-center gap-2 rounded-md border-[1.5px] border-gold bg-paper-raised px-3 py-2 text-[13.5px] leading-[19px] font-semibold text-gold"
    >
      <Icon name="star" className="size-4" />
      Ligne débloquée : <span className="font-jp text-base">{groupGlyph(group)}</span> ({group.label})
    </p>
  )
}

/** Case de papier quadrillé (genkō) : le kana d'une question, avec ses repères en croix. */
function KanaCase({ children, size }: { children: string; size: 'lg' | 'md' }) {
  // Yōon (きゃ) : deux caractères côte à côte, la taille est divisée pour tenir dans la case.
  const pair = children.length > 1
  const box = size === 'lg' ? 'size-[212px]' : 'size-[168px]'
  const text = pair
    ? `${size === 'lg' ? 'text-[88px]' : 'text-[70px]'} short:text-[46px]`
    : `${size === 'lg' ? 'text-[148px]' : 'text-[116px]'} short:text-[76px]`
  return (
    <div
      className={`relative grid shrink-0 place-items-center rounded-sm border-[1.5px] border-ink bg-paper-raised font-jp leading-none whitespace-nowrap short:size-28 ${box} ${text}`}
    >
      <span aria-hidden="true" className="absolute inset-y-2 left-1/2 border-l-[1.5px] border-dashed border-hairline" />
      <span aria-hidden="true" className="absolute inset-x-2 top-1/2 border-t-[1.5px] border-dashed border-hairline" />
      <span className="relative">{children}</span>
    </div>
  )
}

function PromptView({ question }: { question: Question }) {
  const { prompt } = question
  switch (prompt.type) {
    case 'kana':
      return <KanaCase size={question.stage === 3 ? 'md' : 'lg'}>{prompt.text}</KanaCase>
    case 'romaji':
      return (
        <p className="text-center font-serif text-[64px] leading-none font-medium tracking-wide short:text-5xl lg:text-7xl">
          {prompt.text}
        </p>
      )
    case 'word':
      return (
        <p className={`text-center font-jp leading-tight tracking-[0.04em] break-keep ${wordSizeClass(prompt.text)}`}>
          {prompt.text}
        </p>
      )
    case 'sentence':
      return (
        // Un bloc par mot : le japonais se couperait sinon au milieu d'un mot.
        <p
          className={`flex flex-wrap justify-center gap-x-[0.4em] px-1 font-jp leading-relaxed short:leading-snug ${sentenceSizeClass(prompt.text)}`}
        >
          {prompt.text.split(' ').map((word, i) => (
            <span key={i}>{word}</span>
          ))}
        </p>
      )
    case 'romajiSentence':
      return (
        <div className="text-center">
          <p className={`font-serif leading-snug font-medium ${romajiSentenceSizeClass(prompt.text)}`}>{prompt.text}</p>
          {/* La traduction guide le choix des étiquettes. */}
          <p className="mt-2 text-[13.5px] leading-[19px] text-ink-muted">
            {/* Certaines traductions (répliques) ont déjà leurs guillemets. */}
            {prompt.meaning.startsWith('«') ? prompt.meaning : `« ${prompt.meaning} »`}
          </p>
        </div>
      )
    case 'draw': {
      const count = question.kind === 'draw' ? question.chars.length : 1
      return (
        <div className="text-center">
          <p className={`font-serif leading-none font-medium tracking-wide break-all ${romajiSizeClass(prompt.text)}`}>
            {prompt.text}
          </p>
          <p className="mt-2 text-[13.5px] leading-[19px] text-ink-muted">
            En {prompt.script}
            {count > 1 && ` · ${count} caractères`}
            {prompt.note && ` · ${prompt.note}`}
          </p>
          {/[āīūēō]/.test(prompt.text) && (
            <p className="mt-1 text-xs text-ink-muted">ā, ī, ū, ē, ō : voyelle longue (ー)</p>
          )}
        </div>
      )
    }
  }
}

// Tailles choisies pour tenir sur une ligne à ~350 px de large (mots jusqu'à 10 kana),
// ~640 px sur grand écran.
function wordSizeClass(text: string): string {
  if (text.length <= 5) return 'text-[64px] short:text-5xl lg:text-7xl'
  if (text.length <= 6) return 'text-5xl lg:text-6xl'
  if (text.length <= 8) return 'text-4xl lg:text-6xl'
  return 'text-3xl lg:text-5xl'
}

function romajiSizeClass(text: string): string {
  if (text.length <= 10) return 'text-[44px] lg:text-5xl'
  if (text.length <= 14) return 'text-3xl lg:text-5xl'
  return 'text-2xl lg:text-4xl'
}

// Les répliques longues (discours) doivent tenir à l'écran avec le clavier ouvert.
function sentenceSizeClass(text: string): string {
  if (text.length <= 30) return 'text-[25px] short:text-[21px] lg:text-4xl'
  if (text.length <= 60) return 'text-[21px] short:text-lg lg:text-3xl'
  return 'text-lg short:text-base lg:text-2xl'
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
  const stateOf = (id: string): ChoiceState => {
    if (session.wrongAnswers.includes(id)) return 'wrong'
    if (!settled) return 'idle'
    if (id === question.answerId) return session.status === 'correct' ? 'correct' : 'revealed'
    return 'dim'
  }

  return (
    <div className="grid grid-cols-2 gap-2.5">
      {question.choices.map((choice) => {
        const state = stateOf(choice.id)
        return (
          <Choice
            key={choice.id}
            state={state}
            jp={question.choiceType === 'kana'}
            compact={question.choices.length > 4}
            disabled={settled || state === 'wrong'}
            onClick={() => onPick(choice.id)}
          >
            {choice.label}
          </Choice>
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
  const expected = question.reading.split(' ')
  const answerOf = (indices: number[]) => indices.map((i) => question.tiles[i]!).join(' ')
  const showWrong =
    status === 'failed' || (picked.length === expected.length && wrongAnswers.includes(answerOf(picked)))

  const pick = (index: number) => {
    if (settled || picked.length >= expected.length) return
    const next = [...picked, index]
    setPicked(next)
    // Phrase complète : vérifiée tout de suite, sans bouton à valider.
    if (next.length === expected.length) onSubmit(answerOf(next))
  }
  const unpick = (position: number) => {
    if (!settled) setPicked(picked.filter((_, p) => p !== position))
  }

  // Seules les étiquettes en cause sont marquées fausses.
  const placedState = (tileIndex: number, position: number): WordTileState => {
    if (status === 'correct') return 'correct'
    if (showWrong && question.tiles[tileIndex] !== expected[position]) return 'wrong'
    return 'idle'
  }

  return (
    <div>
      <div
        aria-label="Votre phrase"
        className="flex min-h-[116px] flex-wrap content-start gap-2 py-2"
        // Lignes de cahier tous les 56 px : une étiquette (48 px) + l'écart.
        style={{ background: 'repeating-linear-gradient(to bottom, transparent 0 55px, var(--k-hairline) 55px 56px)' }}
      >
        {picked.map((tileIndex, position) => (
          <WordTile
            key={position}
            state={placedState(tileIndex, position)}
            onClick={() => unpick(position)}
            disabled={settled}
          >
            {question.tiles[tileIndex]}
          </WordTile>
        ))}
      </div>

      {/* Une étiquette posée laisse son emplacement en pointillés : la réserve ne bouge pas. */}
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        {question.tiles.map((tile, index) => (
          <WordTile
            key={index}
            state={picked.includes(index) ? 'gone' : 'idle'}
            onClick={() => pick(index)}
            disabled={settled}
            className={settled ? 'opacity-45' : ''}
          >
            {tile}
          </WordTile>
        ))}
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

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (status !== 'pending') return onNext()
    if (!value.trim()) return
    onSubmit(value)
    // Le champ garde le focus : on corrige sans retoucher l'écran.
    inputRef.current?.select()
  }

  const state: FieldState =
    status === 'correct' ? 'correct' : lastWrong !== undefined && value === lastWrong ? 'wrong' : 'idle'

  return (
    <form onSubmit={handleSubmit}>
      <TextField
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        readOnly={status !== 'pending'}
        autoFocus
        long={question.stage === 8}
        state={state}
        enterKeyHint={status === 'pending' ? 'done' : 'next'}
        placeholder={status === 'pending' ? 'en romaji' : ''}
        aria-label="Votre réponse en romaji"
        className="short:[&_input]:min-h-12"
      />
    </form>
  )
}

function QuizSummary({ session }: { session: SessionState }) {
  const { start, startAuto, quit, autoParams, unlockedThisSession } = useQuizSessionStore()
  const settings = useQuizSettingsStore()
  const pool = useQuizPool()
  const navigate = useNavigate()
  const origin = useQuizOrigin()
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
        <Button onClick={restart}>
          Recommencer
        </Button>
        <Button
          variant="quiet"
          fullWidth
          onClick={() => {
            quit()
            navigate(origin, { replace: true })
          }}
        >
          {origin === '/home' ? 'Retour à l’accueil' : 'Retour à S’entraîner'}
        </Button>
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
