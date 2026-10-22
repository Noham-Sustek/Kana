import type { Script } from '@/data/kana'

const OPTIONS: { value: Script; label: string }[] = [
  { value: 'hiragana', label: 'Hiragana' },
  { value: 'katakana', label: 'Katakana' },
]

interface ScriptToggleProps {
  value: Script
  onChange: (script: Script) => void
}

export function ScriptToggle({ value, onChange }: ScriptToggleProps) {
  return (
    <div role="radiogroup" aria-label="Écriture" className="grid grid-cols-2 gap-1 rounded-xl bg-slate-200 p-1 dark:bg-slate-800">
      {OPTIONS.map((opt) => {
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
                ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-slate-100'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
