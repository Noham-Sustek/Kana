import { StrokeOrderAnimation } from '@/components/StrokeOrderAnimation'
import type { Kana } from '@/data/kana'
import { isWritable, strokesOf } from '@/data/strokes'

interface KanaStrokeCaseProps {
  kana: Kana
  /** Changer la valeur rejoue l'animation. */
  replay: number
}

/** Case de la fiche : ordre des traits animé (kana d'un caractère), sinon le kana seul.
 *  Chargée en différé pour garder les tracés hors du bundle principal. */
export function KanaStrokeCase({ kana, replay }: KanaStrokeCaseProps) {
  const strokes = isWritable(kana) ? strokesOf(kana.char) : undefined
  if (!strokes) return <KanaPlainCase char={kana.char} />
  return <StrokeOrderAnimation key={replay} strokes={strokes} />
}

/** Nombre de traits d'un kana d'un caractère, `null` sinon. */
export function strokeCountOf(kana: Kana): number | null {
  return isWritable(kana) ? (strokesOf(kana.char)?.length ?? null) : null
}

export function KanaPlainCase({ char }: { char: string }) {
  return (
    <div className="grid aspect-square w-full place-items-center rounded-sm border-[1.5px] border-ink bg-paper-raised">
      <span className={`font-jp leading-none ${[...char].length > 1 ? 'text-[88px]' : 'text-[150px]'}`}>{char}</span>
    </div>
  )
}
