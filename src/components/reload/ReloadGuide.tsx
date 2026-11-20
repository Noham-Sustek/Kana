import type { ReactNode } from 'react'
import { Link } from 'react-router'
import type { SoundKind } from '@/lib/sound'

export interface GuideAction {
  label: ReactNode
  to?: string
  /** État transmis à la navigation (`from` du quiz…). */
  state?: unknown
  onClick?: () => void
  /** primary : bouton blanc (l'action de l'écran) · back : « ‹ Retour » · plain : texte. */
  kind?: 'primary' | 'back' | 'plain'
  /** Touche affichée sur ordinateur (« Entrée », « Échap »…). */
  keyHint?: string
  disabled?: boolean
  sound?: SoundKind
}

interface ReloadGuideProps {
  title: ReactNode
  /** Petit mot au-dessus du filet : « Guide » ou « Commande ». */
  caption?: string
  detail?: ReactNode
  actions?: readonly GuideAction[]
  /** Sur fond clair (menu système) : texte en encre. */
  onLight?: boolean
  /** Collé en bas de l'écran (défaut) ; sinon dans le flux. */
  sticky?: boolean
  className?: string
}

/** Guide en bas à droite des écrans Reload : question ou titre en italique, filet, description,
 *  puis les actions (le bouton blanc à portée de pouce ; les touches clavier sur ordinateur). */
export function ReloadGuide({
  title,
  caption = 'Guide',
  detail,
  actions = [],
  onLight = false,
  sticky = true,
  className = '',
}: ReloadGuideProps) {
  const ink = onLight ? 'text-[#05081f]' : 'text-white rl-shadow-soft'
  return (
    <div
      className={`${sticky ? 'sticky bottom-0 -mx-4 mt-auto px-4 pb-[max(16px,env(safe-area-inset-bottom))]' : 'pb-2'} z-20 pt-6 ${
        sticky && !onLight ? 'rl-guide-fade' : ''
      } ${className}`}
    >
      <div aria-live="polite" className={`ml-auto flex max-w-[22rem] flex-col items-end gap-0.5 text-right ${ink}`}>
        <p className="rl-cond text-[19px] leading-6 font-semibold">{title}</p>
        <span aria-hidden="true" className="flex w-[15.5rem] items-center gap-1">
          <span className="rl-cond text-[9px] font-semibold">{caption}</span>
          <i className={`h-[1.5px] flex-1 ${onLight ? 'bg-[#05081f]' : 'bg-white'}`} />
        </span>
        {detail && <div className="mt-0.5 text-[14px] leading-[19px] font-semibold">{detail}</div>}
        {actions.length > 0 && (
          <div className="mt-1.5 flex flex-wrap items-center justify-end gap-1">
            {actions.map((a, i) => (
              <GuideButton key={i} action={a} onLight={onLight} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function GuideButton({ action, onLight }: { action: GuideAction; onLight: boolean }) {
  const kind = action.kind ?? 'plain'
  const look =
    kind === 'primary'
      ? 'rl-cond bg-white px-5 text-[19px] font-extrabold text-[#05081f] [clip-path:polygon(8%_0,100%_0,92%_100%,0_100%)] shadow-[inset_0_3px_0_var(--r-red)]'
      : `rl-cond px-2.5 text-[18px] font-bold ${onLight ? 'text-[#05081f]' : 'text-white'}`
  const content = (
    <>
      {action.keyHint && <span className="rl-kbd mr-1.5">{action.keyHint}</span>}
      {kind === 'back' && (
        <span aria-hidden="true" className="mr-1 text-[22px] leading-none not-italic">
          ‹
        </span>
      )}
      {action.label}
      {kind === 'primary' && (
        <svg viewBox="0 0 24 24" className="ml-2 size-4" aria-hidden="true">
          <path d="M6 4l12 8-12 8z" fill="var(--r-red)" />
        </svg>
      )}
    </>
  )
  const cls = `flex min-h-11 items-center transition-transform duration-100 active:translate-x-[3px] disabled:opacity-40 ${look}`
  const sound = action.sound ?? (kind === 'back' ? 'tapBack' : kind === 'primary' ? 'tapPrimary' : 'tap')
  if (action.to && !action.disabled) {
    return (
      <Link to={action.to} state={action.state} className={cls} data-tap-sound={sound} onClick={action.onClick}>
        {content}
      </Link>
    )
  }
  return (
    <button type="button" className={cls} disabled={action.disabled} data-tap-sound={sound} onClick={action.onClick}>
      {content}
    </button>
  )
}
