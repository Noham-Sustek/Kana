import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { ReloadGuide, type GuideAction } from '@/components/reload/ReloadGuide'
import { ReloadLR } from '@/components/reload/ReloadLR'
import { getKana, groupGlyph } from '@/data/kana'
import {
  applicableOptions,
  bestChronoScore,
  isSentenceStage,
  isWordStage,
  reviewDetail,
  stageMastery,
  stageMasteryLine,
  unavailableReason,
  type StageStatus,
} from '@/features/learn/learn'
import { useLearnHub } from '@/features/learn/useLearnHub'
import { AUTO_STAGES } from '@/features/quiz/auto'
import { generateQuestions, sentencesForPool, wordsForPool } from '@/features/quiz/questions'
import { stagePresentation } from '@/features/quiz/stages'
import type { StageId } from '@/features/quiz/types'
import { useCustomGroups, useQuizPool } from '@/features/quiz/useQuizPool'
import { useChronoSettingsStore } from '@/stores/chronoSettingsStore'
import { useProfileStore } from '@/stores/profileStore'
import { useQuizSessionStore } from '@/stores/quizSessionStore'
import { useQuizSettingsStore } from '@/stores/quizSettingsStore'

type Tag = { label: string; look: 'filled' | 'line' | 'done' }

interface Row {
  id: string
  name: string
  tag: Tag
  detail: string
  /** Action principale (Lancer, Ouvrir…). */
  cta: string
  run: () => void
  /** Exercice du quiz : « Régler » ouvre la Session libre sur cet exercice. */
  stage?: StageId
  disabled?: boolean
}

const TABS = [
  { id: 'recognize', label: 'Reconnaître', art: 'あ', stages: [1, 2, 3, 4] as StageId[] },
  { id: 'write', label: 'Écrire', art: 'か', stages: [5, 7] as StageId[] },
  { id: 'read', label: 'Lire', art: 'よ', stages: [6, 8, 9] as StageId[] },
  { id: 'lists', label: 'Listes', art: 'リ', stages: [] as StageId[] },
] as const

const STATUS_TAG: Record<StageStatus, Tag> = {
  new: { label: 'Nouveau', look: 'line' },
  progress: { label: '✓ En cours', look: 'filled' },
  done: { label: 'Acquis', look: 'done' },
}

/** S'entraîner du style Reload : liste de quêtes. Onglets Reconnaître / Écrire / Lire / Listes
 *  (L / R), un exercice par rangée avec sa maîtrise, le détail de la rangée choisie, Lancer. */
export function ReloadLearn() {
  const navigate = useNavigate()
  const settings = useQuizSettingsStore()
  const lists = useCustomGroups()
  const pool = useQuizPool()
  const hub = useLearnHub(settings.autoScript)
  const profileId = useProfileStore((s) => s.profileId)
  const record = useChronoSettingsStore((s) => bestChronoScore(s.best, profileId))
  const start = useQuizSessionStore((s) => s.start)
  const startAuto = useQuizSessionStore((s) => s.startAuto)
  const [tab, setTab] = useState(0)
  const [sel, setSel] = useState(0)

  const options = { retry: settings.retry, timerSeconds: settings.timerSeconds, drawingCheck: settings.drawingCheck }

  // Lancer un exercice avec les kana choisis dans la Session libre ; sans kana utilisables,
  // la Session libre s'ouvre sur cet exercice pour les choisir.
  const launch = (stage: StageId) => {
    settings.setStage(stage)
    const anime = applicableOptions(stage).sentences && settings.animeSentences
    const reason = unavailableReason({
      stage,
      poolSize: pool.length,
      wordCount: isWordStage(stage) ? wordsForPool(pool).length : 0,
      sentenceCount: isSentenceStage(stage) ? sentencesForPool(pool, settings.sentenceFilter).length : 0,
      sentenceFilter: settings.sentenceFilter,
      anime,
      questionCount: settings.questionCount,
    })
    if (reason) {
      navigate('/learn/libre')
      return
    }
    start(generateQuestions(stage, pool, settings.questionCount, Math.random, settings.sentenceFilter, anime), options)
    navigate('/learn/quiz', { state: { from: '/learn' } })
  }

  const due = hub?.review.due ?? []
  const startReview = async () => {
    if (due.length === 0) return
    await startAuto({
      script: getKana(due[0]!)!.script,
      kanaIds: due,
      stages: AUTO_STAGES,
      questionCount: settings.questionCount,
      options,
    })
    navigate('/learn/quiz', { state: { from: '/learn' } })
  }

  const focus = hub?.focus
  const writingStart = focus?.kanaIds[0] ?? (settings.autoScript === 'katakana' ? 'k-a' : 'h-a')
  const current = TABS[tab]!

  const stageRow = (stage: StageId): Row => {
    const p = stagePresentation(stage)
    const m = hub ? stageMastery(hub.progress, stage) : undefined
    return {
      id: `s${stage}`,
      stage,
      name: p.name,
      tag: m ? STATUS_TAG[m.status] : STATUS_TAG.new,
      detail: `${p.description}. ${m ? stageMasteryLine(m) : ''}`,
      cta: 'Lancer',
      run: () => launch(stage),
    }
  }

  let rows: Row[] = current.stages.map(stageRow)
  if (current.id === 'write') {
    rows.push({
      id: 'chain',
      name: 'Écriture enchaînée',
      tag: { label: focus ? `Ligne ${groupGlyph(focus)}` : 'Tout', look: 'filled' },
      detail: focus ? `Ligne ${groupGlyph(focus)}, kana après kana : observer, calque, de mémoire.` : 'Tous les kana, trait par trait.',
      cta: 'Tracer',
      run: () => navigate(`/writing/${writingStart}`),
    })
  }
  if (current.id === 'read') {
    rows.push({
      id: 'chrono',
      name: 'Lecture chronométrée',
      tag: record === null ? STATUS_TAG.new : { label: `${record}/min`, look: 'filled' },
      detail: record === null ? 'Le roman, mot par mot, contre la montre.' : `Le roman, mot par mot. Record : ${record} kana par minute.`,
      cta: 'Ouvrir',
      run: () => navigate('/learn/reading'),
    })
  }
  if (current.id === 'lists') {
    rows = [
      {
        id: 'review',
        name: 'Révision ciblée',
        tag: due.length > 0 ? { label: `${due.length} kana`, look: 'filled' } : { label: 'À jour', look: 'done' },
        detail: hub ? `${reviewDetail(hub.review)}.` : '',
        cta: 'Lancer',
        run: () => void startReview(),
        disabled: due.length === 0,
      },
      ...lists.map(
        (list): Row => ({
          id: `l${list.id}`,
          name: list.name,
          tag: { label: `${list.kanaIds.length} kana`, look: 'line' },
          detail: list.kanaIds
            .slice(0, 12)
            .map((id) => getKana(id)?.char)
            .join(' '),
          cta: 'Ouvrir',
          run: () => navigate(`/learn/custom/${list.id}`),
        }),
      ),
      {
        id: 'new',
        name: 'Nouvelle liste',
        tag: { label: '+', look: 'line' },
        detail: 'Regroupez les kana qui vous résistent pour les travailler ensemble.',
        cta: 'Créer',
        run: () => navigate('/learn/custom/new'),
      },
    ]
  }

  const index = Math.min(sel, rows.length - 1)
  const row = rows[index]!
  const changeTab = (next: number) => {
    setTab((next + TABS.length) % TABS.length)
    setSel(0)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement | null)?.closest('input, textarea, dialog[open]')) return
      if (e.key === 'ArrowDown') setSel((i) => Math.min(i + 1, rows.length - 1))
      else if (e.key === 'ArrowUp') setSel((i) => Math.max(i - 1, 0))
      else if (e.key === 'ArrowRight' || e.key === 'e') changeTab(tab + 1)
      else if (e.key === 'ArrowLeft' || e.key === 'q') changeTab(tab - 1)
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const actions: GuideAction[] = [{ label: 'Retour', kind: 'back', to: '/home', keyHint: 'Échap' }]
  if (row.stage) {
    const stage = row.stage
    actions.push({
      label: 'Régler',
      onClick: () => {
        settings.setStage(stage)
        navigate('/learn/libre')
      },
    })
  }
  actions.push({ label: row.cta, kind: 'primary', onClick: row.run, disabled: row.disabled, keyHint: 'Entrée', sound: 'launch' })

  return (
    <div className="relative flex flex-1 flex-col">
      <h1 className="sr-only">S’entraîner</h1>
      <span aria-hidden="true" className="rl-ghost -top-5 -left-6 text-[92px]">
        EXERCICES
      </span>
      <span key={current.art} aria-hidden="true" className="rl-art rl-rise absolute bottom-24 -left-8 -rotate-12 text-[180px]">
        {current.art}
      </span>

      <div className="relative mt-[70px] flex items-center gap-0.5">
        <ReloadLR side="L" label="Onglet précédent" onClick={() => changeTab(tab - 1)} />
        <div role="tablist" aria-label="Familles d’exercices" className="flex flex-1 justify-center gap-0.5">
          {TABS.map((t, i) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={i === tab}
              onClick={() => changeTab(i)}
              data-tap-sound="tabSwitch"
              className={`rl-cond min-h-11 px-2 text-[15.5px] font-bold ${
                i === tab ? 'rounded-full bg-white text-[#05081f] shadow-[0_0_0_2px_#10206e]' : 'rl-shadow text-white'
              }`}
              style={i === tab ? { minHeight: 30, alignSelf: 'center' } : undefined}
            >
              {t.label}
            </button>
          ))}
        </div>
        <ReloadLR side="R" label="Onglet suivant" onClick={() => changeTab(tab + 1)} />
      </div>

      <div className="relative -mx-4 mt-2 bg-[repeating-linear-gradient(28deg,rgba(0,0,30,0.25)_0_1.5px,transparent_1.5px_120px),repeating-linear-gradient(-62deg,rgba(0,0,30,0.25)_0_1.5px,transparent_1.5px_120px)] py-2.5 pr-8 [clip-path:polygon(0_0,100%_0,90%_100%,0_100%)]" style={{ backgroundColor: 'rgba(22, 34, 138, 0.94)' }}>
        <div className="rl-cond flex items-center gap-2 pr-2 pb-1.5 pl-4 text-[13px] font-semibold text-[#8ea6e6]">
          <span className="w-7">N°</span>
          <span className="flex-1">Exercice</span>
          <span className="w-[86px] bg-gradient-to-r from-[#1a8fe0] to-[#45d4ff] text-center text-white [clip-path:polygon(0_0,100%_0,92%_100%,8%_100%)]">
            Maîtrise
          </span>
        </div>
        <div className="rl-rule" />
        <ul role="listbox" aria-label={current.label} key={current.id} className="rl-stagger mt-1 flex flex-col gap-0.5">
          {rows.map((r, i) => {
            const on = i === index
            return (
              <li key={r.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={on}
                  data-tap-sound={on ? 'launch' : 'select'}
                  onClick={() => (on ? !r.disabled && r.run() : setSel(i))}
                  onPointerEnter={(e) => e.pointerType === 'mouse' && setSel(i)}
                  className={`flex min-h-11 w-full items-center gap-2 py-1 pr-2 pl-4 text-left ${on ? 'rl-sel rl-wipe' : ''}`}
                >
                  <span className={`rl-cond w-7 text-[24px] leading-none font-medium ${on ? '' : r.tag.look === 'done' ? 'text-[#9aa3c9]' : 'text-[#5ce1ff]'}`}>
                    {i + 1}
                  </span>
                  <span
                    className={`min-w-0 flex-1 truncate text-[17px] font-semibold ${
                      on ? 'font-bold' : r.tag.look === 'done' ? 'text-[#b9bfdc]' : 'text-[#7fe9ff] rl-shadow-soft'
                    }`}
                  >
                    {r.name}
                  </span>
                  <TagPill tag={r.tag} on={on} />
                </button>
              </li>
            )
          })}
        </ul>
        <div className="mt-5 pr-4 pl-6">
          <p className="rl-cond text-[24px] font-semibold text-[#4fdcff]">Détail</p>
          <p className="mt-1 flex gap-2.5 text-[15.5px] leading-[21px] font-semibold">
            <span aria-hidden="true" className="mt-2 size-[7px] shrink-0 rounded-full bg-white" />
            <span>{row.detail}</span>
          </p>
        </div>
      </div>

      <ReloadGuide title={'Que voulez-vous faire\u00a0?'} actions={actions} />
    </div>
  )
}

function TagPill({ tag, on }: { tag: Tag; on: boolean }) {
  const look = on
    ? 'bg-[#05081f] text-white'
    : tag.look === 'filled'
      ? 'bg-[#5ce1ff] text-[#05081f]'
      : tag.look === 'done'
        ? 'shadow-[inset_0_0_0_1.5px_#9aa3c9] text-[#c4c9e4]'
        : 'shadow-[inset_0_0_0_1.5px_#5ce1ff] text-[#5ce1ff]'
  return (
    <span className={`rl-cond flex h-[22px] min-w-[86px] shrink-0 items-center justify-center px-2 text-[15px] font-bold whitespace-nowrap ${look}`}>
      {tag.label}
    </span>
  )
}
