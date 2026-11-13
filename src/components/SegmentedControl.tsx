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
      className="grid gap-[3px] rounded-md border-[1.5px] border-control bg-paper-raised p-[3px]"
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
            className={`min-h-11 rounded-sm text-sm font-semibold transition-colors ${
              selected
                ? 'bg-ink text-paper'
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
