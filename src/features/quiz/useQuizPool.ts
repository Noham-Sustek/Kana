import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo } from 'react'
import { KANA, type Kana } from '@/data/kana'
import { db, type CustomGroup } from '@/db/db'
import { useProfileStore } from '@/stores/profileStore'
import { useQuizSettingsStore } from '@/stores/quizSettingsStore'

const NO_GROUPS: CustomGroup[] = []

/** Listes personnalisées du profil actif, par nom. */
export function useCustomGroups(): CustomGroup[] {
  const profileId = useProfileStore((s) => s.profileId)
  return useLiveQuery(
    () => db.customGroups.where('profileId').equals(profileId).sortBy('name'),
    [profileId],
    NO_GROUPS,
  )
}

/** Kana à travailler : groupes cochés + listes personnalisées cochées, sans doublon. */
export function useQuizPool(): Kana[] {
  const groupIds = useQuizSettingsStore((s) => s.groupIds)
  const customGroupIds = useQuizSettingsStore((s) => s.customGroupIds)
  const customGroups = useCustomGroups()

  return useMemo(() => {
    const ids = new Set<string>()
    const groups = new Set(groupIds)
    for (const k of KANA) if (groups.has(k.groupId)) ids.add(k.id)
    for (const g of customGroups) {
      if (customGroupIds.includes(g.id)) for (const id of g.kanaIds) ids.add(id)
    }
    // Ordre canonique de KANA, indépendant de l'ordre de sélection.
    return KANA.filter((k) => ids.has(k.id))
  }, [groupIds, customGroupIds, customGroups])
}
