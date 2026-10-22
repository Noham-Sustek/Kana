/** Marche à suivre pour installer une voix japonaise sur Android (Samsung / Google). */
export function JapaneseVoiceHelp() {
  return (
    <div className="mt-4 rounded-xl bg-slate-100 p-3 text-sm leading-relaxed text-slate-700 dark:bg-slate-800 dark:text-slate-300">
      <p className="font-semibold">Installer une voix japonaise (Android)</p>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        Le son de l’exercice « Écouter » (stage 5) utilise la synthèse vocale du téléphone, qui fonctionne hors ligne une
        fois la voix téléchargée.
      </p>
      <ol className="mt-2 list-decimal space-y-1.5 pl-5">
        <li>
          Ouvrez <b>Paramètres</b> et cherchez « <b>synthèse vocale</b> » (sur Samsung : Gestion globale → Synthèse
          vocale).
        </li>
        <li>
          Dans <b>Moteur préféré</b>, choisissez <b>Services vocaux Google</b> (recommandé) ou <b>Samsung TTS</b>.
        </li>
        <li>
          Touchez l’engrenage ⚙ à côté du moteur → <b>Installer les données vocales</b> → <b>Japonais (日本語)</b>, puis
          téléchargez la voix.
        </li>
        <li>Fermez complètement Kana (et Chrome) puis rouvrez-la, ou touchez « Vérifier ».</li>
      </ol>
      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
        Si « Services vocaux Google » n’apparaît pas, installez-le depuis le Play Store (« Speech Services by Google »).
      </p>
    </div>
  )
}
