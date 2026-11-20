import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { ReloadGuide } from '@/components/reload/ReloadGuide'
import { ReloadMenu, type ReloadMenuItem } from '@/components/reload/ReloadMenu'
import { playSound } from '@/lib/sound'
import { useIsDark } from '@/lib/useIsDark'

export interface ReloadSettingsSection {
  id: string
  /** Mot du menu, en capitales. */
  word: string
  title: string
  detail: string
  content: ReactNode
}

const LAYOUT: Omit<ReloadMenuItem, 'id' | 'label'>[] = [
  { size: 20, angle: -8, x: 124, y: 140, color: '#ffffff' },
  { size: 26, angle: -4, x: 168, y: 192, color: '#b9f4ff' },
  { size: 24, angle: -6, x: 140, y: 244, color: '#8fe8ff' },
  { size: 19, angle: 3, x: 160, y: 292, color: '#3fa8ff' },
  { size: 20, angle: -5, x: 138, y: 342, color: '#ffffff' },
]

/** Réglages du style Reload (menu système) : les rubriques en cercle bleu sur fond blanc ;
 *  toucher une rubrique fait glisser son panneau (aucun panneau tant qu'on n'a rien choisi). */
export function ReloadSettings({ sections }: { sections: readonly ReloadSettingsSection[] }) {
  const navigate = useNavigate()
  const [selected, setSelected] = useState(0)
  const [open, setOpen] = useState(false)
  const dark = useIsDark()
  const current = sections[selected]!

  const choose = (i: number) => {
    playSound(open ? 'select' : 'panelIn')
    setSelected(i)
    setOpen(true)
  }
  const close = () => {
    playSound('panelOut')
    setOpen(false)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open && !document.querySelector('dialog[open]')) close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const items: ReloadMenuItem[] = sections.map((s, i) => ({ id: s.id, label: s.word, aria: s.title, sound: 'panelIn', ...LAYOUT[i % LAYOUT.length]! }))

  return (
    <div className="relative flex flex-1 flex-col">
      <h1 className="sr-only">Réglages</h1>
      <div aria-hidden="true" className={`absolute -inset-x-4 -top-4 bottom-0 overflow-hidden ${dark ? 'bg-[#0a0f2e]' : 'bg-[#f3f5fa]'}`}>
      <span
        aria-hidden="true"
        className={`rl-word pointer-events-none absolute text-[150px] ${dark ? 'text-[#1a2a78]' : 'text-[#05081f]'}`}
        style={{ left: 0, top: 0, transform: 'translate(-74px, 916px) rotate(-62deg) scaleX(.86) skewX(-7deg)', transformOrigin: '0 0' }}
      >
        RÉGLAGES
      </span>
      <span
        aria-hidden="true"
        className="rl-pop absolute -top-[174px] left-[22px] size-[600px] rounded-full"
        style={{
          background:
            'radial-gradient(ellipse 200px 120px at 30% 70%, rgba(80,200,255,0.35), rgba(80,200,255,0) 70%), repeating-linear-gradient(172deg, rgba(255,255,255,0.06) 0 2px, rgba(255,255,255,0) 2px 24px), linear-gradient(170deg, #2a6ff0 0%, #1838c8 40%, #0e1f96 100%)',
        }}
      />
      </div>
      <ReloadMenu
        label="Rubriques des réglages"
        items={items}
        selected={selected}
        onSelect={choose}
        onActivate={choose}
        maxRight={350}
        height={380}
        keyboard={!open}
        silent
      />

      {open && (
        <div
          role="region"
          aria-label={current.title}
          key={current.id}
          className="rl-panel-in absolute top-[392px] -left-4 z-30 max-h-[calc(100dvh-392px-150px)] w-[calc(100%+2rem)] overflow-y-auto overscroll-contain bg-[#0e1c7c] pt-3 pr-8 pb-5 pl-4 text-white shadow-[inset_0_3px_0_var(--r-red)] [clip-path:polygon(0_0,100%_0,96%_100%,0_100%)] lg:max-w-[40rem]"
        >
          <h2 className="rl-cond mb-2 text-[24px] font-semibold text-[#4fdcff]">{current.title}</h2>
          {current.content}
        </div>
      )}

      <ReloadGuide
        onLight={!dark}
        title={open ? current.title : 'Que voulez-vous régler ?'}
        detail={open ? undefined : current.detail}
        actions={[
          open
            ? { label: 'Fermer', kind: 'back', onClick: close, keyHint: 'Échap', sound: 'panelOut' }
            : { label: 'Retour', kind: 'back', onClick: () => navigate('/home'), keyHint: 'Échap' },
        ]}
      />
    </div>
  )
}
