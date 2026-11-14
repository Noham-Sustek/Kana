/** Clavier romaji intégré : dispositions et édition du champ (pur, testé). */

export type KeyboardLayout = 'azerty' | 'qwerty' | 'qwertz'

/** Trois rangées de lettres par disposition (la touche d'effacement suit la dernière). */
export const LAYOUT_ROWS: Record<KeyboardLayout, readonly string[]> = {
  azerty: ['azertyuiop', 'qsdfghjklm', 'wxcvbn'],
  qwerty: ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'],
  qwertz: ['qwertzuiop', 'asdfghjkl', 'yxcvbnm'],
}

export const LAYOUT_LABELS: Record<KeyboardLayout, string> = { azerty: 'AZERTY', qwerty: 'QWERTY', qwertz: 'QWERTZ' }

/** Disposition probable du clavier du système, d'après ses langues (le navigateur ne donne pas la
 *  disposition réelle sur Android) : français → AZERTY (sauf Canada : QWERTY, Suisse : QWERTZ),
 *  allemand et Europe centrale → QWERTZ, le reste → QWERTY. La première langue reconnue l'emporte. */
export function layoutForLanguages(languages: readonly string[]): KeyboardLayout {
  for (const raw of languages) {
    const [lang = '', region = ''] = raw.toLowerCase().split(/[-_]/)
    if (lang === 'fr') return region === 'ca' ? 'qwerty' : region === 'ch' ? 'qwertz' : 'azerty'
    if (['de', 'cs', 'sk', 'hu', 'sl', 'hr', 'sr', 'bs', 'pl'].includes(lang)) return lang === 'pl' ? 'qwerty' : 'qwertz'
    if (lang) return 'qwerty'
  }
  return 'qwerty'
}

export interface EditResult {
  value: string
  caret: number
}

/** Effet d'une touche sur la valeur d'un champ et sa sélection : `text` remplace la sélection,
 *  `null` efface (la sélection, ou le caractère avant le curseur). */
export function editValue(value: string, start: number, end: number, text: string | null): EditResult {
  const from = Math.max(0, Math.min(start, value.length))
  const to = Math.max(from, Math.min(end, value.length))
  if (text !== null) return { value: value.slice(0, from) + text + value.slice(to), caret: from + text.length }
  if (from !== to) return { value: value.slice(0, from) + value.slice(to), caret: from }
  if (from === 0) return { value, caret: 0 }
  return { value: value.slice(0, from - 1) + value.slice(to), caret: from - 1 }
}
