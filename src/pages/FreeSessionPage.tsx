import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { Button } from '@/components/Button'
import { Chip } from '@/components/Chip'
import { Icon } from '@/components/Icon'
import { IconButton } from '@/components/IconButton'
import { SegmentedControl } from '@/components/SegmentedControl'
import { Sheet } from '@/components/Sheet'
import { Switch } from '@/components/Switch'
import { GROUP_KIND_LABELS, KANA_GROUPS, groupGlyph, groupsOfScript, type GroupKind, type Script } from '@/data/kana'
import {
  applicableOptions,
  isSentenceStage,
  isWordStage,
  kanaSummary,
  optionsSummary,
  startDetail,
  unavailableReason,
  type FreeSessionInput,
} from '@/features/learn/learn'
import { generateQuestions, sentencesForPool, wordsForPool, type SentenceFilter } from '@/features/quiz/questions'
import { FAMILIES, stagePresentation, type StageFamily } from '@/features/quiz/stages'
import type { DrawingCheck, StageId } from '@/features/quiz/types'
import { useCustomGroups, useQuizPool } from '@/features/quiz/useQuizPool'
import {
  QUESTION_COUNTS,
  TIMER_OPTIONS,
  useQuizSettingsStore,
  type PickerTab,
} from '@/stores/quizSettingsStore'
import { useQuizSessionStore } from '@/stores/quizSessionStore'

const KIND_ORDER: GroupKind[] = ['gojuon', 'dakuten', 'handakuten', 'yoon', 'extended']
const FAMILY_ORDER: StageFamily[] = ['recognize', 'write', 'read']
const STAGE_IDS: StageId[] = [1, 2, 3, 4, 5, 6, 7, 8, 9]

const PICKER_TABS: { value: PickerTab; label: string }[] = [
  { value: 'hiragana', label: 'Hiragana' },
  { value: 'katakana', label: 'Katakana' },
  { value: 'lists', label: 'Mes listes' },
]

const SENTENCE_FILTER_OPTIONS: { value: SentenceFilter; label: string }[] = [
  { value: 'all', label: 'Toutes' },
  { value: 'hiragana', label: 'Hiragana' },
  { value: 'katakana', label: 'Katakana' },
  { value: 'mixed', label: 'Mixte' },
]

const DRAWING_CHECK_OPTIONS: { value: DrawingCheck; label: string }[] = [
  { value: 'auto', label: 'Automatique' },
  { value: 'self', label: 'Par moi-même' },
]

/** Session libre : exercice, kana, options (seulement celles qui s'appliquent), Commencer. */
export function FreeSessionPage() {
  const navigate = useNavigate()
  const settings = useQuizSettingsStore()
  const startSession = useQuizSessionStore((s) => s.start)
  const pool = useQuizPool()
  const lists = useCustomGroups()
  const [choosing, setChoosing] = useState(false)
  // Une section dépliée au plus : le choix des kana, ou les options.
  const [open, setOpen] = useState<'kana' | 'options' | null>('kana')

  const { stage } = settings
  const presentation = stagePresentation(stage)
  const applicable = applicableOptions(stage)
  const anime = applicable.sentences && settings.animeSentences
  const input: FreeSessionInput = {
    stage,
    poolSize: pool.length,
    wordCount: isWordStage(stage) ? wordsForPool(pool).length : 0,
    sentenceCount: isSentenceStage(stage) ? sentencesForPool(pool, settings.sentenceFilter).length : 0,
    sentenceFilter: settings.sentenceFilter,
    anime,
    questionCount: settings.questionCount,
  }
  const reason = unavailableReason(input)
  const selectedGroups = KANA_GROUPS.filter((g) => settings.groupIds.includes(g.id))
  const listCount = lists.filter((l) => settings.customGroupIds.includes(l.id)).length

  const goBack = () => {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0
    if (idx > 0) navigate(-1)
    else navigate('/learn', { replace: true })
  }

  const start = () => {
    if (reason) return
    startSession(
      generateQuestions(stage, pool, settings.questionCount, Math.random, settings.sentenceFilter, anime),
      { retry: settings.retry, timerSeconds: settings.timerSeconds, drawingCheck: settings.drawingCheck },
    )
    navigate('/learn/quiz', { state: { from: '/learn/libre' } })
  }

  return (
    <div className="flex min-h-full flex-col">
      <header className="-ml-2 flex items-center gap-0.5">
        <IconButton icon="chevronLeft" label="Retour" onClick={goBack} />
        <h1 className="font-serif text-[21px] leading-tight font-medium">Session libre</h1>
      </header>

      <div className="mt-2 border-t border-hairline">
        <Row
          label="Exercice"
          value={`${FAMILIES[presentation.family].label} · ${presentation.name}`}
          icon="chevronRight"
          onClick={() => setChoosing(true)}
        />
        <Row
          label="Kana"
          value={kanaSummary(pool.length, selectedGroups, listCount)}
          icon={open === 'kana' ? 'chevronUp' : 'chevronDown'}
          expanded={open === 'kana'}
          onClick={() => setOpen(open === 'kana' ? null : 'kana')}
        />
      </div>
      {open === 'kana' && <KanaPicker />}

      <div className={open === 'kana' ? 'mt-4 border-t border-hairline' : ''}>
        <Row
          label="Options"
          value={open === 'options' ? 'Réglages de la session' : optionsSummary(settings)}
          icon={open === 'options' ? 'chevronUp' : 'chevronDown'}
          expanded={open === 'options'}
          onClick={() => setOpen(open === 'options' ? null : 'options')}
        />
      </div>
      {open === 'options' && (
        <div className="mt-3.5 flex flex-col gap-3.5 pb-2">
          {applicable.sentences && (
            <>
              <Field label="Phrases en">
                <SegmentedControl
                  label="Phrases en"
                  options={SENTENCE_FILTER_OPTIONS}
                  value={settings.sentenceFilter}
                  onChange={settings.setSentenceFilter}
                />
              </Field>
              <Switch
                label="Répliques de Dragon Ball"
                description="Ajoutées aux phrases du roman, quels que soient vos kana."
                checked={settings.animeSentences}
                onChange={settings.setAnimeSentences}
              />
            </>
          )}
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
          {applicable.drawingCheck && (
            <Field label="Validation du tracé">
              <SegmentedControl
                label="Validation du tracé"
                options={DRAWING_CHECK_OPTIONS}
                value={settings.drawingCheck}
                onChange={settings.setDrawingCheck}
              />
              <p className="mt-1.5 text-[13px] leading-[18px] text-ink-muted">
                {settings.drawingCheck === 'auto'
                  ? 'Chaque trait est vérifié : forme, sens, ordre.'
                  : 'Vous tracez librement, comparez au modèle et dites si c’est juste.'}
              </p>
            </Field>
          )}
          <Switch
            label="Réessayer après une erreur"
            description="Sinon la réponse s’affiche tout de suite."
            checked={settings.retry}
            onChange={settings.setRetry}
          />
        </div>
      )}

      <div className="sticky -bottom-4 z-10 -mx-4 mt-auto bg-paper px-4 pt-3 pb-5">
        {reason && <p className="mb-2 text-center text-[13px] leading-[18px] text-ink-muted">{reason}</p>}
        <Button detail={startDetail(input)} icon="arrow" disabled={reason !== null} onClick={start}>
          Commencer
        </Button>
      </div>

      <Sheet open={choosing} onClose={() => setChoosing(false)} title="Quel exercice ?">
        {FAMILY_ORDER.map((family) => (
          <section key={family}>
            <h3 className="mt-3 mb-0.5 flex items-center gap-1.5 text-[11px] leading-[14px] font-bold tracking-[0.12em] text-ink-muted uppercase">
              <Icon name={FAMILIES[family].icon} className="size-4" />
              {FAMILIES[family].label}
            </h3>
            <div role="radiogroup" aria-label={FAMILIES[family].label}>
              {STAGE_IDS.filter((id) => stagePresentation(id).family === family).map((id) => {
                const selected = id === stage
                return (
                  <button
                    key={id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => {
                      settings.setStage(id)
                      setChoosing(false)
                    }}
                    className="flex min-h-14 w-full items-center gap-3 border-b border-hairline py-2 text-left active:brightness-90"
                  >
                    <span
                      className={`grid size-[22px] shrink-0 place-items-center rounded-full border-[1.5px] ${
                        selected ? 'border-accent bg-accent text-on-accent' : 'border-control'
                      }`}
                    >
                      {selected && <Icon name="check" strokeWidth={3} className="size-3.5" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <b className="block font-semibold">{stagePresentation(id).name}</b>
                      <small className="block text-[13px] leading-[18px] text-ink-muted">
                        {stagePresentation(id).description}
                      </small>
                    </span>
                  </button>
                )
              })}
            </div>
          </section>
        ))}
      </Sheet>
    </div>
  )
}

function KanaPicker() {
  const navigate = useNavigate()
  const tab = useQuizSettingsStore((s) => s.pickerScript)
  const setTab = useQuizSettingsStore((s) => s.setPickerScript)

  return (
    <div className="mt-3">
      <SegmentedControl label="Kana à travailler" options={PICKER_TABS} value={tab} onChange={setTab} />
      {tab === 'lists' ? <ListPicker onCreate={() => navigate('/learn/custom/new')} /> : <GroupPicker script={tab} />}
    </div>
  )
}

function GroupPicker({ script }: { script: Script }) {
  const selectedIds = useQuizSettingsStore((s) => s.groupIds)
  const setGroupsSelected = useQuizSettingsStore((s) => s.setGroupsSelected)
  const groups = groupsOfScript(script)

  return KIND_ORDER.map((kind) => {
    const kindGroups = groups.filter((g) => g.kind === kind)
    if (kindGroups.length === 0) return null
    const ids = kindGroups.map((g) => g.id)
    const allSelected = ids.every((id) => selectedIds.includes(id))
    return (
      <section key={kind}>
        <div className="mt-3 mb-1.5 flex items-center justify-between">
          <h3 className="text-[11px] leading-[14px] font-bold tracking-[0.12em] text-ink-muted uppercase">
            {GROUP_KIND_LABELS[kind]}
          </h3>
          <button
            type="button"
            onClick={() => setGroupsSelected(ids, !allSelected)}
            aria-label={`${allSelected ? 'Aucun' : 'Tout'} : ${GROUP_KIND_LABELS[kind]}`}
            className="-mr-2 min-h-11 px-2 text-[14.5px] font-semibold text-accent"
          >
            {allSelected ? 'Aucun' : 'Tout'}
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {kindGroups.map((group) => {
            const selected = selectedIds.includes(group.id)
            return (
              <Chip
                key={group.id}
                state={selected ? 'on' : 'off'}
                glyph={groupGlyph(group)}
                detail={group.label}
                aria-label={`Ligne ${group.label}`}
                onClick={() => setGroupsSelected([group.id], !selected)}
              />
            )
          })}
        </div>
      </section>
    )
  })
}

function ListPicker({ onCreate }: { onCreate: () => void }) {
  const lists = useCustomGroups()
  const selectedIds = useQuizSettingsStore((s) => s.customGroupIds)
  const toggle = useQuizSettingsStore((s) => s.toggleCustomGroup)

  return (
    <div className="mt-3">
      {lists.length === 0 ? (
        <p className="text-[14.5px] leading-5 text-ink-muted">
          Regroupez les kana qui vous résistent dans une liste pour les travailler ensemble.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {lists.map((list) => (
            <Chip
              key={list.id}
              state={selectedIds.includes(list.id) ? 'on' : 'off'}
              detail={list.kanaIds.length}
              onClick={() => toggle(list.id)}
            >
              {list.name}
            </Chip>
          ))}
        </div>
      )}
      <Button variant="text" size="sm" icon="plus" iconPosition="start" className="mt-2 -ml-3" onClick={onCreate}>
        Nouvelle liste
      </Button>
    </div>
  )
}

/** Ligne de liste : petit libellé, résumé en gras, icône à droite. */
function Row({
  label,
  value,
  icon,
  expanded,
  onClick,
}: {
  label: string
  value: string
  icon: 'chevronRight' | 'chevronDown' | 'chevronUp'
  expanded?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={expanded}
      className="flex min-h-14 w-full items-center gap-3 border-b border-hairline py-2 text-left active:brightness-90"
    >
      <span className="min-w-0 flex-1">
        <small className="block text-[13px] leading-[18px] text-ink-muted">{label}</small>
        <b className="block font-semibold">{value}</b>
      </span>
      <Icon name={icon} className="size-5 shrink-0 text-ink-muted" />
    </button>
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
