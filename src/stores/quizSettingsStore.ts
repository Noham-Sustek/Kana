import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Script } from '@/data/kana'
import type { StageId } from '@/features/quiz/types'

export const QUESTION_COUNTS = [10, 20, 50] as const
export const TIMER_OPTIONS = [0, 5, 10, 20] as const

interface QuizSettingsState {
  stage: StageId
  /** Groupes prédéfinis cochés (ids de KANA_GROUPS). */
  groupIds: string[]
  /** Listes personnalisées cochées (ids Dexie). */
  customGroupIds: number[]
  questionCount: number
  retry: boolean
  timerSeconds: number
  /** Écriture affichée dans le sélecteur de groupes. */
  pickerScript: Script

  setStage: (stage: StageId) => void
  setGroupsSelected: (ids: string[], selected: boolean) => void
  toggleCustomGroup: (id: number) => void
  setQuestionCount: (n: number) => void
  setRetry: (retry: boolean) => void
  setTimerSeconds: (s: number) => void
  setPickerScript: (script: Script) => void
}

export const useQuizSettingsStore = create<QuizSettingsState>()(
  persist(
    (set) => ({
      stage: 1,
      groupIds: ['hiragana-a'],
      customGroupIds: [],
      questionCount: 20,
      retry: true,
      timerSeconds: 0,
      pickerScript: 'hiragana',

      setStage: (stage) => set({ stage }),
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
    { name: 'kana-quiz-settings', version: 1 },
  ),
)
