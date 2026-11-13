import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import { Icon } from '@/components/Icon'
import { SegmentedControl } from '@/components/SegmentedControl'
import { BOOK_AUTHOR, BOOK_ORIGINAL_TITLE, BOOK_SENTENCES, BOOK_TITLE, bookSource } from '@/data/book'
import {
  CHRONO_DURATIONS,
  chronoResult,
  createChrono,
  randomStart,
  remainingSeconds,
  sentenceWords,
  skipWord,
  startChrono,
  submitWord,
  type ChronoResult,
  type ChronoScript,
  type ChronoState,
} from '@/features/chrono/chrono'
import { toRomaji } from '@/features/quiz/reading'
import { bestScoreKey, useChronoSettingsStore } from '@/stores/chronoSettingsStore'
import { useProfileStore } from '@/stores/profileStore'

const SCRIPT_OPTIONS: { value: ChronoScript; label: string }[] = [
  { value: 'hiragana', label: 'Hiragana' },
  { value: 'katakana', label: 'Katakana' },
]

const DURATION_OPTIONS = CHRONO_DURATIONS.map((d) => ({ value: d, label: `${d / 60} min` }))

const TOTAL = BOOK_SENTENCES.length

type Phase = { type: 'setup' } | { type: 'running' } | { type: 'done'; result: ChronoResult; record: boolean }

export function ChronoPage() {
  const settings = useChronoSettingsStore()
  const profileId = useProfileStore((s) => s.profileId)
  const [phase, setPhase] = useState<Phase>({ type: 'setup' })
  const [chrono, setChrono] = useState<ChronoState>(() => createChrono(randomStart(BOOK_SENTENCES)))
  const bestKey = bestScoreKey(profileId, settings.script, settings.duration)
  const best = settings.best[bestKey]

  const start = () => {
    setChrono(createChrono(randomStart(BOOK_SENTENCES)))
    setPhase({ type: 'running' })
  }

  const finish = useCallback(
    (state: ChronoState) => {
      const result = chronoResult(state, settings.duration)
      const record = result.correctKana > 0 && settings.recordScore(bestKey, result.kanaPerMinute)
      setPhase({ type: 'done', result, record })
    },
    [settings, bestKey],
  )

  if (phase.type === 'running') {
    return (
      <ChronoRunner
        state={chrono}
        onChange={setChrono}
        script={settings.script}
        duration={settings.duration}
        onFinish={finish}
        onQuit={() => setPhase({ type: 'setup' })}
      />
    )
  }
  if (phase.type === 'done') {
    return (
      <ChronoSummary
        state={chrono}
        script={settings.script}
        result={phase.result}
        record={phase.record}
        onRestart={start}
        onSettings={() => setPhase({ type: 'setup' })}
      />
    )
  }

  return (
    <div className="flex min-h-full flex-col">
      <header className="mb-4 flex items-center gap-2">
        <Link
          to="/learn"
          aria-label="Retour"
          className="-ml-2 flex size-11 items-center justify-center text-ink-muted"
        >
          <Icon name="chevronLeft" />
        </Link>
        <h1 className="text-xl font-bold tracking-tight">Lecture chronométrée</h1>
      </header>

      <p className="mb-4 text-sm text-ink-muted">
        Le livre défile à partir d’un paragraphe tiré au sort. Tapez chaque mot en romaji puis espace : juste, on passe
        au suivant ; faux, on le retape. Le chrono part à la première touche.
      </p>

      <Card>
        <div className="space-y-4">
          <Field label="Durée">
            <SegmentedControl
              label="Durée"
              options={DURATION_OPTIONS}
              value={settings.duration}
              onChange={settings.setDuration}
            />
          </Field>
          <Field label="Écriture">
            <SegmentedControl
              label="Écriture"
              options={SCRIPT_OPTIONS}
              value={settings.script}
              onChange={settings.setScript}
            />
            <p className="mt-1.5 text-xs text-ink-muted">
              {settings.script === 'hiragana'
                ? 'Kanji réécrits en hiragana, noms et mots étrangers en katakana comme dans le livre.'
                : 'Tout le texte en katakana.'}
            </p>
          </Field>
          <p className="text-sm text-ink-muted">
            Record :{' '}
            <strong className="tabular-nums">{best !== undefined ? `${best} kana/min` : 'aucun pour l’instant'}</strong>
          </p>
        </div>
      </Card>

      <Card>
        <p className="text-sm text-ink-muted">
          Texte : <span className="font-jp">{BOOK_ORIGINAL_TITLE}</span> (<em>{BOOK_TITLE}</em>) de {BOOK_AUTHOR},{' '}
          {BOOK_SENTENCES.length} phrases ; leur traduction est donnée dans le récapitulatif.
        </p>
      </Card>

      <div className="sticky bottom-0 z-10 mt-auto pt-3">
        <button
          type="button"
          onClick={start}
          className="min-h-12 w-full rounded-md bg-accent font-semibold text-on-accent transition-transform active:scale-[0.98]"
        >
          Commencer
        </button>
      </div>
    </div>
  )
}

interface ChronoRunnerProps {
  state: ChronoState
  onChange: (state: ChronoState) => void
  script: ChronoScript
  duration: number
  onFinish: (state: ChronoState) => void
  onQuit: () => void
}

function ChronoRunner({ state, onChange, script, duration, onFinish, onQuit }: ChronoRunnerProps) {
  const [value, setValue] = useState('')
  const [now, setNow] = useState(() => Date.now())
  const [skipped, setSkipped] = useState<{ word: string; romaji: string } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const currentRef = useRef<HTMLSpanElement>(null)
  const words = useWords(script)
  const remaining = remainingSeconds(state, duration, now)

  // Tic du chrono ; à zéro, la partie s'arrête sur l'état courant.
  useEffect(() => {
    if (state.startedAt === null) return
    const timer = setInterval(() => setNow(Date.now()), 200)
    return () => clearInterval(timer)
  }, [state.startedAt])
  useEffect(() => {
    if (state.startedAt !== null && remaining <= 0) onFinish(state)
  }, [remaining, state, onFinish])

  useEffect(() => {
    currentRef.current?.scrollIntoView({ block: 'nearest' })
  }, [state.sentence, state.word])

  const submit = (input: string) => {
    onChange(submitWord(startChrono(state, Date.now()), input, words, TOTAL))
    setValue('')
    setSkipped(null)
  }

  const handleChange = (input: string) => {
    // Espace (y compris l'espace japonais) = valider le mot.
    if (/[\s　]$/.test(input)) return submit(input)
    if (state.startedAt === null && input !== '') onChange(startChrono(state, Date.now()))
    setValue(input)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return
    e.preventDefault()
    submit(value)
  }

  const skip = () => {
    const word = words(state.sentence)[state.word]!
    setSkipped({ word, romaji: toRomaji(`${word} `).trim() })
    onChange(skipWord(startChrono(state, Date.now()), words, TOTAL))
    setValue('')
    inputRef.current?.focus()
  }

  const showWrong = state.wrong && value === ''
  const minutes = Math.floor(Math.ceil(remaining) / 60)
  const seconds = Math.ceil(remaining) % 60

  return (
    <div className="flex min-h-full flex-col">
      <header className="flex items-center gap-3">
        <button
          type="button"
          onClick={onQuit}
          aria-label="Quitter la lecture"
          className="-ml-2 flex size-11 items-center justify-center text-ink-muted"
        >
          <Icon name="close" />
        </button>
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-hairline">
          <div className="h-full rounded-full bg-ink" style={{ width: `${(remaining / duration) * 100}%` }} />
        </div>
        <span className="flex items-center gap-1 text-sm font-semibold tabular-nums text-ink-muted">
          <Icon name="timer" className="size-4" />
          {minutes}:{String(seconds).padStart(2, '0')}
        </span>
      </header>

      <p className="mt-2 text-center text-xs text-ink-muted">
        <span className="tabular-nums">{state.correctWords}</span> mots ·{' '}
        <span className="tabular-nums">{state.correctKana}</span> kana ·{' '}
        <span className="tabular-nums">{state.errors}</span> erreurs
        {state.startedAt === null && ' · le chrono part à la première touche'}
      </p>

      <div className="my-4 max-h-[45dvh] flex-1 overflow-y-auto rounded-md border border-hairline p-4 short:max-h-[30dvh]">
        <p className="font-jp text-lg leading-loose lg:text-xl">
          {[0, 1, 2].map((offset) => {
            const index = (state.sentence + offset) % TOTAL
            return (
              <span key={index}>
                {words(index).map((word, i) => {
                  const current = offset === 0 && i === state.word
                  const done = offset === 0 && i < state.word
                  return (
                    <span key={i}>
                      <span
                        ref={current ? currentRef : undefined}
                        className={
                          current
                            ? `rounded-md px-1 text-2xl font-semibold lg:text-3xl ${
                                showWrong
                                  ? 'bg-error text-on-signal'
                                  : 'bg-accent-tint text-accent'
                              }`
                            : done
                              ? 'text-correct-ink'
                              : offset > 0
                                ? 'text-ink-muted'
                                : ''
                        }
                      >
                        {word}
                      </span>{' '}
                    </span>
                  )
                })}
                {BOOK_SENTENCES[(index + 1) % TOTAL]!.newParagraph ? <br /> : ' '}
              </span>
            )
          })}
        </p>
      </div>

      <div className="sticky bottom-0 z-10 -mx-4 mt-auto bg-paper px-4 pt-2 pb-1">
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
          autoCapitalize="none"
          autoCorrect="off"
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="next"
          placeholder="romaji puis espace"
          aria-label="Mot en cours, en romaji"
          className={`min-h-14 w-full rounded-md border-2 px-4 text-center text-2xl outline-none placeholder:text-base placeholder:text-ink-muted focus:ring-2 focus:ring-accent/40 ${
            showWrong
              ? 'border-error bg-error text-on-signal'
              : 'border-control bg-paper-raised'
          }`}
        />
        <div className="mt-1 flex min-h-11 items-center justify-between gap-2 text-sm">
          <span className="min-w-0 truncate">
            {showWrong && <span className="text-error-ink">Pas tout à fait, retapez le mot.</span>}
            {!showWrong && skipped && (
              <span className="text-ink-muted">
                <span className="font-jp">{skipped.word}</span> se lit{' '}
                <strong className="text-correct-ink">{skipped.romaji}</strong>
              </span>
            )}
          </span>
          <button
            type="button"
            onClick={skip}
            className="flex min-h-11 shrink-0 items-center px-2 font-medium text-ink-muted"
          >
            Passer le mot
          </button>
        </div>
      </div>
    </div>
  )
}

interface ChronoSummaryProps {
  state: ChronoState
  script: ChronoScript
  result: ChronoResult
  record: boolean
  onRestart: () => void
  onSettings: () => void
}

function ChronoSummary({ state, script, result, record, onRestart, onSettings }: ChronoSummaryProps) {
  const navigate = useNavigate()
  const words = useWords(script)
  // Phrases lues : jusqu'à la phrase en cours, comprise si elle est entamée.
  const read = state.word > 0 ? state.visited : state.visited.slice(0, -1)

  return (
    <div className="flex min-h-full flex-col">
      <header className="mb-4 flex items-center gap-2">
        <button
          type="button"
          onClick={() => navigate('/learn')}
          aria-label="Retour"
          className="-ml-2 flex size-11 items-center justify-center text-ink-muted"
        >
          <Icon name="chevronLeft" />
        </button>
        <h1 className="text-xl font-bold tracking-tight">Résultat</h1>
      </header>

      <Card>
        <div className="text-center">
          <p className="text-5xl font-bold tabular-nums">{result.kanaPerMinute}</p>
          <p className="text-sm text-ink-muted">kana par minute</p>
          {record && <p className="mt-2 text-sm font-semibold text-gold">Nouveau record !</p>}
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-2 text-center">
          <Stat label="Mots justes" value={result.correctWords} />
          <Stat label="Précision" value={`${result.accuracy} %`} />
          <Stat label="Erreurs" value={result.errors} />
          <Stat label="Mots passés" value={result.skipped} />
        </dl>
      </Card>

      {read.length > 0 && (
        <Card>
          <h2 className="mb-3 text-sm font-semibold text-ink-muted">Texte lu</h2>
          <ul className="space-y-3">
            {read.map((index, i) => {
              const sentence = BOOK_SENTENCES[index]!
              return (
                <li key={i}>
                  <p className="font-jp">{words(index).join(' ')}</p>
                  <p className="font-jp text-sm text-ink-muted">{sentence.original}</p>
                  <p className="text-sm">{sentence.meaning}</p>
                </li>
              )
            })}
          </ul>
          <p className="mt-3 text-xs text-ink-muted">
            {bookSource(BOOK_SENTENCES[read[0]!]!.chapter)}
          </p>
        </Card>
      )}

      <div className="sticky bottom-0 z-10 mt-auto grid grid-cols-2 gap-2 pt-3">
        <button
          type="button"
          onClick={onSettings}
          className="min-h-12 rounded-md border-2 border-control bg-paper-raised font-semibold active:scale-[0.98]"
        >
          Réglages
        </button>
        <button
          type="button"
          onClick={onRestart}
          className="min-h-12 rounded-md bg-accent font-semibold text-on-accent active:scale-[0.98]"
        >
          Recommencer
        </button>
      </div>
    </div>
  )
}

/** Mots de chaque phrase dans l'écriture choisie, calculés à la demande. */
function useWords(script: ChronoScript): (sentence: number) => string[] {
  return useMemo(() => {
    const cache = new Map<number, string[]>()
    return (index: number) => {
      let words = cache.get(index)
      if (!words) {
        words = sentenceWords(BOOK_SENTENCES[index]!, script)
        cache.set(index, words)
      }
      return words
    }
  }, [script])
}

function Card({ children }: { children: ReactNode }) {
  return <section className="mb-4 rounded-md border border-hairline p-4">{children}</section>
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      {children}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-lg bg-paper-raised px-2 py-2">
      <dt className="text-xs text-ink-muted">{label}</dt>
      <dd className="text-lg font-semibold tabular-nums">{value}</dd>
    </div>
  )
}
