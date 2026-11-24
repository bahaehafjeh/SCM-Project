import type { Dataset, Range } from './derive'
import { dataMonthsIn, totalsOf } from './derive'

/**
 * «منابع و مصارف ارزی» › «نرخ دلار شرکت در برابر دلار بازار».
 *
 * The market rate is the purchase file's own (rial over dollar of the month's purchases; sample before
 * 1404/02, empty in 1404/02–03 where the file has no dollar figure). The company's rate for its raw-
 * material purchases is not in any file yet: SAMPLE DATA, 72–84% of the market rate, drifting slowly,
 * seeded so it is the same on every load. The page labels it «نمونه».
 */
export interface FxRow {
  month: string
  /** Rial per USD */
  market: number | null
  company: number | null
}

function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** One row per data month of the whole file (the range is cut later, so a month's sample never changes with the range) */
export function fxSeries(ds: Dataset): Map<string, FxRow> {
  const r = rng(404)
  let k = 0.78
  const out = new Map<string, FxRow>()
  for (const month of ds.months) {
    const market = totalsOf(ds, month)?.marketRate ?? null
    k = Math.min(0.84, Math.max(0.72, k + (r() - 0.5) * 0.03))
    out.set(month, { month, market, company: market == null ? null : Math.round(market * k) })
  }
  return out
}
export const fxRows = (fx: Map<string, FxRow>, ds: Dataset, range: Range): FxRow[] => dataMonthsIn(ds, range).map((m) => fx.get(m) ?? { month: m, market: null, company: null })

/** The company's rate against the market in the last month that has both, in percent (negative: cheaper than the market) */
export function fxGap(rows: FxRow[]): { month: string; pct: number } | null {
  const last = [...rows].reverse().find((x) => x.market != null && x.company != null)
  return last ? { month: last.month, pct: (last.company! / last.market! - 1) * 100 } : null
}
