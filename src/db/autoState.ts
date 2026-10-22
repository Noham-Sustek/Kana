import type { Script } from '@/data/kana'
import { db, type AnswerRecord } from '@/db/db'

const SCRIPT_PREFIX: Record<Script, string> = { hiragana: 'h-', katakana: 'k-' }

/** Historique des réponses d'une écriture (tous modes confondus). */
export function loadAnswersForScript(script: Script): Promise<AnswerRecord[]> {
  return db.answers.where('kanaId').startsWith(SCRIPT_PREFIX[script]).toArray()
}

export async function loadUnlockedGroups(script: Script): Promise<number> {
  return (await db.autoState.get(script))?.unlockedGroups ?? 1
}

export async function saveUnlockedGroups(script: Script, unlockedGroups: number): Promise<void> {
  await db.autoState.put({ script, unlockedGroups })
}
