import { useRef, useState, type ChangeEvent } from 'react'
import { exportBackup, importBackup } from '@/db/backup'
import { BackupError, backupFileName, parseBackup, profileToActivate, type Backup } from '@/features/backup/backup'
import { useProfileStore } from '@/stores/profileStore'

const BUTTON_CLASS =
  'flex min-h-11 flex-1 items-center justify-center rounded-xl border border-slate-200 px-3 text-sm font-medium active:scale-[0.98] dark:border-slate-700'

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

  const buildFile = async () => {
    const backup = await exportBackup()
    return new File([JSON.stringify(backup)], backupFileName(backup.exportedAt), { type: 'application/json' })
  }

  const download = async () => {
    const file = await buildFile()
    const url = URL.createObjectURL(file)
    const a = document.createElement('a')
    a.href = url
    a.download = file.name
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
    setExportMessage(`Fichier « ${file.name} » enregistré dans Téléchargements.`)
  }

  // Partage Android : envoi direct vers Drive, mail, Quick Share…
  const canShare = typeof navigator.canShare === 'function'
  const share = async () => {
    const file = await buildFile()
    if (!navigator.canShare({ files: [file] })) return download()
    try {
      await navigator.share({ files: [file], title: 'Sauvegarde Kana' })
    } catch (err) {
      if ((err as DOMException).name !== 'AbortError') throw err
    }
  }

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
      <p className="text-sm text-slate-600 dark:text-slate-300">
        Toute la progression (profils, réponses, listes) et les réglages, dans un fichier JSON : pour la mettre à l’abri
        ou la transférer sur un autre téléphone.
      </p>

      <div className="mt-3 flex gap-2">
        <button type="button" onClick={download} className={BUTTON_CLASS}>
          Exporter
        </button>
        {canShare && (
          <button type="button" onClick={share} className={BUTTON_CLASS}>
            Partager…
          </button>
        )}
        <button type="button" onClick={() => fileRef.current?.click()} className={BUTTON_CLASS}>
          Importer
        </button>
        <input ref={fileRef} type="file" accept="application/json,.json" onChange={onFile} className="hidden" />
      </div>

      {exportMessage && <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{exportMessage}</p>}

      {state.step === 'error' && <p className="mt-3 text-sm font-medium text-red-600">{state.message}</p>}

      {(state.step === 'confirm' || state.step === 'busy') && (
        <div className="mt-3 rounded-xl border-2 border-red-600 p-3 text-sm">
          {state.step === 'confirm' && (
            <>
              <p>
                Sauvegarde du <b>{dateFormat.format(state.backup.exportedAt)}</b> :{' '}
                {state.backup.profiles.length} profil{state.backup.profiles.length > 1 ? 's' : ''},{' '}
                {state.backup.answers.length} réponse{state.backup.answers.length > 1 ? 's' : ''}.
              </p>
              <p className="mt-1 font-semibold text-red-600">
                Toutes les données actuelles de cet appareil seront remplacées.
              </p>
              <div className="mt-3 flex gap-2">
                <button type="button" onClick={() => setState({ step: 'idle' })} className={BUTTON_CLASS}>
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={() => confirmImport(state.backup)}
                  className="flex min-h-11 flex-1 items-center justify-center rounded-xl bg-red-600 px-3 text-sm font-semibold text-white active:scale-[0.98]"
                >
                  Remplacer
                </button>
              </div>
            </>
          )}
          {state.step === 'busy' && <p>Import en cours…</p>}
        </div>
      )}
    </>
  )
}
