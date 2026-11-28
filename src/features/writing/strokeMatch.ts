import {
  centroid,
  distance,
  meanPairDistance,
  normalize,
  pathLength,
  radius,
  resample,
  type Point,
} from '@/features/writing/geometry'

/** `trace` : par-dessus le modèle (position stricte) ; `free` : case vide (position et taille tolérées). */
export type MatchMode = 'trace' | 'free'

export type StrokeFault = 'order' | 'direction' | 'position' | 'shape' | 'missing'

export type StrokeVerdict =
  | { ok: true }
  | {
      ok: false
      fault: StrokeFault
      /** Pour `order` : rang du trait effectivement dessiné. */
      matchedIndex?: number
    }

export interface PreparedStroke {
  points: Point[]
  samples: Point[]
  length: number
  /** Taille du trait (écart quadratique moyen au centre), pour des seuils proportionnés. */
  size: number
}

export const SAMPLE_COUNT = 32
/** En dessous de cette longueur (points du dakuten…), le sens du trait n'est pas exigé. */
const SHORT_STROKE = 14
/** Longueur cumulée (unités) des traits déjà posés pour en déduire l'échelle et la place du caractère. */
const MIN_ALIGNMENT_SUPPORT = 18

/**
 * Seuils, en unités KanjiVG (carré de 109). La forme est comparée par appariement
 * élastique (DTW) après recentrage et mise à l'échelle, avec un seuil qui grandit
 * avec la taille du trait : une longue courbe (boucle de あ, ね…) tolère plus
 * d'écart absolu qu'un tiret. Réglés sur un banc d'essai de tracés simulés
 * (déformation, tremblement, crochets, vitesse irrégulière).
 */
const TOLERANCES = {
  trace: { shapeBase: 4, shapePerSize: 0.3, shapeMin: 4.5, shapeMax: 12, position: 12, maxScale: 1.15 },
  free: { shapeBase: 4, shapePerSize: 0.28, shapeMin: 4, shapeMax: 12, position: 24, maxScale: 1.4 },
  /** Libre, une fois l'échelle et la place du caractère connues par les traits déjà posés. */
  aligned: { shapeBase: 4, shapePerSize: 0.28, shapeMin: 4, shapeMax: 12, position: 18, maxScale: 1.4 },
  /** Libre, caractère entier : calage sur tous les traits, plus sûr, donc place plus stricte. */
  whole: { shapeBase: 4, shapePerSize: 0.28, shapeMin: 4, shapeMax: 12, position: 14, maxScale: 1.4 },
}

type Tolerance = (typeof TOLERANCES)[keyof typeof TOLERANCES]

export function prepareStroke(points: Point[]): PreparedStroke {
  const samples = resample(points, SAMPLE_COUNT)
  return { points, samples, length: pathLength(points), size: radius(samples) }
}

/** Distance moyenne le long du meilleur appariement des points (DTW, bande de Sakoe-Chiba). */
export function dtwMean(a: readonly Point[], b: readonly Point[], band = 8): number {
  const n = a.length
  const m = b.length
  if (n === 0 || m === 0) return Infinity
  const width = m + 1
  const cost = new Float64Array((n + 1) * width).fill(Infinity)
  const steps = new Float64Array((n + 1) * width)
  cost[0] = 0
  const w = Math.max(band, Math.abs(n - m))
  for (let i = 1; i <= n; i++) {
    for (let j = Math.max(1, i - w); j <= Math.min(m, i + w); j++) {
      const diag = (i - 1) * width + j - 1
      const up = diag + 1
      const left = i * width + j - 1
      let best = diag
      if (cost[up]! < cost[best]!) best = up
      if (cost[left]! < cost[best]!) best = left
      const k = i * width + j
      cost[k] = cost[best]! + distance(a[i - 1]!, b[j - 1]!)
      steps[k] = steps[best]! + 1
    }
  }
  const end = n * width + m
  return cost[end]! / (steps[end]! || 1)
}

/** Échelle et décalage (sans rotation) qui posent le caractère dessiné sur le modèle. */
export interface Alignment {
  scale: number
  from: Point
  to: Point
}

/** Moindres carrés sur les traits appariés (`pairs` : [tracé, modèle]) ; `null` si trop peu de matière. */
function alignmentOf(pairs: readonly (readonly [readonly Point[], PreparedStroke])[]): Alignment | null {
  const d: Point[] = []
  const m: Point[] = []
  let support = 0
  for (const [stroke, model] of pairs) {
    if (stroke.length === 0) continue
    d.push(...resample(stroke, SAMPLE_COUNT))
    m.push(...model.samples)
    support += model.length
  }
  if (support < MIN_ALIGNMENT_SUPPORT) return null
  const dc = centroid(d)
  const mc = centroid(m)
  let num = 0
  let den = 0
  for (let i = 0; i < d.length; i++) {
    const dx = d[i]![0] - dc[0]
    const dy = d[i]![1] - dc[1]
    num += dx * (m[i]![0] - mc[0]) + dy * (m[i]![1] - mc[1])
    den += dx * dx + dy * dy
  }
  // Un seul trait presque droit donne une échelle peu fiable : on la borne.
  const scale = den > 1 ? Math.min(2, Math.max(0.5, num / den)) : 1
  return { scale, from: dc, to: mc }
}

/** Calage sans appariement : centre et étendue de tous les points (un ordre faux ne le fausse pas). */
function cloudAlignment(drawn: readonly (readonly Point[])[], expected: readonly PreparedStroke[]): Alignment | null {
  const d = drawn.filter((s) => s.length > 0).flatMap((s) => resample(s, SAMPLE_COUNT))
  const m = expected.flatMap((e) => e.samples)
  if (d.length === 0 || m.length === 0) return null
  const rd = radius(d)
  const rm = radius(m)
  const scale = rd > 1 ? Math.min(2, Math.max(0.5, rm / rd)) : 1
  return { scale, from: centroid(d), to: centroid(m) }
}

function applyAlignment(points: readonly Point[], a: Alignment | null): Point[] {
  if (!a) return [...points]
  return points.map((p) => [a.to[0] + (p[0] - a.from[0]) * a.scale, a.to[1] + (p[1] - a.from[1]) * a.scale] as const)
}

function shapeLimit(tol: Tolerance, e: PreparedStroke): number {
  return Math.min(tol.shapeMax, Math.max(tol.shapeMin, tol.shapeBase + tol.shapePerSize * e.size))
}

interface Fit {
  /** Écart de forme (DTW) après recentrage. */
  shape: number
  /** Écart point à point (sensible au sens du tracé). */
  pair: number
  offset: number
}

function fit(drawn: readonly Point[], expected: PreparedStroke, tol: Tolerance): Fit {
  const rd = radius(drawn)
  const re = expected.size
  const scale = rd > 1 && re > 1 ? Math.min(tol.maxScale, Math.max(1 / tol.maxScale, re / rd)) : 1
  const a = normalize(drawn, scale)
  const b = normalize(expected.samples)
  return { shape: dtwMean(a, b), pair: meanPairDistance(a, b), offset: distance(centroid(drawn), centroid(expected.samples)) }
}

// Sans ce garde-fou, un simple tapotement passerait pour un trait court :
// ses points rééchantillonnés restent proches du centre du modèle.
function lengthMatches(drawnLength: number, expected: PreparedStroke, tol: Tolerance): boolean {
  const min = expected.length < 10 ? 2 : expected.length * 0.45
  const max = Math.max(expected.length * 2.2 * tol.maxScale, expected.length + 25)
  return drawnLength >= min && drawnLength <= max
}

/** Évalue un trait déjà ramené au repère du modèle ; `candidates` : rangs testés pour une erreur d'ordre. */
function judge(
  points: readonly Point[],
  expected: readonly PreparedStroke[],
  index: number,
  tol: Tolerance,
  candidates: readonly number[],
): StrokeVerdict {
  const target = expected[index]
  if (!target) return { ok: false, fault: 'shape' }
  const drawnLength = pathLength(points)
  const samples = resample(points, SAMPLE_COUNT)
  const reversed = [...samples].reverse()
  const fits = (f: Fit, e: PreparedStroke) => f.shape <= shapeLimit(tol, e) && f.offset <= tol.position

  const lengthOk = lengthMatches(drawnLength, target, tol)
  const forward = fit(samples, target, tol)
  const backward = fit(reversed, target, tol)
  const short = target.length < SHORT_STROKE
  // Sur un trait court, l'écart d'un tracé inversé reste faible : le sens n'est pas exigé.
  const rightWay = short || forward.pair <= backward.pair

  if (lengthOk && rightWay && fits(forward, target)) return { ok: true }
  if (lengthOk && short && fits(backward, target)) return { ok: true }

  for (const j of candidates) {
    const other = expected[j]
    if (!other || !lengthMatches(drawnLength, other, tol)) continue
    if (fits(fit(samples, other, tol), other) || fits(fit(reversed, other, tol), other)) {
      return { ok: false, fault: 'order', matchedIndex: j }
    }
  }

  if (lengthOk && (fits(backward, target) || fits(forward, target))) return { ok: false, fault: 'direction' }
  if (lengthOk && Math.min(forward.shape, backward.shape) <= shapeLimit(tol, target)) return { ok: false, fault: 'position' }
  return { ok: false, fault: 'shape' }
}

const range = (from: number, to: number) => Array.from({ length: Math.max(0, to - from) }, (_, i) => from + i)

/**
 * Évalue un trait dessiné face au trait attendu (`expected[index]`), au fil de l'écriture.
 * Les traits suivants servent à détecter une erreur d'ordre. En mode libre, les
 * traits déjà acceptés (`previous`, dans l'ordre) donnent l'échelle et la place du
 * caractère : un kana écrit petit dans un coin n'est pas une erreur de position.
 */
export function evaluateStroke(
  drawn: readonly Point[],
  expected: readonly PreparedStroke[],
  index: number,
  mode: MatchMode,
  previous: readonly (readonly Point[])[] = [],
): StrokeVerdict {
  if (mode === 'trace') return judge(drawn, expected, index, TOLERANCES.trace, range(index + 1, expected.length))
  const later = range(index + 1, expected.length)
  const alignment = alignmentOf(previous.flatMap((s, k) => (expected[k] ? [[s, expected[k]] as const] : [])))
  const raw = judge(drawn, expected, index, TOLERANCES.free, later)
  if (!alignment || raw.ok) return raw
  // Le calage sur deux ou trois traits reste approximatif : un trait juste dans la case,
  // sans calage, reste juste.
  return judge(applyAlignment(drawn, alignment), expected, index, TOLERANCES.aligned, later)
}

/**
 * Évalue un caractère entier, une fois tous ses traits posés (vérification à la fin).
 * L'échelle et la place du caractère viennent de l'ensemble des traits ; un trait
 * raté ne fausse pas ce calage (second passage sur les seuls traits justes).
 * Un trait manquant est une faute `missing` ; un trait en trop rend la forme fausse.
 */
export function evaluateCharacter(
  drawn: readonly (readonly Point[])[],
  expected: readonly PreparedStroke[],
  mode: MatchMode,
): StrokeVerdict[] {
  const others = (i: number) => range(0, expected.length).filter((j) => j !== i)
  const judgeAll = (alignment: Alignment | null, tol: Tolerance) =>
    expected.map((_, i): StrokeVerdict => {
      const stroke = drawn[i]
      if (!stroke) return { ok: false, fault: 'missing' }
      return judge(applyAlignment(stroke, alignment), expected, i, tol, others(i))
    })

  let verdicts: StrokeVerdict[]
  if (mode === 'trace') {
    verdicts = judgeAll(null, TOLERANCES.trace)
  } else {
    // Premier calage sur l'ensemble des points (indépendant de l'ordre), puis, si des
    // traits sont justes, calage plus fin sur eux seuls.
    const pairs = expected.flatMap((e, i) => (drawn[i] ? [[drawn[i]!, e] as const] : []))
    const cloud = drawn.length === expected.length ? cloudAlignment(drawn, expected) : alignmentOf(pairs)
    verdicts = judgeAll(cloud, cloud ? TOLERANCES.whole : TOLERANCES.free)
    const good = pairs.filter((_, i) => verdicts[i]?.ok)
    const refined = good.length >= 2 ? alignmentOf(good) : null
    if (refined) verdicts = judgeAll(refined, TOLERANCES.whole)
  }
  // Trait en trop : le dernier attendu est compté faux (le caractère n'a pas la bonne forme).
  if (drawn.length > expected.length && verdicts.length > 0) {
    verdicts[verdicts.length - 1] = { ok: false, fault: 'shape' }
  }
  return verdicts
}
