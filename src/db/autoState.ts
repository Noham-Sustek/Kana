import type { Script } from '@/data/kana'
import { db, type AnswerRecord } from '@/db/db'

const SCRIPT_PREFIX: Record<Script, string> = { hiragana: 'h-', katakana: 'k-' }

/** Historique des réponses d'un profil pour une écriture (tous modes confondus). */
export function loadAnswersForScript(profileId: number, script: Script): Promise<AnswerRecord[]> {
  const prefix = SCRIPT_PREFIX[script]
  return db.answers.where('[profileId+kanaId]').between([profileId, prefix], [profileId, prefix + '￿']).toArray()
}

export async function loadUnlockedGroups(profileId: number, script: Script): Promise<number> {
  return (await db.autoStates.get([profileId, script]))?.unlockedGroups ?? 1
}

export async function saveUnlockedGroups(profileId: number, script: Script, unlockedGroups: number): Promise<void> {
  await db.autoStates.put({ profileId, script, unlockedGroups })
}
