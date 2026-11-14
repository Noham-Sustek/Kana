import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { AppKeyboard } from '@/components/AppKeyboard'
import { Button } from '@/components/Button'
import { Icon } from '@/components/Icon'
import { IconButton } from '@/components/IconButton'
import { SegmentedControl } from '@/components/SegmentedControl'
import { TextField } from '@/components/TextField'
import { BOOK_AUTHOR, BOOK_ORIGINAL_TITLE, BOOK_SENTENCES, bookSource } from '@/data/book'
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
import { useAppKeyboard } from '@/lib/useAppKeyboard'
import { bestScoreKey, useChronoSettingsStore } from '@/stores/chronoSettingsStore'
import { useProfileStore } from '@/stores/profileStore'

const SCRIPT_OPTIONS: { value: ChronoScript; label: string }[] = [
  { value: 'hiragana', label: 'Hiragana' },
  { value: 'katakana', label: 'Tout en katakana' },
]

const DURATION_OPTIONS = CHRONO_DURATIONS.map((d) => ({ value: d, label: `${d / 60} min` }))

const TOTAL = BOOK_SENTENCES.length

type Phase =
  | { type: 'setup' }
  | { type: 'running' }
  | { type: 'done'; result: ChronoResult; record: boolean; previousBest: number | undefined }

export function ChronoPage() {
  const navigate = useNavigate()
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
      const previousBest = settings.best[bestKey]
      const record = result.correctKana > 0 && settings.recordScore(bestKey, result.kanaPerMinute)
      setPhase({ type: 'done', result, record, previousBest })
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
        duration={settings.duration}
        result={phase.result}
        record={phase.record}
        previousBest={phase.previousBest}
        onRestart={start}
      />
    )
  }

  return (
    <div className="flex min-h-full flex-col">
      <header className="-ml-2 flex items-center gap-0.5">
        <IconButton icon="chevronLeft" label="Retour" onClick={() => navigate('/learn')} />
        <h1 className="font-serif text-[21px] leading-tight font-medium">Lecture chronométrée</h1>
      </header>

      <div className="mt-3 flex flex-col gap-4">
        <section className="rounded-md border border-hairline bg-paper-raised p-3.5">
          <Overline>Votre record · {settings.duration / 60} min</Overline>
          {best !== undefined ? (
            <p className="mt-1 font-serif text-[40px] leading-[0.95] font-medium tabular-nums">
              {best}
              <small className="ml-1.5 text-[17px] text-ink-muted">kana par minute</small>
            </p>
          ) : (
            <p className="mt-1 text-[14.5px] leading-5 text-ink-muted">Pas encore de record pour cette durée.</p>
          )}
        </section>

        <Field label="Durée">
          <SegmentedControl label="Durée" options={DURATION_OPTIONS} value={settings.duration} onChange={settings.setDuration} />
        </Field>
        <Field label="Écriture">
          <SegmentedControl label="Écriture" options={SCRIPT_OPTIONS} value={settings.script} onChange={settings.setScript} />
        </Field>

        <ol className="border-t border-hairline">
          <Step n={1} title="Le roman défile mot par mot">
            <span className="font-jp">{BOOK_ORIGINAL_TITLE}</span>, {BOOK_AUTHOR}, écrit en kana
          </Step>
          <Step n={2} title="Tapez le mot, puis espace">
            Une erreur ? Retapez-le, ou passez-le.
          </Step>
          <Step n={3} title="Le chrono part à la première touche">
            Seuls les mots justes comptent. La traduction vous attend à la fin.
          </Step>
        </ol>
      </div>

      <div className="sticky bottom-0 z-10 -mx-4 mt-auto bg-paper px-4 pt-3 pb-1">
        <Button onClick={start}>Commencer</Button>
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
  // Clavier romaji intégré (écran tactile, réglage « Intégré ») : le texte ne bouge plus.
  const keyboard = useAppKeyboard()

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
  const elapsedMin = state.startedAt === null ? 0 : (now - state.startedAt) / 60_000
  // Allure en cours, affichée après quelques secondes pour ne pas s'affoler au départ.
  const pace = elapsedMin > 0.05 ? Math.round(state.correctKana / elapsedMin) : null

  return (
    <div className="flex min-h-full flex-col" data-app-keyboard={keyboard ? '' : undefined}>
      <header className="-ml-2 flex items-center gap-3">
        <IconButton icon="close" label="Quitter la lecture" onClick={onQuit} />
        <div className="h-1.5 flex-1 overflow-hidden rounded-[1px] bg-hairline" aria-hidden="true">
          <div className="h-full bg-ink" style={{ width: `${(remaining / duration) * 100}%` }} />
        </div>
        <span className="font-serif text-[22px] leading-none font-medium tabular-nums" aria-label="Temps restant">
          {minutes}:{String(seconds).padStart(2, '0')}
        </span>
      </header>

      <p className="mt-2 flex justify-between gap-3 text-[13px] leading-[18px] text-ink-muted tabular-nums">
        <span>
          {state.correctWords} mot{state.correctWords > 1 ? 's' : ''} lu{state.correctWords > 1 ? 's' : ''}
        </span>
        <span>
          {state.startedAt === null ? 'Le chrono part à la première touche' : pace === null ? '' : `${pace} kana/min`}
        </span>
      </p>

      <div className="my-3 max-h-[45dvh] flex-1 overflow-y-auto short:max-h-[30dvh]">
        <p className="font-jp text-[21px] leading-[2] font-semibold">
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
                        aria-current={current ? 'true' : undefined}
                        className={
                          current
                            ? `mx-0.5 inline-block rounded-sm border-2 px-2 align-middle text-[34px] leading-[1.3] ${
                                showWrong ? 'animate-shake border-error bg-error-tint' : 'border-ink bg-paper-raised'
                              }`
                            : done
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
        <TextField
          ref={inputRef}
          id="chrono-answer"
          inputMode={keyboard ? 'none' : undefined}
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
          enterKeyHint="next"
          placeholder="romaji puis espace"
          aria-label="Mot en cours, en romaji"
          state={showWrong ? 'wrong' : 'idle'}
        />
        <div className="mt-1 flex min-h-11 items-center justify-between gap-2 text-[13.5px]">
          <span className="min-w-0 truncate" aria-live="polite">
            {showWrong && <span className="text-error-ink">Pas tout à fait, retapez le mot.</span>}
            {!showWrong && skipped && (
              <span className="text-ink-muted">
                <span className="font-jp">{skipped.word}</span> se lit{' '}
                <strong className="font-semibold text-ink">{skipped.romaji}</strong>
              </span>
            )}
          </span>
          <Button variant="quiet" size="sm" fullWidth={false} icon="skip" iconPosition="start" onClick={skip}>
            Passer le mot
          </Button>
        </div>
        {keyboard && <AppKeyboard targetId="chrono-answer" layout={keyboard} enterLabel="OK" />}
      </div>
    </div>
  )
}

interface ChronoSummaryProps {
  state: ChronoState
  script: ChronoScript
  duration: number
  result: ChronoResult
  record: boolean
  previousBest: number | undefined
  onRestart: () => void
}

function ChronoSummary({ state, script, duration, result, record, previousBest, onRestart }: ChronoSummaryProps) {
  const navigate = useNavigate()
  const words = useWords(script)
  const profileId = useProfileStore((s) => s.profileId)
  const best = useChronoSettingsStore((s) => s.best)
  const [allRead, setAllRead] = useState(false)
  // Phrases lues : jusqu'à la phrase en cours, comprise si elle est entamée.
  const read = state.word > 0 ? state.visited : state.visited.slice(0, -1)
  const shown = allRead ? read : read.slice(0, 1)

  return (
    <div className="flex min-h-full flex-col">
      <header className="-mr-2 flex items-center justify-between">
        <h1 className="text-[11px] leading-[14px] font-bold tracking-[0.12em] text-ink-muted uppercase">
          Lecture · {duration / 60} min · {script === 'hiragana' ? 'hiragana' : 'katakana'}
        </h1>
        <IconButton icon="close" label="Fermer" onClick={() => navigate('/learn')} />
      </header>

      <section className="mt-1">
        {record && (
          <p className="mb-2 flex animate-unlock items-center gap-1.5 text-[13.5px] font-semibold text-gold">
            <Icon name="star" className="size-4" />
            Nouveau record{previousBest !== undefined ? ` · ${previousBest} auparavant` : ''}
          </p>
        )}
        <p className="font-serif text-[64px] leading-[0.9] font-medium tracking-[-0.02em] tabular-nums">
          {result.kanaPerMinute}
          <small className="ml-1.5 text-[17px] tracking-normal text-ink-muted">kana par minute</small>
        </p>
        <dl className="mt-4 grid grid-cols-3 gap-3">
          <Stat label="Mots justes" value={result.correctWords} />
          <Stat label="Mots passés" value={result.skipped} />
          <Stat label="Du premier coup" value={`${result.accuracy} %`} />
        </dl>
      </section>

      <Section title="Vos records">
        <ul className="border-t border-hairline">
          {CHRONO_DURATIONS.map((d) => {
            const score = best[bestScoreKey(profileId, script, d)]
            return (
              <li key={d} className="flex min-h-12 items-center justify-between border-b border-hairline py-2">
                <b className="font-semibold">{d / 60} min</b>
                <span className="text-ink-muted tabular-nums">
                  {score === undefined ? 'pas encore' : `${score} kana/min${record && d === duration ? ' · à l’instant' : ''}`}
                </span>
              </li>
            )
          })}
        </ul>
      </Section>

      {read.length > 0 && (
        <Section title="Ce que vous avez lu" aside={bookSource(BOOK_SENTENCES[read[0]!]!.chapter)}>
          <ul className="flex flex-col gap-4">
            {shown.map((index, i) => {
              const sentence = BOOK_SENTENCES[index]!
              return (
                <li key={i}>
                  <p className="font-jp text-[17px] leading-relaxed">{words(index).join(' ')}</p>
                  <p className="mt-1 font-jp text-[15px] text-ink-muted">{sentence.original}</p>
                  <p className="mt-1 text-[13.5px] leading-[19px] text-ink-muted">« {sentence.meaning} »</p>
                </li>
              )
            })}
          </ul>
          {read.length > 1 && (
            <Button variant="text" size="sm" fullWidth={false} className="mt-2 -ml-3" onClick={() => setAllRead(!allRead)}>
              {allRead ? 'N’afficher que la première' : `Afficher les ${read.length} phrases lues`}
            </Button>
          )}
        </Section>
      )}

      <div className="sticky bottom-0 z-10 -mx-4 mt-auto flex gap-3 bg-paper px-4 pt-3 pb-1">
        <Button variant="line" icon="replay" iconPosition="start" className="flex-1" onClick={onRestart}>
          Rejouer
        </Button>
        <Button className="flex-1" onClick={() => navigate('/learn')}>
          Terminer
        </Button>
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

function Overline({ children }: { children: ReactNode }) {
  return <h2 className="text-[11px] leading-[14px] font-bold tracking-[0.12em] text-ink-muted uppercase">{children}</h2>
}

function Section({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="mt-5 border-t border-hairline pt-5">
      <div className="mb-2.5">
        <Overline>{title}</Overline>
        {aside && <p className="mt-1 text-[12.5px] leading-4 text-ink-muted">{aside}</p>}
      </div>
      {children}
    </section>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <span className="mb-1.5 block text-[13px] leading-[18px] font-semibold text-ink-muted">{label}</span>
      {children}
    </div>
  )
}

function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <li className="flex min-h-14 items-center gap-3 border-b border-hairline py-2">
      <span className="grid size-8 shrink-0 place-items-center rounded-sm border-[1.5px] border-ink font-serif text-[15px] font-medium">
        {n}
      </span>
      <span className="min-w-0">
        <b className="block font-semibold">{title}</b>
        <small className="block text-[13px] leading-[18px] text-ink-muted">{children}</small>
      </span>
    </li>
  )
}

function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <dd className="font-serif text-[22px] leading-7 font-medium tabular-nums">{value}</dd>
      <dt className="text-[12.5px] leading-4 text-ink-muted">{label}</dt>
    </div>
  )
}
