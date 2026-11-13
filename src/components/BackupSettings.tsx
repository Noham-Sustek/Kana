import { useState } from 'react'
import { Button } from '@/components/Button'
import { ImportBackupButton } from '@/components/ImportBackupButton'
import { lastExportLine } from '@/features/backup/backup'
import { canShareBackup, downloadBackup, shareBackup } from '@/lib/backupFile'
import { useSettingsStore } from '@/stores/settingsStore'

/** Export de la progression en JSON et import (remplace tout) depuis un fichier. */
export function BackupSettings() {
  const lastBackupAt = useSettingsStore((s) => s.lastBackupAt)
  const [exportMessage, setExportMessage] = useState<string | null>(null)

  const download = async () => {
    setExportMessage(await downloadBackup())
  }

  // Partage Android : envoi direct vers Drive, mail, Quick Share…
  const canShare = canShareBackup()

  return (
    <>
      <p className="text-[14.5px] leading-5 text-ink-muted">
        {lastExportLine(lastBackupAt, Date.now())} Le fichier contient tous les profils et les réglages : de quoi les
        mettre à l’abri ou les transférer sur un autre téléphone.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="line" size="sm" className="flex-1 px-2" icon="download" iconPosition="start" onClick={download}>
          Exporter
        </Button>
        {canShare && (
          <Button variant="line" size="sm" className="flex-1 px-2" onClick={shareBackup}>
            Partager…
          </Button>
        )}
        <ImportBackupButton variant="line" size="sm" className="flex-1 px-2" icon="upload" iconPosition="start">
          Importer
        </ImportBackupButton>
      </div>

      {exportMessage && <p className="mt-2 text-[13px] leading-[18px] text-ink-muted">{exportMessage}</p>}
    </>
  )
}
