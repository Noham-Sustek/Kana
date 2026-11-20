import { useState } from 'react'
import { Link } from 'react-router'
import { ReloadGuide } from '@/components/reload/ReloadGuide'
import { GROUP_KIND_LABELS, getKana, groupsOfScript, type GroupKind, type KanaGroup, type Script } from '@/data/kana'
import type { KanaProgress } from '@/features/kana/useKanaProgress'
import { heatLevel } from '@/features/stats/heat'
import { WRITABLE_KINDS } from '@/features/writing/progress'

const KIND_ORDER: GroupKind[] = ['gojuon', 'dakuten', 'handakuten', 'yoon', 'extended']

interface ReloadKanaLinesProps {
  script: Script
  progress: KanaProgress | undefined
}

/** Vue « Lignes » de l'onglet Kana (style Reload) : une rangée par ligne, avec le nombre de kana
 *  acquis (réussite ≥ 90 %). La rangée choisie montre ses kana, chacun ouvre sa fiche. */
export function ReloadKanaLines({ script, progress }: ReloadKanaLinesProps) {
  const groups = groupsOfScript(script)
  const [selectedId, setSelectedId] = useState<string>(() => firstOpenLine(groups, progress)?.id ?? groups[0]!.id)
  const selected = groups.find((g) => g.id === selectedId) ?? groups[0]!
  const acquired = (g: KanaGroup) => g.kanaIds.filter((id) => heatLevel(progress?.perKana.get(id)) === 4).length
  const firstKana = selected.kanaIds[0]!
  const art = getKana(firstKana)!.char
  const doneLines = groups.filter((g) => g.kind === 'gojuon' && acquired(g) === g.kanaIds.length).length
  const gojuonTotal = groups.filter((g) => g.kind === 'gojuon').length

  return (
    <>
      <span key={art} aria-hidden="true" className={`rl-art rl-rise pointer-events-none fixed top-[46%] right-[-44px] z-0 rotate-[10deg] opacity-40 lg:right-[6%] ${[...art].length > 1 ? 'text-[150px]' : 'text-[260px]'}`}>
        {art}
      </span>
      <div className="relative -mx-4 mt-1">
        {KIND_ORDER.map((kind) => {
          const section = groups.filter((g) => g.kind === kind)
          if (section.length === 0) return null
          return (
            <section key={kind} className="mb-3">
              {kind !== 'gojuon' && (
                <h2 className="rl-cond rl-shadow px-4 pt-2 pb-1 text-[13px] font-extrabold tracking-[0.06em]">
                  {GROUP_KIND_LABELS[kind].toLocaleUpperCase('fr-FR')}
                </h2>
              )}
              <ul role="listbox" aria-label={GROUP_KIND_LABELS[kind]} className="rl-stagger flex flex-col gap-0.5">
                {section.map((g) => {
                  const n = acquired(g)
                  const on = g.id === selected.id
                  const label = getKana(g.kanaIds[0]!)!.char
                  return (
                    <li key={g.id} className="w-[min(100%,24rem)]">
                      {on ? (
                        <div role="option" aria-selected="true" className="rl-sel rl-wipe flex min-h-12 items-center gap-2 pr-2 pl-1.5">
                          <LineLabel glyph={label} on />
                          <Level n={n} on />
                          <span className="flex flex-1 justify-around">
                            {g.kanaIds.map((id) => {
                              const k = getKana(id)!
                              return (
                                <Link
                                  key={id}
                                  to={`/kana/${id}`}
                                  data-tap-sound="forward"
                                  aria-label={`${k.char}, ${k.romaji[0]} : ouvrir la fiche`}
                                  className="grid min-h-11 min-w-9 place-items-center font-jp text-[20px] active:bg-[#05081f] active:text-white"
                                >
                                  {k.char}
                                </Link>
                              )
                            })}
                          </span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          role="option"
                          aria-selected="false"
                          aria-label={`Ligne ${label}, ${n} kana acquis sur ${g.kanaIds.length}`}
                          data-tap-sound="select"
                          onClick={() => setSelectedId(g.id)}
                          className={`flex min-h-11 w-full items-center gap-2 pr-2 pl-1.5 text-left ${n === 0 && !progress?.perKana.has(g.kanaIds[0]!) ? 'opacity-60' : ''}`}
                        >
                          <LineLabel glyph={label} />
                          <Level n={n} />
                          <span className="flex-1 font-jp text-[18px] tracking-[0.3em] text-[#7fe9ff] [text-shadow:1px_1px_0_#10206e]">
                            {g.kanaIds.map((id) => getKana(id)!.char).join('')}
                          </span>
                        </button>
                      )}
                    </li>
                  )
                })}
              </ul>
            </section>
          )
        })}
      </div>
      <ReloadGuide
        title={`${doneLines} ligne${doneLines > 1 ? 's' : ''} sur ${gojuonTotal} acquise${doneLines > 1 ? 's' : ''}`}
        detail={`Ligne ${art} : ${acquired(selected)} kana acquis sur ${selected.kanaIds.length}.`}
        actions={[
          { label: 'Retour', kind: 'back', to: '/home', keyHint: 'Échap' },
          ...(WRITABLE_KINDS.includes(selected.kind) ? [{ label: 'Tracer', to: `/writing/${firstKana}` }] : []),
          { label: 'Fiche', kind: 'primary' as const, to: `/kana/${firstKana}`, keyHint: 'Entrée', sound: 'forward' as const },
        ]}
      />
    </>
  )
}

function LineLabel({ glyph, on = false }: { glyph: string; on?: boolean }) {
  return (
    <span
      className={`rl-cond flex h-[30px] w-[84px] shrink-0 items-center justify-center text-[17px] font-bold ${
        on ? 'bg-[#33d6ff] text-[#05081f]' : 'bg-[rgba(16,32,140,0.92)] text-[#5ce1ff]'
      }`}
    >
      Ligne <span className="ml-1 font-jp not-italic">{glyph}</span>
    </span>
  )
}

function Level({ n, on = false }: { n: number; on?: boolean }) {
  return (
    <span className={`rl-cond w-11 shrink-0 text-[13px] font-bold ${on ? 'text-[#05081f]' : 'text-[#5ce1ff]'}`}>
      Nv <span className="text-[25px] font-semibold">{n}</span>
    </span>
  )
}

/** Première ligne pas encore entièrement acquise (celle qu'on travaille). */
function firstOpenLine(groups: KanaGroup[], progress: KanaProgress | undefined): KanaGroup | undefined {
  if (!progress) return undefined
  return groups.find((g) => g.kind === 'gojuon' && g.kanaIds.some((id) => heatLevel(progress.perKana.get(id)) < 4))
}
