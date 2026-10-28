import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import { Icon } from '@/components/Icon'
import { PageHeader } from '@/components/PageHeader'
import { ScriptToggle } from '@/components/ScriptToggle'
import { SegmentedControl } from '@/components/SegmentedControl'
import { Switch } from '@/components/Switch'
import { GROUP_KIND_LABELS, getKana, groupGlyph, groupsOfScript, type GroupKind, type KanaGroup } from '@/data/kana'
import { generateQuestions, sentencesForPool, wordsForPool, type SentenceFilter } from '@/features/quiz/questions'
import { AUTO_STAGES } from '@/features/quiz/auto'
import { STAGES, getStage } from '@/features/quiz/stages'
import type { StageId } from '@/features/quiz/types'
import { useAutoOverview } from '@/features/quiz/useAutoOverview'
import { useCustomGroups, useQuizPool } from '@/features/quiz/useQuizPool'
import {
  QUESTION_COUNTS,
  TIMER_OPTIONS,
  effectiveSentenceFilter,
  useQuizSettingsStore,
  type AutoSource,
  type QuizMode,
} from '@/stores/quizSettingsStore'
import { useQuizSessionStore } from '@/stores/quizSessionStore'

const KIND_ORDER: GroupKind[] = ['gojuon', 'dakuten', 'handakuten', 'yoon', 'extended']

const MODE_OPTIONS: { value: QuizMode; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: 'manual', label: 'Manuel' },
]

const SENTENCE_FILTER_OPTIONS: { value: SentenceFilter; label: string }[] = [
  { value: 'all', label: 'Toutes' },
  { value: 'hiragana', label: 'Hira' },
  { value: 'katakana', label: 'Kata' },
  { value: 'mixed', label: 'Mixte' },
]

/** Proposées en plus quand l'option « Phrases d'anime » est cochée. */
const ANIME_FILTER_OPTIONS: { value: SentenceFilter; label: string }[] = [{ value: 'dragonball', label: 'Dragon Ball' }]

const isSentenceStage = (stage: StageId) => stage === 8 || stage === 9

const SOURCE_OPTIONS: { value: AutoSource; label: string }[] = [
  { value: 'path', label: 'Parcours guidé' },
  { value: 'selection', label: 'Mon choix' },
]

export function LearnPage() {
  const settings = useQuizSettingsStore()
  const startSession = useQuizSessionStore((s) => s.start)
  const startAuto = useQuizSessionStore((s) => s.startAuto)
  const navigate = useNavigate()
  const pool = useQuizPool()
  const wordCount = wordsForPool(pool).length
  const sentenceFilter = effectiveSentenceFilter(settings)
  const sentenceCount = sentencesForPool(pool, sentenceFilter).length
  const isAuto = settings.mode === 'auto'
  const isSelection = isAuto && settings.autoSource === 'selection'
  // Les répliques d'anime ne dépendent pas des kana cochés.
  const needsPool = !(isSentenceStage(settings.stage) && sentenceFilter === 'dragonball')

  const unavailableReason = isAuto
    ? isSelection && pool.length === 0
      ? 'Sélectionnez au moins un groupe.'
      : null
    : pool.length === 0 && needsPool
      ? 'Sélectionnez au moins un groupe.'
      : (settings.stage === 6 || settings.stage === 7) && wordCount === 0
        ? 'Aucun mot ne s’écrit avec ces kana : ajoutez des groupes.'
        : isSentenceStage(settings.stage) && sentenceCount === 0
          ? 'Aucune phrase ne s’écrit avec ces kana : ajoutez des groupes ou changez d’écriture.'
          : null

  const start = async () => {
    const options = { retry: settings.retry, timerSeconds: settings.timerSeconds }
    if (isAuto) {
      await startAuto({
        script: settings.autoScript,
        kanaIds: isSelection ? pool.map((k) => k.id) : undefined,
        stages: AUTO_STAGES,
        questionCount: settings.questionCount,
        options,
      })
    } else {
      startSession(
        generateQuestions(settings.stage, pool, settings.questionCount, Math.random, sentenceFilter),
        options,
      )
    }
    navigate('/learn/quiz')
  }

  return (
    <div className="pb-20 lg:pb-0">
      <PageHeader
        title="Apprendre"
        subtitle={
          isAuto
            ? 'Mode auto : les questions s’adaptent à votre progression.'
            : "Mode manuel : choisissez l'exercice et les kana."
        }
      />

      {/* Grand écran : réglages à gauche, options et bouton dans une colonne fixe à droite. */}
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-6">
        <div>
          <div className="mb-4">
            <SegmentedControl label="Mode" options={MODE_OPTIONS} value={settings.mode} onChange={settings.setMode} />
          </div>

          {isAuto ? <AutoPanel /> : <ManualPanel />}
        </div>

        <div className="lg:sticky lg:top-0">
          <Card title="Options">
            <div className="space-y-4">
              <Field label="Questions">
                <SegmentedControl
                  label="Nombre de questions"
                  options={QUESTION_COUNTS.map((n) => ({ value: n, label: String(n) }))}
                  value={settings.questionCount}
                  onChange={settings.setQuestionCount}
                />
              </Field>
              <Field label="Chrono par question">
                <SegmentedControl
                  label="Chrono par question"
                  options={TIMER_OPTIONS.map((s) => ({ value: s, label: s === 0 ? 'Aucun' : `${s} s` }))}
                  value={settings.timerSeconds}
                  onChange={settings.setTimerSeconds}
                />
              </Field>
              <Switch
                label="Réessayer après une erreur"
                description="Sinon, la bonne réponse est affichée tout de suite."
                checked={settings.retry}
                onChange={settings.setRetry}
              />
              <Switch
                label="Phrases d'anime"
                description="Ajoute les répliques de Dragon Ball au choix des phrases (stages 8 et 9, mode manuel)."
                checked={settings.animeSentences}
                onChange={settings.setAnimeSentences}
              />
            </div>
          </Card>

          <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-10 mx-auto max-w-lg px-4 pb-3 lg:static lg:max-w-none lg:p-0">
            {unavailableReason && (
              <p className="mb-2 rounded-lg bg-slate-200/90 px-3 py-2 text-center text-xs text-slate-600 backdrop-blur dark:bg-slate-800/90 dark:text-slate-300">
                {unavailableReason}
              </p>
            )}
            <button
              type="button"
              onClick={start}
              disabled={unavailableReason !== null}
              className="min-h-12 w-full rounded-xl bg-accent-600 font-semibold text-white shadow-lg transition-transform active:scale-[0.98] disabled:bg-slate-400 disabled:shadow-none dark:disabled:bg-slate-700"
            >
              Commencer
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function AutoPanel() {
  const source = useQuizSettingsStore((s) => s.autoSource)
  const setSource = useQuizSettingsStore((s) => s.setAutoSource)

  return (
    <>
      <div className="mb-4">
        <SegmentedControl label="Kana révisés" options={SOURCE_OPTIONS} value={source} onChange={setSource} />
      </div>
      {source === 'path' ? <PathPanel /> : <SelectionPanel />}
    </>
  )
}

function PathPanel() {
  const script = useQuizSettingsStore((s) => s.autoScript)
  const setScript = useQuizSettingsStore((s) => s.setAutoScript)
  const overview = useAutoOverview(script, AUTO_STAGES)

  return (
    <Card title="Progression">
      <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">
        On commence par la ligne あ. Quand 80 % des kana en cours sont reconnus vite et sans erreur, la ligne suivante
        s’ajoute. Chaque kana bien connu passe ensuite aux exercices suivants (stages), et revient régulièrement en
        révision.
      </p>
      <ScriptToggle value={script} onChange={setScript} />
      {overview && (
        <div className="mt-4 space-y-4">
          <div>
            <span className="mb-1.5 block text-xs font-semibold text-slate-500 dark:text-slate-400">
              Groupes en cours ({overview.activeGroups.length})
            </span>
            <div className="flex flex-wrap gap-1.5">
              {overview.activeGroups.map((g) => (
                <span
                  key={g.id}
                  className="flex min-h-9 items-center gap-1 rounded-lg bg-slate-100 px-2 text-sm dark:bg-slate-800"
                >
                  <span className="font-jp">{groupGlyph(g)}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">{g.label}</span>
                </span>
              ))}
            </div>
          </div>

          {overview.nextGroup ? (
            <div>
              <div className="mb-1.5 flex items-baseline justify-between text-xs">
                <span className="font-semibold text-slate-500 dark:text-slate-400">
                  Prochain groupe : <span className="font-jp">{groupGlyph(overview.nextGroup)}</span>{' '}
                  {overview.nextGroup.label}
                </span>
                <span className="tabular-nums text-slate-400">
                  {Math.round(overview.ratio * 100)} % / {Math.round(overview.requiredRatio * 100)} %
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                <div
                  className="h-full rounded-full bg-accent-500"
                  style={{ width: `${Math.min(1, overview.ratio / overview.requiredRatio) * 100}%` }}
                />
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400">Tous les groupes sont débloqués.</p>
          )}

          <StageMastery perStage={overview.perStage} />
        </div>
      )}
    </Card>
  )
}

function SelectionPanel() {
  const settings = useQuizSettingsStore()
  const pool = useQuizPool()
  const overview = useAutoOverview(
    settings.autoScript,
    AUTO_STAGES,
    pool.map((k) => k.id),
  )

  return (
    <>
      <Card title="Kana à réviser" aside={`${pool.length} kana`}>
        <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">
          Cochez ce que vous voulez réviser : les questions portent uniquement sur ces kana, en commençant par ceux que
          vous connaissez le moins.
        </p>
        <ScriptToggle value={settings.pickerScript} onChange={settings.setPickerScript} />
        <GroupPicker groups={groupsOfScript(settings.pickerScript)} />
      </Card>

      <CustomGroupsCard />

      {overview && pool.length > 0 && (
        <Card title="Maîtrise de la sélection">
          <StageMastery perStage={overview.perStage} />
        </Card>
      )}
    </>
  )
}

function StageMastery({ perStage }: { perStage: { stage: StageId; mastered: number; total: number }[] }) {
  return (
    <div>
      <span className="mb-1.5 block text-xs font-semibold text-slate-500 dark:text-slate-400">
        Kana maîtrisés par stage
      </span>
      <ul className="grid grid-cols-3 gap-1.5">
        {perStage.map(({ stage, mastered, total }) => (
          <li key={stage} className="rounded-lg bg-slate-100 px-2 py-1.5 dark:bg-slate-800">
            <span className="block text-xs text-slate-500 dark:text-slate-400">{getStage(stage).title}</span>
            <span className="text-sm font-semibold tabular-nums">
              {mastered}/{total}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function ManualPanel() {
  const settings = useQuizSettingsStore()
  const pool = useQuizPool()
  const wordCount = wordsForPool(pool).length
  const sentenceFilter = effectiveSentenceFilter(settings)
  const sentenceCount = sentencesForPool(pool, sentenceFilter).length
  const plural = (n: number, word: string) => `${n} ${word}${n > 1 ? 's' : ''} disponible${n > 1 ? 's' : ''}`

  return (
    <>
      <Card title="Exercice">
        <div className="grid grid-cols-2 gap-2">
          {STAGES.map((stage) => {
            const selected = settings.stage === stage.id
            const note =
              stage.id === 6 || stage.id === 7
                ? plural(wordCount, 'mot')
                : isSentenceStage(stage.id)
                  ? plural(sentenceCount, 'phrase')
                  : null
            return (
              <button
                key={stage.id}
                type="button"
                aria-pressed={selected}
                onClick={() => settings.setStage(stage.id)}
                className={`flex min-h-20 flex-col items-start rounded-xl border p-3 text-left transition-colors ${
                  selected
                    ? 'border-accent-500 bg-accent-50 dark:bg-accent-500/15'
                    : 'border-slate-200 dark:border-slate-700'
                }`}
              >
                <span
                  className={`text-xs font-semibold ${selected ? 'text-accent-600 dark:text-accent-500' : 'text-slate-400'}`}
                >
                  Stage {stage.id}
                </span>
                <span className="text-sm font-semibold">{stage.title}</span>
                <span className="text-xs text-slate-500 dark:text-slate-400">{stage.description}</span>
                {note && <span className="mt-1 text-xs text-slate-400 dark:text-slate-500">{note}</span>}
              </button>
            )
          })}
        </div>
        {isSentenceStage(settings.stage) && (
          <div className="mt-4">
            <Field label="Phrases">
              <SegmentedControl
                label="Phrases"
                options={
                  settings.animeSentences
                    ? [...SENTENCE_FILTER_OPTIONS, ...ANIME_FILTER_OPTIONS]
                    : SENTENCE_FILTER_OPTIONS
                }
                value={sentenceFilter}
                onChange={settings.setSentenceFilter}
              />
            </Field>
          </div>
        )}
      </Card>

      <Card title="Kana à travailler" aside={`${pool.length} kana`}>
        <ScriptToggle value={settings.pickerScript} onChange={settings.setPickerScript} />
        <GroupPicker groups={groupsOfScript(settings.pickerScript)} />
      </Card>

      <CustomGroupsCard />
    </>
  )
}

function Card({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="mb-4 rounded-2xl bg-white p-4 shadow-sm dark:bg-slate-900">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400">{title}</h2>
        {aside && <span className="text-xs text-slate-400 dark:text-slate-500">{aside}</span>}
      </div>
      {children}
    </section>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      {children}
    </div>
  )
}

function GroupPicker({ groups }: { groups: KanaGroup[] }) {
  const selectedIds = useQuizSettingsStore((s) => s.groupIds)
  const setGroupsSelected = useQuizSettingsStore((s) => s.setGroupsSelected)

  return (
    <div className="mt-3 space-y-4">
      {KIND_ORDER.map((kind) => {
        const kindGroups = groups.filter((g) => g.kind === kind)
        if (kindGroups.length === 0) return null
        const ids = kindGroups.map((g) => g.id)
        const allSelected = ids.every((id) => selectedIds.includes(id))
        return (
          <div key={kind}>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {GROUP_KIND_LABELS[kind]}
              </span>
              <button
                type="button"
                onClick={() => setGroupsSelected(ids, !allSelected)}
                className="min-h-8 px-2 text-xs font-medium text-accent-600 dark:text-accent-500"
              >
                {allSelected ? 'Aucun' : 'Tous'}
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {kindGroups.map((group) => {
                const selected = selectedIds.includes(group.id)
                return (
                  <button
                    key={group.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setGroupsSelected([group.id], !selected)}
                    className={`flex min-h-11 items-center gap-1.5 rounded-lg border px-2.5 text-sm transition-colors ${
                      selected
                        ? 'border-accent-500 bg-accent-500 text-white'
                        : 'border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <span className="font-jp text-base">{groupGlyph(group)}</span>
                    <span className="text-xs">{group.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function CustomGroupsCard() {
  const customGroups = useCustomGroups()
  const selectedIds = useQuizSettingsStore((s) => s.customGroupIds)
  const toggle = useQuizSettingsStore((s) => s.toggleCustomGroup)

  return (
    <Card title="Mes listes">
      {customGroups.length === 0 && (
        <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">
          Regroupez ici les kana qui vous posent problème.
        </p>
      )}
      <ul className="mb-3 divide-y divide-slate-100 dark:divide-slate-800">
        {customGroups.map((group) => {
          const selected = selectedIds.includes(group.id)
          return (
            <li key={group.id} className="flex items-center gap-2">
              <button
                type="button"
                role="checkbox"
                aria-checked={selected}
                onClick={() => toggle(group.id)}
                className="flex min-h-12 flex-1 items-center gap-3 text-left"
              >
                <span
                  className={`flex size-6 shrink-0 items-center justify-center rounded-md border-2 ${
                    selected ? 'border-accent-500 bg-accent-500 text-white' : 'border-slate-300 dark:border-slate-600'
                  }`}
                >
                  {selected && <Icon name="check" className="size-4" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{group.name}</span>
                  <span className="block truncate font-jp text-xs text-slate-500 dark:text-slate-400">
                    {group.kanaIds.map((id) => getKana(id)?.char).join(' ')}
                  </span>
                </span>
              </button>
              <Link
                to={`/learn/custom/${group.id}`}
                aria-label={`Modifier ${group.name}`}
                className="flex size-11 items-center justify-center text-slate-400"
              >
                <Icon name="chevronRight" className="size-5" />
              </Link>
            </li>
          )
        })}
      </ul>
      <Link
        to="/learn/custom/new"
        className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 text-sm font-medium text-slate-600 dark:border-slate-700 dark:text-slate-300"
      >
        <Icon name="plus" className="size-4" />
        Nouvelle liste
      </Link>
    </Card>
  )
}
