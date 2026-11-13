import { Button } from '@/components/Button'
import { KanaTile } from '@/components/KanaTile'
import { getKana, groupGlyph, type KanaGroup } from '@/data/kana'

interface UnlockCelebrationProps {
  /** Lignes débloquées pendant la session ; la dernière est présentée. */
  groups: readonly KanaGroup[]
  onContinue: () => void
}

/** Ligne débloquée : un moment bref, en or, avant le récapitulatif. */
export function UnlockCelebration({ groups, onContinue }: UnlockCelebrationProps) {
  const group = groups.at(-1)!
  const kana = group.kanaIds.map((id) => getKana(id)!)
  const count = kana.length

  return (
    <div className="flex min-h-full flex-col">
      <div className="relative flex flex-1 flex-col items-center justify-center gap-3.5 px-1 text-center">
        {/* Rayons de papier autour du titre, en filets : décor seul. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-45"
          style={{
            background:
              'repeating-conic-gradient(from 0deg at 50% 46%, var(--k-hairline) 0 1deg, transparent 1deg 15deg)',
            maskImage: 'radial-gradient(circle at 50% 46%, transparent 0 150px, #000 150px 330px, transparent 330px)',
            WebkitMaskImage:
              'radial-gradient(circle at 50% 46%, transparent 0 150px, #000 150px 330px, transparent 330px)',
          }}
        />
        <p className="relative text-[11px] leading-[14px] font-bold tracking-[0.12em] text-gold uppercase">
          {groups.length > 1 ? `${groups.length} lignes débloquées` : 'Ligne débloquée'}
        </p>
        <h1 role="status" className="relative animate-unlock font-serif text-[32px] leading-tight font-medium">
          La ligne <span className="font-jp">{groupGlyph(group)}</span> s’ouvre
        </h1>
        <ul className="relative grid w-full grid-cols-5 gap-2">
          {kana.map((k) => (
            <li key={k.id}>
              <KanaTile kana={k.char} romaji={k.romaji[0]} className="w-full border-2 border-gold!" />
            </li>
          ))}
        </ul>
        <p className="relative text-[14.5px] leading-5 text-ink-muted">
          {count > 1 ? `${count} nouveaux kana.` : 'Un nouveau kana.'} Vous{' '}
          {count > 1 ? 'les' : 'le'} découvrirez dès la prochaine session.
        </p>
      </div>
      <div className="sticky bottom-0 z-10 -mx-4 bg-paper px-4 pt-3 pb-1">
        <Button onClick={onContinue} autoFocus>
          Continuer
        </Button>
      </div>
    </div>
  )
}
