import { CONFUSABLE_SETS } from '@/data/confusables'
import { getKana, KANA, type Kana } from '@/data/kana'
import type { AttemptStatus } from '@/features/quiz/session'
import type { Question } from '@/features/quiz/types'

// Contenu du panneau de retour d'une question (docs/design/components/Feedback) :
// titre court et détail qui apporte quelque chose. Pur : le composant ne fait que l'afficher.
// Pas de panneau pour une bonne réponse : la zone de réponse suffit (vert + coche).
// La traduction d'un mot ou d'une phrase n'y figure pas non plus : elle s'affiche sous
// le sujet, en récompense, une fois la réponse fixée (QuizPage).

/** Morceau de texte ; `jp` = kana, à afficher en police japonaise. */
export interface Segment {
  text: string
  jp?: boolean
}

export type Line = Segment[]

export interface FeedbackContent {
  signal: 'wrong' | 'revealed'
  title: Line
  detail: Line[]
}

export interface FeedbackInput {
  question: Question
  status: AttemptStatus
  /** Réponses fausses déjà données (ids de kana pour un choix). */
  wrongAnswers: readonly string[]
  /** Résultat obtenu par « Afficher la réponse » ou chrono écoulé. */
  revealed: boolean
}

const t = (text: string): Segment => ({ text })
const jp = (text: string): Segment => ({ text, jp: true })

/** `null` quand il n'y a rien à dire : question en attente sans erreur, ou réussie. */
export function feedbackFor({ question, status, wrongAnswers, revealed }: FeedbackInput): FeedbackContent | null {
  const lastWrong = wrongAnswers.at(-1)

  if (status === 'correct') return null

  if (status === 'pending') {
    if (lastWrong === undefined) return null
    return { signal: 'wrong', title: [t('Pas encore')], detail: [retryHint(question, lastWrong)] }
  }

  const title = [t('La réponse : '), answerSegment(question)]
  if (revealed) return { signal: 'revealed', title, detail: revealedDetail(question) }
  return { signal: 'wrong', title, detail: failedDetail(question, lastWrong) }
}

function answerSegment(question: Question): Segment {
  switch (question.kind) {
    case 'choice': {
      const label = question.choices.find((c) => c.id === question.answerId)!.label
      return question.choiceType === 'kana' ? jp(label) : t(label)
    }
    case 'input':
      return t(question.expected)
    case 'draw':
      return jp(question.target)
    case 'compose':
      return jp(question.reading)
  }
}

/** Kana évalué par une question sur un seul kana (stages 1 à 5). */
function targetKana(question: Question): Kana | undefined {
  return question.stage <= 5 ? getKana(question.kanaIds[0]!) : undefined
}

function retryHint(question: Question, lastWrong: string): Line {
  switch (question.kind) {
    case 'choice':
      return [...pickedLine(question, lastWrong), t(' Choisissez une autre réponse.')]
    case 'compose':
      return [t('Touchez une étiquette pour la retirer.')]
    default:
      return [t('Corrigez votre réponse, ou affichez-la.')]
  }
}

function failedDetail(question: Question, lastWrong: string | undefined): Line[] {
  const lines: Line[] = []
  if (question.kind === 'choice' && lastWrong !== undefined) lines.push(pickedLine(question, lastWrong))
  if (question.kind === 'draw') lines.push([t('Comparez votre tracé avec le modèle.')])
  return lines
}

function revealedDetail(question: Question): Line[] {
  const kana = targetKana(question)
  if (!kana) return []
  const confusable = confusableLine(kana)
  return confusable ? [confusable] : []
}

/** Ce que vaut la réponse choisie : « « me » s'écrit め. » ou « め se lit « me ». » */
function pickedLine(question: Question, pickedId: string): Line {
  const picked = getKana(pickedId)
  if (!picked) return []
  const romaji = picked.romaji[0]!
  return question.prompt.type === 'romaji'
    ? [jp(picked.char), t(` se lit « ${romaji} ».`)]
    : [t(`« ${romaji} » s’écrit `), jp(picked.char), t('.')]
}

/** « À ne pas confondre avec め (me) et ね (ne). » d'après les familles de caractères proches. */
export function confusableLine(kana: Kana): Line | null {
  const others: Kana[] = []
  for (const set of CONFUSABLE_SETS) {
    if (!set.includes(kana.char)) continue
    for (const char of set) {
      const other = KANA.find((k) => k.char === char && k.script === kana.script)
      if (other && other.id !== kana.id && !others.includes(other)) others.push(other)
    }
  }
  const shown = others.slice(0, 3)
  if (shown.length === 0) return null
  const line: Line = [t('À ne pas confondre avec ')]
  shown.forEach((k, i) => {
    if (i > 0) line.push(t(i === shown.length - 1 ? ' et ' : ', '))
    line.push(jp(k.char), t(` (${k.romaji[0]})`))
  })
  line.push(t('.'))
  return line
}
