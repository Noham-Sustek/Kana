/** Point dans le repère des tracés KanjiVG (carré de 109 unités). */
export type Point = readonly [number, number]

export function distance(a: Point, b: Point): number {
  return Math.hypot(b[0] - a[0], b[1] - a[1])
}

export function pathLength(points: readonly Point[]): number {
  let total = 0
  for (let i = 1; i < points.length; i++) total += distance(points[i - 1]!, points[i]!)
  return total
}

/** `count` points régulièrement espacés le long de la polyligne (extrémités incluses). */
export function resample(points: readonly Point[], count: number): Point[] {
  const first = points[0]
  if (!first) return []
  const total = pathLength(points)
  if (points.length === 1 || total === 0) return Array.from({ length: count }, () => first)

  const out: Point[] = [first]
  const step = total / (count - 1)
  let acc = 0
  let prev = first
  let i = 1
  while (out.length < count - 1 && i < points.length) {
    const next = points[i]!
    const seg = distance(prev, next)
    if (acc + seg >= step && seg > 0) {
      const t = (step - acc) / seg
      const p: Point = [prev[0] + (next[0] - prev[0]) * t, prev[1] + (next[1] - prev[1]) * t]
      out.push(p)
      prev = p
      acc = 0
    } else {
      acc += seg
      prev = next
      i++
    }
  }
  while (out.length < count) out.push(points[points.length - 1]!)
  return out
}

export function centroid(points: readonly Point[]): Point {
  let x = 0
  let y = 0
  for (const p of points) {
    x += p[0]
    y += p[1]
  }
  const n = points.length || 1
  return [x / n, y / n]
}

/** Distance quadratique moyenne au centroïde : mesure de la taille d'un tracé. */
export function radius(points: readonly Point[]): number {
  const c = centroid(points)
  let sum = 0
  for (const p of points) sum += (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2
  return Math.sqrt(sum / (points.length || 1))
}

/** Distance moyenne entre points de même rang (deux listes de même longueur). */
export function meanPairDistance(a: readonly Point[], b: readonly Point[]): number {
  let sum = 0
  const n = Math.min(a.length, b.length)
  for (let i = 0; i < n; i++) sum += distance(a[i]!, b[i]!)
  return n ? sum / n : Infinity
}

/** Recentre (et met éventuellement à l'échelle) des points autour de l'origine. */
export function normalize(points: readonly Point[], scale = 1): Point[] {
  const [cx, cy] = centroid(points)
  return points.map((p) => [(p[0] - cx) * scale, (p[1] - cy) * scale] as const)
}

/** Attribut `points` d'une `<polyline>` SVG. */
export function toSvgPoints(points: readonly Point[]): string {
  return points.map((p) => `${p[0]},${p[1]}`).join(' ')
}

/** Convertit un tableau plat `[x0, y0, x1, y1…]` en points. */
export function fromFlat(flat: readonly number[]): Point[] {
  const out: Point[] = []
  for (let i = 0; i + 1 < flat.length; i += 2) out.push([flat[i]!, flat[i + 1]!])
  return out
}
