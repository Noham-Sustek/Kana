import { Suspense, lazy, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { Icon } from '@/components/Icon'
import { MASTERY_LABELS } from '@/components/MasterySteps'
import { Sheet } from '@/components/Sheet'
import { ReloadGuide, type GuideAction } from '@/components/reload/ReloadGuide'
import { ReloadLR } from '@/components/reload/ReloadLR'
import { getKana, groupGlyph, type Kana, type KanaGroup } from '@/data/kana'
import { buildProgress } from '@/engine/scheduler'
import { confusablesOf, familyMastery, wordsWithKana } from '@/features/kana/detail'
import { useKanaProgress } from '@/features/kana/useKanaProgress'
import { toRomaji } from '@/features/quiz/reading'
import { FAMILIES, type StageFamily } from '@/features/quiz/stages'
import { formatResponseTime } from '@/features/quiz/summary'
import { heatLevel } from '@/features/stats/heat'
import { summarize } from '@/features/stats/stats'
import { writingStatus } from '@/features/writing/progress'

const KanaStrokeCase = lazy(() => import('@/components/KanaStrokeCase').then((m) => ({ default: m.KanaStrokeCase })))

const FAMILY_ORDER: StageFamily[] = ['recognize', 'write', 'read']
/** Repère sous chaque kana de la ligne, selon sa réussite (la couleur n'est pas seule). */
const HEAT_MARK = ['', '!', '·', '•', '◆'] as const

interface ReloadKanaDetailProps {
  kana: Kana
  group: KanaGroup
  prev: Kana | undefined
  next: Kana | undefined
  counterpart: Kana | undefined
  writable: boolean
  onGoTo: (k: Kana | undefined) => void
  onBack: () => void
}

/** Fiche d'un kana, style Reload (écran de statut) : bandeau blanc (kana, lecture, niveau),
 *  les kana de la ligne en pastilles, l'ordre des traits sur une carte, vos résultats en barres,
 *  mots et kana proches dans un panneau marine. */
export function ReloadKanaDetail({ kana, group, prev, next, counterpart, writable, onGoTo, onBack }: ReloadKanaDetailProps) {
  const navigate = useNavigate()
  const progress = useKanaProgress()
  const [replay, setReplay] = useState(0)
  const [strokesOpen, setStrokesOpen] = useState(false)
  const own = useMemo(() => progress?.answers.filter((a) => a.kanaId === kana.id) ?? [], [progress, kana.id])
  const mastery = useMemo(() => familyMastery(buildProgress(own), kana.id), [own, kana.id])
  const stat = progress?.perKana.get(kana.id)
  const average = summarize(own).averageResponseMs
  const writing = progress?.writing.get(kana.id) ?? 0
  const confusables = confusablesOf(kana).slice(0, 3)
  const words = wordsWithKana(kana, 4)
  const level = Math.max(...FAMILY_ORDER.map((f) => mastery[f]))
  const [primary, ...variants] = kana.romaji
  const index = group.kanaIds.indexOf(kana.id)

  const bars = [
    { k: 'Ré', label: 'Réussite sur les 10 dernières réponses', v: stat ? `${Math.round(stat.recentRate * 100)} %` : '—', w: stat ? stat.recentRate : 0 },
    {
      k: 'Te',
      label: 'Temps moyen',
      v: average === null ? '—' : formatResponseTime(average),
      w: average === null ? 0 : Math.max(0.08, 1 - average / 6000),
    },
    { k: 'Rp', label: 'Réponses', v: String(stat?.attempts ?? 0), w: Math.min(1, (stat?.attempts ?? 0) / 50) },
  ]

  const actions: GuideAction[] = [{ label: 'Retour', kind: 'back', onClick: onBack, keyHint: 'Échap' }]
  if (counterpart) {
    actions.push({ label: `En ${counterpart.script}`, onClick: () => navigate(`/kana/${counterpart.id}`, { replace: true }) })
  }
  if (writable) actions.push({ label: 'Écrire', kind: 'primary', to: `/writing/${kana.id}`, keyHint: 'Entrée' })

  return (
    <div className="relative flex flex-1 flex-col">
      <span key={kana.id} aria-hidden="true" className="rl-art rl-rise absolute top-[230px] right-[-40px] rotate-[8deg] text-[230px] opacity-75">
        {kana.char}
      </span>

      {/* Bandeau blanc : ligne, écriture, kana et lecture, niveau. */}
      {/* Remonte sous la marge haute réelle (barre d'état comprise) : pas de bande de mer au-dessus. */}
      <div className="rl-bleed-band relative -mx-4 bg-white text-[#05081f] [clip-path:polygon(0_0,100%_0,100%_calc(100%-78px),0_100%)]">
        <div className="absolute inset-x-0 bottom-0 h-[206px]">
          <span className="absolute top-4 left-[52px] flex h-[26px] items-center bg-[#0b1352] pr-6 pl-3.5 text-[15px] font-semibold text-[#5ce1ff] [clip-path:polygon(7%_0,100%_0,90%_100%,0_100%)]">
            Ligne <span className="mx-1 font-jp">{groupGlyph(group)}</span> · {index + 1} / {group.kanaIds.length}
          </span>
          <span aria-hidden="true" className="rl-display absolute top-[50px] left-[54px] text-[50px] text-[#d9dce6]">
            {kana.script === 'hiragana' ? 'HIRAGANA' : 'KATAKANA'}
          </span>
          <h1 key={kana.id} className="rl-pop absolute top-[60px] left-[104px] flex items-baseline gap-2">
            <span className="font-jp text-[50px] leading-none">{kana.char}</span>
            <span className="rl-cond text-[32px] font-bold">{primary}</span>
          </h1>
          {variants.length > 0 && (
            <span className="absolute top-[122px] left-[108px] text-[12.5px] font-semibold">Aussi : {variants.join(', ')}</span>
          )}
          <div className="absolute top-[86px] right-5 flex items-end gap-2">
            <span className="flex flex-col items-end pb-0.5">
              <span className="rl-cond text-[11px] leading-none font-extrabold">NIVEAU</span>
              <span className="rl-cond text-[15px] leading-tight font-bold">{MASTERY_LABELS[level]}</span>
            </span>
            <span className="rl-display text-[60px] leading-[0.8]">{level + 1}</span>
          </div>
          {/* Les deux gâchettes à la même hauteur, dans les coins, comme sur une manette. */}
          <ReloadLR side="L" label="Kana précédent" onLight onClick={() => onGoTo(prev)} className="absolute top-3 left-1" />
          <ReloadLR side="R" label="Kana suivant" onLight onClick={() => onGoTo(next)} className="absolute top-3 right-2" />
        </div>
      </div>

      {/* Les kana de la ligne, en pastilles. */}
      <div role="tablist" aria-label={`Ligne ${groupGlyph(group)}`} className="relative -mt-3 flex gap-2">
        {group.kanaIds.map((id) => {
          const k = getKana(id)!
          const on = id === kana.id
          const heat = heatLevel(progress?.perKana.get(id))
          return (
            <span key={id} className="flex w-12 flex-col items-center gap-1">
              <button
                type="button"
                role="tab"
                aria-selected={on}
                aria-label={`${k.char}, ${k.romaji[0]}`}
                data-tap-sound="select"
                onClick={() => !on && navigate(`/kana/${id}`, { replace: true })}
                className={`grid size-12 place-items-center rounded-full font-jp text-[24px] ${
                  on
                    ? 'bg-white text-[#05081f] shadow-[0_0_0_3px_#05081f,0_0_0_5px_#5ce1ff]'
                    : `bg-[#0b1352] shadow-[inset_0_0_0_2px_rgba(255,255,255,0.14)] ${heat >= 3 ? 'text-[#5ce1ff]' : heat === 2 ? 'text-[#ffd34a]' : heat === 1 ? 'text-[#ff8fbf]' : 'text-white/60'}`
                }`}
              >
                {k.char}
              </button>
              <span aria-hidden="true" className="rl-cond h-3.5 text-[13px] leading-[14px] font-extrabold text-[#c9cff5]">
                {HEAT_MARK[heat]}
              </span>
            </span>
          )
        })}
      </div>

      <div className="relative mt-2 flex items-start gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-2 pr-[30%]">
          <span className="rl-cond text-[11px] font-extrabold tracking-[0.06em] text-[#8fb4ff]">VOS RÉSULTATS</span>
          {bars.map((b) => (
            <div key={b.k} className="flex items-center gap-1.5" aria-label={`${b.label} : ${b.v}`} role="img">
              <span className="rl-cond w-6 text-[19px] leading-none font-bold [text-shadow:2px_2px_0_#05081f]">{b.k}</span>
              <span className="rl-cond w-[54px] text-[21px] leading-none font-semibold [text-shadow:2px_2px_0_#05081f]">{b.v}</span>
              <span className="relative h-[9px] flex-1 -skew-x-[24deg] overflow-hidden bg-[#05081f]/70">
                <span className="absolute inset-y-0 left-0 bg-[#5ce1ff] transition-[width] duration-500" style={{ width: `${b.w * 100}%` }} />
              </span>
            </div>
          ))}
          <ul className="mt-1 flex flex-col gap-1">
            {FAMILY_ORDER.map((f) => (
              <li key={f} className="flex items-center gap-2 text-[14px] font-semibold">
                <Icon name={FAMILIES[f].icon} className="size-4 text-[#5ce1ff]" />
                <span className="flex-1">{FAMILIES[f].label}</span>
                <span role="img" aria-label={MASTERY_LABELS[mastery[f]]} className="flex gap-0.5">
                  {[0, 1, 2, 3].map((i) => (
                    <i
                      key={i}
                      className={`h-2 w-3 -skew-x-[20deg] ${i <= mastery[f] ? 'bg-[#5ce1ff]' : 'shadow-[inset_0_0_0_1.5px_#5d6bb0]'}`}
                    />
                  ))}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {writable && (
        <button
          type="button"
          onClick={() => {
            setReplay((n) => n + 1)
            setStrokesOpen(true)
          }}
          className="rl-cond relative mt-3 flex min-h-11 items-center gap-2 self-start bg-[#05081f] pr-5 pl-3 text-[16px] font-bold text-white shadow-[inset_0_0_0_2px_#5ce1ff] [clip-path:polygon(0_0,100%_0,94%_100%,0_100%)]"
        >
          <Icon name="writing" className="size-4 text-[#5ce1ff]" />
          Ordre des traits
        </button>
      )}

      <div className="relative mt-4 bg-[rgba(8,14,60,0.9)] px-2 py-2.5">
        <span className="rl-cond mb-1.5 ml-1 block text-[11px] font-extrabold tracking-[0.06em] text-[#8fb4ff]">MOTS AVEC CE KANA</span>
        <ul className="grid grid-cols-2 gap-1">
          {words.map((w, i) => (
            <li key={w.id} className={`flex min-h-[30px] items-center gap-2 px-2 ${i % 3 === 0 ? 'bg-white/8' : ''}`}>
              <span className="font-jp text-[16px] text-[#5ce1ff]">{w.kana}</span>
              <span className="min-w-0 truncate text-[14px] font-semibold" title={toRomaji(w.kana, { macron: true })}>
                {w.meaning}
              </span>
            </li>
          ))}
        </ul>
        {confusables.length > 0 && (
          <div className="relative mt-2.5 flex flex-wrap items-center gap-1.5">
            <span className="rl-cond mr-1 text-[13px] leading-none font-extrabold text-[#5ce1ff]">
              À NE PAS
              <br />
              CONFONDRE
            </span>
            {confusables.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => navigate(`/kana/${c.id}`, { replace: true })}
                aria-label={`${c.char}, ${c.romaji[0]} : voir sa fiche`}
                data-tap-sound="forward"
                className="flex min-h-11 items-center gap-1.5 bg-white/10 px-3 [clip-path:polygon(8%_0,100%_0,92%_100%,0_100%)] active:bg-white active:text-[#05081f]"
              >
                <span className="font-jp text-[20px]">{c.char}</span>
                <span className="rl-cond text-[15px] font-bold text-[#5ce1ff]">{c.romaji[0]}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {writable && (
        <p className="relative mt-3 flex items-start gap-2 text-[14px] font-semibold">
          <span className="rl-cond mt-0.5 rounded-full bg-[#5ce1ff] px-2 text-[11px] leading-4 font-extrabold text-[#05081f]">Info</span>
          {writingStatus(writing)}
        </p>
      )}

      <ReloadGuide title={'Que voulez-vous travailler ?'} actions={actions} />

      {writable && (
        <Sheet open={strokesOpen} onClose={() => setStrokesOpen(false)} title="Ordre des traits">
          <div className="mx-auto w-[min(240px,70vw)] bg-white p-1 text-[#05081f]">
            <Suspense fallback={<div className="aspect-square w-full" />}>
              <KanaStrokeCase kana={kana} replay={replay} />
            </Suspense>
          </div>
          <div className="mt-4 flex justify-center gap-2 pb-2">
            <button
              type="button"
              onClick={() => setReplay((n) => n + 1)}
              className="rl-cond flex min-h-11 items-center gap-1.5 px-4 text-[17px] font-bold text-white"
            >
              <Icon name="replay" className="size-4" />
              Rejouer
            </button>
            <button
              type="button"
              onClick={() => navigate(`/writing/${kana.id}`)}
              className="rl-cond flex min-h-11 items-center bg-white px-5 text-[17px] font-extrabold text-[#05081f] [clip-path:polygon(8%_0,100%_0,92%_100%,0_100%)]"
            >
              S’entraîner à l’écrire
            </button>
          </div>
        </Sheet>
      )}
    </div>
  )
}
