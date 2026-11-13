import { useRef, useState, type ChangeEvent } from 'react'
import { Button } from '@/components/Button'
import { Dialog } from '@/components/Dialog'
import { importBackup } from '@/db/backup'
import { BackupError, parseBackup, profileToActivate, type Backup } from '@/features/backup/backup'
import { downloadBackup, shareBackup } from '@/lib/backupFile'
import { useProfileStore } from '@/stores/profileStore'

const dateFormat = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeStyle: 'short' })

type ImportState =
  | { step: 'idle' }
  | { step: 'confirm'; backup: Backup }
  | { step: 'error'; message: string }
  | { step: 'busy' }

/** Export de la progression en JSON et import (remplace tout) depuis un fichier. */
export function BackupSettings() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [state, setState] = useState<ImportState>({ step: 'idle' })
  const [exportMessage, setExportMessage] = useState<string | null>(null)

  const download = async () => {
    const name = await downloadBackup()
    setExportMessage(`Fichier « ${name} » enregistré dans Téléchargements.`)
  }

  // Partage Android : envoi direct vers Drive, mail, Quick Share…
  const canShare = typeof navigator.canShare === 'function'
  const share = shareBackup

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      setState({ step: 'confirm', backup: parseBackup(JSON.parse(await file.text())) })
    } catch (err) {
      const message =
        err instanceof BackupError
          ? err.message
          : err instanceof SyntaxError
            ? 'Fichier illisible : ce n’est pas du JSON valide.'
            : 'Lecture du fichier impossible.'
      setState({ step: 'error', message })
    }
  }

  const confirmImport = async (backup: Backup) => {
    setState({ step: 'busy' })
    try {
      await importBackup(backup)
      useProfileStore.getState().setProfileId(profileToActivate(backup))
      // Recharge pour appliquer les préférences restaurées à tous les stores.
      location.reload()
    } catch (err) {
      console.error(err)
      setState({ step: 'error', message: 'Import impossible : vos données n’ont pas été modifiées.' })
    }
  }

  return (
    <>
      <p className="text-sm text-ink-muted">
        Toute la progression (profils, réponses, listes) et les réglages, dans un fichier JSON : pour la mettre à l’abri
        ou la transférer sur un autre téléphone.
      </p>

      <div className="mt-3 flex gap-2">
        <Button variant="line" size="sm" className="flex-1 px-2" icon="download" iconPosition="start" onClick={download}>
          Exporter
        </Button>
        {canShare && (
          <Button variant="line" size="sm" className="flex-1 px-2" onClick={share}>
            Partager…
          </Button>
        )}
        <Button
          variant="line"
          size="sm"
          className="flex-1 px-2"
          icon="upload"
          iconPosition="start"
          onClick={() => fileRef.current?.click()}
        >
          Importer
        </Button>
        <input ref={fileRef} type="file" accept="application/json,.json" onChange={onFile} className="hidden" />
      </div>

      {exportMessage && <p className="mt-2 text-xs text-ink-muted">{exportMessage}</p>}

      {state.step === 'error' && <p className="mt-3 text-sm font-medium text-error-ink">{state.message}</p>}

      {state.step === 'busy' && <p className="mt-3 text-sm text-ink-muted">Import en cours…</p>}

      <Dialog
        open={state.step === 'confirm'}
        title="Remplacer toutes les données ?"
        safeLabel="Annuler"
        onSafe={() => setState({ step: 'idle' })}
        riskyLabel="Remplacer"
        onRisky={() => state.step === 'confirm' && confirmImport(state.backup)}
        irreversible
      >
        {state.step === 'confirm' && (
          <>
            Sauvegarde du {dateFormat.format(state.backup.exportedAt)} : {state.backup.profiles.length} profil
            {state.backup.profiles.length > 1 ? 's' : ''}, {state.backup.answers.length} réponse
            {state.backup.answers.length > 1 ? 's' : ''}. Toutes les données actuelles de cet appareil seront
            remplacées.
          </>
        )}
      </Dialog>
    </>
  )
}
