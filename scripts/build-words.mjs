#!/usr/bin/env node
// Télécharge le dictionnaire japonais → français Jiyomi (base SQLite, JMdict +
// sens français) et en extrait les mots courants lisibles avec les kana de
// l'app dans src/data/dictWords.json, en complément de la liste écrite à la
// main (src/data/words.ts, prioritaire), avec l'écriture en kanji de chaque mot
// quand elle est d'usage (y compris pour les mots de la liste manuelle).
//
//   node scripts/build-words.mjs            # utilise le cache s'il existe
//   node scripts/build-words.mjs --refresh  # retélécharge la base
//   JIYOMI_RELEASE=dico-61 node scripts/build-words.mjs  # autre version
//
// JMdict © EDRDG — CC BY-SA 4.0 — https://www.edrdg.org/
// Sens français © Jiyomi — CC BY-SA 4.0 — https://jiyomi.app

import { createWriteStream } from 'node:fs'
import { access, mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { pipeline } from 'node:stream/promises'
import { Readable } from 'node:stream'
import { fileURLToPath } from 'node:url'
import { createGunzip } from 'node:zlib'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const RELEASE = process.env.JIYOMI_RELEASE ?? 'dico-60'
const URL_DB = `https://github.com/AStoicBoy/jiyomi-dico/releases/download/${RELEASE}/jiyomi-dict-fr.db.gz`
const CACHE_DIR = join(ROOT, 'scripts', '.cache', 'jiyomi')
const DB_PATH = join(CACHE_DIR, `jiyomi-dict-fr-${RELEASE}.db`)
const KANA_SOURCE = join(ROOT, 'src', 'data', 'kana.ts')
const WORDS_SOURCE = join(ROOT, 'src', 'data', 'words.ts')
const OUTPUT = join(ROOT, 'src', 'data', 'dictWords.json')
const REFRESH = process.argv.includes('--refresh')

/** Nombre total de mots visé par écriture, liste manuelle comprise. */
const TARGET = { hiragana: 5000, katakana: 1500 }
/** Au-delà, le mot ne tient plus sur une ligne dans le quiz. */
const MAX_LENGTH = 8
/** Un kana seul est déjà exercé par les stages 1 à 4. */
const MIN_LENGTH = 2
const MAX_GLOSS_LENGTH = 32
const MAX_GLOSSES = 2

// Mots grammaticaux (けど, てる…) et éléments qui ne se lisent pas seuls (suffixes, compteurs).
const GRAMMAR_POS = /particle|auxiliary|copula/
const BOUND_POS = /suffix|prefix|^counter$|^numeric$/

// ---------------------------------------------------------------------------
// Kana reconnus par l'app (même découpage que features/quiz/reading.ts)
// ---------------------------------------------------------------------------

async function collectKana() {
  const source = await readFile(KANA_SOURCE, 'utf8')
  const kana = new Set()
  for (const [, char] of source.matchAll(/\bc\('([^']+)'/g)) {
    kana.add(char)
    // Les katakana de base sont dérivés des hiragana (cf. toKatakana).
    kana.add(char.replace(/[ぁ-ゖ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) + 0x60)))
  }
  return kana
}

/** Vrai si le mot se découpe en kana de l'app, っ et ー bien placés, une seule écriture. */
function isReadable(word, kana) {
  const units = []
  let i = 0
  while (i < word.length) {
    const pair = word.slice(i, i + 2)
    if (kana.has(pair)) {
      units.push(pair)
      i += 2
    } else if (kana.has(word[i]) || 'っッー'.includes(word[i])) {
      units.push(word[i])
      i++
    } else {
      return false
    }
  }
  const isHiragana = /^[ぁ-ゖー]+$/.test(word)
  const isKatakana = /^[ァ-ヺー]+$/.test(word)
  if (isHiragana === isKatakana) return false
  return units.every((u, j) => {
    const next = units[j + 1]
    const prev = units[j - 1]
    // っ doit doubler une consonne : ni en fin de mot, ni devant une voyelle, ん ou ー.
    if (u === 'っ' || u === 'ッ') return next !== undefined && !/^[あいうえおんアイウエオンーっッ]/.test(next)
    if (u === 'ー') return prev !== undefined && !/^[っッんンー]$/.test(prev)
    return true
  })
}

// ---------------------------------------------------------------------------
// Base Jiyomi
// ---------------------------------------------------------------------------

async function ensureDatabase() {
  const cached = await access(DB_PATH).then(
    () => true,
    () => false,
  )
  if (cached && !REFRESH) return
  await mkdir(CACHE_DIR, { recursive: true })
  console.log(`Téléchargement de ${URL_DB}…`)
  const res = await fetch(URL_DB)
  if (!res.ok || !res.body) throw new Error(`${URL_DB} : HTTP ${res.status}`)
  const tmp = `${DB_PATH}.part`
  await pipeline(Readable.fromWeb(res.body), createGunzip(), createWriteStream(tmp))
  await rename(tmp, DB_PATH)
}

/** Sens court : les premières gloses françaises du premier sens qui en a. */
function meaningOf(entry) {
  // La nature du mot se lit sur le premier sens (le sens français de JMdict n'en porte pas).
  const pos = entry.s[0]?.pos ?? []
  if (pos.some((p) => GRAMMAR_POS.test(p)) || (pos.length && pos.every((p) => BOUND_POS.test(p)))) return null
  // Expressions sans kanji : surtout des tournures grammaticales (である, だった…).
  if (!entry.k.length && pos.includes('expressions (phrases, clauses, etc.)')) return null
  const sense = entry.s.find((s) => s.fr?.length)
  if (!sense) return null
  // Pas de définition explicative (« (introduit le terme défini) ») ni de forme incomplète (« -ique »).
  const glosses = [...new Set(sense.fr.map((g) => g.trim()))].filter(
    (g) => g && g.length <= MAX_GLOSS_LENGTH && !/^[(-]|\.\.\.|…/.test(g),
  )
  return glosses.length ? glosses.slice(0, MAX_GLOSSES).join(', ') : null
}

/**
 * Fréquence (zipf × 100, wordfreq) : celle des écritures en kanji quand le mot
 * en a, sinon un homophone grammatical gonflerait le score (ます « truite »).
 */
function frequencyOf(entry) {
  const forms = entry.k.length ? entry.k : entry.r
  const scores = forms.map((f) => entry.zf?.[f] ?? 0)
  return Math.max(0, ...scores) || (entry.k.length ? 0 : (entry.z ?? 0))
}

// Écritures à ne pas montrer : rares, réservées à la recherche, irrégulières ou désuètes.
const HIDDEN_KANJI_INFO = new Set(['rK', 'sK', 'iK', 'oK'])
const KANJI_FORM = /^[぀-ヿ㐀-鿿々]+$/
const HAS_KANJI = /[㐀-鿿々]/

/**
 * Écriture en kanji usuelle pour la lecture `reading` de l'entrée, ou null si le
 * mot s'écrit d'habitude en kana (ありがとう) ou n'a pas de kanji.
 */
function kanjiOf(entry, reading) {
  if (entry.s[0]?.uk) return null
  const r = entry.r.indexOf(reading)
  // rr[r] : 1 = toutes les écritures, 0 = aucune (lecture propre aux kana), sinon les indices permis.
  const allowed = entry.rr?.[r] ?? 1
  if (allowed === 0) return null
  return (
    entry.k.find(
      (form, i) =>
        (allowed === 1 || allowed.includes(i)) &&
        !HIDDEN_KANJI_INFO.has(entry.ki?.[String(i)]) &&
        KANJI_FORM.test(form) &&
        HAS_KANJI.test(form),
    ) ?? null
  )
}

const STOP_WORDS = new Set(['les', 'des', 'une', 'pour', 'avec', 'dans', 'sur', 'par', 'qui', 'que', 'est', 'être'])

function meaningTokens(text) {
  return (
    text
      .toLowerCase()
      .split(/[^\p{L}]+/u)
      .filter((t) => t.length >= 3 && !STOP_WORDS.has(t))
      // Radical grossier : accords et pluriels (prochain / prochaine, lèvre / lèvres).
      .map((t) => t.replace(/(es|s|x|e)$/, '').slice(0, 6))
  )
}

/** Corrections à la main des rapprochements automatiques (null = pas de kanji). */
const KANJI_OVERRIDES = {
  いっこ: '一個',
  ひつじ: '羊',
  あう: '会う',
  かたい: '硬い',
  // Deux sens, deux écritures : 速い / 早い, 五日 / 何時か.
  はやい: null,
  いつか: null,
}

/** Écart de fréquence (zipf × 100) au-delà duquel un homophone domine nettement (×10). */
const DOMINANT_GAP = 100

/** Glose sans précision entre parenthèses : « pomme (fruit) » → « pomme ». */
function bareGloss(gloss) {
  return gloss
    .replace(/\s*\([^)]*\)/g, '')
    .trim()
    .toLowerCase()
}

/**
 * Kanji des mots de la liste manuelle. Chaque sens de la traduction (« pont,
 * baguettes ») est rapproché de l'homophone dont les gloses le recoupent, en
 * préférant le plus fréquent (兄 plutôt que 義兄 pour « grand frère »). Si deux
 * sens mènent à deux kanji (はし : 橋 / 箸), pas de kanji plutôt qu'un kanji faux.
 */
function manualKanji(db, manual) {
  const lookup = db.prepare('SELECT e.freq, e.data FROM form f JOIN entry e ON e.id = f.id WHERE f.text = ?')
  const result = {}
  for (const [word, meaning] of manual) {
    // Les mots en katakana n'ont guère que des ateji (越南 pour ベトナム) : pas de kanji.
    if (!/^[ぁ-ゖ]/.test(word)) continue
    const candidates = []
    for (const row of lookup.all(word)) {
      const entry = JSON.parse(row.data)
      if (entry.s.some((s) => s.np) || !entry.r.includes(word)) continue
      // Les gloses anglaises rattrapent les traductions qui gardent le mot japonais (« kanji »).
      const glosses = entry.s.flatMap((s) => [...(s.fr ?? []), ...(s.en ?? [])])
      candidates.push({
        common: row.freq < 99,
        usuallyKana: Boolean(entry.s[0]?.uk),
        frequency: frequencyOf(entry),
        kanji: kanjiOf(entry, word),
        phrases: new Set(glosses.map(bareGloss)),
        tokens: new Set(glosses.flatMap(meaningTokens)),
      })
    }
    // Un mot courant l'emporte toujours sur un mot rare (唇 plutôt que 口唇), puis le plus fréquent.
    candidates.sort((a, b) => Number(b.common) - Number(a.common) || b.frequency - a.frequency)

    // « ; » sépare des sens distincts (ちゅうしゃ : piqûre ; stationnement) : chacun doit
    // être reconnu, sinon le kanji trouvé ne vaudrait que pour l'un d'eux.
    const matched = new Set()
    let unmatchedSense = false
    for (const sense of meaning.split(/\s*;\s*/)) {
      let found = false
      for (const part of sense.split(/\s*,\s*/)) {
        const phrase = bareGloss(part)
        const tokens = meaningTokens(part)
        const match = candidates.find((c) => c.phrases.has(phrase) || tokens.some((t) => c.tokens.has(t)))
        if (match) {
          matched.add(match.kanji)
          found = true
        }
      }
      if (!found) unmatchedSense = true
    }

    let kanji = matched.size === 1 && !unmatchedSense ? [...matched][0] : null
    if (word in KANJI_OVERRIDES) kanji = KANJI_OVERRIDES[word]
    // Traduction formulée autrement (神社 « sanctuaire » / « temple shinto ») : on se rabat
    // sur l'homophone courant s'il domine nettement, sauf si l'un d'eux s'écrit en kana
    // (いか : 烏賊 « calmar » plutôt que 以下).
    if (matched.size === 0 && !(word in KANJI_OVERRIDES) && !candidates.some((c) => c.usuallyKana)) {
      const [first, second] = candidates.filter((c) => c.common)
      if (first && first.frequency - (second?.frequency ?? 0) >= DOMINANT_GAP) kanji = first.kanji
    }
    if (kanji) result[word] = kanji
  }
  return result
}

async function main() {
  await ensureDatabase()
  const kana = await collectKana()
  const manual = new Map(
    [...(await readFile(WORDS_SOURCE, 'utf8')).matchAll(/^\s*\['([^']+)', (?:'([^']*)'|"([^"]*)")\]/gm)].map(
      (m) => [m[1], m[2] ?? m[3]],
    ),
  )

  const { DatabaseSync } = await import('node:sqlite')
  const db = new DatabaseSync(DB_PATH, { readOnly: true })

  // freq < 99 : mots marqués courants par JMdict ou présents dans wordfreq.
  const best = new Map()
  for (const row of db.prepare('SELECT freq, data FROM entry WHERE freq < 99').all()) {
    const entry = JSON.parse(row.data)
    if (entry.s.some((s) => s.np)) continue
    // Première lecture, sauf si elle est marquée irrégulière ou désuète.
    if (entry.ri?.['0']) continue
    const word = entry.r[0]
    if (word.length < MIN_LENGTH || word.length > MAX_LENGTH || manual.has(word) || !isReadable(word, kana)) continue
    const meaning = meaningOf(entry)
    if (!meaning) continue
    // Homophones : on garde le plus fréquent (score wordfreq, puis rang JMdict).
    const score = frequencyOf(entry) * 1000 - row.freq
    const known = best.get(word)
    const kanji = /^[ぁ-ゖ]/.test(word) ? kanjiOf(entry, word) : null
    if (!known || score > known.score) best.set(word, { word, meaning, kanji, score })
  }
  const kanjiOfManual = manualKanji(db, manual)
  db.close()

  const ranked = [...best.values()].sort((a, b) => b.score - a.score)
  const countManual = (re) => [...manual.keys()].filter((w) => re.test(w)).length
  const pick = (re, target) =>
    ranked
      .filter((w) => re.test(w.word))
      .slice(0, Math.max(0, target - countManual(re)))
      .map((w) => (w.kanji ? [w.word, w.meaning, w.kanji] : [w.word, w.meaning]))
  const hiragana = pick(/^[ぁ-ゖ]/, TARGET.hiragana)
  const katakana = pick(/^[ァ-ヺ]/, TARGET.katakana)

  const out = JSON.stringify({
    source: `Jiyomi ${RELEASE} (JMdict © EDRDG, sens français © Jiyomi) — CC BY-SA 4.0`,
    words: [...hiragana, ...katakana],
    manualKanji: kanjiOfManual,
  })
  // Une ligne par mot : diffs lisibles.
  await writeFile(
    OUTPUT,
    out
      .replace(/\],\[/g, '],\n[')
      .replace('"words":[[', '"words":[\n[')
      .replace(/,"(?=[^"]+":"[^"]*"[,}])/g, ',\n"') + '\n',
  )
  const withKanji = [...hiragana, ...katakana].filter((w) => w[2]).length
  console.log(`${OUTPUT} : ${hiragana.length} hiragana, ${katakana.length} katakana (${withKanji} avec kanji)`)
  console.log(`Kanji trouvés pour ${Object.keys(kanjiOfManual).length} / ${manual.size} mots de la liste manuelle`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
