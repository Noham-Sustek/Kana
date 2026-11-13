interface SwitchProps {
  label: string
  description?: string
  checked: boolean
  onChange: (checked: boolean) => void
}

export function Switch({ label, description, checked, onChange }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex min-h-11 w-full items-center justify-between gap-4 text-left"
    >
      <span>
        <span className="block text-sm font-medium">{label}</span>
        {description && <span className="block text-xs text-ink-muted">{description}</span>}
      </span>
      <span
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
          checked ? 'bg-accent' : 'bg-control'
        }`}
      >
        <span
          className={`absolute top-1 left-1 size-5 rounded-full bg-paper-raised transition-transform ${
            checked ? 'translate-x-5' : ''
          }`}
        />
      </span>
    </button>
  )
}
