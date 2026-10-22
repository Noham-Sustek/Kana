import { describe, expect, it } from 'vitest'
import {
  KANA,
  KANA_GROUPS,
  counterpartOf,
  getGroup,
  getKana,
  kanaOfScript,
  toKatakana,
  type GroupKind,
  type Script,
} from '@/data/kana'

const SCRIPTS: Script[] = ['hiragana', 'katakana']

// Homophones légitimes en Hepburn : même romaji principal pour deux kana distincts.
const HOMOPHONES = [
  ['h-ji', 'h-dji'],
  ['h-zu', 'h-dzu'],
  ['k-ji', 'k-dji'],
  ['k-zu', 'k-dzu'],
  ['k-wo', 'k-uo'],
]

const CHAR_RANGE: Record<Script, RegExp> = {
  hiragana: /^[ぁ-ゖ]+$/,
  katakana: /^[ァ-ヺ]+$/,
}

function duplicates<T>(values: T[]): T[] {
  return values.filter((v, i) => values.indexOf(v) !== i)
}

describe('kana : unicité', () => {
  it("aucun id en double", () => {
    expect(duplicates(KANA.map((k) => k.id))).toEqual([])
  })

  it('aucun caractère en double', () => {
    expect(duplicates(KANA.map((k) => k.char))).toEqual([])
  })

  it("aucun id de groupe en double", () => {
    expect(duplicates(KANA_GROUPS.map((g) => g.id))).toEqual([])
  })

  it('romaji principal unique par écriture, hors homophones connus', () => {
    for (const script of SCRIPTS) {
      const byRomaji = new Map<string, string[]>()
      for (const k of kanaOfScript(script)) {
        byRomaji.set(k.romaji[0]!, [...(byRomaji.get(k.romaji[0]!) ?? []), k.id])
      }
      const clashes = [...byRomaji.values()].filter((ids) => ids.length > 1)
      for (const ids of clashes) {
        expect(HOMOPHONES).toContainEqual(ids)
      }
    }
  })
})

describe('kana : cohérence', () => {
  it.each(KANA.map((k) => [k.id, k] as const))('%s est bien formé', (_, k) => {
    expect(k.char).toMatch(CHAR_RANGE[k.script])
    expect(k.id.startsWith(k.script === 'hiragana' ? 'h-' : 'k-')).toBe(true)
    expect(k.romaji.length).toBeGreaterThan(0)
    for (const r of k.romaji) expect(r).toMatch(/^[a-z']+$/)
    expect(duplicates(k.romaji)).toEqual([])

    const group = getGroup(k.groupId)
    expect(group).toBeDefined()
    expect(group!.script).toBe(k.script)
    expect(group!.kanaIds).toContain(k.id)
  })

  it('chaque katakana issu des hiragana a le même romaji que son homologue', () => {
    for (const h of kanaOfScript('hiragana')) {
      const k = counterpartOf(h)
      expect(k, h.id).toBeDefined()
      expect(k!.char).toBe(toKatakana(h.char))
      expect(k!.romaji).toEqual(h.romaji)
    }
  })

  it('les variantes de romaji demandées sont acceptées', () => {
    const expectations: [string, string[]][] = [
      ['し', ['shi', 'si']],
      ['ち', ['chi', 'ti']],
      ['つ', ['tsu', 'tu']],
      ['ふ', ['fu', 'hu']],
      ['じ', ['ji', 'zi']],
      ['シ', ['shi', 'si']],
      ['チ', ['chi', 'ti']],
      ['ツ', ['tsu', 'tu']],
      ['フ', ['fu', 'hu']],
      ['ジ', ['ji', 'zi']],
    ]
    for (const [char, romaji] of expectations) {
      const kana = KANA.find((k) => k.char === char)
      expect(kana?.romaji.slice(0, romaji.length), char).toEqual(romaji)
    }
  })
})

describe('groupes : cohérence', () => {
  it.each(KANA_GROUPS.map((g) => [g.id, g] as const))('%s est cohérent', (_, g) => {
    const width = g.kind === 'yoon' ? 3 : 5
    for (const row of g.rows) expect(row).toHaveLength(width)

    const cellIds = g.rows.flat().filter((id): id is string => id !== null)
    expect(cellIds).toEqual(g.kanaIds)
    expect(g.kanaIds.length).toBeGreaterThan(0)

    const members = KANA.filter((k) => k.groupId === g.id).map((k) => k.id)
    expect(members).toEqual(g.kanaIds)

    for (const id of g.kanaIds) expect(getKana(id)?.script).toBe(g.script)
  })

  it('les katakana étendus n’existent qu’en katakana', () => {
    for (const g of KANA_GROUPS.filter((g) => g.kind === 'extended')) {
      expect(g.script).toBe('katakana')
    }
  })

  it('les yōon sont des combinaisons de deux caractères (kana + petit ya/yu/yo)', () => {
    for (const g of KANA_GROUPS.filter((g) => g.kind === 'yoon')) {
      for (const id of g.kanaIds) {
        expect(getKana(id)!.char).toMatch(/^.[ゃゅょャュョ]$/u)
      }
    }
  })

  it('effectifs attendus par écriture', () => {
    const count = (script: Script, kind: GroupKind) =>
      KANA_GROUPS.filter((g) => g.script === script && g.kind === kind).reduce(
        (n, g) => n + g.kanaIds.length,
        0,
      )
    for (const script of SCRIPTS) {
      expect(count(script, 'gojuon')).toBe(46)
      expect(count(script, 'dakuten')).toBe(20)
      expect(count(script, 'handakuten')).toBe(5)
      expect(count(script, 'yoon')).toBe(33)
    }
    expect(count('hiragana', 'extended')).toBe(0)
    expect(count('katakana', 'extended')).toBeGreaterThan(0)
  })
})
