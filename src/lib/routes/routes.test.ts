import { describe, expect, it } from 'vitest'
import { CHOKEPOINTS, ROUTES, chokepointById } from '../../data/routes'
import { buildCorridors, segmentValues } from './corridors'
import { cpValue, dependencyOf, filterRoutes, insights, isIncompleteMonth, levelOf, routedValue, routeValue, shareOf, totalsOf } from './metrics'
import { DEFAULT_STATE, parseState, serializeState } from './url'
import type { RoutesState } from './url'

const ALL = DEFAULT_STATE
const hormuz = chokepointById('hormuz')!

describe('definitions (routes-map-prompt §2, §16)', () => {
  it('shareOf: Hormuz = 23.4 of the routed value', () => expect(shareOf(hormuz, ALL)).toBe(23.4))
  it('every design share (§3 table)', () => {
    const want: Record<string, number> = { panama: 33.7, hormuz: 23.4, gibraltar: 22.7, suez: 12.8, bab: 11.7, malacca: 10.6, bosphorus: 8.0, dardanelles: 8.0, manche: 7.5, cape: 4.7, taiwan: 3.7 }
    for (const cp of CHOKEPOINTS) expect(shareOf(cp, ALL), cp.id).toBe(want[cp.id])
  })
  it('dependencyOf: levels at the 40 and 65 boundaries', () => {
    expect([levelOf(39), levelOf(40), levelOf(64), levelOf(65)]).toEqual(['low', 'medium', 'medium', 'high'])
    expect(dependencyOf(hormuz)).toEqual({ score: 74, level: 'high', parts: { value: 82, trades: 61, concentration: 79 } })
  })
  it('the design scores (§3)', () => {
    const want: Record<string, number> = { panama: 78, hormuz: 74, gibraltar: 69, suez: 58, bab: 55, malacca: 51, bosphorus: 42, dardanelles: 42, manche: 39, cape: 28, taiwan: 24 }
    for (const cp of CHOKEPOINTS) expect(dependencyOf(cp).score, cp.id).toBe(want[cp.id])
  })
  it("isIncompleteMonth('2026-04') is true, and only that month", () => {
    expect(isIncompleteMonth('2026-04')).toBe(true)
    expect(isIncompleteMonth('2026-03')).toBe(false)
  })
  it('totals over the whole period are the design totals', () => {
    const t = totalsOf(ALL)
    expect({ value: Math.round(t.value * 10) / 10, trades: t.trades, routes: t.routes, tonnes: Math.round(t.tonnesBn * 100) / 100, routed: Math.round(t.routed * 10) / 10 }).toEqual({ value: 2199.3, trades: 163305, routes: 3827, tonnes: 6.71, routed: 1121.7 })
  })
  it('the months of a chokepoint add up to its value', () => {
    for (const cp of CHOKEPOINTS) expect(Math.abs(cpValue(cp, ALL) - cp.value), cp.id).toBeLessThan(0.02)
  })
  it('insights: at most two, built from the data', () => {
    const list = insights(ALL)
    expect(list.length).toBeLessThanOrEqual(2)
    expect(list.find((x) => x.kind === 'concentration')?.main).toContain('۳ گلوگاه')
  })
})

describe('route filters read the matching routes', () => {
  it('«دانهٔ سویا» + «برزیل» keeps the Brazilian soy routes, by their soy value only', () => {
    const f: RoutesState = { ...ALL, goods: ['soy'], origin: ['BR'] }
    expect(
      filterRoutes(f)
        .map((r) => r.id)
        .sort(),
    ).toEqual(['BRPNG-NLRTM', 'BRSSZ-IRBKM'])
    expect(Math.round(routedValue(f) * 10) / 10).toBe(9.4)
  })
  it('«به سمت ایران»: the two routes to Iranian ports, 11.8 in all, all through Hormuz', () => {
    const f: RoutesState = { ...ALL, iran: true }
    expect(
      filterRoutes(f)
        .map((r) => r.id)
        .sort(),
    ).toEqual(['BRSSZ-IRBKM', 'RUNVS-IRBND'])
    expect(Math.round(routedValue(f) * 10) / 10).toBe(11.8)
    expect(shareOf(hormuz, f)).toBe(100)
  })
  it('the sample route of the design: 11 of 12 months active, 5 chokepoints in voyage order', () => {
    const r = ROUTES.find((x) => x.id === 'AEJEA-PABLB')!
    expect(r.activeMonths).toBe(11)
    expect(r.chokepoints).toEqual(['hormuz', 'bab', 'suez', 'gibraltar', 'panama'])
    expect(Math.round(routeValue(r, ALL) * 100) / 100).toBe(6.42)
  })
})

describe('corridors', () => {
  const valueOf = (r: (typeof ROUTES)[number]) => routeValue(r, ALL)
  const fc = buildCorridors(ROUTES, valueOf)
  it('each stretch carries exactly the sum of the routes passing it', () => {
    const segs = segmentValues(ROUTES, valueOf)
    for (const s of segs.values()) {
      const want = ROUTES.filter((r) => s.routes.includes(r.id)).reduce((t, r) => t + valueOf(r), 0)
      expect(Math.abs(s.value - want)).toBeLessThan(1e-6)
    }
    for (const f of fc.features) {
      const want = ROUTES.filter((r) => f.properties.routes.includes(r.id)).reduce((t, r) => t + valueOf(r), 0)
      expect(Math.abs(f.properties.value - want)).toBeLessThan(0.002)
    }
  })
  it('every route segment lies on exactly one corridor, and shared lanes are merged', () => {
    const total = ROUTES.reduce((t, r) => t + r.geometry.coordinates.length - 1, 0)
    const drawn = fc.features.reduce((t, f) => t + f.geometry.coordinates.length - 1, 0)
    expect(drawn).toBe(segmentValues(ROUTES, valueOf).size)
    expect(drawn).toBeLessThan(total)
    // The Hormuz stretch carries every route through Hormuz but the ones joining after it
    const max = Math.max(...fc.features.map((f) => f.properties.value))
    expect(max).toBeLessThanOrEqual(ROUTES.reduce((t, r) => t + valueOf(r), 0))
  })
})

describe('url', () => {
  it('the default state writes nothing', () => expect(serializeState(DEFAULT_STATE)).toBe(''))
  it('round trip keeps the state', () => {
    const s: RoutesState = { ...DEFAULT_STATE, view: '3d', cp: 'hormuz', route: 'AEJEA-PABLB', iran: true, month: '2025-05', goods: ['soy', 'wheat'], origin: ['BR'], mode: ['sea'], from: '2025-08', lp: ['AEJEA'], via: ['suez'], q: 4, form: ['dry'], layers: ['main', 'alt', 'ports', 'zones'] }
    expect(parseState(serializeState(s))).toEqual(s)
    expect(serializeState(parseState(serializeState(s)))).toBe(serializeState(s))
  })
  it('unknown values fall back to the defaults', () => {
    expect(parseState('view=xx&month=1999-01&q=9&mode=fly')).toEqual(DEFAULT_STATE)
  })
})
