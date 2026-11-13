import { db } from '@/db/db'
import { BACKUP_FORMAT, BACKUP_VERSION, PREFERENCE_KEYS, type Backup } from '@/features/backup/backup'

export async function exportBackup(): Promise<Backup> {
  const [profiles, answers, customGroups, autoStates, writingResults] = await db.transaction(
    'r',
    [db.profiles, db.answers, db.customGroups, db.autoStates, db.writingResults],
    () =>
      Promise.all([
        db.profiles.toArray(),
        db.answers.toArray(),
        db.customGroups.toArray(),
        db.autoStates.toArray(),
        db.writingResults.toArray(),
      ]),
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
    writingResults,
    preferences,
  }
}

/**
 * Remplace toutes les données de l'appareil par la sauvegarde. Les préférences
 * sont réécrites dans le localStorage : recharger la page pour les appliquer.
 */
export async function importBackup(backup: Backup): Promise<void> {
  const tables = [db.profiles, db.answers, db.customGroups, db.autoStates, db.writingResults]
  await db.transaction('rw', tables, async () => {
    await Promise.all(tables.map((t) => t.clear()))
    await db.profiles.bulkAdd(backup.profiles)
    await db.answers.bulkAdd(backup.answers)
    await db.customGroups.bulkAdd(backup.customGroups)
    await db.autoStates.bulkAdd(backup.autoStates)
    await db.writingResults.bulkAdd(backup.writingResults)
  })
  for (const [key, value] of Object.entries(backup.preferences)) localStorage.setItem(key, value)
}
