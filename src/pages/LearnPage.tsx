import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import { Icon } from '@/components/Icon'
import { JapaneseVoiceHelp } from '@/components/JapaneseVoiceHelp'
import { PageHeader } from '@/components/PageHeader'
import { ScriptToggle } from '@/components/ScriptToggle'
import { SegmentedControl } from '@/components/SegmentedControl'
import { Switch } from '@/components/Switch'
import { GROUP_KIND_LABELS, getKana, groupsOfScript, type GroupKind, type KanaGroup } from '@/data/kana'
import { useKanaAudio } from '@/features/audio/useKanaAudio'
import { generateQuestions, wordsForPool } from '@/features/quiz/questions'
import { autoStages } from '@/features/quiz/auto'
import { STAGES, getStage } from '@/features/quiz/stages'
import { useAutoOverview } from '@/features/quiz/useAutoOverview'
import { useCustomGroups, useQuizPool } from '@/features/quiz/useQuizPool'
import { QUESTION_COUNTS, TIMER_OPTIONS, useQuizSettingsStore, type QuizMode } from '@/stores/quizSettingsStore'
import { useQuizSessionStore } from '@/stores/quizSessionStore'

const KIND_ORDER: GroupKind[] = ['gojuon', 'dakuten', 'handakuten', 'yoon', 'extended']

const MODE_OPTIONS: { value: QuizMode; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: 'manual', label: 'Manuel' },
]

export function LearnPage() {
  const settings = useQuizSettingsStore()
  const startSession = useQuizSessionStore((s) => s.start)
  const startAuto = useQuizSessionStore((s) => s.startAuto)
  const navigate = useNavigate()
  const pool = useQuizPool()
  const audio = useKanaAudio()
  const wordCount = wordsForPool(pool).length
  const isAuto = settings.mode === 'auto'

  const unavailableReason = isAuto
    ? null
    : pool.length === 0
      ? 'Sélectionnez au moins un groupe.'
      : settings.stage === 5 && !audio.available
        ? audio.status === 'checking'
          ? 'Recherche d’une voix japonaise…'
          : 'Aucune voix japonaise sur cet appareil (voir ci-dessus).'
        : settings.stage === 6 && wordCount === 0
          ? 'Aucun mot ne s’écrit avec ces kana : ajoutez des groupes.'
          : null

  const start = async () => {
    const options = { retry: settings.retry, timerSeconds: settings.timerSeconds }
    if (isAuto) {
      await startAuto({
        script: settings.autoScript,
        stages: autoStages(audio.available),
        questionCount: settings.questionCount,
        options,
      })
    } else {
      startSession(generateQuestions(settings.stage, pool, settings.questionCount), options)
    }
    navigate('/learn/quiz')
  }

  return (
    <div className="pb-20">
      <PageHeader
        title="Apprendre"
        subtitle={
          isAuto
            ? 'Mode auto : les questions s’adaptent à votre progression.'
            : "Mode manuel : choisissez l'exercice et les kana."
        }
      />

      <div className="mb-4">
        <SegmentedControl label="Mode" options={MODE_OPTIONS} value={settings.mode} onChange={settings.setMode} />
      </div>

      {isAuto ? <AutoPanel /> : <ManualPanel />}

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
        </div>
      </Card>

      <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-10 mx-auto max-w-lg px-4 pb-3">
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
  )
}

function AutoPanel() {
  const script = useQuizSettingsStore((s) => s.autoScript)
  const setScript = useQuizSettingsStore((s) => s.setAutoScript)
  const audio = useKanaAudio()
  const overview = useAutoOverview(script, autoStages(audio.available))

  return (
    <Card title="Progression">
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
                  <span className="font-jp">{getKana(g.kanaIds[0]!)!.char}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">{g.label}</span>
                </span>
              ))}
            </div>
          </div>

          {overview.nextGroup ? (
            <div>
              <div className="mb-1.5 flex items-baseline justify-between text-xs">
                <span className="font-semibold text-slate-500 dark:text-slate-400">
                  Prochain groupe : <span className="font-jp">{getKana(overview.nextGroup.kanaIds[0]!)!.char}</span>{' '}
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

          <div>
            <span className="mb-1.5 block text-xs font-semibold text-slate-500 dark:text-slate-400">
              Kana maîtrisés par stage
            </span>
            <ul className="grid grid-cols-3 gap-1.5">
              {overview.perStage.map(({ stage, mastered, total }) => (
                <li key={stage} className="rounded-lg bg-slate-100 px-2 py-1.5 dark:bg-slate-800">
                  <span className="block text-xs text-slate-500 dark:text-slate-400">{getStage(stage).title}</span>
                  <span className="text-sm font-semibold tabular-nums">
                    {mastered}/{total}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {(audio.status === 'missing' || audio.status === 'unsupported') && (
            <Link to="/settings" className="block text-xs text-slate-500 dark:text-slate-400">
              Stage 5 « Écouter » ignoré : aucune voix japonaise.{' '}
              <span className="font-medium text-accent-600 underline dark:text-accent-500">Installer une voix</span>
            </Link>
          )}
        </div>
      )}
    </Card>
  )
}

function ManualPanel() {
  const settings = useQuizSettingsStore()
  const pool = useQuizPool()
  const audio = useKanaAudio()
  const wordCount = wordsForPool(pool).length

  return (
    <>
      <Card title="Exercice">
        <div className="grid grid-cols-2 gap-2">
          {STAGES.map((stage) => {
            const selected = settings.stage === stage.id
            const note =
              stage.id === 5 && !audio.available
                ? 'Voix japonaise requise'
                : stage.id === 6
                  ? `${wordCount} mot${wordCount > 1 ? 's' : ''} disponible${wordCount > 1 ? 's' : ''}`
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
                <span className={`text-xs font-semibold ${selected ? 'text-accent-600 dark:text-accent-500' : 'text-slate-400'}`}>
                  Stage {stage.id}
                </span>
                <span className="text-sm font-semibold">{stage.title}</span>
                <span className="text-xs text-slate-500 dark:text-slate-400">{stage.description}</span>
                {note && <span className="mt-1 text-xs text-slate-400 dark:text-slate-500">{note}</span>}
              </button>
            )
          })}
        </div>
        {settings.stage === 5 && audio.status === 'missing' && <JapaneseVoiceHelp />}
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
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{GROUP_KIND_LABELS[kind]}</span>
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
                    <span className="font-jp text-base">{getKana(group.kanaIds[0]!)!.char}</span>
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
