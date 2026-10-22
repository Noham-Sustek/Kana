import { db } from '@/db/db'
import { BACKUP_FORMAT, BACKUP_VERSION, PREFERENCE_KEYS, type Backup } from '@/features/backup/backup'

export async function exportBackup(): Promise<Backup> {
  const [profiles, answers, customGroups, autoStates] = await db.transaction(
    'r',
    [db.profiles, db.answers, db.customGroups, db.autoStates],
    () => Promise.all([db.profiles.toArray(), db.answers.toArray(), db.customGroups.toArray(), db.autoStates.toArray()]),
  )
  const preferences: Record<string, string> = {}
  for (const key of PREFERENCE_KEYS) {
    const value = localStorage.getItem(key)
    if (value !== null) preferences[key] = value
  }
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: Date.now(),
    profiles,
    answers,
    customGroups,
    autoStates,
    preferences,
  }
}

/**
 * Remplace toutes les données de l'appareil par la sauvegarde. Les préférences
 * sont réécrites dans le localStorage : recharger la page pour les appliquer.
 */
export async function importBackup(backup: Backup): Promise<void> {
  await db.transaction('rw', [db.profiles, db.answers, db.customGroups, db.autoStates], async () => {
    await Promise.all([db.profiles.clear(), db.answers.clear(), db.customGroups.clear(), db.autoStates.clear()])
    await db.profiles.bulkAdd(backup.profiles)
    await db.answers.bulkAdd(backup.answers)
    await db.customGroups.bulkAdd(backup.customGroups)
    await db.autoStates.bulkAdd(backup.autoStates)
  })
  for (const [key, value] of Object.entries(backup.preferences)) localStorage.setItem(key, value)
}
