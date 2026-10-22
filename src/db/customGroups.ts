import { db, type CustomGroup } from '@/db/db'

export async function saveCustomGroup(group: { id?: number; name: string; kanaIds: string[] }): Promise<number> {
  if (group.id !== undefined) {
    await db.customGroups.update(group.id, { name: group.name, kanaIds: group.kanaIds })
    return group.id
  }
  return db.customGroups.add({ name: group.name, kanaIds: group.kanaIds, createdAt: Date.now() } as CustomGroup)
}

export async function deleteCustomGroup(id: number): Promise<void> {
  await db.customGroups.delete(id)
}
