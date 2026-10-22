// Génère les icônes de la PWA (public/*.png + public/icon.svg) à partir des tracés
// KanjiVG de « あ » (src/data/strokes.json) : aucune police requise, rendu identique
// partout. Rasterisation maison (distance aux segments, anticrénelage) et encodage
// PNG avec zlib : aucune dépendance. Usage : npm run icons
import { readFileSync, writeFileSync } from 'node:fs'
import { deflateSync } from 'node:zlib'

const BG = [0x0f, 0x17, 0x2a] // slate-900, = theme_color du manifeste
const INK = [0xf4, 0x3f, 0x5e] // rose-500, couleur d'accent
const GLYPH = 'あ'
/** Épaisseur du trait, en unités KanjiVG (les tracés d'origine font ~3). */
const STROKE_WIDTH = 9

const root = new URL('../', import.meta.url)
const data = JSON.parse(readFileSync(new URL('src/data/strokes.json', root), 'utf8'))
const strokes = data.strokes[GLYPH].map((flat) => {
  const pts = []
  for (let i = 0; i + 1 < flat.length; i += 2) pts.push([flat[i], flat[i + 1]])
  return pts
})

// Boîte englobante du glyphe (épaisseur comprise), pour le centrer.
const xs = strokes.flat().map((p) => p[0])
const ys = strokes.flat().map((p) => p[1])
const box = {
  x: Math.min(...xs) - STROKE_WIDTH / 2,
  y: Math.min(...ys) - STROKE_WIDTH / 2,
  w: Math.max(...xs) - Math.min(...xs) + STROKE_WIDTH,
  h: Math.max(...ys) - Math.min(...ys) + STROKE_WIDTH,
}

/** Transformation unités KanjiVG → pixels : le glyphe occupe `scale` de la taille, centré. */
function transform(size, scale) {
  const k = (size * scale) / Math.max(box.w, box.h)
  const ox = (size - box.w * k) / 2 - box.x * k
  const oy = (size - box.h * k) / 2 - box.y * k
  return { k, map: ([x, y]) => [ox + x * k, oy + y * k] }
}

function distToSegment(px, py, [ax, ay], [bx, by]) {
  const dx = bx - ax
  const dy = by - ay
  const len2 = dx * dx + dy * dy
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2))
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
}

/** Couverture (0 à 1) du glyphe pour chaque pixel. */
function glyphCoverage(size, scale) {
  const { k, map } = transform(size, scale)
  const r = (STROKE_WIDTH * k) / 2
  const dist = new Float32Array(size * size).fill(Infinity)
  for (const stroke of strokes) {
    const pts = stroke.map(map)
    for (let i = 0; i + 1 < pts.length; i++) {
      const a = pts[i]
      const b = pts[i + 1]
      const x0 = Math.max(0, Math.floor(Math.min(a[0], b[0]) - r - 1))
      const x1 = Math.min(size - 1, Math.ceil(Math.max(a[0], b[0]) + r + 1))
      const y0 = Math.max(0, Math.floor(Math.min(a[1], b[1]) - r - 1))
      const y1 = Math.min(size - 1, Math.ceil(Math.max(a[1], b[1]) + r + 1))
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          const d = distToSegment(x + 0.5, y + 0.5, a, b)
          if (d < dist[y * size + x]) dist[y * size + x] = d
        }
      }
    }
  }
  return dist.map((d) => Math.max(0, Math.min(1, r + 0.5 - d)))
}

/** Couverture d'un carré à coins arrondis de rayon `radius` (0 = plein cadre). */
function roundedRectCoverage(size, radius) {
  const cov = new Float32Array(size * size)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const px = x + 0.5
      const py = y + 0.5
      const cx = Math.max(radius - px, px - (size - radius), 0)
      const cy = Math.max(radius - py, py - (size - radius), 0)
      const d = Math.hypot(cx, cy) - radius
      cov[y * size + x] = radius === 0 ? 1 : Math.max(0, Math.min(1, 0.5 - d))
    }
  }
  return cov
}

function render(size, { scale, radius }) {
  const bg = roundedRectCoverage(size, radius)
  const ink = glyphCoverage(size, scale)
  const rgba = Buffer.alloc(size * size * 4)
  for (let i = 0; i < size * size; i++) {
    const g = ink[i] * (bg[i] > 0 ? 1 : 0)
    for (let c = 0; c < 3; c++) rgba[i * 4 + c] = Math.round(BG[c] * (1 - g) + INK[c] * g)
    rgba[i * 4 + 3] = Math.round(bg[i] * 255)
  }
  return encodePng(size, size, rgba)
}

// --- PNG ---------------------------------------------------------------------

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})

function crc32(buf) {
  let c = 0xffffffff
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, body) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(body.length)
  const typed = Buffer.concat([Buffer.from(type, 'ascii'), body])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(typed))
  return Buffer.concat([len, typed, crc])
}

function encodePng(width, height, rgba) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bits par canal
  ihdr[9] = 6 // RGBA
  const raw = Buffer.alloc(height * (width * 4 + 1))
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0 // filtre : aucun
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4)
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

// --- SVG (favicon) -----------------------------------------------------------

function svg() {
  const size = 512
  const { k, map } = transform(size, 0.72)
  const lines = strokes
    .map((s) => `<polyline points="${s.map(map).map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')}"/>`)
    .join('')
  const hex = (c) => '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('')
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">` +
    `<rect width="${size}" height="${size}" rx="96" fill="${hex(BG)}"/>` +
    `<g fill="none" stroke="${hex(INK)}" stroke-width="${(STROKE_WIDTH * k).toFixed(1)}" stroke-linecap="round" stroke-linejoin="round">${lines}</g>` +
    `</svg>\n`
  )
}

// « any » : carré arrondi, glyphe large. « maskable » : plein cadre, glyphe dans
// la zone de sécurité (cercle de 80 % du côté) pour survivre à tous les masques.
const outputs = [
  ['icon-192.png', 192, { scale: 0.72, radius: 36 }],
  ['icon-512.png', 512, { scale: 0.72, radius: 96 }],
  ['icon-maskable-192.png', 192, { scale: 0.5, radius: 0 }],
  ['icon-maskable-512.png', 512, { scale: 0.5, radius: 0 }],
  ['apple-touch-icon.png', 180, { scale: 0.62, radius: 0 }],
]

for (const [name, size, opts] of outputs) {
  writeFileSync(new URL(`public/${name}`, root), render(size, opts))
  console.log(`public/${name}`)
}
writeFileSync(new URL('public/icon.svg', root), svg())
console.log('public/icon.svg')
