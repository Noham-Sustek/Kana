import { useRef, useState, type ChangeEvent, type ComponentProps } from 'react'
import { Button } from '@/components/Button'
import { Dialog } from '@/components/Dialog'
import { importBackup } from '@/db/backup'
import { BackupError, importWarning, parseBackup, profileToActivate, type Backup } from '@/features/backup/backup'
import { useProfileStore } from '@/stores/profileStore'
import { useSettingsStore } from '@/stores/settingsStore'

type ImportState =
  | { step: 'idle' }
  | { step: 'confirm'; backup: Backup }
  | { step: 'error'; message: string }
  | { step: 'busy' }

type ImportBackupButtonProps = Omit<ComponentProps<typeof Button>, 'onClick'>

/** Bouton « Importer » : choix du fichier, confirmation (l'import remplace tout), puis rechargement. */
export function ImportBackupButton({ children, ...button }: ImportBackupButtonProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [state, setState] = useState<ImportState>({ step: 'idle' })

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
      useSettingsStore.getState().setOnboarded()
      // Recharge pour appliquer les préférences restaurées à tous les stores.
      location.reload()
    } catch (err) {
      console.error(err)
      setState({ step: 'error', message: 'Import impossible : vos données n’ont pas été modifiées.' })
    }
  }

  return (
    <>
      <Button {...button} onClick={() => fileRef.current?.click()}>
        {children}
      </Button>
      <input ref={fileRef} type="file" accept="application/json,.json" onChange={onFile} className="hidden" />
      {state.step === 'error' && (
        <p role="alert" className="mt-2 basis-full text-[14px] font-medium text-error-ink">
          {state.message}
        </p>
      )}
      {state.step === 'busy' && <p className="mt-2 basis-full text-[14px] text-ink-muted">Import en cours…</p>}
      <Dialog
        open={state.step === 'confirm'}
        title="Remplacer toutes les données ?"
        safeLabel="Annuler"
        onSafe={() => setState({ step: 'idle' })}
        riskyLabel="Remplacer"
        onRisky={() => state.step === 'confirm' && confirmImport(state.backup)}
        irreversible
      >
        {state.step === 'confirm' && importWarning(state.backup, Date.now())}
      </Dialog>
    </>
  )
}
