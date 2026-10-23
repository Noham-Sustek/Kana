export type Script = 'hiragana' | 'katakana'

export type GroupKind = 'gojuon' | 'dakuten' | 'handakuten' | 'yoon' | 'extended'

export interface Kana {
  /** Identifiant stable (persisté en base) : `h-ka`, `k-ka`… */
  id: string
  char: string
  /** Romaji acceptés ; le premier est la forme Hepburn affichée. */
  romaji: string[]
  script: Script
  groupId: string
}

export interface KanaGroup {
  /** `hiragana-ka`, `katakana-v`… */
  id: string
  script: Script
  kind: GroupKind
  /** Nom court de la ligne (romaji de son premier kana). */
  label: string
  /** Disposition en grille : 5 colonnes (a i u e o) ou 3 pour les yōon (ya yu yo). `null` = case vide. */
  rows: (string | null)[][]
  /** Ids des kana du groupe, dans l'ordre de lecture de la grille. */
  kanaIds: string[]
}

export const GROUP_KIND_LABELS: Record<GroupKind, string> = {
  gojuon: 'Gojūon',
  dakuten: 'Dakuten',
  handakuten: 'Handakuten',
  yoon: 'Yōon',
  extended: 'Katakana étendus',
}

export const GOJUON_COLUMNS = ['a', 'i', 'u', 'e', 'o']
export const YOON_COLUMNS = ['ya', 'yu', 'yo']

// ---------------------------------------------------------------------------
// Définitions source
// ---------------------------------------------------------------------------

interface CellDef {
  char: string
  romaji: string[]
  /** Clé de l'id, par défaut le premier romaji (à préciser pour les homophones). */
  key: string
}

interface GroupDef {
  kind: GroupKind
  label: string
  rows: (CellDef | null)[][]
}

/** `c('し', 'shi si')` ; `key` lève l'ambiguïté quand deux kana partagent le même romaji Hepburn. */
function c(char: string, romaji: string, key?: string): CellDef {
  const list = romaji.split(' ')
  return { char, romaji: list, key: key ?? list[0]! }
}

const _ = null

// Les groupes katakana correspondants sont dérivés automatiquement (cf. toKatakana).
const HIRAGANA_GROUPS: GroupDef[] = [
  { kind: 'gojuon', label: 'a', rows: [[c('あ', 'a'), c('い', 'i'), c('う', 'u'), c('え', 'e'), c('お', 'o')]] },
  { kind: 'gojuon', label: 'ka', rows: [[c('か', 'ka'), c('き', 'ki'), c('く', 'ku'), c('け', 'ke'), c('こ', 'ko')]] },
  { kind: 'gojuon', label: 'sa', rows: [[c('さ', 'sa'), c('し', 'shi si'), c('す', 'su'), c('せ', 'se'), c('そ', 'so')]] },
  { kind: 'gojuon', label: 'ta', rows: [[c('た', 'ta'), c('ち', 'chi ti'), c('つ', 'tsu tu'), c('て', 'te'), c('と', 'to')]] },
  { kind: 'gojuon', label: 'na', rows: [[c('な', 'na'), c('に', 'ni'), c('ぬ', 'nu'), c('ね', 'ne'), c('の', 'no')]] },
  { kind: 'gojuon', label: 'ha', rows: [[c('は', 'ha'), c('ひ', 'hi'), c('ふ', 'fu hu'), c('へ', 'he'), c('ほ', 'ho')]] },
  { kind: 'gojuon', label: 'ma', rows: [[c('ま', 'ma'), c('み', 'mi'), c('む', 'mu'), c('め', 'me'), c('も', 'mo')]] },
  { kind: 'gojuon', label: 'ya', rows: [[c('や', 'ya'), _, c('ゆ', 'yu'), _, c('よ', 'yo')]] },
  { kind: 'gojuon', label: 'ra', rows: [[c('ら', 'ra'), c('り', 'ri'), c('る', 'ru'), c('れ', 're'), c('ろ', 'ro')]] },
  {
    kind: 'gojuon',
    label: 'wa',
    rows: [
      [c('わ', 'wa'), _, _, _, c('を', 'wo o')],
      [c('ん', "n nn n'"), _, _, _, _],
    ],
  },

  { kind: 'dakuten', label: 'ga', rows: [[c('が', 'ga'), c('ぎ', 'gi'), c('ぐ', 'gu'), c('げ', 'ge'), c('ご', 'go')]] },
  { kind: 'dakuten', label: 'za', rows: [[c('ざ', 'za'), c('じ', 'ji zi'), c('ず', 'zu'), c('ぜ', 'ze'), c('ぞ', 'zo')]] },
  {
    kind: 'dakuten',
    label: 'da',
    rows: [[c('だ', 'da'), c('ぢ', 'ji di', 'dji'), c('づ', 'zu du', 'dzu'), c('で', 'de'), c('ど', 'do')]],
  },
  { kind: 'dakuten', label: 'ba', rows: [[c('ば', 'ba'), c('び', 'bi'), c('ぶ', 'bu'), c('べ', 'be'), c('ぼ', 'bo')]] },

  { kind: 'handakuten', label: 'pa', rows: [[c('ぱ', 'pa'), c('ぴ', 'pi'), c('ぷ', 'pu'), c('ぺ', 'pe'), c('ぽ', 'po')]] },

  { kind: 'yoon', label: 'kya', rows: [[c('きゃ', 'kya'), c('きゅ', 'kyu'), c('きょ', 'kyo')]] },
  { kind: 'yoon', label: 'sha', rows: [[c('しゃ', 'sha sya'), c('しゅ', 'shu syu'), c('しょ', 'sho syo')]] },
  { kind: 'yoon', label: 'cha', rows: [[c('ちゃ', 'cha tya cya'), c('ちゅ', 'chu tyu cyu'), c('ちょ', 'cho tyo cyo')]] },
  { kind: 'yoon', label: 'nya', rows: [[c('にゃ', 'nya'), c('にゅ', 'nyu'), c('にょ', 'nyo')]] },
  { kind: 'yoon', label: 'hya', rows: [[c('ひゃ', 'hya'), c('ひゅ', 'hyu'), c('ひょ', 'hyo')]] },
  { kind: 'yoon', label: 'mya', rows: [[c('みゃ', 'mya'), c('みゅ', 'myu'), c('みょ', 'myo')]] },
  { kind: 'yoon', label: 'rya', rows: [[c('りゃ', 'rya'), c('りゅ', 'ryu'), c('りょ', 'ryo')]] },
  { kind: 'yoon', label: 'gya', rows: [[c('ぎゃ', 'gya'), c('ぎゅ', 'gyu'), c('ぎょ', 'gyo')]] },
  { kind: 'yoon', label: 'ja', rows: [[c('じゃ', 'ja zya jya'), c('じゅ', 'ju zyu jyu'), c('じょ', 'jo zyo jyo')]] },
  { kind: 'yoon', label: 'bya', rows: [[c('びゃ', 'bya'), c('びゅ', 'byu'), c('びょ', 'byo')]] },
  { kind: 'yoon', label: 'pya', rows: [[c('ぴゃ', 'pya'), c('ぴゅ', 'pyu'), c('ぴょ', 'pyo')]] },
]

// Combinaisons propres aux katakana (mots d'origine étrangère).
const KATAKANA_EXTENDED_GROUPS: GroupDef[] = [
  { kind: 'extended', label: 'v', rows: [[c('ヴァ', 'va'), c('ヴィ', 'vi'), c('ヴ', 'vu'), c('ヴェ', 've'), c('ヴォ', 'vo')]] },
  { kind: 'extended', label: 'f', rows: [[c('ファ', 'fa'), c('フィ', 'fi'), _, c('フェ', 'fe'), c('フォ', 'fo')]] },
  {
    kind: 'extended',
    label: 'ti',
    rows: [
      [_, c('ティ', 'ti'), c('トゥ', 'tu'), _, _],
      [_, c('ディ', 'di'), c('ドゥ', 'du'), _, _],
    ],
  },
  { kind: 'extended', label: 'w', rows: [[_, c('ウィ', 'wi'), _, c('ウェ', 'we'), c('ウォ', 'wo', 'uo')]] },
  { kind: 'extended', label: 'ts', rows: [[c('ツァ', 'tsa'), c('ツィ', 'tsi'), _, c('ツェ', 'tse'), c('ツォ', 'tso')]] },
  {
    kind: 'extended',
    label: 'she',
    rows: [
      [_, _, _, c('シェ', 'she'), _],
      [_, _, _, c('チェ', 'che'), _],
      [_, _, _, c('ジェ', 'je'), _],
      [_, _, _, c('イェ', 'ye'), _],
    ],
  },
]

// ---------------------------------------------------------------------------
// Construction
// ---------------------------------------------------------------------------

const HIRAGANA_TO_KATAKANA_OFFSET = 0x60

/** Hiragana (U+3041–U+3096) → katakana correspondant. */
export function toKatakana(text: string): string {
  return text.replace(/[ぁ-ゖ]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) + HIRAGANA_TO_KATAKANA_OFFSET),
  )
}

const SCRIPT_PREFIX: Record<Script, string> = { hiragana: 'h', katakana: 'k' }

function buildGroups(defs: GroupDef[], script: Script, kanaOut: Kana[], groupsOut: KanaGroup[]) {
  for (const def of defs) {
    const groupId = `${script}-${def.label}`
    const kanaIds: string[] = []
    const rows = def.rows.map((row) =>
      row.map((cell) => {
        if (!cell) return null
        const id = `${SCRIPT_PREFIX[script]}-${cell.key}`
        kanaOut.push({ id, char: cell.char, romaji: cell.romaji, script, groupId })
        kanaIds.push(id)
        return id
      }),
    )
    groupsOut.push({ id: groupId, script, kind: def.kind, label: def.label, rows, kanaIds })
  }
}

const katakanaDefs: GroupDef[] = HIRAGANA_GROUPS.map((g) => ({
  ...g,
  rows: g.rows.map((row) => row.map((cell) => cell && { ...cell, char: toKatakana(cell.char) })),
}))

const kanaList: Kana[] = []
const groupList: KanaGroup[] = []
buildGroups(HIRAGANA_GROUPS, 'hiragana', kanaList, groupList)
buildGroups([...katakanaDefs, ...KATAKANA_EXTENDED_GROUPS], 'katakana', kanaList, groupList)

/** Tous les kana, hiragana puis katakana, dans l'ordre des groupes. */
export const KANA: readonly Kana[] = kanaList
export const KANA_GROUPS: readonly KanaGroup[] = groupList

const kanaById = new Map(KANA.map((k) => [k.id, k]))
const groupById = new Map(KANA_GROUPS.map((g) => [g.id, g]))

export function getKana(id: string): Kana | undefined {
  return kanaById.get(id)
}

export function getGroup(id: string): KanaGroup | undefined {
  return groupById.get(id)
}

export function kanaOfScript(script: Script): Kana[] {
  return KANA.filter((k) => k.script === script)
}

export function groupsOfScript(script: Script): KanaGroup[] {
  return KANA_GROUPS.filter((g) => g.script === script)
}

/** Le même son dans l'autre écriture (か ↔ カ), s'il existe. */
export function counterpartOf(kana: Kana): Kana | undefined {
  const other: Script = kana.script === 'hiragana' ? 'katakana' : 'hiragana'
  return kanaById.get(`${SCRIPT_PREFIX[other]}-${kana.id.slice(2)}`)
}

/** Aperçu d'un groupe pour les pastilles : premier kana de chaque rangée (わ・ん). */
export function groupGlyph(group: KanaGroup): string {
  return group.rows
    .map((row) => row.find((id) => id !== null))
    .filter((id): id is string => id !== undefined && id !== null)
    .map((id) => getKana(id)!.char)
    .join('・')
}
