import type { Dataset, Range, Unit } from './derive'
import { dataMonthsIn, totalsOf } from './derive'
import { MONTH_NAMES, monthOf, shiftMonth, yearOf } from './months'

/**
 * «تولید و فروش»: monthly sales of the symbol.
 *
 * SAMPLE DATA — not from Codal. No sales file exists yet; the owner asked for the tab to be built now,
 * so every month is generated from that month's purchase total (sales ≈ 1.15–1.35 × purchases) with a
 * seeded generator, the same on every load. The page labels the whole tab «نمونه». Amounts are kept
 * in million rial and shown in billion rial; the dollar figure divides by that month's market rate and stays empty where the
 * purchase data has no rate (missing is not zero).
 */
export interface SalesMonth {
  month: string
  /** Million rial */
  domestic: number
  export: number
  services: number
  /** Returns and discounts (subtracted) */
  returns: number
  net: number
  /** Rial per USD from the purchase data; null when unknown */
  rate: number | null
  /** The month's sales by product; amounts add up to the month's domestic, export and services totals */
  items: SalesItem[]
  sample: true
}
export type SalesType = 'فروش داخلی' | 'صادراتی' | 'خدمات'
export interface SalesItem {
  key: string
  product: string
  type: SalesType
  unit: string
  /** Million rial */
  mr: number
  /** In the item's unit */
  qty: number
}

/** Sample products: name, type, weight within its type, and price per tonne (million rial) at 1405/06 */
const PRODUCTS: { product: string; type: SalesType; w: number; price: number }[] = [
  { product: 'روغن مایع آفتابگردان', type: 'فروش داخلی', w: 30, price: 3200 },
  { product: 'روغن مایع سرخ‌کردنی', type: 'فروش داخلی', w: 22, price: 3000 },
  { product: 'روغن نیمه‌جامد', type: 'فروش داخلی', w: 16, price: 2700 },
  { product: 'روغن جامد', type: 'فروش داخلی', w: 8, price: 2500 },
  { product: 'مارگارین', type: 'فروش داخلی', w: 7, price: 3600 },
  { product: 'شورتنینگ صنعتی', type: 'فروش داخلی', w: 9, price: 2600 },
  { product: 'روغن مایع کانولا', type: 'فروش داخلی', w: 5, price: 3400 },
  { product: 'اسید چرب', type: 'فروش داخلی', w: 2, price: 1200 },
  { product: 'صابون پایه', type: 'فروش داخلی', w: 1, price: 1500 },
  { product: 'روغن مایع آفتابگردان', type: 'صادراتی', w: 60, price: 3300 },
  { product: 'شورتنینگ صنعتی', type: 'صادراتی', w: 40, price: 2700 },
  { product: 'خدمات تصفیه روغن (کارمزدی)', type: 'خدمات', w: 70, price: 320 },
  { product: 'خدمات بسته‌بندی (کارمزدی)', type: 'خدمات', w: 30, price: 260 },
]
const PRICE_END = '1405/06'
const PRICE_DRIFT = 0.025
const monthsBetween = (a: string, b: string) => yearOf(b) * 12 + monthOf(b) - (yearOf(a) * 12 + monthOf(a))

const FISCAL_FIRST_MONTH = 10 // the year runs دی → آذر (پایان سال مالی ۰۹/۳۰)

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

export interface SalesSet {
  months: string[]
  byMonth: Map<string, SalesMonth>
}

/** One sample row per purchase month */
export function sampleSales(ds: Dataset): SalesSet {
  const r = rng(1405)
  const byMonth = new Map<string, SalesMonth>()
  let exp = 0.05
  for (const month of ds.months) {
    const t = totalsOf(ds, month)
    if (!t || !(t.mrTotal > 0)) continue
    const gross = t.mrTotal * (1.15 + r() * 0.2)
    exp = Math.min(0.1, Math.max(0.015, exp + (r() - 0.5) * 0.02))
    const services = gross * (0.008 + r() * 0.01)
    const exported = gross * exp
    const domestic = gross - services - exported
    const returns = gross * (0.005 + r() * 0.015)
    const round = (x: number) => Math.round(x)
    byMonth.set(month, { month, domestic: round(domestic), export: round(exported), services: round(services), returns: round(returns), net: round(domestic + exported + services - returns), rate: t.marketRate, items: [], sample: true })
  }
  // Products: each type's total shared by weight (±25% a month; a minor product now and then has a month without sales); prices fall ~2.5% a month going back
  const q = rng(7)
  // Each product's price wanders ±7% around its trend from month to month (a separate stream, so the amounts stay put)
  const noise = rng(11)
  for (const x of byMonth.values()) {
    const totals: Record<SalesType, number> = { 'فروش داخلی': x.domestic, صادراتی: x.export, خدمات: x.services }
    const ws = PRODUCTS.map((pr) => (q() < 0.06 && pr.w < 10 ? 0 : pr.w * (0.75 + q() * 0.5)))
    const sumW = (type: SalesType) => PRODUCTS.reduce((a, pr, i) => a + (pr.type === type ? ws[i] : 0), 0)
    const factor = Math.pow(1 + PRICE_DRIFT, monthsBetween(PRICE_END, x.month))
    x.items = PRODUCTS.map((pr, i) => {
      const tw = sumW(pr.type)
      const mr = tw > 0 ? Math.round((totals[pr.type] * ws[i]) / tw) : 0
      return { key: `${pr.product}|${pr.type}`, product: pr.product, type: pr.type, unit: 'تن', mr, qty: Math.round(mr / (pr.price * factor * (0.93 + noise() * 0.14))) }
    })
  }
  return { months: [...byMonth.keys()].sort(), byMonth }
}

// ── «تحلیل فروش»: one row per product for the end month ──
export type SalesTableMode = 'amount' | 'qty'
export interface SalesTableRow {
  key: string
  product: string
  type: SalesType
  unit: string
  cur: number | null
  prev: number | null
  yearAgo: number | null
  mom: number | null
  yoy: number | null
  /** Percent of the month's gross sales (domestic + export + services) */
  share: number | null
}
export function salesTableRows(s: SalesSet, end: string, mode: SalesTableMode, unit: Unit): SalesTableRow[] {
  const x = s.byMonth.get(end)
  if (!x) return []
  const pick = (month: string, key: string) => {
    const m = s.byMonth.get(month)
    const it = m?.items.find((i) => i.key === key)
    if (!m || !it) return null
    return mode === 'qty' ? it.qty : inUnit(it.mr, m.rate, unit)
  }
  const gross = x.domestic + x.export + x.services
  return x.items
    .map((it) => {
      const cur = pick(end, it.key)
      const prev = pick(shiftMonth(end, -1), it.key)
      const yearAgo = pick(shiftMonth(end, -12), it.key)
      return { key: it.key, product: it.product, type: it.type, unit: it.unit, cur, prev, yearAgo, mom: pctChange(cur, prev), yoy: pctChange(cur, yearAgo), share: gross > 0 ? (it.mr / gross) * 100 : null }
    })
    .filter((r) => [r.cur, r.prev, r.yearAgo].some((v) => v != null && v !== 0))
    .sort((a, b) => (b.share ?? 0) - (a.share ?? 0))
}
const csvCell = (v: string | number | null) => (v == null ? '' : typeof v === 'number' ? String(Math.round(v * 100) / 100) : /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)
export function salesCsv(rows: SalesTableRow[], end: string, mode: SalesTableMode, unit: Unit): string {
  const u = mode === 'qty' ? 'مقدار' : SALES_UNIT_LABEL[unit]
  const head = ['ماه', 'محصول', 'نوع', 'واحد', `این ماه (${u})`, `ماه قبل (${u})`, 'رشد ماهانه ٪', `همان ماه سال قبل (${u})`, 'رشد سالانه ٪', 'سهم ٪', 'منبع']
  // A byte-order mark first, so Excel reads the Persian text as UTF-8
  return '\uFEFF' + [head, ...rows.map((r) => [end, r.product, r.type, r.unit, r.cur, r.prev, r.mom, r.yearAgo, r.yoy, r.share, 'نمونه'])].map((l) => l.map(csvCell).join(',')).join('\n')
}

/** Sales amounts are large, so the rial unit is billion rial (the dollar unit stays thousand USD) */
export const SALES_UNIT_LABEL: Record<Unit, string> = { usd: 'هزار دلار', mr: 'میلیارد ریال' }
/** A month's amount in the page's unit: thousand USD, or billion rial */
export function inUnit(mr: number | null | undefined, rate: number | null, unit: Unit): number | null {
  if (mr == null) return null
  if (unit === 'mr') return mr / 1e3
  return rate ? (mr * 1e6) / rate / 1e3 : null
}
const netOf = (s: SalesSet, month: string, unit: Unit) => {
  const x = s.byMonth.get(month)
  return x ? inUnit(x.net, x.rate, unit) : null
}
const pctChange = (cur: number | null, prev: number | null) => (cur == null || prev == null || prev === 0 ? null : (cur / prev - 1) * 100)
const sumAll = (xs: (number | null)[]) => (xs.length && xs.every((x) => x != null) ? xs.reduce<number>((a, x) => a + x!, 0) : null)

// ── Fiscal year: named by the year it ends in (دی ۱۴۰۴ – آذر ۱۴۰۵ is سال مالی ۱۴۰۵) ──
export const fiscalYearOf = (m: string) => (monthOf(m) >= FISCAL_FIRST_MONTH ? yearOf(m) + 1 : yearOf(m))
export const fiscalStart = (fy: number) => `${fy - 1}/${String(FISCAL_FIRST_MONTH).padStart(2, '0')}`

// ── KPI ──
export type SalesKpiId = 'net' | 'yoy' | 'exportShare' | 'fiscal'
export interface SalesKpi {
  id: SalesKpiId
  value: number | null
  /** Percent; for «net» against the month before, for «fiscal» against the same stretch a year earlier */
  change: number | null
  /** One value per month with data in the range */
  bars: (number | null)[]
  /** One per calendar year (the range's last ten) */
  years: { year: number; v: number | null; months: number }[]
}

export function salesKpis(s: SalesSet, ds: Dataset, r: Range, unit: Unit): { kpis: SalesKpi[]; months: string[]; fiscal: FiscalLines } | null {
  const months = dataMonthsIn(ds, r).filter((m) => s.byMonth.has(m))
  const end = months[months.length - 1]
  if (!end) return null
  const net = (m: string) => netOf(s, m, unit)
  const yoy = (m: string) => pctChange(net(m), net(shiftMonth(m, -12)))
  const share = (ms: string[]) => {
    const xs = ms.map((m) => s.byMonth.get(m)).filter((x): x is SalesMonth => !!x)
    const tot = xs.reduce((a, x) => a + x.net, 0)
    return xs.length && tot > 0 ? (xs.reduce((a, x) => a + x.export, 0) / tot) * 100 : null
  }
  const yearList = [...new Set(months.map(yearOf))].slice(-10)
  const perYear = (f: (ms: string[]) => number | null) =>
    yearList.map((year) => {
      const ms = months.filter((m) => yearOf(m) === year)
      return { year, v: f(ms), months: ms.length }
    })
  // A year's growth compares its months with the same months a year earlier (empty if any is missing)
  const yearGrowth = (ms: string[]) => pctChange(sumAll(ms.map(net)), sumAll(ms.map((m) => net(shiftMonth(m, -12)))))
  const fiscal = fiscalLines(s, end, unit)
  return {
    months,
    fiscal,
    kpis: [
      { id: 'net', value: net(end), change: pctChange(net(end), net(shiftMonth(end, -1))), bars: months.map(net), years: perYear((ms) => sumAll(ms.map(net))) },
      { id: 'yoy', value: yoy(end), change: null, bars: months.map(yoy), years: perYear(yearGrowth) },
      { id: 'exportShare', value: share([end]), change: null, bars: months.map((m) => share([m])), years: perYear(share) },
      { id: 'fiscal', value: fiscal.cur[fiscal.upTo] ?? null, change: fiscal.growth, bars: [], years: [] },
    ],
  }
}

/** Cumulative sales of the end month's fiscal year against the year before, month by month */
export interface FiscalLines {
  fy: number
  /** Index of the end month in the fiscal year (0 = دی) */
  upTo: number
  labels: string[]
  cur: (number | null)[]
  prev: (number | null)[]
  /** End-month cumulative against the same stretch a year earlier */
  growth: number | null
}
export function fiscalLines(s: SalesSet, end: string, unit: Unit): FiscalLines {
  const fy = fiscalYearOf(end)
  const start = fiscalStart(fy)
  const run = (from: string, n: number) => {
    const out: (number | null)[] = []
    let acc: number | null = 0
    for (let i = 0; i < n; i++) {
      const v = netOf(s, shiftMonth(from, i), unit)
      acc = acc == null || v == null ? null : acc + v
      out.push(acc)
    }
    return out
  }
  const upTo = Math.round(yearOf(end) * 12 + monthOf(end) - (yearOf(start) * 12 + monthOf(start)))
  const cur = run(start, upTo + 1)
  const prev = run(shiftMonth(start, -12), 12)
  return { fy, upTo, labels: Array.from({ length: 12 }, (_, i) => shiftMonth(start, i)), cur, prev, growth: pctChange(cur[upTo], prev[upTo]) }
}

// ── «مقایسه سال‌ها» ──
export type YearMode = 'fiscal' | 'calendar'
/** The five years ending at the end month, newest first */
export const compareYears = (end: string, mode: YearMode) => {
  const y = mode === 'fiscal' ? fiscalYearOf(end) : yearOf(end)
  return [y, y - 1, y - 2, y - 3, y - 4]
}
/** The calendar month of the k-th month (0–11) of a year */
export const monthOfYear = (year: number, k: number, mode: YearMode) => (mode === 'fiscal' ? shiftMonth(fiscalStart(year), k) : `${year}/${String(k + 1).padStart(2, '0')}`)
/** The twelve month names in the year's order */
export const yearMonthNames = (mode: YearMode) => Array.from({ length: 12 }, (_, k) => MONTH_NAMES[(mode === 'fiscal' ? FISCAL_FIRST_MONTH - 1 + k : k) % 12])

export type YearRow = { k: number; name: string } & Record<string, number | null | string>
/** One row per month of the year, one column per year (`y1405`); a month after the end month or without data stays empty */
export function yearCompareRows(s: SalesSet, end: string, mode: YearMode, unit: Unit, years: number[]): YearRow[] {
  const names = yearMonthNames(mode)
  return names.map((name, k) => {
    const row: YearRow = { k, name }
    for (const y of years) {
      const m = monthOfYear(y, k, mode)
      row[`y${y}`] = m > end ? null : netOf(s, m, unit)
    }
    return row
  })
}

// ── «تغییرات نرخ فروش محصولات»: one line per product ──
export type ProductMode = 'rate' | 'qty' | 'amount'
export interface SalesProduct {
  key: string
  label: string
  color: string
}
const PRODUCT_COLORS = [
  'var(--raw-blue-600)',
  'var(--raw-orange-500)',
  'var(--raw-emerald-600)',
  'var(--raw-rose-500)',
  'var(--raw-violet-500)',
  'var(--raw-amber-500)',
  'var(--raw-cyan-600)',
  'var(--raw-pink-500)',
  'var(--raw-lime-600)',
  'var(--raw-indigo-500)',
  'var(--raw-teal-600)',
  'var(--raw-slate-500)',
  'var(--raw-fuchsia-500)',
]
/** Every product once, in list order, named like the report: product · sales type · unit */
export const SALES_PRODUCTS: SalesProduct[] = PRODUCTS.map((p, i) => ({ key: `${p.product}|${p.type}`, label: `${p.product} · ${p.type} · تن`, color: PRODUCT_COLORS[i % PRODUCT_COLORS.length] }))
export const MAX_PRODUCTS = 8

/** The sales months inside the filter range */
export const salesMonthsIn = (s: SalesSet, ds: Dataset, r: Range) => dataMonthsIn(ds, r).filter((m) => s.byMonth.has(m))

/** A product's figure in a month: rate (million rial or dollar per tonne), quantity (tonnes) or amount (billion rial or thousand dollars) */
export function productValue(s: SalesSet, month: string, key: string, mode: ProductMode, unit: Unit): number | null {
  const m = s.byMonth.get(month)
  const it = m?.items.find((i) => i.key === key)
  if (!m || !it) return null
  if (mode === 'qty') return it.qty
  if (mode === 'amount') return inUnit(it.mr, m.rate, unit)
  // No quantity, no rate
  if (!it.qty) return null
  if (unit === 'mr') return it.mr / it.qty
  return m.rate ? (it.mr * 1e6) / m.rate / it.qty : null
}
export type ProductRow = { month: string } & Record<string, number | string | null>
export const productRows = (s: SalesSet, months: string[], mode: ProductMode, unit: Unit, keys: string[]): ProductRow[] => months.map((month) => ({ month, ...Object.fromEntries(keys.map((k) => [k, productValue(s, month, k, mode, unit)])) }))

/** The leading products over the months: «اصلی» by sales amount, «پرفروش» by quantity */
export function topProducts(s: SalesSet, months: string[], by: 'amount' | 'qty', n: number): string[] {
  const total = (key: string) => months.reduce((a, m) => a + ((by === 'qty' ? s.byMonth.get(m)?.items.find((i) => i.key === key)?.qty : s.byMonth.get(m)?.items.find((i) => i.key === key)?.mr) ?? 0), 0)
  return SALES_PRODUCTS.map((p) => ({ key: p.key, v: total(p.key) }))
    .filter((x) => x.v > 0)
    .sort((a, b) => b.v - a.v)
    .slice(0, n)
    .map((x) => x.key)
}
export const PRODUCT_UNIT: Record<ProductMode, (unit: Unit) => string> = {
  rate: (u) => (u === 'usd' ? 'دلار بر تن' : 'میلیون ریال بر تن'),
  qty: () => 'تن',
  amount: (u) => SALES_UNIT_LABEL[u],
}

/** The table view of «تغییرات نرخ فروش محصولات»: the chosen products in the end month */
export interface ProductSummary {
  key: string
  product: string
  type: SalesType
  unit: string
  /** In the rate unit (million rial or dollar per tonne) */
  rate: number | null
  /** Percent against the month before */
  rateChange: number | null
  qty: number | null
  /** In the amount unit (billion rial or thousand dollars) */
  amount: number | null
  /** Percent of the month's gross sales */
  share: number | null
}
export function productSummary(s: SalesSet, end: string, keys: string[], unit: Unit): ProductSummary[] {
  const x = s.byMonth.get(end)
  if (!x) return []
  const gross = x.domestic + x.export + x.services
  return keys
    .map((key): ProductSummary | null => {
      const it = x.items.find((i) => i.key === key)
      if (!it) return null
      const rate = productValue(s, end, key, 'rate', unit)
      return { key, product: it.product, type: it.type, unit: it.unit, rate, rateChange: pctChange(rate, productValue(s, shiftMonth(end, -1), key, 'rate', unit)), qty: it.qty, amount: inUnit(it.mr, x.rate, unit), share: gross > 0 ? (it.mr / gross) * 100 : null }
    })
    .filter((r): r is ProductSummary => !!r)
    .sort((a, b) => (b.share ?? 0) - (a.share ?? 0))
}

// ── «جزئیات فروش در بازه»: one row per product and month, like «جدول جزئیات ماهانه» ──
export interface SalesRecord {
  month: string
  key: string
  product: string
  type: SalesType
  unit: string
  qty: number
  qtyChangePct: number | null
  /** Million rial per tonne */
  rateMr: number | null
  rateChangePct: number | null
  /** Billion rial */
  amountBr: number
  amountChangePct: number | null
  /** Thousand USD; null without a market rate */
  usdThousand: number | null
  usdChangePct: number | null
  /** USD per tonne */
  usdPerUnit: number | null
  sample: true
}
/** Rows inside the range (and the year, when one is chosen), newest month first, largest amount first; a product with nothing sold that month is left out */
export function salesRecords(s: SalesSet, ds: Dataset, r: Range, year: number | null): SalesRecord[] {
  const months = salesMonthsIn(s, ds, r)
    .filter((m) => year == null || yearOf(m) === year)
    .reverse()
  const usdOf = (m: SalesMonth, mr: number) => (m.rate ? (mr * 1e6) / m.rate / 1e3 : null)
  return months.flatMap((month) => {
    const x = s.byMonth.get(month)!
    const p = s.byMonth.get(shiftMonth(month, -1))
    return x.items
      .filter((it) => it.mr > 0 || it.qty > 0)
      .map((it) => {
        const before = p?.items.find((i) => i.key === it.key)
        const rateMr = it.qty ? it.mr / it.qty : null
        const prevRate = before?.qty ? before.mr / before.qty : null
        const usd = usdOf(x, it.mr)
        const prevUsd = p && before ? usdOf(p, before.mr) : null
        return {
          month,
          key: it.key,
          product: it.product,
          type: it.type,
          unit: it.unit,
          qty: it.qty,
          qtyChangePct: pctChange(it.qty, before?.qty ?? null),
          rateMr,
          rateChangePct: pctChange(rateMr, prevRate),
          amountBr: it.mr / 1e3,
          amountChangePct: pctChange(it.mr, before?.mr ?? null),
          usdThousand: usd,
          usdChangePct: pctChange(usd, prevUsd),
          usdPerUnit: usd != null && it.qty ? (usd * 1e3) / it.qty : null,
          sample: true as const,
        }
      })
      .sort((a, b) => b.amountBr - a.amountBr)
  })
}
export function salesYearCounts(s: SalesSet, ds: Dataset, r: Range): { year: number; n: number }[] {
  const years = [...new Set(salesMonthsIn(s, ds, r).map(yearOf))]
  return years.map((year) => ({ year, n: salesRecords(s, ds, r, year).length }))
}
export function salesRecordsCsv(rows: SalesRecord[]): string {
  const head = ['ماه', 'محصول', 'نوع', 'واحد', 'مقدار', 'تغییر مقدار ٪', 'نرخ (میلیون ریال بر واحد)', 'تغییر نرخ ٪', 'میلیارد ریال', 'تغییر مبلغ ٪', 'هزار دلار', 'تغییر دلاری ٪', 'دلار / واحد', 'منبع']
  const lines = rows.map((r) => [r.month, r.product, r.type, r.unit, r.qty, r.qtyChangePct, r.rateMr, r.rateChangePct, r.amountBr, r.amountChangePct, r.usdThousand, r.usdChangePct, r.usdPerUnit, 'نمونه'])
  return '﻿' + [head, ...lines].map((l) => l.map(csvCell).join(',')).join('\n')
}
