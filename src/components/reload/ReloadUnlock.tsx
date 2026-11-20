import { ReloadGuide } from '@/components/reload/ReloadGuide'
import { ReloadMenu } from '@/components/reload/ReloadMenu'
import { getKana, groupGlyph, type KanaGroup } from '@/data/kana'

interface ReloadUnlockProps {
  groups: readonly KanaGroup[]
  onContinue: () => void
}

const TILT = [-6, 4, -3, 5, -4]

/** Ligne débloquée, style Reload : rayons, bandeau blanc, grand kana, « S'OUVRE » sur les
 *  triangles de sélection, cartes des nouveaux kana. */
export function ReloadUnlock({ groups, onContinue }: ReloadUnlockProps) {
  const group = groups.at(-1)!
  const kana = group.kanaIds.map((id) => getKana(id)!)
  const count = kana.length
  const glyph = groupGlyph(group)

  return (
    <div className="relative flex flex-1 flex-col">
      <span aria-hidden="true" className="absolute -inset-x-4 -top-4 bottom-0 bg-[linear-gradient(165deg,#1d49d8_0%,#1430ae_38%,#0c1c78_70%,#070f45_100%)]" />
      <span
        aria-hidden="true"
        className="rl-burst absolute top-[-120px] left-1/2 size-[790px] -translate-x-1/2 rounded-full"
        style={{ background: 'repeating-conic-gradient(from 0deg, rgba(255,255,255,0.14) 0deg 3deg, rgba(255,255,255,0) 3deg 15deg)' }}
      />
      <div className="relative -mx-6 mt-12 flex h-10 -rotate-6 items-center justify-center bg-white">
        <span className="rl-cond text-[18px] font-extrabold tracking-[0.04em] text-[#05081f]">
          {groups.length > 1 ? `${groups.length} LIGNES DÉBLOQUÉES` : 'LIGNE DÉBLOQUÉE'}
        </span>
      </div>
      <span
        aria-hidden="true"
        className="rl-pop relative mx-auto mt-4 block font-['Zen_Kaku_Kana','Klee_One_Kana',sans-serif] text-[200px] leading-none font-black text-white [text-shadow:-8px_8px_0_#5ce1ff,-16px_16px_0_#d73cff]"
      >
        {kana[0]!.char}
      </span>
      <h1 role="status" className="sr-only">
        La ligne {glyph} s’ouvre
      </h1>
      <div aria-hidden="true" className="relative -mt-10">
        <span className="rl-cond rl-shadow absolute top-0 left-2 text-[22px] font-bold text-[#5ce1ff]">LA LIGNE {glyph}</span>
        <ReloadMenu
          label="Ligne débloquée"
          items={[{ id: 'open', label: 'S’OUVRE', size: 46, angle: -6, x: 60, y: 96, color: '#ffffff' }]}
          selected={0}
          onSelect={() => {}}
          onActivate={() => {}}
          maxRight={330}
          height={120}
          grow={1}
          keyboard={false}
          className="pointer-events-none"
        />
      </div>
      <ul className="relative mt-4 flex justify-center gap-2">
        {kana.map((k, i) => (
          <li
            key={k.id}
            className="rl-rise flex h-[92px] w-[60px] flex-col items-center justify-center gap-0.5 border-[3px] border-white bg-[linear-gradient(170deg,#1d49d8,#0b1a6e)] shadow-[3px_3px_0_#05081f]"
            style={{ rotate: `${TILT[i % TILT.length]}deg`, animationDelay: `${300 + i * 80}ms` }}
          >
            <span className="font-jp text-[30px] leading-none">{k.char}</span>
            <span className="rl-cond text-[14px] font-bold text-[#5ce1ff]">{k.romaji[0]}</span>
          </li>
        ))}
      </ul>
      <p className="relative mt-6 px-6 text-center text-[16px] leading-[22px] font-semibold">
        {count > 1 ? `${count} nouveaux kana.` : 'Un nouveau kana.'} Vous {count > 1 ? 'les' : 'le'} découvrirez dès la prochaine session.
      </p>
      <ReloadGuide
        title={
          <>
            La ligne <span className="font-jp not-italic">{glyph}</span> est ouverte.
          </>
        }
        actions={[{ label: 'Continuer', kind: 'primary', onClick: onContinue, keyHint: 'Entrée' }]}
      />
    </div>
  )
}
