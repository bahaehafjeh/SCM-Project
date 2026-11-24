import type { PurchaseRecord } from './data'
import { AXIS, DATA_START, shiftMonth } from './months'

/**
 * SAMPLE DATA — not from Codal. The owner asked for the months before the real file (1395/01 to
 * 1404/01) to be filled so the long ranges can be judged by eye. Every generated row carries
 * `sample: true` and the report version «نمونه»; the page says so beside the symbol and the table
 * shows no Codal link for them. Turn it off with SAMPLE_HISTORY = false.
 *
 * Each item starts from its earliest real months; going back in time, rial prices and the market
 * dollar both fall about 2.5% a month (so dollar prices stay level), quantities vary ±30%. Deterministic: same seed, same rows.
 */
export const SAMPLE_HISTORY = true
/** Months before this one are sample data */
export const SAMPLE_BEFORE = DATA_START

const PRICE_DRIFT = 0.025
const USD_DRIFT = 0.025

/** mulberry32: a small seeded generator, so the sample never changes between loads */
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
const median = (xs: number[]) => {
  const s = xs.filter((x) => Number.isFinite(x)).sort((a, b) => a - b)
  return s.length ? s[Math.floor(s.length / 2)] : null
}
const pct = (cur: number | null, prev: number | null) => (cur == null || prev == null || prev === 0 ? null : Math.round((cur / prev - 1) * 1000) / 10)
const round = (x: number, d: number) => Math.round(x * 10 ** d) / 10 ** d

/** Sample rows for every axis month before the real data, built from the real rows' typical values */
export function sampleHistory(real: PurchaseRecord[]): PurchaseRecord[] {
  if (!SAMPLE_HISTORY || !real.length) return []
  const realMonths = [...new Set(real.map((r) => r.month))]
  // The market dollar at the start of the real data (first month with a dollar figure)
  const firstUsd = realMonths.sort().find((m) => real.some((r) => r.month === m && r.usdThousand != null))
  const usdRows = real.filter((r) => r.month === firstUsd && r.usdThousand)
  const usdRate0 = (usdRows.reduce((s, r) => s + (r.amountMr ?? 0), 0) * 1e6) / (usdRows.reduce((s, r) => s + (r.usdThousand ?? 0), 0) * 1e3)

  const keys = [...new Set(real.map((r) => `${r.item}|${r.source}`))]
  const items = keys.map((key) => {
    const rows = real.filter((r) => `${r.item}|${r.source}` === key)
    // Anchored on the item's earliest real months, so the sample joins the real data without a jump
    const early = rows.filter((r) => r.month < shiftMonth(realMonths[0], 3))
    const base = early.length ? early : rows
    const ton = rows[0].unit === 'تن'
    return {
      item: rows[0].item,
      source: rows[0].source,
      unit: rows[0].unit,
      ton,
      presence: rows.length / realMonths.length,
      qty: median(base.map((r) => r.qty ?? NaN)),
      rate: median(base.map((r) => r.rateRial ?? NaN)),
      amount: median(base.map((r) => r.amountMr ?? NaN)),
    }
  })

  const months = AXIS.filter((m) => m < SAMPLE_BEFORE)
  const back = (m: string) => AXIS.indexOf(SAMPLE_BEFORE) - AXIS.indexOf(m)
  const rand = rng(1395)
  const out: PurchaseRecord[] = []
  const prev = new Map<string, PurchaseRecord>()
  for (const m of months) {
    const k = back(m)
    const usdRate = usdRate0 * Math.exp(-USD_DRIFT * k) * (0.97 + rand() * 0.06)
    for (const it of items) {
      if (!it.amount || rand() > Math.max(0.35, it.presence)) continue
      const priceF = Math.exp(-PRICE_DRIFT * k) * (0.9 + rand() * 0.2)
      const qtyF = (0.7 + rand() * 0.6) * (1 - 0.002 * k)
      let qty: number | null, rateRial: number | null, amountMr: number
      if (it.ton && it.qty && it.rate) {
        qty = Math.round(it.qty * qtyF)
        rateRial = Math.round(it.rate * priceF)
        amountMr = Math.round((qty * rateRial) / 1e6)
      } else {
        qty = it.ton ? null : 1
        rateRial = null
        amountMr = Math.round(it.amount * priceF * qtyF)
      }
      const usdThousand = round((amountMr * 1e6) / usdRate / 1e3, 1)
      const p = prev.get(`${it.item}|${it.source}`)
      const row: PurchaseRecord = {
        month: m,
        item: it.item,
        source: it.source,
        qty,
        unit: it.unit,
        qtyChangePct: it.ton ? pct(qty, p?.qty ?? null) : null,
        rateRial,
        rateChangePct: pct(rateRial, p?.rateRial ?? null),
        amountMr,
        amountChangePct: pct(amountMr, p?.amountMr ?? null),
        usdThousand,
        usdChangePct: pct(usdThousand, p?.usdThousand ?? null),
        usdPerUnit: it.ton && qty ? round((usdThousand * 1e3) / qty, 1) : null,
        reportVersion: 'نمونه',
        trackingNo: null,
        cellRange: null,
        sample: true,
      }
      prev.set(`${it.item}|${it.source}`, row)
      out.push(row)
    }
  }
  return out
}
