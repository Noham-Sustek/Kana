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

/** `trace` : par-dessus le modèle (position stricte) ; `free` : canvas vide (position et taille tolérées). */
export type MatchMode = 'trace' | 'free'

export type StrokeFault = 'order' | 'direction' | 'position' | 'shape'

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
}

interface Tolerance {
  /** Écart moyen maximal après recentrage, en unités KanjiVG (carré de 109). */
  shape: number
  /** Décalage maximal entre centres. */
  position: number
  /** Mise à l'échelle autorisée du tracé dessiné (1 = aucune). */
  maxScale: number
}

const TOLERANCES: Record<MatchMode, Tolerance> = {
  trace: { shape: 10, position: 12, maxScale: 1 },
  free: { shape: 13, position: 22, maxScale: 1.4 },
}

export const SAMPLE_COUNT = 32
/** En dessous de cette longueur (points du dakuten…), le sens du trait n'est pas exigé. */
const SHORT_STROKE = 14

export function prepareStroke(points: Point[]): PreparedStroke {
  return { points, samples: resample(points, SAMPLE_COUNT), length: pathLength(points) }
}

interface Fit {
  shape: number
  offset: number
}

function fit(drawn: readonly Point[], expected: readonly Point[], tol: Tolerance): Fit {
  let scale = 1
  if (tol.maxScale > 1) {
    const rd = radius(drawn)
    const re = radius(expected)
    if (rd > 1 && re > 1) scale = Math.min(tol.maxScale, Math.max(1 / tol.maxScale, re / rd))
  }
  return {
    shape: meanPairDistance(normalize(drawn, scale), normalize(expected)),
    offset: distance(centroid(drawn), centroid(expected)),
  }
}

// Sans ce garde-fou, un simple tapotement passerait pour un trait court :
// ses points rééchantillonnés restent proches du centre du modèle.
function lengthMatches(drawnLength: number, expected: PreparedStroke, tol: Tolerance): boolean {
  const min = expected.length < 10 ? 2 : expected.length * 0.45
  const max = Math.max(expected.length * 2.2 * tol.maxScale, expected.length + 25)
  return drawnLength >= min && drawnLength <= max
}

function fits(f: Fit, tol: Tolerance): boolean {
  return f.shape <= tol.shape && f.offset <= tol.position
}

/**
 * Évalue un trait dessiné face au trait attendu (`expected[index]`).
 * Les traits suivants servent à détecter une erreur d'ordre.
 */
export function evaluateStroke(
  drawn: readonly Point[],
  expected: readonly PreparedStroke[],
  index: number,
  mode: MatchMode,
): StrokeVerdict {
  const target = expected[index]
  if (!target) return { ok: false, fault: 'shape' }
  const tol = TOLERANCES[mode]
  const drawnLength = pathLength(drawn)
  const samples = resample(drawn, SAMPLE_COUNT)
  const reversed = [...samples].reverse()

  const lengthOk = lengthMatches(drawnLength, target, tol)
  const forward = fit(samples, target.samples, tol)
  const backward = fit(reversed, target.samples, tol)
  const short = target.length < SHORT_STROKE
  // Sur un trait court, l'écart absolu d'un tracé inversé reste faible :
  // on compare donc les deux sens plutôt que de se fier au seul seuil.
  const rightWay = short || forward.shape <= backward.shape

  if (lengthOk && rightWay && fits(forward, tol)) return { ok: true }
  if (lengthOk && short && fits(backward, tol)) return { ok: true }

  for (let j = index + 1; j < expected.length; j++) {
    const other = expected[j]!
    if (!lengthMatches(drawnLength, other, tol)) continue
    if (fits(fit(samples, other.samples, tol), tol) || fits(fit(reversed, other.samples, tol), tol)) {
      return { ok: false, fault: 'order', matchedIndex: j }
    }
  }

  if (lengthOk && (fits(backward, tol) || fits(forward, tol))) return { ok: false, fault: 'direction' }
  if (lengthOk && Math.min(forward.shape, backward.shape) <= tol.shape) return { ok: false, fault: 'position' }
  return { ok: false, fault: 'shape' }
}
