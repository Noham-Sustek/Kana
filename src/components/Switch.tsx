import { Icon } from '@/components/Icon'

interface SwitchProps {
  label: string
  description?: string
  checked: boolean
  onChange: (checked: boolean) => void
}

/** Réglage oui / non à effet immédiat ; toute la ligne est la cible. */
export function Switch({ label, description, checked, onChange }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex min-h-14 w-full items-center justify-between gap-4 text-left"
    >
      <span>
        <span className="block font-semibold">{label}</span>
        {description && <span className="block text-[13px] leading-[18px] text-ink-muted">{description}</span>}
      </span>
      <span
        className={`k-switch relative h-8 w-[52px] shrink-0 rounded-full border-[1.5px] transition-colors ${
          checked ? 'border-accent bg-accent' : 'border-control bg-paper-raised'
        }`}
      >
        <span
          className={`k-switch__thumb absolute top-[3px] left-[3px] grid size-[23px] place-items-center rounded-full text-accent transition-transform duration-200 ${
            checked ? 'translate-x-5 bg-on-accent' : 'bg-control'
          }`}
        >
          {checked && <Icon name="check" strokeWidth={3} className="size-3.5" />}
        </span>
      </span>
    </button>
  )
}
