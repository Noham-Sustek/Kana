import { Capacitor } from '@capacitor/core'
import { exportBackup } from '@/db/backup'
import { backupFileName } from '@/features/backup/backup'
import { useSettingsStore } from '@/stores/settingsStore'

/** Fichier JSON de la sauvegarde complète (tous profils). */
export async function buildBackupFile(): Promise<File> {
  const backup = await exportBackup()
  return new File([JSON.stringify(backup)], backupFileName(backup.exportedAt), { type: 'application/json' })
}

const NATIVE_FOLDER = 'Kana'

/** Enregistre la sauvegarde et note la date (rappel de l'Accueil). Renvoie où elle se trouve. */
export async function downloadBackup(): Promise<string> {
  const file = await buildBackupFile()
  if (Capacitor.isNativePlatform()) {
    // Application Android : la WebView ignore les liens de téléchargement, on écrit dans Documents.
    const { Directory, Encoding, Filesystem } = await import('@capacitor/filesystem')
    await Filesystem.writeFile({
      path: `${NATIVE_FOLDER}/${file.name}`,
      data: await file.text(),
      directory: Directory.Documents,
      encoding: Encoding.UTF8,
      recursive: true,
    })
    useSettingsStore.getState().markBackedUp(Date.now())
    return `Fichier « ${file.name} » enregistré dans Documents/${NATIVE_FOLDER}.`
  }
  const url = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = url
  a.download = file.name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
  useSettingsStore.getState().markBackedUp(Date.now())
  return `Fichier « ${file.name} » enregistré dans Téléchargements.`
}

/** Le partage de fichier est-il possible (Android : application ou Chrome) ? */
export function canShareBackup(): boolean {
  return Capacitor.isNativePlatform() || typeof navigator.canShare === 'function'
}

/** Partage Android (Drive, mail, Quick Share…), sinon téléchargement. */
export async function shareBackup(): Promise<void> {
  const file = await buildBackupFile()
  if (Capacitor.isNativePlatform()) {
    const { Directory, Encoding, Filesystem } = await import('@capacitor/filesystem')
    const { Share } = await import('@capacitor/share')
    const { uri } = await Filesystem.writeFile({
      path: file.name,
      data: await file.text(),
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
    })
    try {
      await Share.share({ title: 'Sauvegarde Kana', files: [uri] })
      useSettingsStore.getState().markBackedUp(Date.now())
    } catch {
      // Partage annulé.
    }
    return
  }
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
