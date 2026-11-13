import type { CSSProperties } from 'react'
import { Icon } from '@/components/Icon'
import type { HeatLevel } from '@/features/stats/heat'

export type KanaTileVariant = 'base' | 'done' | 'current' | 'locked'

interface KanaTileProps {
  kana: string
  /** Romaji sous le kana (case seule : grille, sélecteur). */
  romaji?: string
  /** base · done (ligne acquise) · current (en cours, remplie à hauteur de `fill`) · locked. */
  variant?: KanaTileVariant
  selected?: boolean
  /** Avancement d'une case `current`, de 0 à 1. */
  fill?: number
  /** Lentille Lecture : 0 = jamais vu, 1 à 4 = réussite croissante (rampe d'une teinte). */
  heat?: HeatLevel
  /** Lentille Écriture : 0 = jamais tracé, 1 = calque réussi, 2 = de mémoire réussi. */
  writing?: 0 | 1 | 2
  /** Nom accessible complet (« ぬ, nu, réussite 40 %, à revoir »). */
  label?: string
  onClick?: () => void
  className?: string
}

/** Teinte d'une case selon la réussite (lentille Lecture), reprise par la légende. */
export const HEAT_TILE: Record<HeatLevel, string> = {
  0: 'border-dashed border-control text-ink-muted',
  1: 'border-control bg-heat-1',
  2: 'border-heat-2 bg-heat-2',
  3: 'border-heat-3 bg-heat-3 text-on-heat-3',
  4: 'border-accent bg-accent text-on-accent',
}

/** Case de kana (grille, parcours, sélecteurs). Tous les repères vont dans les coins bas :
 *  en haut à droite, une coche se lirait comme un dakuten ゛ et un cadenas comme un handakuten ゜. */
export function KanaTile({
  kana,
  romaji,
  variant = 'base',
  selected,
  fill = 0.8,
  heat,
  writing,
  label,
  onClick,
  className = '',
}: KanaTileProps) {
  let look = 'border-control bg-paper-raised text-ink'
  let style: CSSProperties | undefined
  if (heat !== undefined) look = HEAT_TILE[heat]
  else if (variant === 'done') look = 'border-accent bg-accent text-on-accent'
  else if (variant === 'locked') look = 'border-dashed border-hairline text-ink-muted'
  else if (variant === 'current') {
    look = 'border-2 border-accent text-ink'
    const pct = `${Math.round(Math.min(1, Math.max(0, fill)) * 100)}%`
    style = { background: `linear-gradient(to top, var(--k-accent-tint) ${pct}, var(--k-paper-raised) ${pct})` }
  } else if (selected) look = 'border-2 border-accent bg-accent-tint text-ink'

  const check = variant === 'done' || (selected && heat === undefined)
  const Tag = onClick ? 'button' : 'span'

  return (
    <Tag
      {...(onClick ? { type: 'button' as const, onClick, 'aria-pressed': selected } : {})}
      aria-label={label}
      style={style}
      className={`relative grid aspect-square min-w-11 place-items-center overflow-hidden rounded-sm border-[1.5px] font-jp leading-none transition-transform ${
        romaji ? 'pb-2.5 text-[26px]' : 'text-3xl'
      } ${onClick ? 'active:scale-95' : ''} ${look} ${className}`}
    >
      <span aria-hidden={label ? true : undefined}>{kana}</span>
      {romaji && (
        <small className="absolute inset-x-0 bottom-[3px] text-center font-sans text-[10.5px] leading-none font-medium opacity-85">
          {romaji}
        </small>
      )}
      {check && (
        <span
          aria-hidden="true"
          className={`absolute right-[5px] bottom-[7px] h-1 w-2 -rotate-45 border-b-2 border-l-2 ${
            variant === 'done' ? 'border-on-accent' : 'border-accent'
          }`}
        />
      )}
      {variant === 'locked' && heat === undefined && (
        <Icon name="lock" className="absolute right-[3px] bottom-[3px] size-3" />
      )}
      {heat === 1 && (
        <span
          aria-hidden="true"
          className="absolute bottom-0 left-0 border-[6px] border-ink border-t-transparent border-r-transparent"
        />
      )}
      {writing !== undefined && writing > 0 && (
        <span
          aria-hidden="true"
          className={`absolute right-1 bottom-1 size-[9px] rounded-[1px] border-2 border-accent ${writing === 2 ? 'bg-accent' : ''}`}
        />
      )}
    </Tag>
  )
}
