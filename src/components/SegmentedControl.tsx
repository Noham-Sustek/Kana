interface SegmentedControlProps<T extends string | number> {
  label: string
  options: readonly { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
}

export function SegmentedControl<T extends string | number>({ label, options, value, onChange }: SegmentedControlProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="grid gap-1 rounded-md bg-hairline p-1"
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((opt) => {
        const selected = value === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(opt.value)}
            className={`min-h-11 rounded-lg text-sm font-medium transition-colors ${
              selected
                ? 'bg-paper-raised text-ink'
                : 'text-ink-muted'
            }`}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
