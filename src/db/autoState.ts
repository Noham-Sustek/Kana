import type { PathScript, Script } from '@/data/kana'
import { db, type AnswerRecord } from '@/db/db'

const SCRIPT_PREFIX: Record<Script, string> = { hiragana: 'h-', katakana: 'k-' }

/** Historique des réponses d'un profil pour un parcours (tous modes confondus ; mixte : toutes). */
export function loadAnswersForScript(profileId: number, script: PathScript): Promise<AnswerRecord[]> {
  const prefix = script === 'mixed' ? '' : SCRIPT_PREFIX[script]
  return db.answers.where('[profileId+kanaId]').between([profileId, prefix], [profileId, prefix + '￿']).toArray()
}

export async function loadUnlockedGroups(profileId: number, script: PathScript): Promise<number> {
  return (await db.autoStates.get([profileId, script]))?.unlockedGroups ?? 1
}

export async function saveUnlockedGroups(profileId: number, script: PathScript, unlockedGroups: number): Promise<void> {
  await db.autoStates.put({ profileId, script, unlockedGroups })
}
