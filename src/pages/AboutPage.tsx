import { useNavigate } from 'react-router'
import { Icon } from '@/components/Icon'
import { PageHeader } from '@/components/PageHeader'

const LINK_CLASS = 'font-medium text-accent underline underline-offset-2'

// Textes de licence servis depuis public/licenses/ (précachés : lisibles hors ligne).
const FONTS = [
  { name: 'Klee One', copyright: '© 2020 The Klee Project Authors (Fontworks)', license: './licenses/KleeOne-OFL.txt' },
  { name: 'Newsreader', copyright: '© 2020 The Newsreader Project Authors (Production Type)', license: './licenses/newsreader-OFL.txt' },
  { name: 'Figtree', copyright: '© 2022 The Figtree Project Authors (Erik Kennedy)', license: './licenses/figtree-OFL.txt' },
]

export function AboutPage() {
  const navigate = useNavigate()

  return (
    <>
      <button
        type="button"
        onClick={() => navigate('/settings', { replace: true })}
        className="-ml-2 mb-2 flex min-h-11 items-center gap-1 px-2 text-sm font-medium text-ink-muted"
      >
        <Icon name="chevronLeft" className="size-5" />
        Réglages
      </button>
      <PageHeader title="À propos" />

      <section className="rounded-md border border-hairline p-4 text-sm leading-relaxed">
        <h2 className="mb-2 font-semibold">Kana</h2>
        <p className="text-ink-muted">
          Application personnelle pour apprendre les hiragana et katakana. Fonctionne entièrement hors ligne, sans compte,
          sans publicité ni suivi : vos données restent sur cet appareil.
        </p>
      </section>

      <section className="mt-4 rounded-md border border-hairline p-4 text-sm leading-relaxed">
        <h2 className="mb-2 font-semibold">Tracés des kana</h2>
        <p className="text-ink-muted">
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
        <p className="mt-2 text-ink-muted">
          Modifications : les tracés SVG ont été convertis en suites de points (courbes aplaties puis rééchantillonnées)
          pour l'animation et la validation. Ces données dérivées sont distribuées sous la même licence.
        </p>
      </section>

      <section className="mt-4 rounded-md border border-hairline p-4 text-sm leading-relaxed">
        <h2 className="mb-2 font-semibold">Mots</h2>
        <p className="text-ink-muted">
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
        <p className="mt-2 text-ink-muted">
          Modifications : sélection des mots courants écrits en kana et raccourcissement des traductions. Cette liste
          dérivée est distribuée sous la même licence.
        </p>
      </section>

      <section className="mt-4 rounded-md border border-hairline p-4 text-sm leading-relaxed">
        <h2 className="mb-2 font-semibold">Livre</h2>
        <p className="text-ink-muted">
          Les phrases du livre (lecture chronométrée, stages 8 et 9) viennent de <span className="font-jp">銀河鉄道の夜</span>{' '}
          (<em>Train de nuit dans la Voie lactée</em>) de Kenji Miyazawa, œuvre du domaine public, dans le texte saisi par{' '}
          <a
            href="https://www.aozora.gr.jp/cards/000081/card456.html"
            target="_blank"
            rel="noopener noreferrer"
            className={LINK_CLASS}
          >
            Aozora Bunko
          </a>
          .
        </p>
        <p className="mt-2 text-ink-muted">
          Kanji réécrits en kana (lectures de l’auteur quand il les donne), découpage en mots et traduction française
          faits pour cette application.
        </p>
      </section>

      <section className="mt-4 rounded-md border border-hairline p-4 text-sm leading-relaxed">
        <h2 className="mb-2 font-semibold">Polices</h2>
        <p className="text-ink-muted">
          Polices embarquées dans l’application, distribuées sous licence SIL Open Font License 1.1 :
        </p>
        <ul className="mt-2 space-y-1 text-ink-muted">
          {FONTS.map((f) => (
            <li key={f.name}>
              <a href={f.license} target="_blank" rel="noopener noreferrer" className={LINK_CLASS}>
                {f.name}
              </a>{' '}
              — {f.copyright}
            </li>
          ))}
        </ul>
        <p className="mt-2 text-ink-muted">
          Modification : Klee One est réduite aux seuls kana, Newsreader et Figtree aux caractères latins.
        </p>
      </section>
    </>
  )
}
