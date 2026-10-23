import { useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router'
import { Icon } from '@/components/Icon'
import { KanaNavButton } from '@/components/KanaNavButton'
import { SegmentedControl } from '@/components/SegmentedControl'
import { StrokeOrderAnimation } from '@/components/StrokeOrderAnimation'
import { WritingComparison } from '@/components/WritingComparison'
import { WritingPad, type WritingResult } from '@/components/WritingPad'
import { getKana, kanaOfScript, type Kana } from '@/data/kana'
import { isWritable, strokesOf } from '@/data/strokes'
import type { Point } from '@/features/writing/geometry'
import { useWritingSettingsStore, type WritingLevel } from '@/stores/writingSettingsStore'

const LEVEL_OPTIONS: { value: WritingLevel; label: string }[] = [
  { value: 1, label: '1 · Ordre' },
  { value: 2, label: '2 · Calque' },
  { value: 3, label: '3 · Libre' },
]

const PRIMARY_BUTTON =
  'flex min-h-12 items-center justify-center gap-2 rounded-xl bg-accent-500 px-4 font-semibold text-white shadow-sm active:scale-95'
const SECONDARY_BUTTON =
  'flex min-h-12 items-center justify-center gap-2 rounded-xl bg-white px-4 font-medium shadow-sm active:scale-95 dark:bg-slate-900'

export function WritingExercisePage() {
  const { kanaId = '' } = useParams()
  const navigate = useNavigate()
  const level = useWritingSettingsStore((s) => s.level)
  const setLevel = useWritingSettingsStore((s) => s.setLevel)
  const kana = getKana(kanaId)

  if (!kana || !isWritable(kana)) return <Navigate to="/writing" replace />

  const strokes = strokesOf(kana.char)!
  const siblings = kanaOfScript(kana.script).filter(isWritable)
  const index = siblings.findIndex((k) => k.id === kana.id)
  const prev = siblings[index - 1]
  const next = siblings[index + 1]

  // replace : le bouton retour d'Android ramène toujours à la liste.
  const goTo = (target: Kana | undefined) => {
    if (target) navigate(`/writing/${target.id}`, { replace: true })
  }

  const goBack = () => {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0
    if (idx > 0) navigate(-1)
    else navigate(`/writing?script=${kana.script}`, { replace: true })
  }

  return (
    <div className="flex min-h-full flex-col">
      <header className="flex items-center justify-between">
        <button
          type="button"
          onClick={goBack}
          className="-ml-2 flex min-h-11 items-center gap-1 px-2 text-sm font-medium text-slate-600 dark:text-slate-300"
        >
          <Icon name="chevronLeft" className="size-5" />
          Écriture
        </button>
        <span className="text-xs text-slate-400 dark:text-slate-500">
          {index + 1} / {siblings.length}
        </span>
      </header>

      <div className="mt-2 flex items-center gap-3">
        {level === 3 ? (
          <span className="text-3xl font-semibold tracking-wide">{kana.romaji[0]}</span>
        ) : (
          <>
            <span className="font-jp text-5xl leading-none">{kana.char}</span>
            <span className="text-2xl font-semibold tracking-wide">{kana.romaji[0]}</span>
          </>
        )}
        <span className="text-sm text-slate-500 dark:text-slate-400">
          {strokes.length} trait{strokes.length > 1 ? 's' : ''}
        </span>
      </div>
      {level === 3 && (
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Écrivez ce kana de mémoire.</p>
      )}

      <div className="mt-4">
        <SegmentedControl label="Niveau" options={LEVEL_OPTIONS} value={level} onChange={setLevel} />
      </div>

      <div className="mt-4 flex-1">
        {level === 1 ? (
          <AnimationStep key={kana.id} strokes={strokes} onPractice={() => setLevel(2)} />
        ) : (
          <PracticeStep
            key={`${kana.id}-${level}`}
            strokes={strokes}
            level={level}
            onNextLevel={() => setLevel(3)}
            onNextKana={next ? () => goTo(next) : undefined}
          />
        )}
      </div>

      <nav className="mt-6 grid grid-cols-2 gap-3" aria-label="Kana précédent et suivant">
        <KanaNavButton target={prev} direction="prev" onClick={() => goTo(prev)} />
        <KanaNavButton target={next} direction="next" onClick={() => goTo(next)} />
      </nav>
    </div>
  )
}

interface AnimationStepProps {
  strokes: Point[][]
  onPractice: () => void
}

function AnimationStep({ strokes, onPractice }: AnimationStepProps) {
  const [replay, setReplay] = useState(0)
  return (
    <>
      <StrokeOrderAnimation key={replay} strokes={strokes} />
      <div className="mt-4 grid grid-cols-2 gap-3">
        <button type="button" onClick={() => setReplay((n) => n + 1)} className={SECONDARY_BUTTON}>
          <Icon name="replay" className="size-5" />
          Rejouer
        </button>
        <button type="button" onClick={onPractice} className={PRIMARY_BUTTON}>
          S'entraîner
          <Icon name="chevronRight" className="size-5" />
        </button>
      </div>
    </>
  )
}

interface PracticeStepProps {
  strokes: Point[][]
  level: 2 | 3
  onNextLevel: () => void
  onNextKana: (() => void) | undefined
}

function PracticeStep({ strokes, level, onNextLevel, onNextKana }: PracticeStepProps) {
  const [result, setResult] = useState<WritingResult | null>(null)
  const [attempt, setAttempt] = useState(0)

  return (
    <>
      {/* Écriture libre : à la fin, le tracé et le modèle remplacent la zone de dessin, côte à côte. */}
      {level === 3 && result ? (
        <div style={{ animation: 'fade-in 0.2s' }}>
          <WritingComparison drawn={result.drawn} model={strokes} />
        </div>
      ) : (
        <WritingPad key={attempt} strokes={strokes} mode={level === 2 ? 'trace' : 'free'} onComplete={setResult} />
      )}
      {result && (
        <section className="mt-4 rounded-2xl bg-white p-4 shadow-sm dark:bg-slate-900" style={{ animation: 'fade-in 0.2s' }}>
          <p className="font-semibold">{resultText(result, strokes.length)}</p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                setResult(null)
                setAttempt((n) => n + 1)
              }}
              className={SECONDARY_BUTTON}
            >
              <Icon name="replay" className="size-5" />
              Encore
            </button>
            {level === 2 ? (
              <button type="button" onClick={onNextLevel} className={PRIMARY_BUTTON}>
                De mémoire
                <Icon name="chevronRight" className="size-5" />
              </button>
            ) : (
              <button type="button" onClick={onNextKana} disabled={!onNextKana} className={`${PRIMARY_BUTTON} disabled:opacity-40`}>
                Kana suivant
                <Icon name="chevronRight" className="size-5" />
              </button>
            )}
          </div>
        </section>
      )}
    </>
  )
}

function resultText({ mistakes, drawn, revealed }: WritingResult, strokeCount: number): string {
  if (revealed) {
    const done = Math.min(drawn.length, strokeCount)
    return `Modèle affiché : comparez avec votre tracé (${done} trait${done > 1 ? 's' : ''} sur ${strokeCount}).`
  }
  return mistakes === 0 ? 'Parfait, sans erreur !' : `Terminé avec ${mistakes} erreur${mistakes > 1 ? 's' : ''}.`
}
