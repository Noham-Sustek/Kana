import { SegmentedControl } from '@/components/SegmentedControl'
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
  return <SegmentedControl label="Écriture" options={OPTIONS} value={value} onChange={onChange} />
}
