import { exportBackup } from '@/db/backup'
import { backupFileName } from '@/features/backup/backup'
import { useSettingsStore } from '@/stores/settingsStore'

/** Fichier JSON de la sauvegarde complète (tous profils). */
export async function buildBackupFile(): Promise<File> {
  const backup = await exportBackup()
  return new File([JSON.stringify(backup)], backupFileName(backup.exportedAt), { type: 'application/json' })
}

/** Télécharge la sauvegarde et note la date (rappel de l'Accueil). Renvoie le nom du fichier. */
export async function downloadBackup(): Promise<string> {
  const file = await buildBackupFile()
  const url = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = url
  a.download = file.name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
  useSettingsStore.getState().markBackedUp(Date.now())
  return file.name
}

/** Partage Android (Drive, mail, Quick Share…), sinon téléchargement. */
export async function shareBackup(): Promise<void> {
  const file = await buildBackupFile()
  if (!navigator.canShare({ files: [file] })) {
    await downloadBackup()
    return
  }
  try {
    await navigator.share({ files: [file], title: 'Sauvegarde Kana' })
    useSettingsStore.getState().markBackedUp(Date.now())
  } catch (err) {
    if ((err as DOMException).name !== 'AbortError') throw err
  }
}
