import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo } from 'react'
import type { KanaGroup, Script } from '@/data/kana'
import { loadProfileAnswers } from '@/db/answers'
import { loadAnswersForScript, loadUnlockedGroups } from '@/db/autoState'
import { UNLOCK_RATIO, acquiredRatio, cardKey, isMastered } from '@/engine/scheduler'
import { activeKana, createAutoContext, createSelectionContext } from '@/features/quiz/auto'
import type { StageId } from '@/features/quiz/types'
import { useProfileStore } from '@/stores/profileStore'

export interface AutoOverview {
  activeGroups: KanaGroup[]
  nextGroup: KanaGroup | undefined
  /** Part des kana actifs acquis, et seuil requis pour débloquer le suivant. */
  ratio: number
  requiredRatio: number
  /** Kana actifs maîtrisés à chaque stage. */
  perStage: { stage: StageId; mastered: number; total: number }[]
}

/**
 * Résumé de la progression du mode auto (se met à jour en direct) : parcours
 * guidé de `script`, ou kana choisis si `selection` est fourni.
 */
export function useAutoOverview(
  script: Script,
  stages: StageId[],
  selection: string[] | null = null,
): AutoOverview | undefined {
  const profileId = useProfileStore((s) => s.profileId)
  const isSelection = selection !== null
  const data = useLiveQuery(
    async () =>
      isSelection
        ? { history: await loadProfileAnswers(profileId), unlocked: 0 }
        : {
            history: await loadAnswersForScript(profileId, script),
            unlocked: await loadUnlockedGroups(profileId, script),
          },
    [profileId, script, isSelection],
  )

  const stagesKey = stages.join(',')
  const selectionKey = selection?.join(',')
  return useMemo(() => {
    if (!data) return undefined
    const ctx = selection
      ? createSelectionContext(selection, stages, data.history)
      : createAutoContext(script, stages, data.history, data.unlocked)
    const active = activeKana(ctx).map((k) => k.id)
    return {
      activeGroups: ctx.path.slice(0, ctx.unlocked),
      nextGroup: ctx.path[ctx.unlocked],
      ratio: acquiredRatio(ctx.path, ctx.unlocked, ctx.progress, stages),
      requiredRatio: UNLOCK_RATIO,
      perStage: stages.map((stage) => ({
        stage,
        mastered: active.filter((id) => isMastered(ctx.progress.get(cardKey(id, stage)))).length,
        total: active.length,
      })),
    }
    // Clés texte plutôt que les tableaux, recréés à chaque rendu par l'appelant.
  }, [data, script, stagesKey, selectionKey])
}
