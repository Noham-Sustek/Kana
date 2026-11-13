import { Link } from 'react-router'
import { Button } from '@/components/Button'
import { ProgressBar } from '@/components/ProgressBar'
import { groupGlyph } from '@/data/kana'
import { AUTO_STAGES } from '@/features/quiz/auto'
import { useAutoOverview } from '@/features/quiz/useAutoOverview'
import { useStartDailySession } from '@/lib/useStartDailySession'
import { useQuizSettingsStore } from '@/stores/quizSettingsStore'

const SCRIPT_LABEL = { hiragana: 'Hiragana', katakana: 'Katakana' } as const

/** Accueil : où j'en suis, que faire maintenant. Version provisoire (étape 2 de la refonte) :
 *  la série, le parcours en cases et les kana à consolider arrivent à l'étape 4. */
export function HomePage() {
  const script = useQuizSettingsStore((s) => s.autoScript)
  const questionCount = useQuizSettingsStore((s) => s.questionCount)
  const overview = useAutoOverview(script, AUTO_STAGES)
  const startDaily = useStartDailySession()
  const progress = overview ? Math.min(1, overview.ratio / overview.requiredRatio) : 0

  return (
    <div className="flex min-h-full flex-col">
      <p className="text-[11px] leading-[14px] font-bold tracking-[0.12em] text-ink-muted uppercase">
        Parcours · {SCRIPT_LABEL[script]}
      </p>
      {overview && (
        <div className="mt-3">
          <p className="font-serif text-2xl leading-tight font-medium">
            {overview.activeGroups.length} ligne{overview.activeGroups.length > 1 ? 's' : ''} en cours
          </p>
          {overview.nextGroup ? (
            <>
              <ProgressBar value={progress} label="Avancée vers la ligne suivante" className="mt-3" />
              <p className="mt-2 text-[13.5px] leading-[19px] text-ink-muted">
                {Math.round(overview.ratio * 100)} % des kana en cours sont acquis. À{' '}
                {Math.round(overview.requiredRatio * 100)} %, la ligne{' '}
                <span className="font-jp text-ink">{groupGlyph(overview.nextGroup)}</span> s’ouvre.
              </p>
            </>
          ) : (
            <p className="mt-2 text-[13.5px] leading-[19px] text-ink-muted">Toutes les lignes sont ouvertes.</p>
          )}
        </div>
      )}

      <div className="sticky -bottom-4 z-10 -mx-4 mt-auto bg-paper px-4 pt-6 pb-5">
        <Button detail={`${questionCount} questions`} icon="arrow" onClick={startDaily}>
          Session du jour
        </Button>
        <Link
          to="/learn"
          className="mt-1 flex min-h-11 items-center justify-center text-[14.5px] font-semibold text-accent"
        >
          Session libre
        </Link>
      </div>
    </div>
  )
}
