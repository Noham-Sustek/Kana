// Icônes de Kana (piste « A · La case ») : PWA (clair et sombre), favicon et application Android.
// Le あ est le tracé du glyphe de Klee One SemiBold (scripts/icon-glyph.json, extrait une fois de la
// police embarquée) : aucune police n'est chargée, ni ici ni à l'exécution.
// Sous 40 px, les repères en croix et le coin indigo disparaissent (illisibles), le cadre s'épaissit.
// Usage : npm run icons
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { Resvg } from '@resvg/resvg-js'

const root = new URL('../', import.meta.url)
const glyph = JSON.parse(readFileSync(new URL('scripts/icon-glyph.json', root), 'utf8'))

// Jetons « Papier et encre » (docs/design/tokens.json).
const THEMES = {
  light: { ground: '#fbf8f1', edge: '#d6ccb9', caseFill: '#fbf8f1', ink: '#1e1b17', guide: '#d6ccb9', corner: '#2a4b9b' },
  dark: { ground: '#000000', edge: '#35302a', caseFill: '#141210', ink: '#ede6d8', guide: '#35302a', corner: '#9db4f0' },
}
const PAPER = { light: '#f5f0e6', dark: '#000000' }

// Glyphe centré dans la case (repère 100 × 100, case de 19 à 81) : 46 unités de corps,
// centre de l'avance horizontalement, centre de la boîte englobante verticalement.
const [, minY, , maxY] = glyph.bbox
const k = 46 / glyph.unitsPerEm
const glyphPath = (fill) =>
  `<path transform="translate(50 50.5) scale(${k} ${-k}) translate(${-glyph.advance / 2} ${-(minY + maxY) / 2})" d="${glyph.d}" fill="${fill}"/>`

/** La case : cadre, repères en croix, coin indigo (taille ≥ 40 px) et あ. */
function mark(t, { small = false } = {}) {
  return [
    `<rect x="19" y="19" width="62" height="62" rx="3" fill="${t.caseFill}" stroke="${t.ink}" stroke-width="${small ? 3 : 2.5}"/>`,
    small ? '' : `<path d="M50 21V79M21 50H79" stroke="${t.guide}" stroke-width="1.2" stroke-dasharray="3 2.5" fill="none"/>`,
    small ? '' : `<path d="M79.75 79.75H67L79.75 67Z" fill="${t.corner}"/>`,
    glyphPath(t.ink),
  ].join('')
}

const svg = (body, viewBox = '0 0 100 100') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">${body}</svg>`

/** Icône complète : carré arrondi (rx 22) ; `square` : plein cadre (iOS arrondit lui-même). */
function icon(theme, { small = false, square = false } = {}) {
  const t = THEMES[theme]
  const ground = square
    ? `<rect width="100" height="100" fill="${t.ground}"/>`
    : theme === 'light'
      ? `<rect x="0.5" y="0.5" width="99" height="99" rx="22" fill="${t.ground}" stroke="${t.edge}" stroke-width="1"/>`
      : `<rect width="100" height="100" rx="22" fill="${t.ground}"/>`
  return svg(ground + mark(t, { small }))
}

/** Maskable : fond plein cadre, case réduite pour tenir dans le cercle de sécurité (80 %). */
function maskable(theme) {
  const t = THEMES[theme]
  return svg(`<rect width="100" height="100" fill="${t.ground}"/><g transform="translate(50 50) scale(0.82) translate(-50 -50)">${mark(t)}</g>`)
}

/** Favicon SVG : version simplifiée, qui suit le thème du système. */
function faviconSvg() {
  const l = THEMES.light
  const d = THEMES.dark
  const style =
    `<style>.g{fill:${l.ground};stroke:${l.edge}}.c{fill:${l.caseFill};stroke:${l.ink}}.k{fill:${l.ink}}` +
    `@media (prefers-color-scheme: dark){.g{fill:${d.ground};stroke:${d.edge}}.c{fill:${d.caseFill};stroke:${d.ink}}.k{fill:${d.ink}}}</style>`
  return svg(
    style +
      `<rect class="g" x="0.5" y="0.5" width="99" height="99" rx="22" stroke-width="1"/>` +
      `<rect class="c" x="19" y="19" width="62" height="62" rx="3" stroke-width="3"/>` +
      glyphPath('currentColor').replace('fill="currentColor"', 'class="k"'),
  )
}

const png = (source, size) => new Resvg(source, { fitTo: { mode: 'width', value: size } }).render().asPng()

/** .ico contenant des PNG (accepté par tous les navigateurs actuels). */
function ico(images) {
  const header = Buffer.alloc(6 + images.length * 16)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(images.length, 4)
  let offset = header.length
  images.forEach(({ size, data }, i) => {
    const e = 6 + i * 16
    header.writeUInt8(size >= 256 ? 0 : size, e)
    header.writeUInt8(size >= 256 ? 0 : size, e + 1)
    header.writeUInt16LE(1, e + 4)
    header.writeUInt16LE(32, e + 6)
    header.writeUInt32LE(data.length, e + 8)
    header.writeUInt32LE(offset, e + 12)
    offset += data.length
  })
  return Buffer.concat([header, ...images.map((i) => i.data)])
}

const write = (path, data) => {
  const url = new URL(path, root)
  mkdirSync(new URL('./', url), { recursive: true })
  writeFileSync(url, data)
  console.log(path)
}

// ── PWA (public/) ──
for (const theme of ['light', 'dark']) {
  const suffix = theme === 'light' ? '' : '-dark'
  for (const size of [192, 512]) {
    write(`public/icon${suffix}-${size}.png`, png(icon(theme), size))
    write(`public/icon-maskable${suffix}-${size}.png`, png(maskable(theme), size))
  }
  write(`public/apple-touch-icon${suffix}.png`, png(icon(theme, { square: true }), 180))
  write(`public/icon${suffix}.svg`, icon(theme))
  write(`public/favicon${suffix}-32.png`, png(icon(theme, { small: true }), 32))
}
write('public/favicon.svg', faviconSvg())
write(
  'public/favicon.ico',
  ico([16, 32, 48].map((size) => ({ size, data: png(icon('light', { small: size < 40 }), size) }))),
)

// ── Application Android (Capacitor) ──
// Icône adaptative : premier plan 108 dp dont seuls ~72 dp sont visibles et 66 dp toujours sûrs ;
// la case (diagonale) tient dans ce cercle. Fond = couleur unie. Variantes « night » : icône et
// écran de démarrage sombres quand le téléphone est en thème sombre.
const res = 'android/app/src/main/res/'
const FG_SCALE = (0.43 * 108) / 62
const foreground = (t) => svg(`<g transform="translate(54 54) scale(${FG_SCALE}) translate(-50 -50)">${mark(t)}</g>`, '0 0 108 108')
// Monochrome (icônes à thème d'Android 13+) : cadre et あ seuls, teintés par le système.
const mono = svg(
  `<g transform="translate(54 54) scale(${FG_SCALE}) translate(-50 -50)"><rect x="19" y="19" width="62" height="62" rx="3" fill="none" stroke="#fff" stroke-width="3"/>${glyphPath('#fff')}</g>`,
  '0 0 108 108',
)
const DENSITIES = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 }
for (const [density, f] of Object.entries(DENSITIES)) {
  const legacy = Math.round(48 * f)
  const fg = Math.round(108 * f)
  for (const theme of ['light', 'dark']) {
    const dir = `${res}mipmap-${theme === 'dark' ? 'night-' : ''}${density}/`
    const t = THEMES[theme]
    write(`${dir}ic_launcher.png`, png(icon(theme), legacy))
    write(
      `${dir}ic_launcher_round.png`,
      png(svg(`<circle cx="50" cy="50" r="50" fill="${t.ground}"/><g transform="translate(50 50) scale(0.9) translate(-50 -50)">${mark(t)}</g>`), legacy),
    )
    write(`${dir}ic_launcher_foreground.png`, png(foreground(t), fg))
  }
  write(`${res}mipmap-${density}/ic_launcher_monochrome.png`, png(mono, fg))
}
for (const theme of ['light', 'dark']) {
  write(
    `${res}values${theme === 'dark' ? '-night' : ''}/ic_launcher_background.xml`,
    `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">${THEMES[theme].ground}</color>\n    <color name="kana_paper">${PAPER[theme]}</color>\n</resources>\n`,
  )
}
