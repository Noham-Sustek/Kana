import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Script } from '@/data/kana'
import type { SentenceFilter } from '@/features/quiz/questions'
import { migrateStage } from '@/features/quiz/stages'
import type { StageId } from '@/features/quiz/types'

export const QUESTION_COUNTS = [10, 20, 50] as const
export const TIMER_OPTIONS = [0, 5, 10, 20] as const

export type QuizMode = 'auto' | 'manual'
/** Mode auto : parcours guidé (groupes débloqués au fil de la maîtrise) ou kana choisis. */
export type AutoSource = 'path' | 'selection'

interface QuizSettingsState {
  mode: QuizMode
  /** Écriture du parcours en mode auto (chaque écriture a sa propre progression). */
  autoScript: Script
  autoSource: AutoSource
  stage: StageId
  /** Phrases des stages 8 et 9 (mode manuel) : écriture, ou série d'anime. */
  sentenceFilter: SentenceFilter
  /** Option « Phrases d'anime » : propose les séries d'anime dans le filtre des phrases. */
  animeSentences: boolean
  /** Groupes prédéfinis cochés (ids de KANA_GROUPS). */
  groupIds: string[]
  /** Listes personnalisées cochées (ids Dexie). */
  customGroupIds: number[]
  questionCount: number
  retry: boolean
  timerSeconds: number
  /** Écriture affichée dans le sélecteur de groupes. */
  pickerScript: Script

  setMode: (mode: QuizMode) => void
  setAutoScript: (script: Script) => void
  setAutoSource: (source: AutoSource) => void
  setStage: (stage: StageId) => void
  setSentenceFilter: (filter: SentenceFilter) => void
  setAnimeSentences: (enabled: boolean) => void
  setGroupsSelected: (ids: string[], selected: boolean) => void
  toggleCustomGroup: (id: number) => void
  setQuestionCount: (n: number) => void
  setRetry: (retry: boolean) => void
  setTimerSeconds: (s: number) => void
  setPickerScript: (script: Script) => void
}

/** Filtre des phrases réellement appliqué : une série d'anime n'est retenue que si l'option est active. */
export function effectiveSentenceFilter(state: Pick<QuizSettingsState, 'sentenceFilter' | 'animeSentences'>): SentenceFilter {
  const isAnime = state.sentenceFilter === 'dragonball'
  return isAnime && !state.animeSentences ? 'all' : state.sentenceFilter
}

export const useQuizSettingsStore = create<QuizSettingsState>()(
  persist(
    (set) => ({
      mode: 'auto',
      autoScript: 'hiragana',
      autoSource: 'path',
      stage: 1,
      sentenceFilter: 'all',
      animeSentences: false,
      groupIds: ['hiragana-a'],
      customGroupIds: [],
      questionCount: 20,
      retry: true,
      timerSeconds: 0,
      pickerScript: 'hiragana',

      setMode: (mode) => set({ mode }),
      setAutoScript: (autoScript) => set({ autoScript }),
      setAutoSource: (autoSource) => set({ autoSource }),
      setStage: (stage) => set({ stage }),
      setSentenceFilter: (sentenceFilter) => set({ sentenceFilter }),
      setAnimeSentences: (animeSentences) => set({ animeSentences }),
      setGroupsSelected: (ids, selected) =>
        set((s) => ({
          groupIds: selected ? [...new Set([...s.groupIds, ...ids])] : s.groupIds.filter((id) => !ids.includes(id)),
        })),
      toggleCustomGroup: (id) =>
        set((s) => ({
          customGroupIds: s.customGroupIds.includes(id)
            ? s.customGroupIds.filter((c) => c !== id)
            : [...s.customGroupIds, id],
        })),
      setQuestionCount: (questionCount) => set({ questionCount }),
      setRetry: (retry) => set({ retry }),
      setTimerSeconds: (timerSeconds) => set({ timerSeconds }),
      setPickerScript: (pickerScript) => set({ pickerScript }),
    }),
    {
      name: 'kana-quiz-settings',
      version: 3,
      migrate: (persisted, version) => {
        const state = persisted as { stage?: number }
        if (state.stage) state.stage = migrateStage(state.stage, version) ?? 1
        return state as QuizSettingsState
      },
    },
  ),
)
