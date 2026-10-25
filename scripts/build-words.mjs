#!/usr/bin/env node
// Télécharge le dictionnaire japonais → français Jiyomi (base SQLite, JMdict +
// sens français) et en extrait les mots courants lisibles avec les kana de
// l'app dans src/data/dictWords.json, en complément de la liste écrite à la
// main (src/data/words.ts, prioritaire).
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

async function main() {
  await ensureDatabase()
  const kana = await collectKana()
  const manual = new Set(
    [...(await readFile(WORDS_SOURCE, 'utf8')).matchAll(/^\s*\['([^']+)',/gm)].map((m) => m[1]),
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
    if (!known || score > known.score) best.set(word, { word, meaning, score })
  }
  db.close()

  const ranked = [...best.values()].sort((a, b) => b.score - a.score)
  const countManual = (re) => [...manual].filter((w) => re.test(w)).length
  const pick = (re, target) =>
    ranked
      .filter((w) => re.test(w.word))
      .slice(0, Math.max(0, target - countManual(re)))
      .map((w) => [w.word, w.meaning])
  const hiragana = pick(/^[ぁ-ゖ]/, TARGET.hiragana)
  const katakana = pick(/^[ァ-ヺ]/, TARGET.katakana)

  const out = JSON.stringify({
    source: `Jiyomi ${RELEASE} (JMdict © EDRDG, sens français © Jiyomi) — CC BY-SA 4.0`,
    words: [...hiragana, ...katakana],
  })
  // Une ligne par mot : diffs lisibles.
  await writeFile(OUTPUT, out.replace(/\],\[/g, '],\n[').replace('"words":[[', '"words":[\n[') + '\n')
  console.log(`${OUTPUT} : ${hiragana.length} hiragana, ${katakana.length} katakana`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
