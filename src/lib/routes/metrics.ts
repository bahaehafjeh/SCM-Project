import { BREAKDOWN, CHOKEPOINTS, FORMS, GOODS, INCOMPLETE_MONTH, MONTHS, ROUTES, TOTALS, TOTAL_MONTHLY } from '../../data/routes'
import type { Chokepoint, TradeRoute } from '../../data/routes'
import { FORM_SLUG, GOOD_SLUG } from './url'
import type { RoutesState } from './url'

/**
 * The definitions of «نقشه مسیرها» (routes-map-prompt §2), once: every figure on the page is read from
 * here, so the map, the panel and the table can never disagree.
 *
 * Two sources, never mixed in one figure (owner decision 2026-11-15):
 *   · no route filter → the dataset's aggregates (chokepoints and totals by month)
 *   · a route filter (goods, countries, mode, ports, quartile, form, «به سمت ایران») → the matching
 *     sample routes; the panel says so
 * The period (range or one month) applies to both.
 */
export type Filters = Pick<RoutesState, 'goods' | 'origin' | 'dest' | 'mode' | 'from' | 'to' | 'month' | 'lp' | 'up' | 'via' | 'q' | 'form' | 'iran'>
export type Level = 'high' | 'medium' | 'low'
export const LEVEL_LABEL: Record<Level, string> = { high: 'بالا', medium: 'متوسط', low: 'کم' }

const round1 = (n: number) => Math.round(n * 10) / 10

/** The last month of the period, whose data is not complete yet */
export const isIncompleteMonth = (month: string) => month === INCOMPLETE_MONTH

/** Month indexes the figures are read over: one chosen month, else the range */
export function monthIndexes(f: Pick<Filters, 'from' | 'to' | 'month'>): number[] {
  if (f.month) return [MONTHS.indexOf(f.month)]
  const a = MONTHS.indexOf(f.from)
  const b = MONTHS.indexOf(f.to)
  return MONTHS.map((_, i) => i).filter((i) => i >= Math.min(a, b) && i <= Math.max(a, b))
}

/** A route filter is on: figures come from the matching routes, not the aggregates */
export const hasRouteFilters = (f: Filters) => f.iran || !!(f.goods.length || f.origin.length || f.dest.length || f.mode.length || f.lp.length || f.up.length || f.via.length || f.q || f.form.length)

const goodSlug = (name: string) => GOOD_SLUG[name as (typeof GOODS)[number]]
const formSlug = (name: string) => FORM_SLUG[name as (typeof FORMS)[number]]

/** Value quartile of each route among all routes (4 = the largest) */
const QUARTILE: Record<string, number> = (() => {
  const sorted = [...ROUTES].sort((a, b) => a.value - b.value)
  return Object.fromEntries(sorted.map((r, i) => [r.id, Math.min(4, Math.floor((i / sorted.length) * 4) + 1)]))
})()
export const quartileOf = (r: TradeRoute) => QUARTILE[r.id]

/** The part of a route's value the goods and form filters keep (a route can carry several goods) */
function keptShare(r: TradeRoute, f: Filters): number {
  const goods = r.goods.filter((g) => (!f.goods.length || f.goods.includes(goodSlug(g.name))) && (!f.form.length || f.form.includes(formSlug(g.form))))
  return goods.reduce((s, g) => s + g.value, 0) / r.value
}

/** A route's value over the period, for the kept goods */
export function routeValue(r: TradeRoute, f: Filters): number {
  const idx = monthIndexes(f)
  return idx.reduce((s, i) => s + r.monthly[i], 0) * keptShare(r, f)
}

/** Routes matching every route filter and active in the period */
export function filterRoutes(f: Filters, routes: TradeRoute[] = ROUTES): TradeRoute[] {
  return routes.filter(
    (r) =>
      (!f.iran || r.destCountry === 'IR') &&
      (!f.origin.length || f.origin.includes(r.originCountry)) &&
      (!f.dest.length || f.dest.includes(r.destCountry)) &&
      (!f.mode.length || f.mode.includes(r.mode)) &&
      (!f.lp.length || f.lp.includes(r.from.id)) &&
      (!f.up.length || f.up.includes(r.to.id)) &&
      (!f.via.length || f.via.some((v) => r.chokepoints.includes(v))) &&
      (!f.q || quartileOf(r) === f.q) &&
      keptShare(r, f) > 0 &&
      routeValue(r, f) > 0,
  )
}

/** Value passing a chokepoint over the period (billion USD) */
export function cpValue(cp: Chokepoint, f: Filters): number {
  if (!hasRouteFilters(f)) return monthIndexes(f).reduce((s, i) => s + cp.monthly[i], 0)
  return filterRoutes(f)
    .filter((r) => r.chokepoints.includes(cp.id))
    .reduce((s, r) => s + routeValue(r, f), 0)
}

/** «ارزش مسیردار»: value of the trades that have a recorded route, over the period */
export function routedValue(f: Filters): number {
  if (!hasRouteFilters(f)) return monthIndexes(f).reduce((s, i) => s + TOTAL_MONTHLY.routed[i], 0)
  return filterRoutes(f).reduce((s, r) => s + routeValue(r, f), 0)
}

/** «سهم گلوگاه» = value through it ÷ routed value, one decimal (shares do not add up to 100) */
export function shareOf(cp: Chokepoint, f: Filters): number {
  const total = routedValue(f)
  return total > 0 ? round1((cpValue(cp, f) / total) * 100) : 0
}

export const levelOf = (score: number): Level => (score >= 65 ? 'high' : score >= 40 ? 'medium' : 'low')

/** «میزان وابستگی»: 0–100 from value passing, number of trades and goods concentration; not a likelihood of disruption */
export function dependencyOf(cp: Chokepoint): { score: number; level: Level; parts: { value: number; trades: number; concentration: number } } {
  const d = cp.dependency
  return { score: d.score, level: levelOf(d.score), parts: { value: d.value, trades: d.trades, concentration: d.concentration } }
}

/** Share in one month of the dataset (aggregates) */
const monthShare = (cp: Chokepoint, i: number) => (cp.monthly[i] / TOTAL_MONTHLY.routed[i]) * 100
/** Index of the last complete month */
export const LAST_COMPLETE = MONTHS.indexOf(INCOMPLETE_MONTH) - 1
/** Change of share over the last three complete months, in percentage points (never against the incomplete month) */
export const shareChange3m = (cp: Chokepoint) => round1(monthShare(cp, LAST_COMPLETE) - monthShare(cp, LAST_COMPLETE - 3))

/** The headline figures over the period: the dataset's, or the matching routes' */
export function totalsOf(f: Filters): { value: number; trades: number; routes: number; tonnesBn: number; routed: number; fromRoutes: boolean } {
  if (!hasRouteFilters(f)) {
    const idx = monthIndexes(f)
    const sum = (a: number[]) => idx.reduce((s, i) => s + a[i], 0)
    const routes = f.month ? TOTAL_MONTHLY.routes[idx[0]] : TOTALS.routes
    return { value: sum(TOTAL_MONTHLY.value), trades: Math.round(sum(TOTAL_MONTHLY.trades)), routes, tonnesBn: sum(TOTAL_MONTHLY.tonnesBn), routed: sum(TOTAL_MONTHLY.routed), fromRoutes: false }
  }
  const rs = filterRoutes(f)
  const value = rs.reduce((s, r) => s + routeValue(r, f), 0)
  const part = (r: TradeRoute) => routeValue(r, f) / r.value
  return {
    value,
    trades: Math.round(rs.reduce((s, r) => s + r.trades * part(r), 0)),
    routes: rs.length,
    tonnesBn: rs.reduce((s, r) => s + (r.tonnes * part(r)) / 1000, 0),
    routed: value,
    fromRoutes: true,
  }
}

/** Chokepoints ranked by share over the period (only those any value passes) */
export function rankedChokepoints(f: Filters): { cp: Chokepoint; value: number; share: number }[] {
  return CHOKEPOINTS.map((cp) => ({ cp, value: cpValue(cp, f), share: shareOf(cp, f) }))
    .filter((x) => x.value > 0)
    .sort((a, b) => b.share - a.share)
}

/** «چه چیزی مهم است»: built from rules, at most two */
export function insights(f: Filters): { kind: 'trend' | 'concentration'; cp?: Chokepoint; main: string; sub: string; tone: 'up' | 'down' | 'info' }[] {
  const out: ReturnType<typeof insights> = []
  if (!hasRouteFilters(f)) {
    const moved = CHOKEPOINTS.map((cp) => ({ cp, d: shareChange3m(cp) }))
      .filter((x) => Math.abs(x.d) > 2)
      .sort((a, b) => Math.abs(b.d) - Math.abs(a.d))[0]
    if (moved) out.push({ kind: 'trend', cp: moved.cp, tone: moved.d > 0 ? 'up' : 'down', main: `سهم ${moved.cp.name} در ۳ ماه کامل اخیر ${fa1(Math.abs(moved.d))} واحد درصد ${moved.d > 0 ? 'بیشتر' : 'کمتر'} شد`, sub: moved.d > 0 ? 'وابستگی به این گلوگاه رو به افزایش است.' : 'بخشی از جریان به مسیرهای دیگر رفته است.' })
  }
  const big = rankedChokepoints(f).filter((x) => x.share > 20)
  if (big.length) out.push({ kind: 'concentration', tone: 'info', main: `${fa1(big.length)} گلوگاه هر کدام بیش از ۲۰٪ ارزش مسیردار را دارند`, sub: big.map((x) => x.cp.short).join('، ') })
  return out.slice(0, 2)
}
const fa1 = (n: number) => n.toLocaleString('fa-IR', { maximumFractionDigits: 1 })

/** Hormuz-style breakdown, when the sample has one */
export const breakdownOf = (cpId: string) => BREAKDOWN[cpId] ?? null
