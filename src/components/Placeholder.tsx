interface PlaceholderProps {
  glyph: string
  text: string
}

export function Placeholder({ glyph, text }: PlaceholderProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 px-6 py-16 text-center dark:border-slate-700">
      <span className="font-jp text-6xl text-accent-500">{glyph}</span>
      <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">{text}</p>
    </div>
  )
}
