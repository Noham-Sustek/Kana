import { Icon } from '@/components/Icon'
import { JapaneseVoiceHelp } from '@/components/JapaneseVoiceHelp'
import { recheckVoices, useKanaAudio, type VoiceStatus } from '@/features/audio/useKanaAudio'

const STATUS_TEXT: Record<VoiceStatus, string> = {
  checking: 'Recherche d’une voix japonaise…',
  ready: 'Voix japonaise disponible',
  missing: 'Aucune voix japonaise installée',
  unsupported: 'Synthèse vocale non prise en charge par ce navigateur',
}

/** État de la voix japonaise, bouton de test et aide à l'installation. */
export function VoiceSettings() {
  const audio = useKanaAudio()

  return (
    <>
      <div className="flex items-center gap-3">
        <span
          className={`size-2.5 shrink-0 rounded-full ${
            audio.status === 'ready'
              ? 'bg-emerald-600'
              : audio.status === 'checking'
                ? 'animate-pulse bg-slate-400'
                : 'bg-red-600'
          }`}
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{STATUS_TEXT[audio.status]}</p>
          {audio.voiceName && (
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">{audio.voiceName}</p>
          )}
        </div>
        {audio.available ? (
          <button
            type="button"
            onClick={() => audio.play('あいうえお')}
            className="flex min-h-11 items-center gap-1.5 rounded-xl bg-accent-600 px-3 text-sm font-semibold text-white active:scale-95"
          >
            <Icon name="volume" className="size-5" />
            Tester
          </button>
        ) : (
          audio.status === 'missing' && (
            <button
              type="button"
              onClick={recheckVoices}
              className="flex min-h-11 items-center gap-1.5 rounded-xl border border-slate-200 px-3 text-sm font-medium dark:border-slate-700"
            >
              <Icon name="replay" className="size-4" />
              Vérifier
            </button>
          )
        )}
      </div>
      {audio.status === 'missing' && <JapaneseVoiceHelp />}
    </>
  )
}
