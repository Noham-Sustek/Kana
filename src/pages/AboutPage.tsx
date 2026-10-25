import { useNavigate } from 'react-router'
import { Icon } from '@/components/Icon'
import { PageHeader } from '@/components/PageHeader'

const LINK_CLASS = 'font-medium text-accent-600 underline underline-offset-2 dark:text-accent-500'

export function AboutPage() {
  const navigate = useNavigate()

  return (
    <>
      <button
        type="button"
        onClick={() => navigate('/settings', { replace: true })}
        className="-ml-2 mb-2 flex min-h-11 items-center gap-1 px-2 text-sm font-medium text-slate-600 dark:text-slate-300"
      >
        <Icon name="chevronLeft" className="size-5" />
        Réglages
      </button>
      <PageHeader title="À propos" />

      <section className="rounded-2xl bg-white p-4 text-sm leading-relaxed shadow-sm dark:bg-slate-900">
        <h2 className="mb-2 font-semibold">Kana</h2>
        <p className="text-slate-600 dark:text-slate-300">
          Application personnelle pour apprendre les hiragana et katakana. Fonctionne entièrement hors ligne, sans compte,
          sans publicité ni suivi : vos données restent sur cet appareil.
        </p>
      </section>

      <section className="mt-4 rounded-2xl bg-white p-4 text-sm leading-relaxed shadow-sm dark:bg-slate-900">
        <h2 className="mb-2 font-semibold">Tracés des kana</h2>
        <p className="text-slate-600 dark:text-slate-300">
          Les formes et l'ordre des traits proviennent de{' '}
          <a href="https://kanjivg.tagaini.net" target="_blank" rel="noopener noreferrer" className={LINK_CLASS}>
            KanjiVG
          </a>
          , © Ulrich Apel et les contributeurs de KanjiVG, distribué sous licence{' '}
          <a
            href="https://creativecommons.org/licenses/by-sa/3.0/deed.fr"
            target="_blank"
            rel="noopener noreferrer"
            className={LINK_CLASS}
          >
            Creative Commons Attribution – Partage dans les mêmes conditions 3.0 (CC BY-SA 3.0)
          </a>
          .
        </p>
        <p className="mt-2 text-slate-600 dark:text-slate-300">
          Modifications : les tracés SVG ont été convertis en suites de points (courbes aplaties puis rééchantillonnées)
          pour l'animation et la validation. Ces données dérivées sont distribuées sous la même licence.
        </p>
      </section>

      <section className="mt-4 rounded-2xl bg-white p-4 text-sm leading-relaxed shadow-sm dark:bg-slate-900">
        <h2 className="mb-2 font-semibold">Mots</h2>
        <p className="text-slate-600 dark:text-slate-300">
          Une partie des mots et de leurs traductions provient du dictionnaire{' '}
          <a href="https://jiyomi.app" target="_blank" rel="noopener noreferrer" className={LINK_CLASS}>
            Jiyomi
          </a>
          , construit sur{' '}
          <a href="https://www.edrdg.org/jmdict/j_jmdict.html" target="_blank" rel="noopener noreferrer" className={LINK_CLASS}>
            JMdict
          </a>{' '}
          © Electronic Dictionary Research and Development Group (EDRDG), sens français © Jiyomi, distribués sous licence{' '}
          <a
            href="https://creativecommons.org/licenses/by-sa/4.0/deed.fr"
            target="_blank"
            rel="noopener noreferrer"
            className={LINK_CLASS}
          >
            Creative Commons Attribution – Partage dans les mêmes conditions 4.0 (CC BY-SA 4.0)
          </a>
          .
        </p>
        <p className="mt-2 text-slate-600 dark:text-slate-300">
          Modifications : sélection des mots courants écrits en kana et raccourcissement des traductions. Cette liste
          dérivée est distribuée sous la même licence.
        </p>
      </section>
    </>
  )
}
