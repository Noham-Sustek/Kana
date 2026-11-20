import { useEffect, useLayoutEffect, useState, type PointerEvent } from 'react'
import type { SoundKind } from '@/lib/sound'

export interface ReloadMenuItem {
  id: string
  label: string
  /** Hauteur des capitales au repos (px). */
  size: number
  /** Inclinaison au repos (degrés ; négatif = monte vers la droite). */
  angle: number
  /** Départ de la ligne de base (px, dans le cadre du menu). */
  x: number
  y: number
  color: string
  /** Nom accessible, si le libellé ne suffit pas. */
  aria?: string
  /** Son à l'ouverture (`forward` par défaut). */
  sound?: SoundKind
}

interface ReloadMenuProps {
  label: string
  items: readonly ReloadMenuItem[]
  selected: number
  onSelect: (index: number) => void
  onActivate: (index: number) => void
  /** Bord droit à ne pas dépasser par le mot sélectionné (px). */
  maxRight: number
  height: number
  /** Agrandissement maximal du mot sélectionné. */
  grow?: number
  /** Flèches, Entrée et chiffres au clavier (écran actif seulement). */
  keyboard?: boolean
  /** Pas de son au toucher (l'écran joue le sien). */
  silent?: boolean
  className?: string
}

// Triangles blanc et rose relevés sur le menu de pause de référence : x en longueur du mot,
// y en hauteur des capitales, depuis le début de la ligne de base.
const WHITE: readonly [number, number][] = [
  [-0.087, -0.485],
  [1.343, -0.795],
  [1.061, 0.344],
]
const PINK: readonly [number, number][] = [
  [-0.067, -0.461],
  [1.412, -0.793],
  [1.101, 0.445],
]
/** Hauteur des capitales de Montserrat Black, en part de la taille de police. */
const CAP = 0.7
/** Resserrement horizontal appliqué aux mots (.rl-word). */
const SQUEEZE = 0.86

/** Menu de pause : mots en italique très gras, chacun penché à sa façon ; le mot choisi grossit,
 *  se penche davantage et passe sur deux triangles (blanc, rose). Ses lettres sont noires, rouges
 *  sur le triangle blanc, roses sur le liseré.
 *  Toucher un mot le choisit (sa description s'affiche) ; le toucher à nouveau l'ouvre.
 *  À la souris, le survol choisit ; au clavier, flèches, Entrée et chiffres. */
export function ReloadMenu({
  label,
  items,
  selected,
  onSelect,
  onActivate,
  maxRight,
  height,
  grow = 1.45,
  keyboard = true,
  silent = false,
  className = '',
}: ReloadMenuProps) {
  const widths = useWordWidths(items.map((i) => i.label))

  useEffect(() => {
    if (!keyboard) return
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (target?.closest('input, textarea, select, dialog[open]') || document.querySelector('dialog[open]')) return
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        onSelect((selected + (e.key === 'ArrowDown' ? 1 : items.length - 1)) % items.length)
      } else if (e.key === 'Enter' && !target?.closest('button, a')) {
        e.preventDefault()
        onActivate(selected)
      } else if (/^[1-9]$/.test(e.key) && Number(e.key) <= items.length) {
        onActivate(Number(e.key) - 1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [keyboard, items.length, onActivate, onSelect, selected])

  // Géométrie de chaque mot (taille, angle, longueur), commune aux deux calques.
  const geo = items.map((item, i) => {
    const on = i === selected
    const w100 = widths[item.label] ?? item.label.length * 62
    const lengthAt = (h: number) => ((w100 * (h / CAP)) / 100) * SQUEEZE
    const h = on ? item.size * Math.min(grow, Math.max(1, (maxRight - item.x) / lengthAt(item.size))) : item.size
    return { on, h, fs: h / CAP, len: lengthAt(h), angle: on ? item.angle - 7 : item.angle }
  })
  const place = (item: ReloadMenuItem, angle: number) => ({ transform: `translate(${item.x}px, ${item.y}px) rotate(${angle}deg)` })

  return (
    <nav aria-label={label} className={`relative ${className}`} style={{ height }}>
      {/* Calque visible : le mot choisi passe devant les autres. */}
      <div aria-hidden="true" className="pointer-events-none">
        {items.map((item, i) => {
          const { on, h, fs, len, angle } = geo[i]!
          const pts = (t: readonly [number, number][]) => t.map(([u, v]) => `${(u * len).toFixed(1)},${(v * h).toFixed(1)}`).join(' ')
          // Cadre des copies découpées : juste autour du mot et des triangles (un cadre trop grand
          // agrandirait la zone de défilement de la page).
          const box = { x: -0.15 * len, y: -1.7 * h, w: 1.7 * len, h: 2.4 * h }
          const poly = (t: readonly [number, number][]) =>
            t.map(([u, v]) => `${(u * len - box.x).toFixed(1)}px ${(v * h - box.y).toFixed(1)}px`).join(', ')
          const word = (color: string) => (
            <span className="rl-word absolute left-0" style={{ fontSize: fs, bottom: -0.2 * fs, color }}>
              {item.label}
            </span>
          )
          return (
            <div
              key={item.id}
              className="absolute top-0 left-0 origin-top-left transition-transform duration-200"
              style={{ ...place(item, angle), zIndex: on ? 3 : 1 }}
            >
              {on && (
                <svg key={`w${selected}`} width="1" height="1" className="rl-pop absolute top-0 left-0 overflow-visible">
                  <polygon points={pts(PINK)} fill="var(--r-pink)" />
                  <polygon points={pts(WHITE)} fill="#ffffff" />
                </svg>
              )}
              {word(on ? 'var(--r-sel-ink)' : item.color)}
              {on && (
                <>
                  <div className="absolute" style={clipBox(box, poly(PINK))}>
                    <span className="absolute" style={{ left: -box.x, top: -box.y }}>
                      {word('var(--r-pink)')}
                    </span>
                  </div>
                  <div className="absolute" style={clipBox(box, poly(WHITE))}>
                    <span className="absolute" style={{ left: -box.x, top: -box.y }}>
                      {word('var(--r-red)')}
                    </span>
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>
      {/* Calque des zones à toucher : celles des autres mots passent devant celle du mot choisi,
          agrandi et penché, pour qu'il ne recouvre pas ses voisins. */}
      <ul>
        {items.map((item, i) => {
          const { on, h, len, angle } = geo[i]!
          return (
            <li
              key={item.id}
              className="absolute top-0 left-0 origin-top-left transition-transform duration-200"
              style={{ ...place(item, angle), zIndex: on ? 4 : 5 }}
            >
              <button
                type="button"
                aria-label={item.aria ?? item.label}
                aria-current={on ? 'true' : undefined}
                data-tap-sound={silent ? undefined : on ? (item.sound ?? 'forward') : 'select'}
                onPointerEnter={(e: PointerEvent) => e.pointerType === 'mouse' && !on && onSelect(i)}
                onClick={() => (on ? onActivate(i) : onSelect(i))}
                className="absolute left-0 cursor-pointer focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-white"
                style={{ bottom: -0.25 * h, width: len + 8, height: Math.max(40, h * 1.35) }}
              />
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

const clipBox = (box: { x: number; y: number; w: number; h: number }, polygon: string) =>
  ({ left: box.x, top: box.y, width: box.w, height: box.h, clipPath: `polygon(${polygon})`, overflow: 'hidden' }) as const

/** Largeur de chaque libellé à 100 px dans la police des menus, mesurée dans le document
 *  (puis de nouveau une fois la police chargée). */
function useWordWidths(labels: readonly string[]): Record<string, number> {
  const [widths, setWidths] = useState<Record<string, number>>({})
  const key = labels.join('|')

  useLayoutEffect(() => {
    const span = document.createElement('span')
    span.className = 'rl-word'
    span.style.cssText = 'position:absolute;visibility:hidden;font-size:100px;transform:none;left:-9999px;top:0'
    document.body.appendChild(span)
    const measure = () => {
      const next: Record<string, number> = {}
      for (const l of key.split('|')) {
        span.textContent = l
        next[l] = span.getBoundingClientRect().width
      }
      setWidths(next)
    }
    measure()
    // La police n'est téléchargée qu'au premier usage : sans elle, la mesure se fait sur la police
    // de secours (plus étroite) et le mot choisi grossirait jusqu'à déborder de l'écran.
    void document.fonts
      ?.load('italic 900 100px "Montserrat Black Italic"', key.replace(/\|/g, ''))
      .then(measure, () => {})
    void document.fonts?.ready.then(measure)
    return () => span.remove()
  }, [key])

  return widths
}
