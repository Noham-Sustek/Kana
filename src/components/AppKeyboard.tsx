import { useEffect, useRef, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { Icon } from '@/components/Icon'
import { haptic } from '@/lib/haptic'
import { LAYOUT_ROWS, editValue, type KeyboardLayout } from '@/lib/keyboard'

interface AppKeyboardProps {
  /** id du champ qui reçoit la saisie (il garde le focus et son curseur). */
  targetId: string
  layout: KeyboardLayout
  /** Libellé de la touche Entrée (« Valider », « Suivant »). */
  enterLabel: string
}

const VALUE_SETTER = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set

/** Écrit dans le champ comme une vraie frappe : valeur posée par le setter natif puis événement
 *  `input`, que React relaie à l'onChange du champ contrôlé. */
function type(target: HTMLInputElement, text: string | null) {
  if (target.readOnly || target.disabled) return
  const start = target.selectionStart ?? target.value.length
  const end = target.selectionEnd ?? start
  const { value, caret } = editValue(target.value, start, end, text)
  if (value === target.value) return
  VALUE_SETTER?.call(target, value)
  target.dispatchEvent(new Event('input', { bubbles: true }))
  target.setSelectionRange(caret, caret)
}

/** Entrée : touche `keydown` (la lecture chronométrée l'écoute), puis envoi du formulaire si
 *  personne ne l'a prise en charge (quiz). */
function enter(target: HTMLInputElement) {
  const handled = !target.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }))
  if (!handled) target.form?.requestSubmit()
}

/** Clavier romaji intégré (docs/design/components) : lettres selon la disposition du système,
 *  tiret (ー), apostrophe (n'), espace, effacer, Entrée. Ne prend jamais le focus. */
export function AppKeyboard({ targetId, layout, enterLabel }: AppKeyboardProps) {
  const rows = LAYOUT_ROWS[layout]
  const target = () => document.getElementById(targetId) as HTMLInputElement | null

  const press = (text: string | null) => {
    const el = target()
    if (!el) return
    el.focus({ preventScroll: true })
    type(el, text)
    haptic('key')
  }

  return (
    <div
      // L'ombre pleine prolonge le fond dans la marge basse de <main> : le clavier touche le bord.
      className="k-keyboard -mx-4 mt-2 grid gap-[7px] border-t border-hairline bg-paper-raised shadow-[0_1rem_0_0_var(--k-paper-raised)] px-[5px] pt-2 pb-[max(6px,env(safe-area-inset-bottom))] select-none"
      role="group"
      aria-label="Clavier romaji"
    >
      {rows.map((row, r) => (
        <div key={row} className="flex justify-center gap-[5px]">
          {[...row].map((letter) => (
            <Key key={letter} label={letter} onPress={() => press(letter)}>
              {letter}
            </Key>
          ))}
          {r === rows.length - 1 && <Backspace onPress={() => press(null)} />}
        </div>
      ))}
      <div className="flex justify-center gap-[5px]">
        <Key label="tiret, voyelle longue" onPress={() => press('-')} wide={1.2}>
          -
        </Key>
        <Key label="apostrophe" onPress={() => press("'")} wide={1.2}>
          ’
        </Key>
        <Key label="espace" onPress={() => press(' ')} wide={4.6}>
          <span className="sr-only">espace</span>
        </Key>
        <Key
          label={enterLabel}
          onPress={() => {
            const el = target()
            if (el) enter(el)
          }}
          wide={2.6}
          accent
        >
          {enterLabel}
        </Key>
      </div>
    </div>
  )
}

interface KeyProps {
  label: string
  onPress: () => void
  /** Largeur relative (1 = une lettre). */
  wide?: number
  accent?: boolean
  repeat?: boolean
  children: ReactNode
}

// Le geste ne doit jamais retirer le focus au champ (le curseur clignoterait ailleurs).
const keepFocus = (e: ReactPointerEvent) => e.preventDefault()

function Key({ label, onPress, wide = 1, accent, repeat, children }: KeyProps) {
  const timers = useRef<{ delay?: number; tick?: number }>({})
  const stop = () => {
    window.clearTimeout(timers.current.delay)
    window.clearInterval(timers.current.tick)
  }
  useEffect(() => stop, [])

  return (
    <button
      type="button"
      aria-label={label}
      onPointerDown={(e) => {
        keepFocus(e)
        // Action au toucher (pas au relâché) : la frappe suit le doigt. Effacer se répète si l'on reste appuyé.
        onPress()
        if (repeat) {
          stop()
          timers.current.delay = window.setTimeout(() => {
            timers.current.tick = window.setInterval(onPress, 70)
          }, 420)
        }
      }}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onPress()
        }
      }}
      // Grille de 10 colonnes : une lettre = 1/10 de la largeur (moins les espacements).
      style={{ flex: `0 1 calc(${wide} * (100% - 45px) / 10)` }}
      className={`k-key ${accent ? 'k-key--enter bg-accent text-on-accent' : 'bg-paper text-ink'} grid h-[46px] min-w-0 place-items-center rounded-sm border border-control text-[19px] leading-none font-medium touch-manipulation active:brightness-90 ${
        accent ? 'text-[15px] font-semibold' : ''
      }`}
    >
      {children}
    </button>
  )
}

function Backspace({ onPress }: { onPress: () => void }) {
  return (
    <Key label="effacer" onPress={onPress} wide={1.6} repeat>
      <Icon name="backspace" className="size-[22px]" />
    </Key>
  )
}
