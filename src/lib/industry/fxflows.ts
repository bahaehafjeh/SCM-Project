import type { Dataset, Range } from './derive'
import { dataMonthsIn, totalsOf } from './derive'
import type { FxRow } from './fx'
import { shiftMonth, yearOf, monthOf } from './months'

/**
 * «منابع و مصارف ارزی»: the rows of «جدول جزئیات منابع و مصارف ارزی» and the tab's four KPI.
 *
 * SAMPLE DATA — no currency file exists yet. Uses are the month's imported purchases (from the real
 * purchase file) split over USD, EUR and now and then CNY, plus «سایر» uses in AED; sources are the
 * sample export sales in AED and USD. Each currency's rate follows the sample company dollar rate
 * (fx.ts). Seeded, so the rows are the same on every load; the page labels them «نمونه».
 */
export type FxSection = 'منابع' | 'مصارف'
export type Currency = 'USD' | 'EUR' | 'AED' | 'CNY'
/** Units of a currency per US dollar (fixed, for the sample only) */
const PER_USD: Record<Currency, number> = { USD: 1, EUR: 0.92, AED: 3.6725, CNY: 7.2 }
export interface FxRecord {
  month: string
  section: FxSection
  /** شرح */
  item: string
  currency: Currency
  /** In the currency; null when the month has no rate */
  amountFx: number | null
  amountFxChangePct: number | null
  /** Rial per unit of the currency, as reported */
  rate: number | null
  rateChangePct: number | null
  /** Million rial */
  amountMr: number
  amountMrChangePct: number | null
  /** Thousand USD at the market dollar; null without a market rate */
  usdMarket: number | null
  /** What is left of the fiscal year's forecast for a use row, in the currency */
  forecastLeft: number | null
  sample: true
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
const fiscalYear = (m: string) => (monthOf(m) >= 10 ? yearOf(m) + 1 : yearOf(m))
const pctChange = (cur: number | null, prev: number | null) => (cur == null || prev == null || prev === 0 ? null : (cur / prev - 1) * 100)
const rowId = (x: Pick<FxRecord, 'section' | 'item' | 'currency'>) => `${x.section}|${x.item}|${x.currency}`

/** All sample rows of the file's months; `exportMr` gives the month's export sales in million rial */
export function fxRecords(ds: Dataset, fx: Map<string, FxRow>, exportMr: (month: string) => number | null): FxRecord[] {
  const r = rng(905)
  type Base = Omit<FxRecord, 'amountFxChangePct' | 'rateChangePct' | 'amountMrChangePct' | 'forecastLeft'>
  const base: Base[] = []
  for (const month of ds.months) {
    const t = totalsOf(ds, month)
    if (!t) continue
    const f = fx.get(month)
    const company = f?.company ?? null
    const push = (section: FxSection, item: string, currency: Currency, mr: number) => {
      if (!(mr > 0)) return
      // A currency's reported rate: the company's dollar rate (exactly, for the dollar), turned into the other currencies ±2%
      const rate = company == null ? null : currency === 'USD' ? company : Math.round((company / PER_USD[currency]) * (0.98 + r() * 0.04))
      base.push({ month, section, item, currency, amountMr: Math.round(mr), rate, amountFx: rate ? Math.round((mr * 1e6) / rate) : null, usdMarket: f?.market ? (mr * 1e6) / f.market / 1e3 : null, sample: true })
    }
    const imp = t.mrImport
    const eur = r() < 0.5 ? 0.1 + r() * 0.15 : 0
    const cny = r() < 0.2 ? 0.08 + r() * 0.12 : 0
    push('مصارف', 'خرید مواد اولیه', 'USD', imp * (1 - eur - cny))
    push('مصارف', 'خرید مواد اولیه', 'EUR', imp * eur)
    push('مصارف', 'خرید مواد اولیه', 'CNY', imp * cny)
    push('مصارف', 'سایر', 'AED', t.mrTotal * (0.01 + r() * 0.03))
    const ex = exportMr(month) ?? 0
    const aed = 0.5 + r() * 0.2
    push('منابع', 'فروش صادراتی', 'AED', ex * aed)
    push('منابع', 'فروش صادراتی', 'USD', ex * (1 - aed))
  }
  const at = new Map(base.map((x) => [`${x.month}|${rowId(x)}`, x]))
  // A use row's fiscal-year forecast: twelve times its average month that year (±10%); what is left after the months so far
  const fyAvg = new Map<string, { sum: number; n: number }>()
  for (const x of base) {
    if (x.section !== 'مصارف' || x.amountFx == null) continue
    const k = `${fiscalYear(x.month)}|${rowId(x)}`
    const a = fyAvg.get(k) ?? { sum: 0, n: 0 }
    fyAvg.set(k, { sum: a.sum + x.amountFx, n: a.n + 1 })
  }
  const used = new Map<string, number>()
  return base.map((x) => {
    const prev = at.get(`${shiftMonth(x.month, -1)}|${rowId(x)}`)
    let forecastLeft: number | null = null
    if (x.section === 'مصارف' && x.amountFx != null) {
      const k = `${fiscalYear(x.month)}|${rowId(x)}`
      const a = fyAvg.get(k)!
      const soFar = (used.get(k) ?? 0) + x.amountFx
      used.set(k, soFar)
      forecastLeft = Math.max(0, Math.round((a.sum / a.n) * 12 * (0.9 + r() * 0.2) - soFar))
    }
    return { ...x, amountFxChangePct: pctChange(x.amountFx, prev?.amountFx ?? null), rateChangePct: pctChange(x.rate, prev?.rate ?? null), amountMrChangePct: pctChange(x.amountMr, prev?.amountMr ?? null), forecastLeft }
  })
}

/** Rows in the range (and year), newest month first; uses before sources, larger amounts first */
export function fxTableRows(rows: FxRecord[], ds: Dataset, range: Range, year: number | null): FxRecord[] {
  const months = new Set(dataMonthsIn(ds, range).filter((m) => year == null || yearOf(m) === year))
  return rows.filter((x) => months.has(x.month)).sort((a, b) => b.month.localeCompare(a.month) || (a.section === b.section ? b.amountMr - a.amountMr : a.section === 'مصارف' ? -1 : 1))
}
export function fxYearCounts(rows: FxRecord[], ds: Dataset, range: Range): { year: number; n: number }[] {
  const years = [...new Set(dataMonthsIn(ds, range).map(yearOf))]
  return years.map((year) => ({ year, n: fxTableRows(rows, ds, range, year).length }))
}
const csvCell = (v: string | number | null) => (v == null ? '' : typeof v === 'number' ? String(Math.round(v * 100) / 100) : /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)
export function fxCsv(rows: FxRecord[]): string {
  const head = ['ماه', 'بخش', 'شرح', 'ارز', 'مبلغ ارزی', 'تغییر مبلغ ارزی ٪', 'نرخ گزارش‌شده (ریال)', 'تغییر نرخ ٪', 'میلیون ریال', 'تغییر مبلغ ریالی ٪', 'هزار دلار بازار', 'مانده پیش‌بینی ارزی', 'منبع']
  const lines = rows.map((x) => [x.month, x.section, x.item, x.currency, x.amountFx, x.amountFxChangePct, x.rate, x.rateChangePct, x.amountMr, x.amountMrChangePct, x.usdMarket, x.forecastLeft, 'نمونه'])
  // A byte-order mark first, so Excel reads the Persian text as UTF-8
  return '﻿' + [head, ...lines].map((l) => l.map(csvCell).join(',')).join('\n')
}

// ── KPI ──
export type FxKpiId = 'uses' | 'sources' | 'usdRate' | 'ratio'
export interface FxKpi {
  id: FxKpiId
  value: number | null
  /** Percent against the month before */
  change: number | null
  /** One per month with data in the range */
  bars: (number | null)[]
  /** One per calendar year (the range's last ten); amounts only */
  years: { year: number; v: number | null; months: number }[]
}
/** End-month figures: uses and sources in billion rial, the reported dollar rate (rial per dollar), the company rate as a percent of the market */
export function fxKpis(rows: FxRecord[], fx: Map<string, FxRow>, ds: Dataset, range: Range): { kpis: FxKpi[]; months: string[] } | null {
  const months = dataMonthsIn(ds, range)
  const end = months[months.length - 1]
  if (!end) return null
  const byMonth = new Map<string, FxRecord[]>()
  for (const x of rows) byMonth.set(x.month, [...(byMonth.get(x.month) ?? []), x])
  const total = (m: string, s: FxSection) =>
    byMonth.has(m)
      ? byMonth
          .get(m)!
          .filter((x) => x.section === s)
          .reduce((a, x) => a + x.amountMr, 0) / 1e3
      : null
  // The month's reported dollar rate: its dollar rows weighted by amount; none without a non-zero dollar row
  const usdRate = (m: string) => {
    const xs = (byMonth.get(m) ?? []).filter((x) => x.currency === 'USD' && x.rate != null && x.amountFx)
    const sum = xs.reduce((a, x) => a + x.amountFx!, 0)
    return sum ? xs.reduce((a, x) => a + x.rate! * x.amountFx!, 0) / sum : null
  }
  const ratio = (m: string) => {
    const u = usdRate(m)
    const mk = fx.get(m)?.market ?? null
    return u != null && mk ? (u / mk) * 100 : null
  }
  const prev = shiftMonth(end, -1)
  const yearList = [...new Set(months.map(yearOf))].slice(-10)
  const perYear = (f: (m: string) => number | null) =>
    yearList.map((year) => {
      const ms = months.filter((m) => yearOf(m) === year)
      const vs = ms.map(f).filter((v): v is number => v != null)
      return { year, v: vs.length ? vs.reduce((a, v) => a + v, 0) : null, months: ms.length }
    })
  const uses = (m: string) => total(m, 'مصارف')
  const sources = (m: string) => total(m, 'منابع')
  return {
    months,
    kpis: [
      { id: 'uses', value: uses(end), change: pctChange(uses(end), uses(prev)), bars: months.map(uses), years: perYear(uses) },
      { id: 'sources', value: sources(end), change: pctChange(sources(end), sources(prev)), bars: months.map(sources), years: perYear(sources) },
      { id: 'usdRate', value: usdRate(end), change: pctChange(usdRate(end), usdRate(prev)), bars: months.map(usdRate), years: [] },
      { id: 'ratio', value: ratio(end), change: null, bars: months.map(ratio), years: [] },
    ],
  }
}

// ── «روند اقلام ارزی»: ۴ قلم مصارف ──
export type FxTrendMode = 'amount' | 'fx' | 'rate'
export type FxUseItemId = 'raw-USD' | 'raw-CNY' | 'other-AED' | 'raw-EUR'
export interface FxUseItemDef {
  id: FxUseItemId
  item: string
  currency: Currency
  label: string
  shortLabel: string
  color: string
}
export const FX_USE_ITEMS: FxUseItemDef[] = [
  { id: 'raw-USD', item: 'خرید مواد اولیه', currency: 'USD', label: 'مصارف · خرید مواد اولیه · USD', shortLabel: 'خرید مواد اولیه (USD)', color: 'var(--raw-blue-600)' },
  { id: 'raw-CNY', item: 'خرید مواد اولیه', currency: 'CNY', label: 'مصارف · خرید مواد اولیه · CNY', shortLabel: 'خرید مواد اولیه (CNY)', color: 'var(--raw-orange-500)' },
  { id: 'other-AED', item: 'سایر', currency: 'AED', label: 'مصارف · سایر · AED', shortLabel: 'سایر مصارف (AED)', color: 'var(--raw-emerald-600)' },
  { id: 'raw-EUR', item: 'خرید مواد اولیه', currency: 'EUR', label: 'مصارف · خرید مواد اولیه · EUR', shortLabel: 'خرید مواد اولیه (EUR)', color: 'var(--raw-violet-500)' },
]
export const DEFAULT_FX_USE_IDS: FxUseItemId[] = ['raw-USD', 'raw-CNY']

export type FxTrendRow = { month: string } & Record<FxUseItemId, number | null>

/** Monthly series for the 4 FX use items under amount (global unit), raw currency amount, or reported rate */
export function fxUseTrendRows(rows: FxRecord[], ds: Dataset, range: Range, mode: FxTrendMode, unit: 'usd' | 'mr'): FxTrendRow[] {
  const byKey = new Map<string, FxRecord>()
  for (const r of rows) {
    if (r.section === 'مصارف') byKey.set(`${r.month}|${r.item}|${r.currency}`, r)
  }
  return dataMonthsIn(ds, range).map((month) => {
    const out = { month } as FxTrendRow
    for (const def of FX_USE_ITEMS) {
      const rec = byKey.get(`${month}|${def.item}|${def.currency}`)
      if (!rec) {
        out[def.id] = null
        continue
      }
      if (mode === 'amount') {
        out[def.id] = unit === 'usd' ? rec.usdMarket : rec.amountMr / 1e3
      } else if (mode === 'fx') {
        out[def.id] = rec.amountFx
      } else {
        out[def.id] = rec.rate
      }
    }
    return out
  })
}

// ── «جمع منابع و مصارف ارزی» ──
export interface FxBalanceRow {
  month: string
  sources: number | null
  uses: number | null
  /** Green-hatched positive gap stacked above uses when sources > uses */
  surplus: number | null
  /** Red-hatched negative gap stacked above sources when uses > sources */
  deficit: number | null
  /** sources - uses (positive = surplus, negative = deficit) */
  net: number | null
  hatched: boolean
}
export interface FxBalanceYear extends FxBalanceRow {
  year: number
  months: number
  missing: number
}

const makeBalance = (month: string, sources: number, uses: number): FxBalanceRow => ({
  month,
  sources,
  uses,
  surplus: Math.max(0, sources - uses),
  deficit: Math.max(0, uses - sources),
  net: sources - uses,
  hatched: false,
})

/** Monthly total FX sources vs uses in billion rials (`mr`) or thousand market USD (`usd`) */
export function fxBalanceRows(rows: FxRecord[], ds: Dataset, range: Range, unit: 'usd' | 'mr'): FxBalanceRow[] {
  const byMonth = new Map<string, FxRecord[]>()
  for (const r of rows) byMonth.set(r.month, [...(byMonth.get(r.month) ?? []), r])
  return dataMonthsIn(ds, range).map((month) => {
    const list = byMonth.get(month) ?? []
    if (!list.length) {
      return { month, sources: null, uses: null, surplus: null, deficit: null, net: null, hatched: true }
    }
    if (unit === 'usd') {
      const hasMissing = list.some((r) => r.usdMarket == null)
      if (hasMissing) {
        return { month, sources: null, uses: null, surplus: null, deficit: null, net: null, hatched: true }
      }
      const sources = list.filter((r) => r.section === 'منابع').reduce((a, r) => a + (r.usdMarket ?? 0), 0)
      const uses = list.filter((r) => r.section === 'مصارف').reduce((a, r) => a + (r.usdMarket ?? 0), 0)
      return makeBalance(month, sources, uses)
    }
    const sources = list.filter((r) => r.section === 'منابع').reduce((a, r) => a + r.amountMr, 0) / 1e3
    const uses = list.filter((r) => r.section === 'مصارف').reduce((a, r) => a + r.amountMr, 0) / 1e3
    return makeBalance(month, sources, uses)
  })
}

/** Annual aggregation of monthly FX balance rows (for ranges longer than 24 months) */
export function fxBalanceYears(monthly: FxBalanceRow[]): FxBalanceYear[] {
  return [...new Set(monthly.map((x) => yearOf(x.month)))].map((year) => {
    const rs = monthly.filter((x) => yearOf(x.month) === year)
    const ok = rs.filter((x) => !x.hatched && x.sources != null && x.uses != null)
    const base = { month: String(year), year, months: rs.length, missing: rs.length - ok.length }
    if (!ok.length) {
      return { ...base, sources: null, uses: null, surplus: null, deficit: null, net: null, hatched: true }
    }
    const sources = ok.reduce((a, x) => a + (x.sources ?? 0), 0)
    const uses = ok.reduce((a, x) => a + (x.uses ?? 0), 0)
    return {
      ...base,
      ...makeBalance(String(year), sources, uses),
    }
  })
}

