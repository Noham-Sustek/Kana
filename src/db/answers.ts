import { db, type AnswerRecord } from '@/db/db'

export type NewAnswer = Omit<AnswerRecord, 'id' | 'profileId'>

export async function recordAnswers(profileId: number, answers: NewAnswer[]): Promise<void> {
  if (answers.length === 0) return
  await db.answers.bulkAdd(answers.map((a) => ({ ...a, profileId })) as AnswerRecord[])
}

/** Historique complet d'un profil, du plus ancien au plus récent. */
export function loadProfileAnswers(profileId: number): Promise<AnswerRecord[]> {
  return db.answers.where('[profileId+answeredAt]').between([profileId, -Infinity], [profileId, Infinity]).toArray()
}
