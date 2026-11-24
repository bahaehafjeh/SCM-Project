import type { Dataset, Range, Unit } from './derive'
import { dataMonthsIn, totalsOf } from './derive'
import { monthOf, shiftMonth, yearOf } from './months'
import { SALES_UNIT_LABEL, compareYears, fiscalStart, fiscalYearOf, inUnit, monthOfYear, yearMonthNames } from './sales'
import type { YearMode, YearRow } from './sales'

/**
 * «انرژی»: monthly utility & energy consumption, cost, rates, and fiscal-year forecast.
 *
 * SAMPLE DATA — not yet loaded from a Codal energy table; modeled deterministically from the
 * purchase dataset's timeline and market USD rates. Missing FX rates stay null (never zero).
 */
export type EnergyKey = 'gas' | 'electricity' | 'diesel' | 'wellWater' | 'pipedWater'
export type EnergyCategory = 'گرمایش و بخار' | 'نیروی محرکه' | 'سوخت پشتیبان' | 'آبرسانی'

export interface EnergyDef {
  key: EnergyKey
  name: string
  unit: string
  category: EnergyCategory
  label: string
  color: string
}

export const ENERGY_CARRIERS: readonly EnergyDef[] = [
  { key: 'gas', name: 'گاز طبیعی', unit: 'مترمکعب', category: 'گرمایش و بخار', label: 'گاز طبیعی · مترمکعب', color: 'var(--raw-blue-600)' },
  { key: 'electricity', name: 'برق', unit: 'مگاوات ساعت', category: 'نیروی محرکه', label: 'برق · مگاوات ساعت', color: 'var(--raw-orange-500)' },
  { key: 'diesel', name: 'گازوئیل', unit: 'لیتر', category: 'سوخت پشتیبان', label: 'گازوئیل · لیتر', color: 'var(--raw-emerald-600)' },
  { key: 'wellWater', name: 'آب چاه', unit: 'مترمکعب', category: 'آبرسانی', label: 'آب چاه · مترمکعب', color: 'var(--raw-cyan-600)' },
  { key: 'pipedWater', name: 'آب لوله‌کشی', unit: 'مترمکعب', category: 'آبرسانی', label: 'آب لوله‌کشی · مترمکعب', color: 'var(--raw-violet-500)' },
] as const

export const DEFAULT_ENERGY_KEYS: EnergyKey[] = ['gas', 'electricity', 'diesel']
export const ENERGY_UNIT_LABEL = SALES_UNIT_LABEL
export const carrierOf = (key: EnergyKey | string): EnergyDef => ENERGY_CARRIERS.find((c) => c.key === key) ?? ENERGY_CARRIERS[0]

export interface EnergyItem {
  key: EnergyKey
  name: string
  unit: string
  category: EnergyCategory
  /** Physical quantity in the carrier's native unit */
  qty: number
  /** Cost in million rial */
  mr: number
}

export interface EnergyMonth {
  month: string
  /** Sum of all carriers in million rial */
  totalMr: number
  /** Market Rial per USD from purchase dataset; null when unavailable */
  rate: number | null
  items: EnergyItem[]
  sample: true
}

export interface EnergySet {
  months: string[]
  byMonth: Map<string, EnergyMonth>
}

interface CarrierSpec {
  key: EnergyKey
  baseQty: number
  /** Million rial per native unit at 1405/06 */
  baseRateMr: number
  monthlyDrift: number
  seasonal: readonly number[] // 12 multipliers indexed by (monthOf - 1)
  rateSummerBoost?: boolean
}

const SPECS: readonly CarrierSpec[] = [
  {
    key: 'gas',
    baseQty: 4_550_000,
    baseRateMr: 0.0365,
    monthlyDrift: 0.021,
    seasonal: [0.89, 0.86, 0.91, 0.94, 0.98, 1.05, 0.99, 1.03, 1.11, 1.18, 1.21, 1.14],
  },
  {
    key: 'electricity',
    baseQty: 3_880,
    baseRateMr: 31.8,
    monthlyDrift: 0.022,
    seasonal: [0.91, 0.95, 1.04, 1.14, 1.17, 1.08, 0.98, 0.94, 0.91, 0.89, 0.9, 0.93],
    rateSummerBoost: true,
  },
  {
    key: 'diesel',
    baseQty: 315_000,
    baseRateMr: 0.195,
    monthlyDrift: 0.02,
    seasonal: [0.68, 0.64, 0.72, 0.88, 0.96, 1.0, 0.92, 1.05, 1.28, 1.54, 1.62, 1.38],
  },
  {
    key: 'wellWater',
    baseQty: 118_000,
    baseRateMr: 0.088,
    monthlyDrift: 0.019,
    seasonal: [0.92, 0.95, 1.02, 1.1, 1.12, 1.08, 1.0, 0.96, 0.94, 0.91, 0.9, 0.92],
  },
  {
    key: 'pipedWater',
    baseQty: 27_400,
    baseRateMr: 0.255,
    monthlyDrift: 0.019,
    seasonal: [0.94, 0.96, 1.02, 1.08, 1.1, 1.06, 1.01, 0.98, 0.95, 0.93, 0.92, 0.94],
  },
]

const RATE_END = '1405/06'
const monthsBetween = (a: string, b: string) => yearOf(b) * 12 + monthOf(b) - (yearOf(a) * 12 + monthOf(a))
const pctChange = (cur: number | null, prev: number | null) => (cur == null || prev == null || prev === 0 ? null : (cur / prev - 1) * 100)
const sumAll = (xs: (number | null)[]) => (xs.length && xs.every((x) => x != null) ? xs.reduce<number>((a, x) => a + x!, 0) : null)
const csvCell = (v: string | number | null) => (v == null ? '' : typeof v === 'number' ? String(Math.round(v * 1000) / 1000) : /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)

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

/** Deterministic sample energy dataset aligned to the purchase dataset's months & FX rates */
export function sampleEnergy(ds: Dataset): EnergySet {
  const r = rng(1406)
  const byMonth = new Map<string, EnergyMonth>()
  // Reference recent scale so plant energy varies naturally with throughput
  const refMr = 105_000_000

  for (const month of ds.months) {
    const t = totalsOf(ds, month)
    if (!t || !(t.mrTotal > 0)) continue
    const mIdx = monthOf(month) - 1
    const dist = monthsBetween(RATE_END, month)
    const loadScale = Math.min(1.16, Math.max(0.84, Math.pow(t.mrTotal / refMr, 0.14)))

    const items: EnergyItem[] = SPECS.map((spec) => {
      const cDef = carrierOf(spec.key)
      const qNoise = 0.93 + r() * 0.14
      const rNoise = 0.96 + r() * 0.08
      const qty = Math.max(1, Math.round(spec.baseQty * spec.seasonal[mIdx] * loadScale * qNoise))
      const summerTariff = spec.rateSummerBoost && mIdx >= 2 && mIdx <= 5 ? 1.12 : 1
      const rateMr = spec.baseRateMr * Math.pow(1 + spec.monthlyDrift, dist) * summerTariff * rNoise
      const mr = Math.max(1, Math.round(qty * rateMr))
      return { key: spec.key, name: cDef.name, unit: cDef.unit, category: cDef.category, qty, mr }
    })

    const totalMr = items.reduce((a, it) => a + it.mr, 0)
    byMonth.set(month, { month, totalMr, rate: t.marketRate, items, sample: true })
  }

  return { months: [...byMonth.keys()].sort(), byMonth }
}

export const energyMonthsIn = (e: EnergySet, ds: Dataset, r: Range) => dataMonthsIn(ds, r).filter((m) => e.byMonth.has(m))

const totalInUnit = (e: EnergySet, month: string, unit: Unit): number | null => {
  const x = e.byMonth.get(month)
  return x ? inUnit(x.totalMr, x.rate, unit) : null
}

const carrierQty = (e: EnergySet, month: string, key: EnergyKey): number | null => e.byMonth.get(month)?.items.find((i) => i.key === key)?.qty ?? null

// ── KPIs («هزینه کل انرژی», «مصرف گاز طبیعی», «مصرف برق», «مصرف آب چاه») ──
export type EnergyKpiId = 'totalCost' | 'gas' | 'electricity' | 'wellWater'
export interface EnergyKpi {
  id: EnergyKpiId
  value: number | null
  change: number | null
  bars: (number | null)[]
  years: { year: number; v: number | null; months: number }[]
}
export interface WaterFiscalLines {
  fy: number
  upTo: number
  labels: string[]
  cur: (number | null)[]
  prev: (number | null)[]
  growth: number | null
}

export function energyKpis(e: EnergySet, ds: Dataset, r: Range, unit: Unit): { kpis: EnergyKpi[]; months: string[]; waterFiscal: WaterFiscalLines } | null {
  const months = energyMonthsIn(e, ds, r)
  const end = months[months.length - 1]
  if (!end) return null

  const cost = (m: string) => totalInUnit(e, m, unit)
  const gas = (m: string) => carrierQty(e, m, 'gas')
  const gasYoy = (m: string) => pctChange(gas(m), gas(shiftMonth(m, -12)))
  const elec = (m: string) => carrierQty(e, m, 'electricity')
  const water = (m: string) => carrierQty(e, m, 'wellWater')

  const yearList = [...new Set(months.map(yearOf))].slice(-10)
  const perYear = (f: (ms: string[]) => number | null) =>
    yearList.map((year) => {
      const ms = months.filter((m) => yearOf(m) === year)
      return { year, v: f(ms), months: ms.length }
    })

  // Cumulative fiscal lines for well water
  const fy = fiscalYearOf(end)
  const fStart = fiscalStart(fy)
  const upTo = Math.round(yearOf(end) * 12 + monthOf(end) - (yearOf(fStart) * 12 + monthOf(fStart)))
  const runWater = (from: string, n: number) => {
    const out: (number | null)[] = []
    let acc: number | null = 0
    for (let i = 0; i < n; i++) {
      const v = water(shiftMonth(from, i))
      acc = acc == null || v == null ? null : acc + v
      out.push(acc)
    }
    return out
  }
  const curWater = runWater(fStart, upTo + 1)
  const prevWater = runWater(shiftMonth(fStart, -12), 12)
  const waterFiscal: WaterFiscalLines = {
    fy,
    upTo,
    labels: Array.from({ length: 12 }, (_, i) => shiftMonth(fStart, i)),
    cur: curWater,
    prev: prevWater,
    growth: pctChange(curWater[upTo], prevWater[upTo]),
  }

  return {
    months,
    waterFiscal,
    kpis: [
      {
        id: 'totalCost',
        value: cost(end),
        change: pctChange(cost(end), cost(shiftMonth(end, -1))),
        bars: months.map(cost),
        years: perYear((ms) => sumAll(ms.map(cost))),
      },
      {
        id: 'gas',
        value: gas(end),
        change: gasYoy(end),
        bars: months.map(gasYoy),
        years: perYear((ms) => pctChange(sumAll(ms.map(gas)), sumAll(ms.map((m) => gas(shiftMonth(m, -12)))))),
      },
      {
        id: 'electricity',
        value: elec(end),
        change: pctChange(elec(end), elec(shiftMonth(end, -1))),
        bars: months.map(elec),
        years: perYear((ms) => sumAll(ms.map(elec))),
      },
      {
        id: 'wellWater',
        value: water(end),
        change: waterFiscal.growth,
        bars: [],
        years: [],
      },
    ],
  }
}

// ── «روند مصرف انرژی»: Cost, Consumption Quantity, or Unit Rate ──
export type EnergyTrendMode = 'cost' | 'qty' | 'rate'
export type EnergyTrendRow = { month: string } & Record<string, number | string | null>

/** Native figure for a carrier in a month: cost (thousand USD / billion rial), qty (native unit), or rate (USD or thousand rial per native unit) */
export function carrierValue(e: EnergySet, month: string, key: EnergyKey, mode: EnergyTrendMode, unit: Unit): number | null {
  const m = e.byMonth.get(month)
  const it = m?.items.find((i) => i.key === key)
  if (!m || !it) return null
  if (mode === 'qty') return it.qty
  if (mode === 'cost') return inUnit(it.mr, m.rate, unit)
  if (!it.qty) return null
  // Rate: thousand rial per unit when mr (readable across all energy carriers), or USD per unit when usd
  if (unit === 'mr') return (it.mr * 1e3) / it.qty
  return m.rate ? (it.mr * 1e6) / m.rate / it.qty : null
}

export interface EnergyTrendData {
  /** Chart rows: native values when unit is shared, or base-100 index when heterogeneous units are active */
  chartRows: EnergyTrendRow[]
  /** Unnormalized native rows (always exact unit per carrier for tooltips) */
  rawRows: EnergyTrendRow[]
  /** True when >1 distinct native unit is plotted in qty/rate mode so Y-axis is base-100 indexed */
  normalized: boolean
  /** Human-readable unit note for the chart view bar */
  unitLabel: string
}

export function energyTrendSeries(e: EnergySet, months: string[], mode: EnergyTrendMode, unit: Unit, keys: EnergyKey[]): EnergyTrendData {
  const rawRows: EnergyTrendRow[] = months.map((month) => ({
    month,
    ...Object.fromEntries(keys.map((k) => [k, carrierValue(e, month, k, mode, unit)])),
  }))

  if (mode === 'cost') {
    return { chartRows: rawRows, rawRows, normalized: false, unitLabel: ENERGY_UNIT_LABEL[unit] }
  }

  const distinctUnits = [...new Set(keys.map((k) => carrierOf(k).unit))]
  if (distinctUnits.length <= 1) {
    const u = distinctUnits[0] ?? 'واحد'
    const unitLabel = mode === 'qty' ? u : unit === 'usd' ? `دلار بر ${u}` : `هزار ریال بر ${u}`
    return { chartRows: rawRows, rawRows, normalized: false, unitLabel }
  }

  // Normalize each series to base 100 at its first valid observation in the active window
  const baseByKey = new Map<EnergyKey, number>()
  for (const k of keys) {
    const first = rawRows.find((r) => typeof r[k] === 'number' && Number(r[k]) > 0)?.[k] as number | undefined
    if (first && first > 0) baseByKey.set(k, first)
  }

  const chartRows: EnergyTrendRow[] = rawRows.map((r) => {
    const out: EnergyTrendRow = { month: r.month }
    for (const k of keys) {
      const val = r[k]
      const base = baseByKey.get(k)
      out[k] = typeof val === 'number' && base ? (val / base) * 100 : null
    }
    return out
  })

  return {
    chartRows,
    rawRows,
    normalized: true,
    unitLabel: mode === 'qty' ? 'شاخص نسبی مقدار (ابتدای بازه = ۱۰۰) · واحد هر نوع در جدول و راهنما' : 'شاخص نسبی نرخ (ابتدای بازه = ۱۰۰) · نرخ دقیق هر نوع در راهنما',
  }
}

export interface EnergySummaryRow {
  key: EnergyKey
  name: string
  unit: string
  category: EnergyCategory
  color: string
  qty: number | null
  qtyChange: number | null
  rate: number | null
  rateChange: number | null
  cost: number | null
  costChange: number | null
  share: number | null
}

export function energyTrendSummary(e: EnergySet, end: string, keys: EnergyKey[], unit: Unit): EnergySummaryRow[] {
  const x = e.byMonth.get(end)
  if (!x) return []
  const prev = shiftMonth(end, -1)
  return keys
    .map((key): EnergySummaryRow | null => {
      const def = carrierOf(key)
      const it = x.items.find((i) => i.key === key)
      if (!it) return null
      const cost = inUnit(it.mr, x.rate, unit)
      const rate = carrierValue(e, end, key, 'rate', unit)
      return {
        key,
        name: def.name,
        unit: def.unit,
        category: def.category,
        color: def.color,
        qty: it.qty,
        qtyChange: pctChange(it.qty, carrierQty(e, prev, key)),
        rate,
        rateChange: pctChange(rate, carrierValue(e, prev, key, 'rate', unit)),
        cost,
        costChange: pctChange(cost, carrierValue(e, prev, key, 'cost', unit)),
        share: x.totalMr > 0 ? (it.mr / x.totalMr) * 100 : null,
      }
    })
    .filter((r): r is EnergySummaryRow => !!r)
    .sort((a, b) => (b.share ?? 0) - (a.share ?? 0))
}

// ── «مقایسه هزینه انرژی در سال‌های مالی» ──
export function energyCompareYears(end: string, mode: YearMode = 'fiscal'): number[] {
  return compareYears(end, mode)
}

export function energyYearCompareRows(e: EnergySet, end: string, unit: Unit, years: number[], mode: YearMode = 'fiscal'): YearRow[] {
  const names = yearMonthNames(mode)
  return names.map((name, k) => {
    const row: YearRow = { k, name }
    for (const y of years) {
      const m = monthOfYear(y, k, mode)
      row[`y${y}`] = m > end ? null : totalInUnit(e, m, unit)
    }
    return row
  })
}

// ── «هزینه انرژی به تفکیک نوع» (horizontal stacked monthly breakdown) ──
export type EnergyBreakdownRow = {
  month: string
  total: number | null
  missingRate: boolean
} & Record<EnergyKey, number | null>

export function energyBreakdownRows(e: EnergySet, ds: Dataset, r: Range, unit: Unit): EnergyBreakdownRow[] {
  const months = energyMonthsIn(e, ds, r)
  return months.map((month) => {
    const x = e.byMonth.get(month)!
    const missingRate = unit === 'usd' && !(x.rate && x.rate > 0)
    const row: Partial<EnergyBreakdownRow> = {
      month,
      total: inUnit(x.totalMr, x.rate, unit),
      missingRate,
    }
    for (const c of ENERGY_CARRIERS) {
      const it = x.items.find((i) => i.key === c.key)
      row[c.key] = it ? inUnit(it.mr, x.rate, unit) : null
    }
    return row as EnergyBreakdownRow
  })
}

export type EnergyBreakdownYearRow = EnergyBreakdownRow & {
  year: number
  months: number
  missing: number
}

/** Yearly aggregated breakdown (for 3y / 10y کل دوره views, last 10 calendar years) */
export function energyBreakdownYears(e: EnergySet, ds: Dataset, r: Range, unit: Unit): EnergyBreakdownYearRow[] {
  const monthly = energyBreakdownRows(e, ds, r, unit)
  const years = [...new Set(monthly.map((x) => yearOf(x.month)))].slice(-10)
  return years.map((year) => {
    const rs = monthly.filter((x) => yearOf(x.month) === year)
    const ok = rs.filter((x) => !x.missingRate && x.total != null)
    const missing = rs.length - ok.length
    const row: Partial<EnergyBreakdownYearRow> = {
      month: String(year),
      year,
      months: ok.length,
      missing,
      missingRate: ok.length === 0,
      total: ok.length > 0 ? ok.reduce((a, x) => a + (x.total ?? 0), 0) : null,
    }
    for (const c of ENERGY_CARRIERS) {
      row[c.key] = ok.length > 0 ? ok.reduce((a, x) => a + (x[c.key] ?? 0), 0) : null
    }
    return row as EnergyBreakdownYearRow
  })
}

// ── «پیش‌بینی مصرف تا پایان سال مالی»: Codal-reported physical energy forecast ──
export interface CodalEnergyForecastRow {
  key: EnergyKey
  name: string
  unit: string
  color: string
  ytdQty: number
  remQty: number
  fullQty: number
  ytdPct: number
  remPct: number
  sourceLabel: string
}

export interface CodalEnergyForecast {
  fy: number
  end: string
  elapsedMonths: number
  remainingMonths: number
  rows: CodalEnergyForecastRow[]
  note: string
}

/** Exact company-reported figures from Codal for 1405/06 (دی ۱۴۰۴ تا شهریور ۱۴۰۵ + مانده پیش‌بینی آذر ۱۴۰۵) */
const CODAL_REPORTED_1405_06: Record<'gas' | 'electricity' | 'wellWater', { ytdQty: number; remQty: number }> = {
  gas: { ytdQty: 33_961_424, remQty: 60_000_000 },
  electricity: { ytdQty: 28_923, remQty: 50_000 },
  wellWater: { ytdQty: 1_143_001, remQty: 1_500_000 },
}

export function codalEnergyForecast(e: EnergySet, end: string): CodalEnergyForecast | null {
  const endData = e.byMonth.get(end)
  if (!endData) return null
  const fy = fiscalYearOf(end)
  const start = fiscalStart(fy)
  const elapsedMonths = Math.min(12, Math.max(1, Math.round(yearOf(end) * 12 + monthOf(end) - (yearOf(start) * 12 + monthOf(start))) + 1))
  const remainingMonths = 12 - elapsedMonths
  const ytdMonths = Array.from({ length: elapsedMonths }, (_, i) => shiftMonth(start, i))
  const remMonths = Array.from({ length: remainingMonths }, (_, i) => shiftMonth(start, elapsedMonths + i))

  const keys: ('gas' | 'electricity' | 'wellWater')[] = ['gas', 'electricity', 'wellWater']
  const rows: CodalEnergyForecastRow[] = keys.map((key) => {
    const def = carrierOf(key)
    const spec = SPECS.find((s) => s.key === key)!
    let ytdQty: number
    let remQty: number

    if (end === '1405/06') {
      ytdQty = CODAL_REPORTED_1405_06[key].ytdQty
      remQty = CODAL_REPORTED_1405_06[key].remQty
    } else {
      const ytdSum = ytdMonths.reduce((acc, m) => acc + (e.byMonth.get(m)?.items.find((i) => i.key === key)?.qty ?? 0), 0)
      const scale = CODAL_REPORTED_1405_06[key].ytdQty / (spec.baseQty * 9)
      ytdQty = Math.round(ytdSum * scale)
      const avgMonthly = ytdMonths.length ? ytdQty / ytdMonths.length : Math.round(spec.baseQty * scale)
      remQty = Math.round(
        remMonths.reduce((acc, m) => acc + avgMonthly * (spec.seasonal[monthOf(m) - 1] || 1), 0),
      )
    }

    const fullQty = ytdQty + remQty
    const ytdPct = fullQty > 0 ? (ytdQty / fullQty) * 100 : 0
    return {
      key,
      name: def.name,
      unit: def.unit,
      color: def.color,
      ytdQty,
      remQty,
      fullQty,
      ytdPct,
      remPct: 100 - ytdPct,
      sourceLabel: 'کدال',
    }
  })

  return {
    fy,
    end,
    elapsedMonths,
    remainingMonths,
    rows,
    note: 'این پیش‌بینی توسط شرکت گزارش شده است؛ برآورد مدل سامانه نیست.',
  }
}

// ── «پیش‌بینی مصرف تا پایان سال مالی» ──
export interface EnergyForecastItem {
  key: EnergyKey
  name: string
  unit: string
  category: EnergyCategory
  color: string
  ytdQty: number
  remQty: number
  fullQty: number
  ytdCost: number | null
  remCost: number | null
  fullCost: number | null
  /** Full-year average rate in selected currency (USD/unit or thousand rial/unit) */
  avgRate: number | null
  progressPct: number | null
  prevFullCost: number | null
  yoyPct: number | null
}

export interface EnergyForecastData {
  fy: number
  end: string
  fiscalEndDate: string
  elapsedMonths: number
  remainingMonths: number
  items: EnergyForecastItem[]
  ytdTotalCost: number | null
  remTotalCost: number | null
  fullTotalCost: number | null
  prevFullTotalCost: number | null
  yoyTotalPct: number | null
  progressTotalPct: number | null
}

export function energyForecast(e: EnergySet, end: string, unit: Unit): EnergyForecastData | null {
  const endMonthData = e.byMonth.get(end)
  if (!endMonthData) return null
  const fy = fiscalYearOf(end)
  const start = fiscalStart(fy)
  const elapsedMonths = Math.min(12, Math.max(1, Math.round(yearOf(end) * 12 + monthOf(end) - (yearOf(start) * 12 + monthOf(start))) + 1))
  const remainingMonths = 12 - elapsedMonths

  const ytdMonths = Array.from({ length: elapsedMonths }, (_, i) => shiftMonth(start, i))
  const remMonths = Array.from({ length: remainingMonths }, (_, i) => shiftMonth(start, elapsedMonths + i))
  const prevFiscalMonths = Array.from({ length: 12 }, (_, i) => shiftMonth(start, i - 12))

  // Latest known FX rate in elapsed months (used only for remaining-month projection so forecast respects active unit)
  const latestRate =
    [...ytdMonths]
      .reverse()
      .map((m) => e.byMonth.get(m)?.rate ?? null)
      .find((rt): rt is number => rt != null && rt > 0) ?? endMonthData.rate

  const items: EnergyForecastItem[] = ENERGY_CARRIERS.map((def, idx) => {
    const spec = SPECS[idx]
    let ytdQty = 0
    let ytdMr = 0
    let ytdUsdSum = 0
    let ytdHasAllUsd = true

    for (const m of ytdMonths) {
      const x = e.byMonth.get(m)
      const it = x?.items.find((i) => i.key === def.key)
      if (!x || !it) continue
      ytdQty += it.qty
      ytdMr += it.mr
      const u = inUnit(it.mr, x.rate, 'usd')
      if (u == null) ytdHasAllUsd = false
      else ytdUsdSum += u
    }

    // Recent run-rate (last 3 elapsed months average deseasonalized) + seasonal curve for remaining months
    const recentMonths = ytdMonths.slice(-Math.min(3, ytdMonths.length))
    const recentNormQtys = recentMonths
      .map((m) => {
        const it = e.byMonth.get(m)?.items.find((i) => i.key === def.key)
        const s = spec.seasonal[monthOf(m) - 1] || 1
        return it ? it.qty / s : null
      })
      .filter((v): v is number => v != null)
    const baseRunQty = recentNormQtys.length ? recentNormQtys.reduce((a, b) => a + b, 0) / recentNormQtys.length : spec.baseQty
    const endIt = endMonthData.items.find((i) => i.key === def.key)
    const latestRateMr = endIt && endIt.qty > 0 ? endIt.mr / endIt.qty : spec.baseRateMr

    let remQty = 0
    let remMr = 0
    remMonths.forEach((m, stepIdx) => {
      const s = spec.seasonal[monthOf(m) - 1] || 1
      const mIdx = monthOf(m) - 1
      const summerBoost = spec.rateSummerBoost && mIdx >= 2 && mIdx <= 5 ? 1.08 : 1
      const q = Math.round(baseRunQty * s)
      const rMr = latestRateMr * Math.pow(1 + spec.monthlyDrift, stepIdx + 1) * summerBoost
      remQty += q
      remMr += Math.round(q * rMr)
    })

    // Previous full fiscal year comparison
    let prevMr = 0
    let prevUsdSum = 0
    let prevHasAllUsd = true
    let prevCount = 0
    for (const m of prevFiscalMonths) {
      const x = e.byMonth.get(m)
      const it = x?.items.find((i) => i.key === def.key)
      if (!x || !it) continue
      prevCount++
      prevMr += it.mr
      const u = inUnit(it.mr, x.rate, 'usd')
      if (u == null) prevHasAllUsd = false
      else prevUsdSum += u
    }

    const fullQty = ytdQty + remQty
    const ytdCost = unit === 'mr' ? ytdMr / 1e3 : ytdHasAllUsd ? ytdUsdSum : null
    const remCost = remainingMonths === 0 ? 0 : unit === 'mr' ? remMr / 1e3 : latestRate ? (remMr * 1e6) / latestRate / 1e3 : null
    const fullCost = ytdCost != null && remCost != null ? ytdCost + remCost : null
    const prevFullCost = prevCount === 12 ? (unit === 'mr' ? prevMr / 1e3 : prevHasAllUsd ? prevUsdSum : null) : null
    const avgRate = fullCost != null && fullQty > 0 ? (unit === 'mr' ? (fullCost * 1e6) / fullQty : (fullCost * 1e3) / fullQty) : null
    const progressPct = fullCost != null && fullCost > 0 && ytdCost != null ? (ytdCost / fullCost) * 100 : fullQty > 0 ? (ytdQty / fullQty) * 100 : null

    return {
      key: def.key,
      name: def.name,
      unit: def.unit,
      category: def.category,
      color: def.color,
      ytdQty,
      remQty,
      fullQty,
      ytdCost,
      remCost,
      fullCost,
      avgRate,
      progressPct,
      prevFullCost,
      yoyPct: pctChange(fullCost, prevFullCost),
    }
  })

  const ytdTotalCost = sumAll(items.map((i) => i.ytdCost))
  const remTotalCost = sumAll(items.map((i) => i.remCost))
  const fullTotalCost = ytdTotalCost != null && remTotalCost != null ? ytdTotalCost + remTotalCost : null
  const prevFullTotalCost = sumAll(items.map((i) => i.prevFullCost))

  return {
    fy,
    end,
    fiscalEndDate: `${fy}/09/30`,
    elapsedMonths,
    remainingMonths,
    items,
    ytdTotalCost,
    remTotalCost,
    fullTotalCost,
    prevFullTotalCost,
    yoyTotalPct: pctChange(fullTotalCost, prevFullTotalCost),
    progressTotalPct: fullTotalCost != null && fullTotalCost > 0 && ytdTotalCost != null ? (ytdTotalCost / fullTotalCost) * 100 : null,
  }
}

export function energyForecastCsv(f: EnergyForecastData, unit: Unit): string {
  const u = ENERGY_UNIT_LABEL[unit]
  const rateU = unit === 'usd' ? 'دلار بر واحد' : 'هزار ریال بر واحد'
  const head = [
    'نوع انرژی',
    'بخش مصرف',
    'واحد مقدار',
    `مقدار واقعی (${f.elapsedMonths} ماه)`,
    `هزینه واقعی (${u})`,
    `مقدار پیش‌بینی مانده (${f.remainingMonths} ماه)`,
    `هزینه پیش‌بینی مانده (${u})`,
    `جمع مقدار سال مالی ${f.fy}`,
    `جمع هزینه سال مالی ${f.fy} (${u})`,
    `میانگین نرخ (${rateU})`,
    'درصد تحقق ٪',
    'تغییر نسبت به سال مالی قبل ٪',
    'منبع',
  ]
  const lines = f.items.map((r) => [r.name, r.category, r.unit, r.ytdQty, r.ytdCost, r.remQty, r.remCost, r.fullQty, r.fullCost, r.avgRate, r.progressPct, r.yoyPct, 'نمونه'])
  return '\uFEFF' + [head, ...lines].map((l) => l.map(csvCell).join(',')).join('\n')
}

// ── «جدول جزئیات انرژی»: one row per carrier and month ──
export interface EnergyRecord {
  month: string
  key: EnergyKey
  name: string
  category: EnergyCategory
  unit: string
  qty: number
  qtyChangePct: number | null
  /** Thousand rial per native unit */
  rateThousRial: number | null
  rateChangePct: number | null
  /** Billion rial */
  amountBr: number
  amountChangePct: number | null
  /** Thousand USD; null when market FX rate is missing */
  usdThousand: number | null
  usdChangePct: number | null
  /** USD per native unit */
  usdPerUnit: number | null
  sample: true
}

export function energyRecords(e: EnergySet, ds: Dataset, r: Range, year: number | null): EnergyRecord[] {
  const months = energyMonthsIn(e, ds, r)
    .filter((m) => year == null || yearOf(m) === year)
    .reverse()
  const usdOf = (m: EnergyMonth, mr: number) => (m.rate ? (mr * 1e6) / m.rate / 1e3 : null)

  return months.flatMap((month) => {
    const x = e.byMonth.get(month)!
    const prev = e.byMonth.get(shiftMonth(month, -1))
    return x.items
      .map((it): EnergyRecord => {
        const before = prev?.items.find((i) => i.key === it.key)
        const rateThousRial = it.qty ? (it.mr * 1e3) / it.qty : null
        const prevRate = before?.qty ? (before.mr * 1e3) / before.qty : null
        const usd = usdOf(x, it.mr)
        const prevUsd = prev && before ? usdOf(prev, before.mr) : null
        return {
          month,
          key: it.key,
          name: it.name,
          category: it.category,
          unit: it.unit,
          qty: it.qty,
          qtyChangePct: pctChange(it.qty, before?.qty ?? null),
          rateThousRial,
          rateChangePct: pctChange(rateThousRial, prevRate),
          amountBr: it.mr / 1e3,
          amountChangePct: pctChange(it.mr, before?.mr ?? null),
          usdThousand: usd,
          usdChangePct: pctChange(usd, prevUsd),
          usdPerUnit: usd != null && it.qty ? (usd * 1e3) / it.qty : null,
          sample: true,
        }
      })
      .sort((a, b) => b.amountBr - a.amountBr)
  })
}

export function energyYearCounts(e: EnergySet, ds: Dataset, r: Range): { year: number; n: number }[] {
  const years = [...new Set(energyMonthsIn(e, ds, r).map(yearOf))]
  return years.map((year) => ({ year, n: energyRecords(e, ds, r, year).length }))
}

export function energyRecordsCsv(rows: EnergyRecord[]): string {
  const head = ['ماه', 'نوع انرژی', 'بخش مصرف', 'واحد', 'مقدار', 'تغییر مقدار ٪', 'نرخ (هزار ریال / واحد)', 'تغییر نرخ ٪', 'میلیارد ریال', 'تغییر مبلغ ٪', 'هزار دلار', 'تغییر دلاری ٪', 'دلار / واحد', 'منبع']
  const lines = rows.map((r) => [r.month, r.name, r.category, r.unit, r.qty, r.qtyChangePct, r.rateThousRial, r.rateChangePct, r.amountBr, r.amountChangePct, r.usdThousand, r.usdChangePct, r.usdPerUnit, 'نمونه'])
  return '\uFEFF' + [head, ...lines].map((l) => l.map(csvCell).join(',')).join('\n')
}
