import { useState, type ReactNode } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router'
import { Button } from '@/components/Button'
import { Feedback } from '@/components/Feedback'
import { Icon } from '@/components/Icon'
import { IconButton } from '@/components/IconButton'
import { SegmentedControl } from '@/components/SegmentedControl'
import { SignalBadge } from '@/components/SignalBadge'
import { StrokeOrderAnimation } from '@/components/StrokeOrderAnimation'
import { WritingComparison } from '@/components/WritingComparison'
import { WritingPad, type WritingResult } from '@/components/WritingPad'
import { getGroup, getKana, groupGlyph, kanaOfScript, type Kana } from '@/data/kana'
import { isWritable, strokesOf } from '@/data/strokes'
import { recordWritingResult } from '@/db/writing'
import type { Point } from '@/features/writing/geometry'
import { isWritingSuccess, strokeNote } from '@/features/writing/progress'
import { haptic } from '@/lib/haptic'
import { useUiStyle } from '@/lib/useUiStyle'
import { activeProfileId } from '@/stores/profileStore'
import { useWritingSettingsStore, type WritingLevel } from '@/stores/writingSettingsStore'

const LEVEL_OPTIONS: { value: WritingLevel; label: string }[] = [
  { value: 1, label: '1 · Observer' },
  { value: 2, label: '2 · Calque' },
  { value: 3, label: '3 · De mémoire' },
]

const TOOL_BUTTON =
  'k-padtool flex min-h-[52px] min-w-[68px] flex-col items-center justify-center gap-0.5 rounded-md px-2 text-[12px] leading-[14px] font-semibold text-ink active:brightness-90 disabled:opacity-40'

const PAD_WIDTH = 'mx-auto w-[min(296px,100%)]'

/** Exercice d'écriture d'un kana : observer l'ordre des traits, tracer sur le calque, puis de mémoire. */
export function WritingExercisePage() {
  const { kanaId = '' } = useParams()
  const navigate = useNavigate()
  const level = useWritingSettingsStore((s) => s.level)
  const setLevel = useWritingSettingsStore((s) => s.setLevel)
  const kana = getKana(kanaId)
  // Le kana est caché au niveau 3 tant que le tracé n'est pas terminé.
  const [revealedChar, setRevealedChar] = useState(false)
  const reload = useUiStyle() === 'reload'

  if (!kana || !isWritable(kana)) return <Navigate to="/kana?lens=ecriture" replace />

  const strokes = strokesOf(kana.char)!
  const group = getGroup(kana.groupId)!
  const inLine = group.kanaIds.indexOf(kana.id)
  const siblings = kanaOfScript(kana.script).filter(isWritable)
  const index = siblings.findIndex((k) => k.id === kana.id)
  const prev = siblings[index - 1]
  const next = siblings[index + 1]

  // replace : le bouton retour d'Android ramène toujours à la grille.
  const goTo = (target: Kana | undefined) => {
    if (!target) return
    setRevealedChar(false)
    navigate(`/writing/${target.id}`, { replace: true })
  }

  const goBack = () => {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0
    if (idx > 0) navigate(-1)
    else navigate(`/kana?lens=ecriture&script=${kana.script}`, { replace: true })
  }

  const changeLevel = (l: WritingLevel) => {
    setRevealedChar(false)
    setLevel(l)
  }

  const showChar = level !== 3 || revealedChar

  return (
    <div className={`flex min-h-full flex-col ${reload ? 'relative flex-1' : ''}`}>
      {reload ? (
        <ReloadWritingHeader
          char={showChar ? kana.char : null}
          romaji={kana.romaji[0]!}
          line={groupGlyph(group)}
          position={`${inLine + 1} / ${group.kanaIds.length}`}
          strokeCount={strokes.length}
          level={level}
          onLevel={changeLevel}
          onBack={goBack}
          onPrev={prev ? () => goTo(prev) : undefined}
          onNext={next ? () => goTo(next) : undefined}
        />
      ) : (
        <>
      <header className="-mx-2 flex items-center justify-between gap-1">
        <div className="flex min-w-0 items-center gap-0.5">
          <IconButton icon="chevronLeft" label="Retour" onClick={goBack} />
          <h1 className="truncate font-serif text-[21px] leading-tight font-medium">
            {showChar && <span className="mr-2 font-jp">{kana.char}</span>}
            {kana.romaji[0]}
          </h1>
        </div>
        <div className="flex shrink-0 items-center">
          <IconButton icon="chevronLeft" label="Kana précédent" disabled={!prev} onClick={() => goTo(prev)} />
          <span className="text-[12.5px] font-semibold text-ink-muted tabular-nums">
            Ligne <span className="font-jp">{groupGlyph(group)}</span> · {inLine + 1} / {group.kanaIds.length}
          </span>
          <IconButton icon="chevronRight" label="Kana suivant" disabled={!next} onClick={() => goTo(next)} />
        </div>
      </header>

      <div className="mt-2">
        <SegmentedControl label="Niveau" options={LEVEL_OPTIONS} value={level} onChange={changeLevel} />
      </div>
        </>
      )}

      {level === 1 ? (
        <ObserveStep key={kana.id} strokes={strokes} onPractice={() => changeLevel(2)} />
      ) : (
        <PracticeStep
          key={`${kana.id}-${level}`}
          kana={kana}
          strokes={strokes}
          level={level}
          next={next}
          onDone={() => setRevealedChar(true)}
          onRetry={() => setRevealedChar(false)}
          onNextLevel={() => changeLevel(3)}
          onNextKana={() => goTo(next)}
        />
      )}
    </div>
  )
}

function ObserveStep({ strokes, onPractice }: { strokes: Point[][]; onPractice: () => void }) {
  // null : tous les traits à la suite ; sinon, un trait à la fois.
  const [step, setStep] = useState<number | null>(null)
  const [replay, setReplay] = useState(0)
  const count = strokes.length

  return (
    <>
      <div className={`mt-4 ${PAD_WIDTH}`}>
        <StrokeOrderAnimation key={`${step}-${replay}`} strokes={strokes} step={step ?? undefined} />
      </div>
      <p className="mt-2.5 text-center text-[12.5px] leading-4 font-semibold text-ink-muted" aria-live="polite">
        {step === null ? `Ordre des traits · ${count} trait${count > 1 ? 's' : ''}` : `Trait ${step + 1} sur ${count}`}
      </p>
      <div className="mt-1.5 flex justify-center gap-2">
        <button
          type="button"
          className={TOOL_BUTTON}
          disabled={step === 0}
          onClick={() => setStep(step === null ? count - 1 : step - 1)}
        >
          <Icon name="chevronLeft" className="size-5" />
          Trait préc.
        </button>
        <button type="button" className={TOOL_BUTTON} onClick={() => setReplay((n) => n + 1)}>
          <Icon name="replay" className="size-5" />
          Rejouer
        </button>
        <button
          type="button"
          className={TOOL_BUTTON}
          disabled={step === count - 1}
          onClick={() => setStep(step === null ? 0 : step + 1)}
        >
          <Icon name="chevronRight" className="size-5" />
          Trait suiv.
        </button>
      </div>
      <Dock>
        <Button onClick={onPractice}>Passer au calque</Button>
      </Dock>
    </>
  )
}

interface PracticeStepProps {
  kana: Kana
  strokes: Point[][]
  level: 2 | 3
  next: Kana | undefined
  onDone: () => void
  onRetry: () => void
  onNextLevel: () => void
  onNextKana: () => void
}

function PracticeStep({ kana, strokes, level, next, onDone, onRetry, onNextLevel, onNextKana }: PracticeStepProps) {
  const [result, setResult] = useState<WritingResult | null>(null)
  const [attempt, setAttempt] = useState(0)
  const success = result ? isWritingSuccess(level, result) : false

  const complete = (r: WritingResult) => {
    setResult(r)
    onDone()
    const ok = isWritingSuccess(level, r)
    if (ok) haptic('correct')
    recordWritingResult(activeProfileId(), {
      kanaId: kana.id,
      level,
      success: ok,
      mistakes: r.mistakes,
      hinted: r.hinted,
      revealed: r.revealed,
      at: Date.now(),
    }).catch((err: unknown) => console.error('Enregistrement impossible', err))
  }

  const retry = () => {
    setResult(null)
    setAttempt((n) => n + 1)
    onRetry()
  }

  return (
    <>
      <div className={`mt-4 ${PAD_WIDTH}`}>
        {level === 3 && result ? (
          <WritingComparison drawn={result.drawn} model={strokes} ok={success} />
        ) : (
          <WritingPad key={attempt} strokes={strokes} mode={level === 2 ? 'trace' : 'free'} onComplete={complete} />
        )}
      </div>

      {!result && (
        <p className="mt-3 text-center text-[13px] leading-[18px] text-ink-muted">
          {level === 2
            ? 'Suivez le modèle. Un trait juste se fixe ; après deux essais, l’indice montre le départ.'
            : 'Sans modèle. Vos traits restent tels que tracés.'}
        </p>
      )}

      {result && level === 3 && (
        <ul className="mt-3 border-t border-hairline">
          {strokes.map((_, i) => {
            const done = i < result.done
            return (
              <li key={i} className="flex min-h-12 items-center gap-3 border-b border-hairline py-1.5">
                <SignalBadge signal={done ? 'correct' : 'revealed'} size="sm" />
                <span>
                  <b className="block text-[14.5px] font-semibold">Trait {i + 1}</b>
                  <small className="block text-[13px] leading-[18px] text-ink-muted">
                    {done ? strokeNote(result.strokeMistakes[i] ?? 0) : 'Pas encore tracé'}
                  </small>
                </span>
              </li>
            )
          })}
        </ul>
      )}

      {result && (
        <Feedback
          className="mt-3"
          signal={success ? 'correct' : 'revealed'}
          title={resultTitle(level, result, success)}
        >
          {resultDetail(level, result, success)}
        </Feedback>
      )}

      {result && (
        <Dock>
          <div className="flex gap-3">
            <Button variant="line" icon="replay" iconPosition="start" onClick={retry} className="flex-1">
              Refaire
            </Button>
            {level === 2 ? (
              <Button onClick={onNextLevel} className="flex-1">
                De mémoire
              </Button>
            ) : (
              <Button onClick={onNextKana} disabled={!next} className="flex-1">
                {next && <span className="font-jp">{next.char}</span>}
                Suivant
              </Button>
            )}
          </div>
        </Dock>
      )}
    </>
  )
}

function resultTitle(level: 2 | 3, result: WritingResult, success: boolean): string {
  if (level === 2) return result.mistakes === 0 ? 'Calque réussi, sans erreur' : 'Calque réussi'
  if (success) return 'De mémoire : réussi'
  return result.revealed ? 'Modèle affiché' : 'Réussi avec un indice'
}

function resultDetail(level: 2 | 3, result: WritingResult, success: boolean): string {
  if (level === 2) {
    return result.mistakes === 0
      ? 'La case a son carré vide dans la grille. Essayez maintenant de mémoire.'
      : `${result.mistakes} trait${result.mistakes > 1 ? 's' : ''} à reprendre en route. Essayez maintenant de mémoire.`
  }
  if (success) return 'La case est pleine dans la grille.'
  return result.revealed ? 'Comparez, puis refaites-le de mémoire.' : 'Refaites-le sans indice pour remplir la case.'
}

function Dock({ children }: { children: ReactNode }) {
  const reload = useUiStyle() === 'reload'
  return (
    <div
      className={`sticky z-10 -mx-4 mt-auto px-4 pt-3 ${
        reload ? 'bottom-0 pb-[max(16px,env(safe-area-inset-bottom))] rl-guide-fade' : '-bottom-4 bg-paper pb-5'
      }`}
    >
      {children}
    </div>
  )
}

interface ReloadWritingHeaderProps {
  /** null au niveau 3 tant que le tracé n'est pas terminé (le kana reste caché). */
  char: string | null
  romaji: string
  line: string
  position: string
  strokeCount: number
  level: WritingLevel
  onLevel: (l: WritingLevel) => void
  onBack: () => void
  onPrev?: () => void
  onNext?: () => void
}

/** En-tête de l'exercice, style Reload : bandeau blanc (kana, lecture, ligne), nombre de traits,
 *  étapes en flèches (Observer, Calque, De mémoire ; les étapes passées portent une coche). */
function ReloadWritingHeader({ char, romaji, line, position, strokeCount, level, onLevel, onBack, onPrev, onNext }: ReloadWritingHeaderProps) {
  return (
    <>
      <span aria-hidden="true" className="absolute -inset-x-4 -top-4 bottom-0 -z-10 bg-[linear-gradient(165deg,#1d49d8_0%,#1430ae_38%,#0c1c78_70%,#070f45_100%)]" />
      <span aria-hidden="true" className="absolute top-[250px] -left-24 -z-10 h-[300px] w-[620px] -rotate-[14deg] bg-[#1838d8]" />
      <div className="relative flex items-start justify-between">
        <button
          type="button"
          onClick={onBack}
          aria-label="Retour"
          data-tap-sound="tapBack"
          className="grid size-11 place-items-center bg-[#05081f] text-white shadow-[inset_0_0_0_2px_#ffffff] [clip-path:polygon(12%_0,100%_0,88%_100%,0_100%)]"
        >
          <Icon name="chevronLeft" className="size-5" />
        </button>
        <div className="flex flex-col items-end">
          <span className="rl-cond text-[12px] font-extrabold tracking-[0.06em] text-[#8fb4ff]">TRAITS</span>
          <span className="rl-display text-[44px] leading-[0.85] text-white [text-shadow:3px_3px_0_#1838d8]">{strokeCount}</span>
        </div>
      </div>
      <div className="relative -mx-4 -mt-3 flex h-[66px] w-[290px] items-center gap-2.5 bg-white pl-4 text-[#05081f] [clip-path:polygon(0_0,100%_0,88%_100%,0_100%)]">
        <h1 className="flex items-center gap-2.5">
          {char ? <span className="font-jp text-[44px] leading-none">{char}</span> : <span className="rl-display text-[40px]">?</span>}
          <span className="flex flex-col leading-[1.05]">
            <span className="rl-cond text-[26px] font-extrabold">{romaji}</span>
            <span className="rl-cond text-[13px] font-bold">
              Ligne <span className="font-jp not-italic">{line}</span> · {position}
            </span>
          </span>
        </h1>
      </div>
      <div className="relative mt-3 flex items-center gap-0.5">
        {LEVEL_OPTIONS.map((o, i) => {
          const on = o.value === level
          const done = o.value < level
          return (
            <button
              key={o.value}
              type="button"
              aria-pressed={on}
              onClick={() => onLevel(o.value)}
              data-tap-sound="tabSwitch"
              className={`rl-display flex h-[38px] flex-1 items-center justify-center gap-1 text-[12.5px] uppercase ${
                on ? 'bg-white text-[#05081f]' : done ? 'bg-[#5ce1ff] text-[#05081f]' : 'bg-white/12 text-[#8fb4ff]'
              }`}
              style={{ clipPath: i === 0 ? 'polygon(0 0,88% 0,100% 50%,88% 100%,0 100%)' : 'polygon(0 0,88% 0,100% 50%,88% 100%,0 100%,11% 50%)' }}
            >
              {done && '✓ '}
              {o.value} {['Observer', 'Calque', 'Mémoire'][i]}
            </button>
          )
        })}
      </div>
      <div className="relative mt-1 flex justify-between">
        <button type="button" onClick={onPrev} disabled={!onPrev} className="rl-cond min-h-11 px-1 text-[15px] font-bold text-white disabled:opacity-30" data-tap-sound="prev">
          ‹ Kana précédent
        </button>
        <button type="button" onClick={onNext} disabled={!onNext} className="rl-cond min-h-11 px-1 text-[15px] font-bold text-white disabled:opacity-30" data-tap-sound="next">
          Kana suivant ›
        </button>
      </div>
    </>
  )
}
