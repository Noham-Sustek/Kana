import { db, type WritingResult } from '@/db/db'

export async function recordWritingResult(profileId: number, result: Omit<WritingResult, 'id' | 'profileId'>): Promise<void> {
  await db.writingResults.add({ ...result, profileId } as WritingResult)
}

export function loadWritingResults(profileId: number): Promise<WritingResult[]> {
  return db.writingResults.where('[profileId+at]').between([profileId, -Infinity], [profileId, Infinity]).toArray()
}
