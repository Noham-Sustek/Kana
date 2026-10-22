import { db, type Profile } from '@/db/db'

export async function createProfile(name: string): Promise<number> {
  return db.profiles.add({ name, createdAt: Date.now() } as Profile)
}

export async function renameProfile(id: number, name: string): Promise<void> {
  await db.profiles.update(id, { name })
}

/** Supprime un profil et toute sa progression. Le dernier profil ne peut pas être supprimé. */
export async function deleteProfile(id: number): Promise<void> {
  await db.transaction('rw', [db.profiles, db.answers, db.customGroups, db.autoStates], async () => {
    if ((await db.profiles.count()) <= 1) throw new Error('Impossible de supprimer le dernier profil')
    await db.answers.where('[profileId+answeredAt]').between([id, -Infinity], [id, Infinity]).delete()
    await db.customGroups.where('profileId').equals(id).delete()
    await db.autoStates.where('[profileId+script]').between([id, ''], [id, '￿']).delete()
    await db.profiles.delete(id)
  })
}
