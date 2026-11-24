import type { Feature, FeatureCollection, LineString } from 'geojson'
import type { TradeRoute } from '../../data/routes'

/**
 * Corridors (routes-map-prompt §5-3): never one line per route. Segments that routes share (the same
 * pair of points in their geometry, either direction) are merged and their values added; a run of
 * segments carried by the same set of routes becomes one line. With thousands of routes this stays a
 * few hundred features.
 */
export interface CorridorProps {
  id: string
  /** Billion USD passing this stretch */
  value: number
  routes: string[]
  /** The good with the largest value on this stretch */
  mainGood: string
}

const key = (p: number[]) => `${p[0].toFixed(3)},${p[1].toFixed(3)}`
const segKey = (a: number[], b: number[]) => {
  const ka = key(a)
  const kb = key(b)
  return ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`
}

/** Value of every segment: the sum of the routes passing it */
export function segmentValues(routes: TradeRoute[], valueOf: (r: TradeRoute) => number): Map<string, { a: number[]; b: number[]; value: number; routes: string[] }> {
  const segs = new Map<string, { a: number[]; b: number[]; value: number; routes: string[] }>()
  for (const r of routes) {
    const v = valueOf(r)
    if (v <= 0) continue
    const c = r.geometry.coordinates
    for (let i = 0; i < c.length - 1; i++) {
      const k = segKey(c[i], c[i + 1])
      const s = segs.get(k)
      if (s) {
        s.value += v
        if (!s.routes.includes(r.id)) s.routes.push(r.id)
      } else segs.set(k, { a: c[i], b: c[i + 1], value: v, routes: [r.id] })
    }
  }
  return segs
}

export function buildCorridors(routes: TradeRoute[], valueOf: (r: TradeRoute) => number): FeatureCollection<LineString, CorridorProps> {
  const segs = segmentValues(routes, valueOf)
  const byId = new Map(routes.map((r) => [r.id, r]))
  const features: Feature<LineString, CorridorProps>[] = []
  const used = new Set<string>()
  // Walk each route; extend the current line while the next segment is carried by the same routes
  for (const r of routes) {
    const c = r.geometry.coordinates
    let run: number[][] = []
    let runKey = ''
    let runSeg: { value: number; routes: string[] } | null = null
    const flush = () => {
      if (run.length > 1 && runSeg) {
        const goods = new Map<string, number>()
        for (const id of runSeg.routes) for (const g of byId.get(id)!.goods) goods.set(g.name, (goods.get(g.name) ?? 0) + g.value)
        const mainGood = [...goods.entries()].sort((x, y) => y[1] - x[1])[0]?.[0] ?? ''
        features.push({ type: 'Feature', id: features.length, properties: { id: `c${features.length}`, value: +runSeg.value.toFixed(3), routes: [...runSeg.routes], mainGood }, geometry: { type: 'LineString', coordinates: run } })
      }
      run = []
      runKey = ''
      runSeg = null
    }
    for (let i = 0; i < c.length - 1; i++) {
      const k = segKey(c[i], c[i + 1])
      const s = segs.get(k)
      if (!s || used.has(k)) {
        flush()
        continue
      }
      const sig = [...s.routes].sort().join(',')
      if (runSeg && sig === runKey) run.push(c[i + 1])
      else {
        flush()
        run = [c[i], c[i + 1]]
        runKey = sig
        runSeg = s
      }
      used.add(k)
    }
    flush()
  }
  return { type: 'FeatureCollection', features }
}
