/**
 * Day-by-day stock simulation. Day 0 is today; each day consumes first, then that day's arrivals
 * land. Demand that finds no stock is lost and counts as a shortage day. Arrivals are the inbound
 * shipments (facts, possibly delayed by an assumption) plus the actions (transfer, purchase).
 */
export interface Arrival {
  qty: number
  day: number
}

export interface StockRun {
  /** End-of-day stock after arrivals, days 0…days */
  series: number[]
  /** Lowest stock before arrivals, over the run */
  min: number
  /** Days with unmet demand */
  shortageDays: number
  /** Tonnes of demand not met */
  unmet: number
  /** First day the stock reaches zero before that day's arrivals; null if it never does */
  emptyDay: number | null
  /** Every day the stock reaches zero before that day's arrivals, in order */
  emptyDays: number[]
  /** First day with unmet demand; null if none */
  firstShort: number | null
}

const EPS = 1e-9

export function runStock(stock: number, consumption: number, arrivals: Arrival[], days: number): StockRun {
  const series = [stock]
  let s = stock
  let min = stock
  let short = 0
  let unmet = 0
  let emptyDay: number | null = null
  const emptyDays: number[] = []
  let firstShort: number | null = null
  for (let d = 1; d <= days; d++) {
    s -= consumption
    if (s < -EPS) {
      short++
      unmet += -s
      if (firstShort === null) firstShort = d
    }
    if (s < EPS) {
      s = 0
      if (emptyDay === null) emptyDay = d
      emptyDays.push(d)
    }
    min = Math.min(min, s)
    for (const a of arrivals) if (a.day === d) s += a.qty
    series.push(s)
  }
  return { series, min, shortageDays: short, unmet, emptyDay, emptyDays, firstShort }
}

/** How far the run is continued past the horizon to find the run-out day */
export const EXTENDED_DAYS = 365
