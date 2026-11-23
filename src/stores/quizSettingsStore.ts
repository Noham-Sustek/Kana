import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { PathScript, Script } from '@/data/kana'
import type { SentenceFilter } from '@/features/quiz/questions'
import { migrateStage } from '@/features/quiz/stages'
import type { DrawingCheck, StageId } from '@/features/quiz/types'

export const QUESTION_COUNTS = [10, 20, 50] as const
export const TIMER_OPTIONS = [0, 5, 10, 20] as const

/** Sélecteur de kana de la session libre : une écriture, ou les listes personnelles. */
export type PickerTab = Script | 'lists'

interface QuizSettingsState {
  /** Écriture du parcours (Session du jour : chaque écriture a sa propre progression). */
  autoScript: PathScript
  /** Session libre : exercice choisi. */
  stage: StageId
  /** Écriture des phrases des stages 8 et 9 (session libre). */
  sentenceFilter: SentenceFilter
  /** Répliques de Dragon Ball ajoutées aux phrases des stages 8 et 9 (session libre). */
  animeSentences: boolean
  /** Groupes prédéfinis cochés (ids de KANA_GROUPS). */
  groupIds: string[]
  /** Listes personnalisées cochées (ids Dexie). */
  customGroupIds: number[]
  questionCount: number
  retry: boolean
  timerSeconds: number
  /** Validation des dessins (stages 5 et 7) : automatique ou par l'utilisateur. */
  drawingCheck: DrawingCheck
  /** Onglet du sélecteur de kana de la session libre. */
  pickerScript: PickerTab

  setAutoScript: (script: PathScript) => void
  setStage: (stage: StageId) => void
  setSentenceFilter: (filter: SentenceFilter) => void
  setAnimeSentences: (enabled: boolean) => void
  setGroupsSelected: (ids: string[], selected: boolean) => void
  toggleCustomGroup: (id: number) => void
  setQuestionCount: (n: number) => void
  setRetry: (retry: boolean) => void
  setTimerSeconds: (s: number) => void
  setDrawingCheck: (check: DrawingCheck) => void
  setPickerScript: (tab: PickerTab) => void
}

export const useQuizSettingsStore = create<QuizSettingsState>()(
  persist(
    (set) => ({
      autoScript: 'hiragana',
      stage: 1,
      sentenceFilter: 'all',
      animeSentences: false,
      groupIds: ['hiragana-a'],
      customGroupIds: [],
      questionCount: 20,
      retry: true,
      timerSeconds: 0,
      drawingCheck: 'auto',
      pickerScript: 'hiragana',

      setAutoScript: (autoScript) => set({ autoScript }),
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
      setDrawingCheck: (drawingCheck) => set({ drawingCheck }),
      setPickerScript: (pickerScript) => set({ pickerScript }),
    }),
    {
      name: 'kana-quiz-settings',
      version: 4,
      migrate: (persisted, version) => {
        const state = persisted as { stage?: number; sentenceFilter?: string; mode?: unknown; autoSource?: unknown }
        if (state.stage && version < 3) state.stage = migrateStage(state.stage, version) ?? 1
        // v4 : Dragon Ball n'est plus un filtre exclusif mais un ajout (`animeSentences`) ; plus de mode auto / manuel.
        if (state.sentenceFilter === 'dragonball') state.sentenceFilter = 'all'
        delete state.mode
        delete state.autoSource
        return state as QuizSettingsState
      },
    },
  ),
)
