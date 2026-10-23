import { useEffect, useState } from 'react'
import { StrokeCell } from '@/components/StrokeCell'
import { WordComparison } from '@/components/WordComparison'
import { WritingComparison } from '@/components/WritingComparison'
import { WritingPad, type WritingResult } from '@/components/WritingPad'
import { drawingStrokesOf, isSmallKana } from '@/data/strokes'
import type { DrawQuestion } from '@/features/quiz/types'

/** Pause sur le caractère terminé (trait validé en vert) avant le suivant. */
const NEXT_CHAR_DELAY_MS = 350

interface QuizDrawingProps {
  question: DrawQuestion
  /** Résultat fixé (réussi, raté ou réponse affichée) : on montre la comparaison. */
  settled: boolean
  /** Dessin terminé : juste si aucun caractère n'a eu d'erreur de trait ni d'indice. */
  onDone: (correct: boolean) => void
}

/**
 * Dessin d'un kana ou d'un mot dans le quiz, un caractère par case (les petits
 * kana s'y dessinent en grand). Une fois le résultat fixé, le tracé et le modèle
 * sont comparés.
 */
export function QuizDrawing({ question, settled, onDone }: QuizDrawingProps) {
  const { chars } = question
  const [results, setResults] = useState<WritingResult[]>([])
  const [pendingNext, setPendingNext] = useState(false)
  const index = results.length
  const model = chars.map((c) => drawingStrokesOf(c) ?? [])

  useEffect(() => {
    if (!pendingNext) return
    const timer = setTimeout(() => setPendingNext(false), NEXT_CHAR_DELAY_MS)
    return () => clearTimeout(timer)
  }, [pendingNext])

  const onCharDone = (result: WritingResult) => {
    const next = [...results, result]
    setResults(next)
    if (next.length < chars.length) {
      setPendingNext(true)
      return
    }
    onDone(next.every((r) => r.mistakes === 0 && !r.hinted))
  }

  if (settled) {
    const drawn = chars.map((_, i) => results[i]?.drawn)
    return (
      <div style={{ animation: 'fade-in 0.2s' }}>
        {chars.length === 1 ? (
          <WritingComparison drawn={drawn[0] ?? []} model={model[0]!} />
        ) : (
          <WordComparison chars={chars} drawn={drawn} model={model} />
        )}
      </div>
    )
  }

  // Pendant la pause, la case terminée reste affichée (dernier trait en vert).
  const padIndex = pendingNext ? index - 1 : index
  const current = chars[padIndex]
  return (
    <div>
      {chars.length > 1 && (
        <div className="mb-3 flex justify-center gap-1.5" aria-label={`Caractère ${index + 1} sur ${chars.length}`}>
          {chars.map((c, i) => (
            <div
              key={i}
              className={`max-w-14 min-w-0 flex-1 rounded-xl ${
                i === index && !pendingNext ? 'ring-2 ring-accent-500' : ''
              }`}
            >
              <StrokeCell
                strokes={results[i]?.drawn ?? []}
                className="stroke-slate-900 dark:stroke-slate-100"
                caption={i === index && isSmallKana(c) ? 'petit' : undefined}
              />
            </div>
          ))}
        </div>
      )}
      {current !== undefined && (
        <WritingPad
          key={padIndex}
          strokes={drawingStrokesOf(current) ?? []}
          mode="free"
          showCompare={false}
          onComplete={onCharDone}
        />
      )}
    </div>
  )
}
