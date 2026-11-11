#!/usr/bin/env node
// Télécharge « 銀河鉄道の夜 » de Kenji Miyazawa sur Aozora Bunko (domaine public,
// fiche 456, orthographe moderne) et le réécrit en kana lisibles par l'app dans
// src/data/book.json : kanji remplacés par leur lecture (furigana du texte, sinon
// analyse morphologique kuromoji), mots et particules séparés par des espaces
// comme dans sentences.ts, ponctuation retirée. La phrase d'origine est gardée.
//
//   node scripts/build-book.mjs            # utilise le cache s'il existe
//   node scripts/build-book.mjs --refresh  # retélécharge le texte
//
// Texte : Aozora Bunko — https://www.aozora.gr.jp/cards/000081/card456.html

import { access, mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { inflateRawSync } from 'node:zlib'
import kuromoji from 'kuromoji'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const URL_ZIP = 'https://www.aozora.gr.jp/cards/000081/files/456_ruby_145.zip'
const CACHE_DIR = join(ROOT, 'scripts', '.cache', 'aozora')
const ZIP_PATH = join(CACHE_DIR, '456_ruby_145.zip')
const OUTPUT = join(ROOT, 'src', 'data', 'book.json')
const REFRESH = process.argv.includes('--refresh')

// Graphies de Miyazawa remplacées avant l'analyse par une forme que kuromoji lit
// bien (kanji moderne, okurigana, ou directement la lecture). Le texte d'origine
// est conservé ; les furigana restent prioritaires.
const SUBSTITUTIONS = [
  ['電燈', '電灯'],
  ['街燈', '街灯'],
  ['燈', '灯'],
  ['云', '言'],
  ['喰', '食'],
  ['巨', '大'],
  ['遁', '逃'],
  ['斯う', 'こう'],
  ['午后', '午後'],
  ['新らし', '新し'],
  ['冷く', '冷たく'],
  ['冷い', '冷たい'],
  ['俄か', 'にわか'],
  ['誰', 'だれ'],
  ['何べん', 'なんべん'],
  ['勢よく', 'いきおいよく'],
  ['まっ赤', 'まっか'],
  ['一そう', 'いっそう'],
  ['蝎', 'さそり'],
]

// Mots mal découpés par kuromoji (suite de mots → correction).
const WORD_FIXES = [
  ['うし ろ', 'うしろ'],
  ['らっ この', 'らっこ の'],
  ['ず うっ と', 'ずうっと'],
  ['はず うっ と', 'は ずうっと'],
  ['ぃ', 'い'],
  ['ににん', 'ふたり'],
  ['いちにん', 'ひとり'],
  ['くるましつ', 'しゃしつ'],
  ['さんかく しるべ', 'さんかくひょう'],
  ['てんき わ', 'てんきりん'],
  ['にわ か に', 'にわかに'],
  ['なん べ ん', 'なんべん'],
  ['いちぺん', 'いっぺん'],
  ['もう じき', 'もうじき'],
  ['ぎん いろ', 'ぎんいろ'],
  ['きん いろ', 'きんいろ'],
  ['だいだい いろ', 'だいだいいろ'],
  ['かお いろ', 'かおいろ'],
  ['いち めん', 'いちめん'],
  ['こうな', 'さいわい な'],
  ['ほし めぐり', 'ほしめぐり'],
  ['のはらちゅう', 'のはらじゅう'],
  ['そこらちゅう', 'そこらじゅう'],
  ['あるい は', 'あるいは'],
  ['すき っと', 'すきっと'],
  ['か っきり', 'かっきり'],
  ['ど きっと', 'どきっと'],
  ['まち か ど', 'まちかど'],
  ['ぼ たん', 'ぼたん'],
  ['という かぜ に', 'という ふう に'],
  ['いろいろな かぜ に', 'いろいろな ふう に'],
  ['かわはら', 'かわら'],
  ['わっ し', 'わっし'],
  ['いそ が しそう', 'いそがしそう'],
  ['ちゃ いろ', 'ちゃいろ'],
  ['せ なか', 'せなか'],
  ['よう す', 'ようす'],
  ['あなたかた', 'あなたがた'],
  ['とり とり', 'とりとり'],
  ['ま さあ', 'まさあ'],
  ['も すこし', 'もすこし'],
  ['こういう かぜ に', 'こういう ふう に'],
  ['ひら べったく', 'ひらべったく'],
  ['しらとりく', 'はくちょうく'],
  ['きき おぼえ', 'ききおぼえ'],
  ['みどり いろ', 'みどりいろ'],
  ['ねずみ いろ', 'ねずみいろ'],
  ['ききょう いろ', 'ききょういろ'],
  ['すいぎん いろ', 'すいぎんいろ'],
  ['という かぜ で', 'という ふう で'],
  ['ような かぜ に', 'ような ふう に'],
  ['はいち めん', 'は いちめん'],
  ['とりと り', 'とりとり'],
  ['のぼ たん', 'の ぼたん'],
  ['ちゃいろ な', 'ちゃいろな'],
  ['み まわしました', 'みまわしました'],
  ['タダ シ', 'タダシ'],
  ['す なお', 'すなお'],
  ['け やき', 'けやき'],
  ['なつちゅう', 'なつじゅう'],
  ['あね おとうと', 'きょうだい'],
  ['いっしょう けんめい', 'いっしょうけんめい'],
  ['ライフ ブイ', 'ライフブイ'],
  ['ようでした', 'よう でした'],
  ['いっぱいでした', 'いっぱい でした'],
  ['かおる こ', 'かおるこ'],
  ['え え', 'ええ'],
  ['わたり とり', 'わたりどり'],
  ['のず うっ と', 'の ずうっと'],
  ['むかう', 'むこう'],
  ['さんじゅう ぴき', 'さんじっぴき'],
  ['かい ぼたん', 'かいぼたん'],
  ['とり の ぐん', 'とり の むれ'],
  ['こころ もち', 'こころもち'],
  ['はな している', 'はなしている'],
  ['は なれて', 'はなれて'],
  ['そ と', 'そと'],
  ['だけでした', 'だけ でした'],
  ['もうこ の あたり', 'もう この へん'],
  ['きらっ きらっ', 'きらっきらっ'],
  ['そう そう', 'そうそう'],
  ['いちぴき', 'いっぴき'],
  ['たかってる', 'あつまってる'],
  ['つどって', 'あつまって'],
  ['いちほん', 'いっぽん'],
  ['でんしんば しら', 'でんしんばしら'],
  ['しがらみ', 'さく'],
  ['ななはちにん', 'しちはちにん'],
  ['や ぐらが', 'やぐら が'],
  ['むちゅうで', 'むちゅう で'],
  ['むねいっぱい', 'むね いっぱい'],
  ['はい いろ', 'はいいろ'],
]

// Relecture manuelle : phrase d'origine → lecture corrigée (facultative) et traduction.
const REVIEW_PATH = join(ROOT, 'scripts', 'book-review.json')

// ---------------------------------------------------------------------------
// Téléchargement et extraction (zip à un fichier, Shift_JIS)
// ---------------------------------------------------------------------------

async function loadText() {
  const cached = await access(ZIP_PATH).then(
    () => true,
    () => false,
  )
  if (!cached || REFRESH) {
    console.log(`Téléchargement de ${URL_ZIP}…`)
    const res = await fetch(URL_ZIP)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    await mkdir(CACHE_DIR, { recursive: true })
    await writeFile(ZIP_PATH, Buffer.from(await res.arrayBuffer()))
  }
  const zip = await readFile(ZIP_PATH)
  // En-tête local du premier fichier : méthode, tailles, longueur du nom et de l'extra.
  if (zip.readUInt32LE(0) !== 0x04034b50) throw new Error('Zip inattendu')
  const method = zip.readUInt16LE(8)
  const size = zip.readUInt32LE(18)
  const start = 30 + zip.readUInt16LE(26) + zip.readUInt16LE(28)
  const data = zip.subarray(start, start + size)
  const raw = method === 8 ? inflateRawSync(data) : data
  return new TextDecoder('shift_jis').decode(raw)
}

// ---------------------------------------------------------------------------
// Texte Aozora → paragraphes (sans en-tête, notes ni pied de page)
// ---------------------------------------------------------------------------

function paragraphsOf(text) {
  const lines = text.replace(/\r/g, '').split('\n')
  // L'en-tête se termine par le second trait de tirets (légende des signes).
  const dashes = lines.reduce((acc, l, i) => (/^-{10,}$/.test(l) ? [...acc, i] : acc), [])
  const bodyStart = (dashes[1] ?? -1) + 1
  const bodyEnd = lines.findIndex((l) => l.startsWith('底本：'))
  const body = lines.slice(bodyStart, bodyEnd < 0 ? undefined : bodyEnd)

  const paragraphs = []
  let chapter = 0
  for (let line of body) {
    line = line
      // Petit kana hors JIS (« ※［＃小書き平仮名ん…］ ») : lu comme le kana normal.
      .replace(/※［＃小書き平仮名(.)[^］]*］/g, '$1')
      .replace(/※?［＃[^］]*］/g, '') // notes et caractères hors JIS
      .replace(/^[\s　]+/, '')
      .trim()
    if (!line) continue
    // Titres de chapitre : « 一、午后の授業 ».
    if (/^[一二三四五六七八九]、/.test(line)) {
      chapter++
      continue
    }
    paragraphs.push({ chapter, line })
  }
  return paragraphs
}

/** Phrases d'un paragraphe : coupées après 。！？ et après une réplique 「…」 complète. */
function sentencesOf(line) {
  const out = []
  let current = ''
  let depth = 0
  let inRuby = false
  for (const ch of line) {
    current += ch
    if (ch === '《') inRuby = true
    if (ch === '》') inRuby = false
    if (inRuby) continue
    if (ch === '「' || ch === '『') depth++
    if (ch === '」' || ch === '』') depth = Math.max(0, depth - 1)
    if (/[。！？]/.test(ch) || (depth === 0 && (ch === '」' || ch === '』'))) {
      out.push(current)
      current = ''
    }
  }
  if (current.trim()) out.push(current)
  // Un 」 resté seul après un 。 appartient à la phrase précédente.
  return out
    .map((s) => s.trim())
    .reduce((acc, s) => {
      if (/^[」』]+$/.test(s) && acc.length) acc[acc.length - 1] += s
      else if (s) acc.push(s)
      return acc
    }, [])
}

// ---------------------------------------------------------------------------
// Kanji → kana, découpage en mots
// ---------------------------------------------------------------------------

const toHiragana = (s) => s.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60))
const isKana = (s) => /^[ぁ-ゖァ-ヺー]+$/.test(s)
const isKanji = (c) => /[々〆ヵヶ一-鿿]/.test(c)
const PUNCTUATION = /[、。「」『』（）()〔〕［］！？!?・…―─‥〈〉《》｜　\s]/g

/**
 * Texte d'origine sans furigana, et plages annotées (début, fin, lecture) :
 * « ｜漢字《かんじ》 » ou « 漢字《かんじ》 » (le groupe de kanji qui précède).
 */
function parseRuby(sentence) {
  let text = ''
  let marker = null
  const spans = []
  for (let i = 0; i < sentence.length; i++) {
    const ch = sentence[i]
    if (ch === '｜') {
      marker = text.length
      continue
    }
    if (ch === '《') {
      const close = sentence.indexOf('》', i)
      const reading = sentence.slice(i + 1, close)
      let start = marker ?? text.length
      if (marker === null) while (start > 0 && isKanji(text[start - 1])) start--
      spans.push({ start, end: text.length, reading })
      marker = null
      i = close
      continue
    }
    text += ch
  }
  return { text, spans }
}

/** Texte donné à kuromoji, et position d'origine de chacun de ses caractères. */
function prepare(text, spans) {
  let input = ''
  const origin = []
  for (let i = 0; i < text.length; ) {
    // Pas de substitution sur un passage annoté : le furigana fait foi.
    const rule = SUBSTITUTIONS.find(
      ([from]) => text.startsWith(from, i) && !spans.some((sp) => i < sp.end && sp.start < i + from.length),
    )
    if (rule) {
      const [from, to] = rule
      for (let j = 0; j < to.length; j++) origin.push(i + Math.min(j, from.length - 1))
      input += to
      i += from.length
    } else {
      origin.push(i)
      input += text[i]
      i++
    }
  }
  return { input, origin }
}

function attachesToPrevious(token, previous) {
  if (!previous) return false
  if (previous.pos === '接頭詞') return true
  const { pos, pos_detail_1: d1, surface_form: s } = token
  if (pos === '助動詞') return true
  if ((pos === '動詞' || pos === '形容詞') && (d1 === '非自立' || d1 === '接尾')) return true
  if (pos === '名詞' && d1 === '接尾') return true
  if (pos === '名詞' && d1 === '数' && previous.pos_detail_1 === '数') return true
  if (pos === '助詞' && d1 === '接続助詞' && ['て', 'で', 'ば', 'ちゃ', 'じゃ'].includes(s)) return true
  if (pos === '助詞' && d1 === '並立助詞' && ['たり', 'だり'].includes(s)) return true
  return false
}

/** Lecture d'un mot : furigana des plages qu'il couvre, sinon celle de kuromoji. */
function readingOf(token, spans, origin) {
  const s = token.surface_form
  const first = token.word_position - 1
  const start = origin[first]
  const end = origin[first + s.length - 1] + 1
  const covering = spans.filter((sp) => start < sp.end && sp.start < end)
  if (covering.length) {
    let out = ''
    const done = new Set()
    for (let k = 0; k < s.length; k++) {
      const i = origin[first + k]
      const sp = covering.find((c) => i >= c.start && i < c.end)
      if (sp) {
        // Toute la lecture va au premier mot de la plage.
        if (sp.start >= start && !done.has(sp)) out += sp.reading
        done.add(sp)
        continue
      }
      const ch = s[k]
      if (isKanji(ch)) {
        out = null
        break
      }
      out += ch
    }
    if (out !== null) return out
  }
  if (isKana(s)) return s // garde は / へ / を et les katakana tels qu'écrits
  if (!token.reading || token.reading === '*') return null
  return toHiragana(token.reading)
}

function toKanaWords(tokenizer, text, spans) {
  const words = []
  let previous = null
  const { input, origin } = prepare(text, spans)
  for (const token of tokenizer.tokenize(input)) {
    const surface = token.surface_form
    if (token.pos === '記号' || surface.replace(PUNCTUATION, '') === '') {
      previous = null
      continue
    }
    const reading = readingOf(token, spans, origin)
    if (reading === null) return { words: null, unknown: surface }
    const clean = reading.replace(PUNCTUATION, '')
    if (!clean) continue
    if (attachesToPrevious(token, previous) && words.length > 0) words[words.length - 1] += clean
    // « では », « には », « それでは » : は isolé pour être lu « wa ».
    else if ((token.pos === '助詞' || token.pos === '接続詞') && clean.length > 1 && clean.endsWith('は'))
      words.push(clean.slice(0, -1), 'は')
    else words.push(clean)
    previous = token
  }
  return { words, unknown: null }
}

// ---------------------------------------------------------------------------

const tokenizer = await new Promise((resolve, reject) =>
  kuromoji
    .builder({ dicPath: join(ROOT, 'node_modules', 'kuromoji', 'dict') })
    .build((err, t) => (err ? reject(err) : resolve(t))),
)

const review = await readFile(REVIEW_PATH, 'utf8').then(JSON.parse, () => ({}))
const text = await loadText()
const sentences = []
const unknown = new Map()
let unreviewed = 0
for (const { chapter, line } of paragraphsOf(text)) {
  sentencesOf(line).forEach((raw, i) => {
    const { text: original, spans } = parseRuby(raw)
    const { words, unknown: missing } = toKanaWords(tokenizer, original, spans)
    if (!words) {
      unknown.set(missing, (unknown.get(missing) ?? 0) + 1)
      return
    }
    if (words.length === 0) return
    const fixed = review[original]
    if (fixed?.exclude) return // texte lacunaire de l'édition (« 〔…空白〕 »)
    const auto = WORD_FIXES.reduce(
      (t, [from, to]) => ` ${t} `.split(` ${from} `).join(` ${to} `).trim(),
      words.join(' '),
    )
    // 行って : kuromoji lit souvent « おこなって », le texte n'emploie que « いって ».
    const kana = (fixed?.kana ?? auto.replace(/(^| )おこなっ/g, '$1いっ')).replace(/ぃ/g, 'い').replace(/ぁ/g, 'あ')
      // っ en fin de mot (ぼおっ と) : collé au mot suivant, sinon la consonne à doubler manque.
      .replace(/([っッ]) /g, '$1')
    const leftover = kana.replace(/[ぁ-ゖァ-ヺー ]/g, '')
    if (leftover) {
      unknown.set(leftover, (unknown.get(leftover) ?? 0) + 1)
      return
    }
    if (!fixed?.fr) unreviewed++
    // Nouveau paragraphe : utile pour l'affichage continu du mode chrono.
    sentences.push([kana, original, fixed?.fr ?? '', chapter, i === 0 ? 1 : 0])
  })
}

await writeFile(
  OUTPUT,
  JSON.stringify(
    {
      source: 'Kenji Miyazawa, 銀河鉄道の夜 — Aozora Bunko (domaine public), fiche 456',
      sentences,
    },
    null,
    0,
  ).replace(/\],\[/g, '],\n['),
)
console.log(`${sentences.length} phrases écrites dans ${OUTPUT} (${unreviewed} sans relecture)`)
if (unknown.size) console.log('Ignorées (lecture inconnue) :', [...unknown].slice(0, 40))
