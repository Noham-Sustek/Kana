interface PlaceholderProps {
  glyph: string
  text: string
}

export function Placeholder({ glyph, text }: PlaceholderProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-control px-6 py-16 text-center">
      <span className="font-jp text-6xl text-accent">{glyph}</span>
      <p className="mt-4 text-sm text-ink-muted">{text}</p>
    </div>
  )
}
