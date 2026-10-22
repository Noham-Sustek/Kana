import { db, type AnswerRecord } from '@/db/db'

export type NewAnswer = Omit<AnswerRecord, 'id'>

export async function recordAnswers(answers: NewAnswer[]): Promise<void> {
  if (answers.length === 0) return
  await db.answers.bulkAdd(answers as AnswerRecord[])
}
