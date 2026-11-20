import { Suspense, lazy, useEffect, useRef, useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { AppKeyboard } from '@/components/AppKeyboard'
import { Button } from '@/components/Button'
import { Choice, type ChoiceState } from '@/components/Choice'
import { Dialog } from '@/components/Dialog'
import { Feedback } from '@/components/Feedback'
import { Icon } from '@/components/Icon'
import { IconButton } from '@/components/IconButton'
import { SegmentText } from '@/components/SegmentText'
import { SessionProgress, type TickState } from '@/components/SessionProgress'
import { LongTextField, TextField, type FieldState } from '@/components/TextField'
import { TimerBar } from '@/components/TimerBar'
import { WordTile, type WordTileState } from '@/components/WordTile'
import { groupGlyph } from '@/data/kana'
import { feedbackFor, type FeedbackContent } from '@/features/quiz/feedback'
import { currentQuestion, type SessionState } from '@/features/quiz/session'
import { FAMILIES, stageKindLabel, stagePresentation } from '@/features/quiz/stages'
import type { ChoiceQuestion, ComposeQuestion, InputQuestion, Question, StageId } from '@/features/quiz/types'
import { useAppKeyboard } from '@/lib/useAppKeyboard'
import { useQuizOrigin } from '@/lib/useQuizOrigin'
import { useUiStyle } from '@/lib/useUiStyle'
import { QuizSummary } from '@/pages/QuizSummary'
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
  // Clavier romaji intégré sous les questions à saisir (écran tactile, réglage « Intégré »).
  const keyboard = useAppKeyboard()
  const appKeyboard = question.kind === 'input' ? keyboard : null
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
  const reload = useUiStyle() === 'reload'
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
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if ((e.key === 'Enter' || e.key === ' ') && settled) {
        e.preventDefault()
        next()
      }
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
    <div className="k-quiz relative flex min-h-full flex-col" data-app-keyboard={appKeyboard ? '' : undefined}>
      {reload && (
        <span aria-hidden="true" className="rl-ghost top-5 -left-6 text-[72px] opacity-45">
          {stagePresentation(question.stage).name.toLocaleUpperCase('fr-FR').replace(' ?', '\u00a0?')}
        </span>
      )}
      <header className="relative -ml-2.5 flex items-center gap-1.5">
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
        className={`flex min-h-0 flex-1 flex-col items-center justify-center ${isDrawing ? 'py-3' : 'py-5 short:py-2'}`}
      >
        <PromptView key={session.index} question={question} done={settled || awaitingVerdict} />
      </div>

      {question.kind === 'choice' && <ChoiceAnswers question={question} session={session} onPick={submit} />}
      {question.kind === 'input' && (
        <InputAnswer
          key={session.index}
          question={question}
          session={session}
          onSubmit={submit}
          onNext={next}
          appKeyboard={appKeyboard !== null}
        />
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

      {/* Même mise en page pour tous les exercices : l'espace libre se partage au-dessus et au-dessous de
          la zone de réponse, qui remonte vers le centre. Sauf le champ de saisie, qui reste contre le clavier
          intégré. */}
      {!(question.kind === 'input' && appKeyboard) && <div className="min-h-0 flex-1" />}

      {/* Collé en bas, sans fond (pas de bande qui masque la zone de réponse) : une longue phrase ou beaucoup
          d’étiquettes ne doivent pas pousser le bouton ni le clavier hors de l’écran. */}
      <div className="sticky bottom-0 z-10 -mx-4 mt-auto px-4 pt-3 pb-1 short:pt-2">
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
        {appKeyboard && <AppKeyboard targetId={ANSWER_ID} layout={appKeyboard} enterLabel={settled ? 'Suivant' : 'Valider'} />}
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
    <Feedback signal={content.signal} title={<SegmentText line={content.title} />} className={className}>
      {content.detail.length > 0 &&
        content.detail.map((line, i) => (
          <p key={i}>
            <SegmentText line={line} />
          </p>
        ))}
    </Feedback>
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
      className={`k-prompt relative grid shrink-0 place-items-center rounded-sm border-[1.5px] border-ink bg-paper-raised font-jp leading-none whitespace-nowrap short:size-28 ${box} ${text}`}
    >
      <span aria-hidden="true" className="absolute inset-y-2 left-1/2 border-l-[1.5px] border-dashed border-hairline" />
      <span aria-hidden="true" className="absolute inset-x-2 top-1/2 border-t-[1.5px] border-dashed border-hairline" />
      <span className="relative">{children}</span>
    </div>
  )
}

/**
 * Sujet de la question. La traduction (kanji, sens, provenance) n'apparaît qu'une fois
 * la réponse fixée, sous le texte : c'est la récompense de la question terminée.
 */
function PromptView({ question, done }: { question: Question; done: boolean }) {
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
        <div className="text-center">
          <p className={`font-jp leading-tight tracking-[0.04em] break-keep ${wordSizeClass(prompt.text)}`}>
            {prompt.text}
          </p>
          {/* Hauteur réservée : le mot ne saute pas quand la traduction arrive. */}
          <p className="mt-3 min-h-6 text-[15px] leading-6 text-ink-muted short:mt-1 lg:text-base">
            {done && <Meaning kanji={prompt.kanji} meaning={prompt.meaning} />}
          </p>
        </div>
      )
    case 'sentence':
      return (
        <div className="text-center">
          {/* Un bloc par mot : le japonais se couperait sinon au milieu d'un mot. */}
          <p
            className={`flex flex-wrap justify-center gap-x-[0.4em] px-1 font-jp leading-relaxed short:leading-snug ${sentenceSizeClass(prompt.text)}`}
          >
            {prompt.text.split(' ').map((word, i) => (
              <span key={i}>{word}</span>
            ))}
          </p>
          {done && <SentenceReward meaning={prompt.meaning} source={prompt.source} original={prompt.original} />}
        </div>
      )
    case 'romajiSentence':
      return (
        <div className="text-center">
          <p className={`font-serif leading-snug font-medium ${romajiSentenceSizeClass(prompt.text)}`}>{prompt.text}</p>
          {done && <SentenceReward meaning={prompt.meaning} source={prompt.source} original={prompt.original} />}
        </div>
      )
    case 'draw': {
      const count = question.kind === 'draw' ? question.chars.length : 1
      const kanji = question.kind === 'draw' ? question.kanji : undefined
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
          {done && prompt.meaning && (
            <p className="mt-1.5 text-[15px] leading-6">
              <Meaning kanji={kanji} meaning={prompt.meaning} />
            </p>
          )}
          {!done && /[āīūēō]/.test(prompt.text) && (
            <p className="mt-1 text-xs text-ink-muted">ā, ī, ū, ē, ō : voyelle longue (ー)</p>
          )}
        </div>
      )
    }
  }
}

function Meaning({ kanji, meaning }: { kanji?: string; meaning: string }) {
  return (
    <span className="inline-block animate-rise">
      {kanji && (
        <>
          <span className="font-jp text-lg text-ink lg:text-2xl">{kanji}</span>
          {' · '}
        </>
      )}
      {meaning}
    </span>
  )
}

/** Traduction d'une phrase, puis provenance et réplique d'origine (livre, anime). */
function SentenceReward({ meaning, source, original }: { meaning: string; source?: string; original?: string }) {
  return (
    <div className="animate-rise">
      <p className="mt-3 text-[15px] leading-[21px] text-ink-muted short:mt-1 lg:text-base">{meaning}</p>
      {source && <p className="mt-2 text-xs font-medium text-ink-muted">{source}</p>}
      {original && <p className="mt-2 font-jp text-base lg:text-lg">{original}</p>}
    </div>
  )
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
    <div className="k-choices grid grid-cols-2 gap-2.5">
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
  /** Clavier intégré affiché : le clavier du système ne doit pas s'ouvrir. */
  appKeyboard: boolean
}

const ANSWER_ID = 'quiz-answer'

function InputAnswer({ question, session, onSubmit, onNext, appKeyboard }: InputAnswerProps) {
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { status, wrongAnswers } = session
  const lastWrong = wrongAnswers.at(-1)

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (status !== 'pending') return onNext()
    if (!value.trim()) return
    onSubmit(value)
    // Le champ garde le focus : on corrige sans retoucher l'écran.
    ;(inputRef.current ?? textareaRef.current)?.select()
  }

  const state: FieldState =
    status === 'correct' ? 'correct' : lastWrong !== undefined && value === lastWrong ? 'wrong' : 'idle'

  const field = {
    id: ANSWER_ID,
    inputMode: appKeyboard ? ('none' as const) : undefined,
    value,
    readOnly: status !== 'pending',
    autoFocus: true,
    state,
    enterKeyHint: status === 'pending' ? ('done' as const) : ('next' as const),
    placeholder: status === 'pending' ? 'en romaji' : '',
    'aria-label': 'Votre réponse en romaji',
  }

  return (
    <form onSubmit={handleSubmit}>
      {question.stage === 8 ? (
        // Phrase : le champ passe à la ligne et grandit, la fin de la saisie reste visible.
        <LongTextField ref={textareaRef} onChange={(e) => setValue(e.target.value)} {...field} />
      ) : (
        <TextField
          ref={inputRef}
          onChange={(e) => setValue(e.target.value)}
          className="short:[&_input]:min-h-12"
          {...field}
        />
      )}
    </form>
  )
}
