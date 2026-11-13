/** Morceau de texte ; `jp` = kana, à afficher en police japonaise. */
export interface Segment {
  text: string
  jp?: boolean
}

export type Line = Segment[]

export const t = (text: string): Segment => ({ text })
export const jp = (text: string): Segment => ({ text, jp: true })

/** Texte brut d'une ligne (tests, noms accessibles). */
export const lineText = (line: Line): string => line.map((s) => s.text).join('')
