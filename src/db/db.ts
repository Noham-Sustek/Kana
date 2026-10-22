import { Dexie } from 'dexie'

// Base IndexedDB de l'app. Aucune table pour l'instant : les schémas seront
// ajoutés au fil de la roadmap (progression, révisions, profils…), chaque
// évolution passant par un nouveau db.version(n).
export const db = new Dexie('kana')

db.version(1).stores({})
