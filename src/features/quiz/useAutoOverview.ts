import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo } from 'react'
import type { KanaGroup, Script } from '@/data/kana'
import { loadAnswersForScript, loadUnlockedGroups } from '@/db/autoState'
import { UNLOCK_RATIO, acquiredRatio, activeKanaIds, cardKey, isMastered } from '@/engine/scheduler'
import { createAutoContext } from '@/features/quiz/auto'
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

/** Résumé de la progression du mode auto pour une écriture (se met à jour en direct). */
export function useAutoOverview(script: Script, stages: StageId[]): AutoOverview | undefined {
  const profileId = useProfileStore((s) => s.profileId)
  const data = useLiveQuery(
    async () => ({
      history: await loadAnswersForScript(profileId, script),
      unlocked: await loadUnlockedGroups(profileId, script),
    }),
    [profileId, script],
  )

  const stagesKey = stages.join(',')
  return useMemo(() => {
    if (!data) return undefined
    const ctx = createAutoContext(script, stages, data.history, data.unlocked)
    const active = activeKanaIds(ctx.path, ctx.unlocked)
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
    // stagesKey plutôt que `stages`, tableau recréé à chaque rendu par l'appelant.
  }, [data, script, stagesKey])
}
