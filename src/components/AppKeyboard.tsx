import { useEffect, useRef, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { Icon } from '@/components/Icon'
import { haptic } from '@/lib/haptic'
import { LAYOUT_ROWS, editValue, type KeyboardLayout } from '@/lib/keyboard'
import { UNLIKELY_WEIGHT, plausibleKeys, resolveKey } from '@/lib/keyTargeting'

interface AppKeyboardProps {
  /** id du champ qui reçoit la saisie (il garde le focus et son curseur). */
  targetId: string
  layout: KeyboardLayout
  /** Libellé de la touche Entrée (« Valider », « Suivant »). */
  enterLabel: string
}

/** Champ cible : un input, ou la zone de texte des phrases (stage 8). */
type Field = HTMLInputElement | HTMLTextAreaElement

const INPUT_SETTER = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
const TEXTAREA_SETTER = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set

/** Écrit dans le champ comme une vraie frappe : valeur posée par le setter natif puis événement
 *  `input`, que React relaie à l'onChange du champ contrôlé. */
function type(target: Field, text: string | null) {
  if (target.readOnly || target.disabled) return
  const start = target.selectionStart ?? target.value.length
  const end = target.selectionEnd ?? start
  const { value, caret } = editValue(target.value, start, end, text)
  if (value === target.value) return
  const setter = target instanceof HTMLTextAreaElement ? TEXTAREA_SETTER : INPUT_SETTER
  setter?.call(target, value)
  target.dispatchEvent(new Event('input', { bubbles: true }))
  target.setSelectionRange(caret, caret)
}

/** Entrée : touche `keydown` (la lecture chronométrée l'écoute), puis envoi du formulaire si
 *  personne ne l'a prise en charge (quiz). */
function enter(target: Field) {
  const handled = !target.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }))
  if (!handled) target.form?.requestSubmit()
}

/** Touches spéciales (les lettres ont pour id leur lettre). */
const ENTER = 'enter'
const BACKSPACE = 'back'

/** Clavier romaji intégré (docs/design/components) : lettres selon la disposition du système,
 *  tiret (ー), apostrophe (n'), espace, effacer, Entrée. Ne prend jamais le focus.
 *  Un toucher est attribué par le clavier entier (`resolveKey`) : le bord d'une touche et les
 *  espaces entre touches reviennent à la touche la plus plausible d'après ce qui précède. */
export function AppKeyboard({ targetId, layout, enterLabel }: AppKeyboardProps) {
  const rows = LAYOUT_ROWS[layout]
  const root = useRef<HTMLDivElement>(null)
  const timers = useRef<{ delay?: number; tick?: number }>({})
  const pressed = useRef(new Map<number, HTMLElement>())
  const target = () => document.getElementById(targetId) as Field | null

  const stopRepeat = () => {
    window.clearTimeout(timers.current.delay)
    window.clearInterval(timers.current.tick)
  }
  useEffect(() => stopRepeat, [])

  const press = (id: string) => {
    const el = target()
    if (!el) return
    if (id === ENTER) {
      enter(el)
      return
    }
    el.focus({ preventScroll: true })
    type(el, id === BACKSPACE ? null : id)
    haptic('key')
  }

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    // Le geste ne doit jamais retirer le focus au champ (le curseur clignoterait ailleurs).
    e.preventDefault()
    const buttons = [...(root.current?.querySelectorAll<HTMLElement>('[data-key]') ?? [])]
    const el = target()
    const plausible = plausibleKeys(el ? el.value.slice(0, el.selectionStart ?? el.value.length) : '')
    const id = resolveKey(
      e.clientX,
      e.clientY,
      buttons.map((b) => {
        const r = b.getBoundingClientRect()
        const key = b.dataset.key!
        const scored = key !== ENTER && key !== BACKSPACE && plausible !== null
        return {
          id: key,
          left: r.left,
          top: r.top,
          width: r.width,
          height: r.height,
          weight: scored && !plausible.has(key) ? UNLIKELY_WEIGHT : 1,
        }
      }),
    )
    if (id === null) return
    const button = buttons.find((b) => b.dataset.key === id)
    if (button) {
      // État appuyé sur la touche retenue, qui n'est pas forcément celle sous le doigt.
      button.dataset.pressed = ''
      pressed.current.set(e.pointerId, button)
    }
    // Action au toucher (pas au relâché) : la frappe suit le doigt. Effacer se répète si l'on reste appuyé.
    press(id)
    if (id === BACKSPACE) {
      stopRepeat()
      timers.current.delay = window.setTimeout(() => {
        timers.current.tick = window.setInterval(() => press(BACKSPACE), 70)
      }, 420)
    }
  }

  const release = (e: ReactPointerEvent<HTMLDivElement>) => {
    const button = pressed.current.get(e.pointerId)
    if (button) delete button.dataset.pressed
    pressed.current.delete(e.pointerId)
    if (pressed.current.size === 0) stopRepeat()
  }

  return (
    <div
      ref={root}
      onPointerDown={onPointerDown}
      onPointerUp={release}
      onPointerCancel={release}
      onPointerLeave={release}
      // L'ombre pleine prolonge le fond dans la marge basse de <main> : le clavier touche le bord.
      className="k-keyboard -mx-4 mt-2 grid touch-manipulation gap-[7px] border-t border-hairline bg-paper-raised shadow-[0_1rem_0_0_var(--k-paper-raised)] px-[5px] pt-2 pb-[max(6px,env(safe-area-inset-bottom))] select-none"
      role="group"
      aria-label="Clavier romaji"
    >
      {rows.map((row, r) => {
        const last = r === rows.length - 1
        return (
          <div key={row} className="flex justify-center gap-[5px]">
            {/* Dernière rangée comme sur le clavier du téléphone : Effacer calé sur le bord droit (aligné
                avec la dernière lettre au-dessus), lettres centrées, une place vide symétrique à gauche. */}
            {last && <span aria-hidden style={keyFlex(SIDE_WIDTH)} />}
            {[...row].map((letter, i) => (
              <Key
                key={letter}
                id={letter}
                label={letter}
                onPress={press}
                className={last ? (i === 0 ? 'ml-auto' : i === row.length - 1 ? 'mr-auto' : '') : ''}
              >
                {letter}
              </Key>
            ))}
            {last && (
              <Key id={BACKSPACE} label="effacer" onPress={press} wide={SIDE_WIDTH}>
                <Icon name="backspace" className="size-[22px]" />
              </Key>
            )}
          </div>
        )
      })}
      <div className="flex justify-center gap-[5px]">
        <Key id="-" label="tiret, voyelle longue" onPress={press} wide={1.2}>
          -
        </Key>
        <Key id="'" label="apostrophe" onPress={press} wide={1.2}>
          ’
        </Key>
        <Key id=" " label="espace" onPress={press} wide={4.6}>
          <span className="sr-only">espace</span>
        </Key>
        <Key id={ENTER} label={enterLabel} onPress={press} wide={2.6} accent>
          {enterLabel}
        </Key>
      </div>
    </div>
  )
}

/** Grille de 10 colonnes : une lettre = 1/10 de la largeur (moins les espacements). */
const keyFlex = (wide: number) => ({ flex: `0 1 calc(${wide} * (100% - 45px) / 10)` })

/** Largeur d'Effacer et de la place vide en face : 7 lettres (QWERTY) + 2 × 1,5 = une rangée pleine. */
const SIDE_WIDTH = 1.5

interface KeyProps {
  id: string
  label: string
  onPress: (id: string) => void
  /** Largeur relative (1 = une lettre). */
  wide?: number
  accent?: boolean
  className?: string
  children: ReactNode
}

/** Touche : le toucher est géré par le clavier ; ici, seulement le clavier physique et les
 *  lecteurs d'écran (clic sans pointeur, `detail === 0`). */
function Key({ id, label, onPress, wide = 1, accent, className = '', children }: KeyProps) {
  return (
    <button
      type="button"
      aria-label={label}
      data-key={id}
      onClick={(e) => {
        if (e.detail === 0) onPress(id)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onPress(id)
        }
      }}
      style={keyFlex(wide)}
      className={`k-key ${accent ? 'k-key--enter bg-accent text-on-accent' : 'bg-paper text-ink'} grid h-[46px] min-w-0 place-items-center rounded-sm border border-control text-[19px] leading-none font-medium data-[pressed]:brightness-90 ${
        accent ? 'text-[15px] font-semibold' : ''
      } ${className}`}
    >
      {children}
    </button>
  )
}
