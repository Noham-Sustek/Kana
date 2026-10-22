#!/usr/bin/env node
// Télécharge les SVG KanjiVG des kana utilisés par l'app et les convertit en
// src/data/strokes.json (tracés rééchantillonnés, embarqués dans le build).
//
//   node scripts/build-strokes.mjs            # utilise le cache s'il existe
//   node scripts/build-strokes.mjs --refresh  # retélécharge tout
//   KANJIVG_REF=r20250816 node scripts/build-strokes.mjs  # fige une version
//
// KanjiVG © Ulrich Apel — CC BY-SA 3.0 — https://kanjivg.tagaini.net

import { mkdir, readFile, writeFile, access } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const CACHE_DIR = join(ROOT, 'scripts', '.cache', 'kanjivg')
const KANA_SOURCE = join(ROOT, 'src', 'data', 'kana.ts')
const OUTPUT = join(ROOT, 'src', 'data', 'strokes.json')
const REF = process.env.KANJIVG_REF ?? 'master'
const BASE_URL = `https://raw.githubusercontent.com/KanjiVG/kanjivg/${REF}/kanji`
const REFRESH = process.argv.includes('--refresh')

/** Écart entre deux points du tracé rééchantillonné, en unités KanjiVG (viewBox 109×109). */
const SAMPLE_SPACING = 2
const CURVE_STEPS = 16

// ---------------------------------------------------------------------------
// Liste des caractères : tout kana présent dans kana.ts, plus les katakana
// dérivés des hiragana (kana.ts ne les écrit pas explicitement).
// ---------------------------------------------------------------------------

async function collectChars() {
  const source = await readFile(KANA_SOURCE, 'utf8')
  const chars = new Set()
  for (const [ch] of source.matchAll(/[ぁ-ゖァ-ヺ]/g)) {
    chars.add(ch)
    const code = ch.codePointAt(0)
    if (code <= 0x3096) chars.add(String.fromCodePoint(code + 0x60))
  }
  return [...chars].sort()
}

// ---------------------------------------------------------------------------
// Téléchargement (avec cache local)
// ---------------------------------------------------------------------------

const fileName = (ch) => `${ch.codePointAt(0).toString(16).padStart(5, '0')}.svg`

async function exists(path) {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

async function loadSvg(ch) {
  const path = join(CACHE_DIR, fileName(ch))
  if (!REFRESH && (await exists(path))) return readFile(path, 'utf8')
  const res = await fetch(`${BASE_URL}/${fileName(ch)}`)
  if (!res.ok) throw new Error(`${ch} (${fileName(ch)}) : HTTP ${res.status}`)
  const text = await res.text()
  await writeFile(path, text, 'utf8')
  return text
}

// ---------------------------------------------------------------------------
// SVG → points
// ---------------------------------------------------------------------------

function extractStrokePaths(svg) {
  const strokes = []
  for (const [tag] of svg.matchAll(/<path\b[^>]*>/g)) {
    const id = /\bid="kvg:[0-9a-f]+-s(\d+)"/.exec(tag)
    const d = /\bd="([^"]+)"/.exec(tag)
    if (id && d) strokes.push({ n: Number(id[1]), d: d[1] })
  }
  return strokes.sort((a, b) => a.n - b.n).map((s) => s.d)
}

function tokenize(d) {
  return d.match(/[MmLlHhVvCcSsQqTtZz]|[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g) ?? []
}

function cubic(p0, p1, p2, p3, t) {
  const u = 1 - t
  return [
    u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
    u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
  ]
}

/** Aplatit un attribut `d` en polyligne (M/L/H/V/C/S/Q/T/Z, absolus et relatifs). */
function flattenPath(d) {
  const tokens = tokenize(d)
  const points = []
  let i = 0
  let cmd = ''
  let cur = [0, 0]
  let start = [0, 0]
  let lastCtrl = null
  const num = () => Number(tokens[i++])
  const isNum = () => i < tokens.length && !/^[A-Za-z]$/.test(tokens[i])

  while (i < tokens.length) {
    if (!isNum()) cmd = tokens[i++]
    const rel = cmd === cmd.toLowerCase()
    const base = rel ? cur : [0, 0]
    const pt = () => {
      const x = num()
      const y = num()
      return [base[0] + x, base[1] + y]
    }
    switch (cmd.toUpperCase()) {
      case 'M': {
        cur = pt()
        start = cur
        points.push(cur)
        lastCtrl = null
        cmd = rel ? 'l' : 'L' // les paires suivantes sont des lineto implicites
        break
      }
      case 'L':
        cur = pt()
        points.push(cur)
        lastCtrl = null
        break
      case 'H':
        cur = [(rel ? cur[0] : 0) + num(), cur[1]]
        points.push(cur)
        lastCtrl = null
        break
      case 'V':
        cur = [cur[0], (rel ? cur[1] : 0) + num()]
        points.push(cur)
        lastCtrl = null
        break
      case 'C':
      case 'S': {
        const p1 =
          cmd.toUpperCase() === 'C'
            ? pt()
            : lastCtrl
              ? [2 * cur[0] - lastCtrl[0], 2 * cur[1] - lastCtrl[1]]
              : cur
        const p2 = pt()
        const p3 = pt()
        for (let s = 1; s <= CURVE_STEPS; s++) points.push(cubic(cur, p1, p2, p3, s / CURVE_STEPS))
        lastCtrl = p2
        cur = p3
        break
      }
      case 'Q':
      case 'T': {
        const q =
          cmd.toUpperCase() === 'Q'
            ? pt()
            : lastCtrl
              ? [2 * cur[0] - lastCtrl[0], 2 * cur[1] - lastCtrl[1]]
              : cur
        const p3 = pt()
        // Quadratique exprimée en cubique.
        const p1 = [cur[0] + (2 / 3) * (q[0] - cur[0]), cur[1] + (2 / 3) * (q[1] - cur[1])]
        const p2 = [p3[0] + (2 / 3) * (q[0] - p3[0]), p3[1] + (2 / 3) * (q[1] - p3[1])]
        for (let s = 1; s <= CURVE_STEPS; s++) points.push(cubic(cur, p1, p2, p3, s / CURVE_STEPS))
        lastCtrl = q
        cur = p3
        break
      }
      case 'Z':
        cur = start
        points.push(cur)
        lastCtrl = null
        break
      default:
        throw new Error(`Commande SVG non gérée : ${cmd}`)
    }
  }
  return points
}

/** Rééchantillonne une polyligne à pas constant (extrémités conservées). */
function resampleBySpacing(points, spacing) {
  const lengths = [0]
  for (let k = 1; k < points.length; k++) {
    const [ax, ay] = points[k - 1]
    const [bx, by] = points[k]
    lengths.push(lengths[k - 1] + Math.hypot(bx - ax, by - ay))
  }
  const total = lengths[lengths.length - 1]
  const count = Math.max(2, Math.round(total / spacing) + 1)
  const out = []
  let seg = 1
  for (let k = 0; k < count; k++) {
    const target = (total * k) / (count - 1)
    while (seg < points.length - 1 && lengths[seg] < target) seg++
    const segLen = lengths[seg] - lengths[seg - 1] || 1
    const t = Math.min(1, Math.max(0, (target - lengths[seg - 1]) / segLen))
    const [ax, ay] = points[seg - 1]
    const [bx, by] = points[seg]
    out.push([ax + (bx - ax) * t, ay + (by - ay) * t])
  }
  return out
}

const round1 = (n) => Math.round(n * 10) / 10

// ---------------------------------------------------------------------------

async function main() {
  await mkdir(CACHE_DIR, { recursive: true })
  const chars = await collectChars()
  const result = {}
  const missing = []

  for (const ch of chars) {
    let svg
    try {
      svg = await loadSvg(ch)
    } catch (err) {
      missing.push(ch)
      console.warn(`! ${err.message}`)
      continue
    }
    const paths = extractStrokePaths(svg)
    if (paths.length === 0) {
      missing.push(ch)
      console.warn(`! ${ch} : aucun tracé trouvé`)
      continue
    }
    result[ch] = paths.map((d) => resampleBySpacing(flattenPath(d), SAMPLE_SPACING).flat().map(round1))
  }

  const output = {
    source: 'KanjiVG',
    license: 'CC BY-SA 3.0',
    ref: REF,
    viewBox: 109,
    strokes: result,
  }
  await writeFile(OUTPUT, JSON.stringify(output) + '\n', 'utf8')
  console.log(`${Object.keys(result).length} kana écrits dans src/data/strokes.json`)
  if (missing.length > 0) {
    console.error(`Manquants : ${missing.join(' ')}`)
    process.exitCode = 1
  }
}

await main()
