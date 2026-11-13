interface ProfileSealProps {
  name: string
  className?: string
}

/** Sceau du profil : initiale en Newsreader dans une case à contour accent. */
export function ProfileSeal({ name, className = '' }: ProfileSealProps) {
  const initial = name.trim().charAt(0).toLocaleUpperCase('fr-FR') || '?'
  return (
    <span
      aria-hidden="true"
      className={`grid size-8 shrink-0 place-items-center rounded-sm border-[1.5px] border-accent font-serif text-[17px] leading-none font-semibold text-accent ${className}`}
    >
      {initial}
    </span>
  )
}
