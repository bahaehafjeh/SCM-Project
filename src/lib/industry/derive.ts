import type { PurchaseRecord, Source } from './data'
import { AXIS, DATA_START, shiftMonth, yearOf } from './months'
import { fixedTicks, niceTicks } from './format'

/**
 * Everything «داشبورد تحلیلی صنعت» computes (page-prompt §5, §7–§13, §16): pure functions, no
 * Date, no randomness. A missing value stays null; it is never replaced by a zero.
 */

// ── Series: identity and colour of each item × source (§5) ──
export interface SeriesDef {
  /** Chart data key (s0…s10) */
  id: string
  key: string
  item: string
  source: Source
  unit: string
  label: string
  /** A design token (categorical colour, not a change meaning) */
  color: string
}
const S = (item: string, source: Source, unit: string, color: string): Omit<SeriesDef, 'id'> => ({ key: `${item}|${source}`, item, source, unit, label: `${item} · ${source} · ${unit}`, color })

/** TREND_ORDER: fixed order and colour */
export const SERIES: readonly SeriesDef[] = [
  S('روغن خام', 'داخلی', 'تن', 'var(--raw-blue-600)'),
  S('روغن خام', 'وارداتی', 'تن', 'var(--raw-orange-500)'),
  S('لوازم بسته بندی', 'داخلی', 'مختلف', 'var(--raw-emerald-600)'),
  S('لوازم بسته بندی', 'وارداتی', 'مختلف', 'var(--raw-rose-500)'),
  S('مواد شیمیایی', 'داخلی', 'مختلف', 'var(--raw-violet-500)'),
  S('دانه های روغنی', 'داخلی', 'تن', 'var(--raw-amber-500)'),
  S('سایر', 'وارداتی', 'مختلف', 'var(--raw-cyan-600)'),
  S('روغن کارمزدی', 'داخلی', 'تن', 'var(--raw-slate-700)'),
  S('رب گوجه فرنگی فله', 'داخلی', 'بریکس کیلو گرم', 'var(--raw-slate-500)'),
  S('مواد شیمیایی', 'وارداتی', 'مختلف', 'var(--raw-cyan-500)'),
  S('سایر', 'داخلی', 'مختلف', 'var(--raw-neutral-400)'),
].map((s, i) => ({ ...s, id: `s${i}` }))
export const UNKNOWN_COLOR = 'var(--raw-neutral-400)'
export const keyOf = (r: Pick<PurchaseRecord, 'item' | 'source'>) => `${r.item}|${r.source}`
export const seriesOf = (key: string) => SERIES.find((s) => s.key === key)
export const colorOf = (key: string) => seriesOf(key)?.color ?? UNKNOWN_COLOR
export const rowLabel = (r: Pick<PurchaseRecord, 'item' | 'source' | 'unit'>) => `${r.item} · ${r.source} · ${r.unit}`

// ── Index ──
export interface Dataset {
  records: PurchaseRecord[]
  /** Months with data, ascending */
  months: string[]
  byMonth: Map<string, PurchaseRecord[]>
}
export function indexRecords(records: PurchaseRecord[]): Dataset {
  const byMonth = new Map<string, PurchaseRecord[]>()
  for (const r of records) byMonth.set(r.month, [...(byMonth.get(r.month) ?? []), r])
  return { records, months: [...byMonth.keys()].sort(), byMonth }
}
const cell = (ds: Dataset, key: string, month: string) => ds.byMonth.get(month)?.find((r) => keyOf(r) === key)
const sum = (xs: (number | null)[]) => xs.reduce<number>((s, x) => s + (x ?? 0), 0)

// ── Monthly totals (§5) ──
export interface MonthTotals {
  /** Thousand USD; null when the month has no dollar figure */
  usdTotal: number | null
  usdImport: number | null
  usdDomestic: number | null
  /** Million rial */
  mrTotal: number
  mrImport: number
  mrDomestic: number
  /** Only rows in tonnes */
  qtyTon: number
  /** Rial per USD */
  marketRate: number | null
}
export function totalsOf(ds: Dataset, month: string): MonthTotals | null {
  const rows = ds.byMonth.get(month)
  if (!rows) return null
  const hasUsd = rows.some((r) => r.usdThousand != null)
  const usdTotal = hasUsd ? sum(rows.map((r) => r.usdThousand)) : null
  const usdImport = hasUsd ? sum(rows.filter((r) => r.source === 'وارداتی').map((r) => r.usdThousand)) : null
  const mrTotal = sum(rows.map((r) => r.amountMr))
  const mrImport = sum(rows.filter((r) => r.source === 'وارداتی').map((r) => r.amountMr))
  return {
    usdTotal,
    usdImport,
    usdDomestic: usdTotal != null && usdImport != null ? usdTotal - usdImport : null,
    mrTotal,
    mrImport,
    mrDomestic: mrTotal - mrImport,
    qtyTon: sum(rows.filter((r) => r.unit === 'تن').map((r) => r.qty)),
    marketRate: usdTotal != null && usdTotal > 0 ? (mrTotal * 1e6) / (usdTotal * 1e3) : null,
  }
}

// ── Filter (§5): two indexes on the month axis (1395/01 – 1405/06) ──
export interface Range {
  from: number
  to: number
}
const LAST = AXIS.length - 1
/** Opens on the last three years (the «سه‌ساله» preset) */
export const DEFAULT_RANGE: Range = { from: LAST - 35, to: LAST }
export type Unit = 'usd' | 'mr'
export const UNIT_LABEL: Record<Unit, string> = { usd: 'هزار دلار', mr: 'میلیون ریال' }

/** The product's period presets, counted back from the last month; «کل دوره» is the whole axis (1395/01 onward) */
export const PRESETS: { id: string; label: string; from: number; to: number }[] = [
  { id: '1m', label: 'یک‌ماهه', from: LAST, to: LAST },
  { id: '3m', label: 'سه‌ماهه', from: LAST - 2, to: LAST },
  { id: '6m', label: 'شش‌ماهه', from: LAST - 5, to: LAST },
  { id: '1y', label: 'سالانه', from: LAST - 11, to: LAST },
  { id: '3y', label: 'سه‌ساله', from: LAST - 35, to: LAST },
  { id: 'all', label: 'کل دوره', from: 0, to: LAST },
]
export const presetOf = (r: Range) => PRESETS.find((p) => p.from === r.from && p.to === r.to)

export const axisMonths = (r: Range) => AXIS.slice(r.from, r.to + 1)
export const dataMonthsIn = (ds: Dataset, r: Range) => ds.months.filter((m) => m >= AXIS[r.from] && m <= AXIS[r.to])
/** The month the KPIs, «سهم مواد» and the breakdown read: `to`, or the last month with data in the range */
export function endMonth(ds: Dataset, r: Range): string | null {
  const months = dataMonthsIn(ds, r)
  return months.length ? months[months.length - 1] : null
}
export const reportVersionOf = (ds: Dataset, month: string | null) => (month ? (ds.byMonth.get(month)?.find((x) => x.reportVersion)?.reportVersion ?? null) : null)

const change = (cur: number | null, prev: number | null) => (cur == null || prev == null || prev === 0 ? null : (cur / prev - 1) * 100)

// ── KPI (§7) ──
export type KpiId = 'amount' | 'qty' | 'importShare' | 'rate'
export interface Kpi {
  id: KpiId
  value: number | null
  /** Percent against the month before; null when that month has no data (no badge) */
  change: number | null
  /** One value per month with data in the range; the last is the end month */
  bars: (number | null)[]
  /** One value per calendar year (the range's last ten); `months` < 12 marks a year the data or the range cuts short */
  years: { year: number; v: number | null; months: number }[]
}
/** Ranges longer than this many months are summarised by year */
export const BY_YEAR_AFTER = 24
const sumOrNull = (xs: (number | null)[]) => (xs.some((x) => x != null) ? sum(xs) : null)
export function kpisOf(ds: Dataset, r: Range, unit: Unit): Kpi[] | null {
  const end = endMonth(ds, r)
  if (!end) return null
  const months = dataMonthsIn(ds, r)
  const cur = totalsOf(ds, end)!
  const prev = totalsOf(ds, shiftMonth(end, -1))
  const amount = (t: MonthTotals | null) => (t ? (unit === 'usd' ? t.usdTotal : t.mrTotal) : null)
  const share = (t: MonthTotals | null) => (t && t.usdTotal && t.usdImport != null ? (t.usdImport / t.usdTotal) * 100 : null)
  const series = (f: (t: MonthTotals | null) => number | null) => months.map((m) => f(totalsOf(ds, m)))
  const yearList = [...new Set(months.map(yearOf))].slice(-10)
  const perYear = (f: (ts: (MonthTotals | null)[]) => number | null) =>
    yearList.map((year) => {
      const ts = months.filter((m) => yearOf(m) === year).map((m) => totalsOf(ds, m))
      return { year, v: f(ts), months: ts.length }
    })
  // A year's import share is its imports over its total (not an average of the months); its rate is the last one of the year
  const yearShare = (ts: (MonthTotals | null)[]) => {
    const u = ts.filter((t): t is MonthTotals => !!t && !!t.usdTotal && t.usdImport != null)
    const tot = sum(u.map((t) => t.usdTotal))
    return tot ? (sum(u.map((t) => t.usdImport)) / tot) * 100 : null
  }
  return [
    { id: 'amount', value: amount(cur), change: change(amount(cur), amount(prev)), bars: series(amount), years: perYear((ts) => sumOrNull(ts.map(amount))) },
    { id: 'qty', value: cur.qtyTon, change: change(cur.qtyTon, prev?.qtyTon ?? null), bars: series((t) => t?.qtyTon ?? null), years: perYear((ts) => sumOrNull(ts.map((t) => t?.qtyTon ?? null))) },
    { id: 'importShare', value: share(cur), change: null, bars: series(share), years: perYear(yearShare) },
    { id: 'rate', value: cur.marketRate, change: change(cur.marketRate, prev?.marketRate ?? null), bars: series((t) => t?.marketRate ?? null), years: perYear((ts) => [...ts].reverse().find((t) => t?.marketRate != null)?.marketRate ?? null) },
  ]
}

// ── «روند خرید مواد اولیه» (§8) ──
export type TrendMode = 'amount' | 'qty' | 'rate'
/** Chips per mode, as indexes into SERIES */
export const TREND_CHIPS: Record<TrendMode, number[]> = { amount: SERIES.map((_, i) => i), qty: [0, 1, 7, 5], rate: [0, 1, 5] }
export const MAX_TREND = 8
export const DEFAULT_TREND_IDS = SERIES.slice(0, 5).map((s) => s.id)

export function trendValue(r: PurchaseRecord | undefined, mode: TrendMode, unit: Unit): number | null {
  if (!r) return null
  if (mode === 'amount') return unit === 'usd' ? r.usdThousand : r.amountMr
  if (mode === 'qty') return r.qty
  return r.rateRial == null ? null : r.rateRial / 1e6
}
export type ChartRow = { month: string } & Record<string, number | string | null | undefined>
/** One row per axis month, a value per series id (null: no point, the line breaks) */
export function trendRows(ds: Dataset, r: Range, mode: TrendMode, unit: Unit, ids: string[]): ChartRow[] {
  return axisMonths(r).map((month) => {
    const row: ChartRow = { month }
    for (const id of ids) row[id] = trendValue(cell(ds, SERIES.find((s) => s.id === id)!.key, month), mode, unit)
    return row
  })
}
<<<<<<< HEAD
/** Fixed design axes in thousand USD; nice ticks from the data in million rial */
export function trendAxis(mode: TrendMode, unit: Unit, rows: ChartRow[], keys: string[]) {
  const top = Math.max(0, ...rows.flatMap((row) => keys.map((k) => Number(row[k] ?? 0))))
  // The spec's fixed scales, unless a point would rise above them
  const fixed = mode === 'qty' ? fixedTicks(50000, 12500) : mode === 'rate' ? fixedTicks(3400, 850) : unit === 'usd' ? fixedTicks(60000, 15000) : null
  return fixed && top <= fixed.max ? fixed : niceTicks(top)
=======
/** Tight nice ticks from the visible rows so lines don't get squashed at the bottom */
export function trendAxis(_mode: TrendMode, _unit: Unit, rows: ChartRow[], keys: string[]) {
  const top = Math.max(0, ...rows.flatMap((row) => keys.map((k) => Number(row[k] ?? 0))))
  return niceTicks(top, 7)
>>>>>>> scm-v1/main
}

// ── «ترکیب خرید مواد اولیه» (§9) ──
export interface CompositionGroup {
  id: string
  label: string
  color: string
  keys: string[]
}
const FIRST7 = SERIES.slice(0, 7)
const g = (i: number): CompositionGroup => ({ id: `g${i}`, label: SERIES[i].label, color: SERIES[i].color, keys: [SERIES[i].key] })
/** Bottom to top, and the legend order */
export const COMPOSITION_GROUPS: CompositionGroup[] = [g(0), g(1), g(2), g(4), g(5), g(6), g(3), { id: 'other', label: 'سایر مواد (خارج از ۷ ماده اول)', color: 'var(--raw-slate-300)', keys: [] }]
export const OTHER_MEMBERS = SERIES.slice(7).map((s) => s.label)
const groupOf = (key: string) => COMPOSITION_GROUPS.find((x) => x.keys.includes(key)) ?? COMPOSITION_GROUPS[COMPOSITION_GROUPS.length - 1]
export const isFirst7 = (key: string) => FIRST7.some((s) => s.key === key)

export type CompositionMode = 'share' | 'amount'
/** One row per axis month: each group's value, or nothing when the month has no data (or no dollar figure) */
export function compositionRows(ds: Dataset, r: Range, mode: CompositionMode, unit: Unit): ChartRow[] {
  return axisMonths(r).map((month) => {
    const row: ChartRow = { month }
    const rows = ds.byMonth.get(month)
    if (!rows) return row
    const useUsd = mode === 'amount' && unit === 'usd'
    if (useUsd && !rows.some((x) => x.usdThousand != null)) return row
    const value = (x: PurchaseRecord) => (useUsd ? x.usdThousand : x.amountMr) ?? 0
    const total = rows.reduce((s, x) => s + value(x), 0)
    if (total <= 0) return row
    for (const grp of COMPOSITION_GROUPS) {
      const v = rows.filter((x) => groupOf(keyOf(x)) === grp).reduce((s, x) => s + value(x), 0)
      row[grp.id] = mode === 'share' ? (v / total) * 100 : v
    }
    return row
  })
}
/**
 * One row per calendar year (the range's last ten): each group's sum over the year's months, or its
 * share of the year's rial total. `months` counts the months that hold a value.
 */
export function compositionYears(ds: Dataset, r: Range, mode: CompositionMode, unit: Unit): ChartRow[] {
  const base = compositionRows(ds, r, 'amount', mode === 'share' ? 'mr' : unit).filter((x) => COMPOSITION_GROUPS.some((g) => x[g.id] != null))
  const years = [...new Set(base.map((x) => yearOf(x.month)))].slice(-10)
  return years.map((year) => {
    const ys = base.filter((x) => yearOf(x.month) === year)
    const row: ChartRow = { month: String(year), months: ys.length }
    const sums = COMPOSITION_GROUPS.map((g) => sum(ys.map((x) => (x[g.id] as number | null | undefined) ?? null)))
    const total = sum(sums)
    COMPOSITION_GROUPS.forEach((g, i) => {
      row[g.id] = mode === 'share' ? (total > 0 ? (sums[i] / total) * 100 : null) : sums[i]
    })
    return row
  })
}
export function compositionAxis(mode: CompositionMode, unit: Unit, rows: ChartRow[], byYear = false) {
  if (byYear && mode === 'amount') return niceTicks(Math.max(0, ...rows.map((row) => COMPOSITION_GROUPS.reduce((s, grp) => s + Number(row[grp.id] ?? 0), 0))))
  if (mode === 'share') return fixedTicks(100, 25)
  if (unit === 'usd') return fixedTicks(100000, 25000)
  return niceTicks(Math.max(0, ...rows.map((row) => COMPOSITION_GROUPS.reduce((s, grp) => s + Number(row[grp.id] ?? 0), 0))))
}

// ── «سهم مواد در …» (§10) ──
/** Both amounts of one row; usd is null when the month has no dollar figure */
export interface ShareAmounts {
  usd: number | null
  mr: number | null
}
export interface ShareItem extends ShareAmounts {
  key: string
  item: string
  unit: string
  color: string
  /** Percent of the month's total in the chosen unit */
  share: number | null
}
export interface ShareGroup extends ShareAmounts {
  source: Source
  share: number | null
  items: ShareItem[]
}
/** Imports first, then domestic; items by the chosen unit, largest first. Null when the month (or its figures in that unit) is missing */
export function shareGroups(ds: Dataset, month: string, unit: Unit): { total: ShareAmounts; groups: ShareGroup[] } | null {
  const recs = ds.byMonth.get(month)
  if (!recs?.length) return null
  const val = (r: PurchaseRecord) => (unit === 'usd' ? r.usdThousand : r.amountMr)
  if (!recs.some((r) => val(r) != null)) return null
  const amounts = (rows: PurchaseRecord[]): ShareAmounts => ({ usd: rows.some((r) => r.usdThousand != null) ? sum(rows.map((r) => r.usdThousand)) : null, mr: sum(rows.map((r) => r.amountMr)) })
  const base = sum(recs.map(val))
  const pc = (v: number | null) => (v != null && base > 0 ? (v / base) * 100 : null)
  const groups = (['وارداتی', 'داخلی'] as const).map((source) => {
    const rows = recs.filter((r) => r.source === source).sort((a, b) => (val(b) ?? 0) - (val(a) ?? 0))
    return {
      source,
      ...amounts(rows),
      share: rows.length ? pc(sum(rows.map(val))) : null,
      items: rows.map((r) => ({ key: keyOf(r), item: r.item, unit: r.unit, color: colorOf(keyOf(r)), usd: r.usdThousand, mr: r.amountMr, share: pc(val(r)) })),
    }
  })
  return { total: amounts(recs), groups }
}

// ── «داخلی و وارداتی» (§11) ──
export type SplitMode = 'amount' | 'share'
export interface SplitRow {
  month: string
  /** Above the axis */
  imp: number | null
  /** Below the axis (negative) */
  dom: number | null
  /** No dollar figure that month: hatched, no bars */
  hatched: boolean
}
export function splitRows(ds: Dataset, r: Range, mode: SplitMode, unit: Unit): SplitRow[] {
  return dataMonthsIn(ds, r).map((month) => {
    const t = totalsOf(ds, month)!
    if (mode === 'amount' && unit === 'mr') return { month, imp: t.mrImport, dom: -t.mrDomestic, hatched: false }
    if (t.usdTotal == null || t.usdImport == null || t.usdDomestic == null) return { month, imp: null, dom: null, hatched: true }
    if (mode === 'share') return t.usdTotal > 0 ? { month, imp: (t.usdImport / t.usdTotal) * 100, dom: -(t.usdDomestic / t.usdTotal) * 100, hatched: false } : { month, imp: null, dom: null, hatched: true }
    return { month, imp: t.usdImport, dom: -t.usdDomestic, hatched: false }
  })
}
/** One row per calendar year: sums of the months; a share year is its imports over its total. `missing`: months with no dollar figure */
export interface SplitYear extends SplitRow {
  year: number
  months: number
  missing: number
}
export function splitYears(ds: Dataset, r: Range, mode: SplitMode, unit: Unit): SplitYear[] {
  const base = splitRows(ds, r, 'amount', mode === 'share' ? 'usd' : unit)
  return [...new Set(base.map((x) => yearOf(x.month)))].map((year) => {
    const rs = base.filter((x) => yearOf(x.month) === year)
    const ok = rs.filter((x) => !x.hatched)
    const row = { month: String(year), year, months: rs.length, missing: rs.length - ok.length }
    if (!ok.length) return { ...row, imp: null, dom: null, hatched: true }
    const imp = sum(ok.map((x) => x.imp))
    const dom = sum(ok.map((x) => x.dom))
    if (mode === 'amount') return { ...row, imp, dom, hatched: false }
    const tot = imp - dom
    return tot > 0 ? { ...row, imp: (imp / tot) * 100, dom: (dom / tot) * 100, hatched: false } : { ...row, imp: null, dom: null, hatched: true }
  })
}
export function splitAxis(mode: SplitMode, unit: Unit, rows: SplitRow[], byYear = false) {
<<<<<<< HEAD
  if (byYear && mode === 'amount') return niceTicks(Math.max(0, ...rows.flatMap((x) => [Math.abs(x.imp ?? 0), Math.abs(x.dom ?? 0)])))
  if (mode === 'share') return fixedTicks(100, 50)
  if (unit === 'usd') return fixedTicks(60000, 20000)
  return niceTicks(Math.max(0, ...rows.flatMap((x) => [Math.abs(x.imp ?? 0), Math.abs(x.dom ?? 0)])))
=======
  if (byYear && mode === 'amount') return niceTicks(Math.max(0, ...rows.flatMap((x) => [Math.abs(x.imp ?? 0), Math.abs(x.dom ?? 0)])), 5)
  if (mode === 'share') return fixedTicks(100, 25)
  if (unit === 'usd') return fixedTicks(60000, 15000)
  return niceTicks(Math.max(0, ...rows.flatMap((x) => [Math.abs(x.imp ?? 0), Math.abs(x.dom ?? 0)])), 5)
>>>>>>> scm-v1/main
}

// ── «تجمعی سال مالی» (§5, §11): a fixed sample until the API exists ──
export const CUMULATIVE = {
  /** Billion rial, one per data month from 1404/02 */
  current: [99000, 107000, 143000, 159000, 179000, 215000, 230000, 242000, 40000, 115000, 131000, 230000, 338000, 421000, 485000, 656000, 755000],
  previous: [60000, 76000, 91000, 103000, 111000, 127000, 135000, 147000, 16000, 28000, 52000, 79000, 99000, 111000, 143000, 159000, 179000],
  /** «رشد تجمعی» of the end month, from the API, not from the arrays */
  growth: 308.9,
}
const CUMULATIVE_MONTHS = Array.from({ length: CUMULATIVE.current.length }, (_, i) => shiftMonth(DATA_START, i))
export function cumulativeRows(ds: Dataset, r: Range): { month: string; cur: number; prev: number }[] {
  return dataMonthsIn(ds, r)
    .map((month) => ({ month, i: CUMULATIVE_MONTHS.indexOf(month) }))
    .filter((x) => x.i >= 0)
    .map(({ month, i }) => ({ month, cur: CUMULATIVE.current[i], prev: CUMULATIVE.previous[i] }))
}

// ── «نرخ خرید: ریالی و دلاری» (§12): one item ──
export interface RateRow {
  month: string
  /** USD per tonne */
  usd: number | null
  /** Million rial per tonne */
  rial: number | null
}
/** Items with a rate in the data (rial or dollar per unit), in series order */
export const rateItems = (ds: Dataset) => SERIES.filter((s) => ds.records.some((x) => keyOf(x) === s.key && (x.rateRial != null || x.usdPerUnit != null)))
export function rateRows(ds: Dataset, r: Range, key: string): RateRow[] {
  return dataMonthsIn(ds, r).map((month) => {
    const x = cell(ds, key, month)
    return { month, usd: x?.usdPerUnit ?? null, rial: x?.rateRial == null ? null : x.rateRial / 1e6 }
  })
}

// ── «تجزیه تغییر مبلغ خرید» (§16): billion rial, always in rial ──
export type BridgeGroupId = 'qtyRate' | 'new' | 'removed' | 'noUnit'
export const BRIDGE_GROUP_LABEL: Record<BridgeGroupId, string> = { qtyRate: 'مقدار و نرخ', new: 'قلم جدید', removed: 'قلم حذف‌شده', noUnit: 'بدون واحد معتبر' }
export interface BridgeRow {
  key: string
  item: string
  source: Source
  unit: string
  p: number
  c: number
  d: number
  q: number | null
  r: number | null
}
export interface BridgeFigures {
  p: number
  c: number
  d: number
  q: number | null
  r: number | null
}
export interface BridgeGroup extends BridgeFigures {
  id: BridgeGroupId
  label: string
  rows: BridgeRow[]
}
export type BridgeStepKey = 'start' | 'qty' | 'rate' | 'new' | 'removed' | 'noUnit' | 'end'
export interface BridgeStep {
  key: BridgeStepKey
  kind: 'total' | 'delta'
  value: number
  from: number
  to: number
}
export interface Bridge {
  base: string
  current: string
  groups: BridgeGroup[]
  total: BridgeFigures & { q: number; r: number }
  steps: BridgeStep[]
}

export function computeBridge(records: PurchaseRecord[], baseMonth: string, currentMonth: string): Bridge {
  if (baseMonth >= currentMonth) throw new RangeError(`base ${baseMonth} must come before current ${currentMonth}`)
  const keys = [...new Set(records.filter((x) => x.month === baseMonth || x.month === currentMonth).map(keyOf))]
  const find = (key: string, m: string) => records.find((x) => x.month === m && keyOf(x) === key)
  const rows: (BridgeRow & { group: BridgeGroupId })[] = []
  for (const key of keys) {
    const b = find(key, baseMonth)
    const c = find(key, currentMonth)
    const any = (x?: PurchaseRecord) => (x?.amountMr ?? 0) > 0 || (x?.qty ?? 0) > 0
    if (!any(b) && !any(c)) continue
    const pA = (b?.amountMr ?? 0) / 1000
    const cA = (c?.amountMr ?? 0) / 1000
    const unit = (c ?? b)!.unit
    let group: BridgeGroupId
    if (pA === 0 && cA > 0) group = 'new'
    else if (pA > 0 && cA === 0) group = 'removed'
    else if (unit === 'تن' && (b?.qty ?? 0) > 0 && (c?.qty ?? 0) > 0 && b?.rateRial != null && b.rateRial > 0 && pA > 0 && cA > 0) group = 'qtyRate'
    else group = 'noUnit'
    const q = group === 'qtyRate' ? ((c!.qty! - b!.qty!) * b!.rateRial!) / 1e9 : null
    const ref = (c ?? b)!
    rows.push({ key, item: ref.item, source: ref.source, unit, p: pA, c: cA, d: cA - pA, q, r: q == null ? null : cA - pA - q, group })
  }
  const groups: BridgeGroup[] = (Object.keys(BRIDGE_GROUP_LABEL) as BridgeGroupId[]).map((id) => {
    const own = rows
      .filter((x) => x.group === id)
      .map(({ group: _g, ...x }) => x)
      .sort((a, b) => Math.abs(b.d) - Math.abs(a.d) || a.item.localeCompare(b.item, 'fa') || a.source.localeCompare(b.source, 'fa'))
    const add = (f: (x: BridgeRow) => number) => own.reduce((s, x) => s + f(x), 0)
    return { id, label: BRIDGE_GROUP_LABEL[id], rows: own, p: add((x) => x.p), c: add((x) => x.c), d: add((x) => x.d), q: id === 'qtyRate' ? add((x) => x.q ?? 0) : null, r: id === 'qtyRate' ? add((x) => x.r ?? 0) : null }
  })
  const byId = (id: BridgeGroupId) => groups.find((x) => x.id === id)!
  const p = groups.reduce((s, x) => s + x.p, 0)
  const c = groups.reduce((s, x) => s + x.c, 0)
  const total = { p, c, d: c - p, q: byId('qtyRate').q ?? 0, r: byId('qtyRate').r ?? 0 }

  const steps: BridgeStep[] = [{ key: 'start', kind: 'total', value: p, from: 0, to: p }]
  let at = p
  const delta = (key: BridgeStepKey, value: number) => {
    steps.push({ key, kind: 'delta', value, from: at, to: at + value })
    at += value
  }
  delta('qty', total.q)
  delta('rate', total.r)
  delta('new', byId('new').d)
  delta('removed', byId('removed').d)
  delta('noUnit', byId('noUnit').d)
  steps.push({ key: 'end', kind: 'total', value: c, from: 0, to: c })

  const deltas = steps.filter((s) => s.kind === 'delta').reduce((s, x) => s + x.value, 0)
  if (Math.abs(deltas - total.d) > 1e-6) throw new Error('bridge: delta steps do not add up to the total change')
  const qr = byId('qtyRate')
  if (Math.abs((qr.q ?? 0) + (qr.r ?? 0) - qr.d) > 1e-6) throw new Error('bridge: quantity and rate effects do not add up')
  return { base: baseMonth, current: currentMonth, groups, total, steps }
}

/** Waterfall axis: step = smallest {1, 2, 5} × 10ⁿ reaching max / 4 */
export function bridgeScale(steps: BridgeStep[]): { step: number; axisMax: number } | null {
  const max = Math.max(0, ...steps.flatMap((s) => [s.from, s.to]))
  if (max <= 0) return null
  const raw = max / 4
  const mag = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 5, 10].map((k) => k * mag).find((s) => s >= raw - 1e-9)!
  return { step, axisMax: Math.ceil(max / step - 1e-9) * step }
}
/** A step's bar measured from the axis zero on the right: offset and width in percent */
export function barGeometry(s: BridgeStep, axisMax: number) {
  const lo = Math.min(s.from, s.to)
  const hi = Math.max(s.from, s.to)
  return { right: (lo / axisMax) * 100, width: Math.max(((hi - lo) / axisMax) * 100, 0.35), lo, hi }
}

/** Default comparison: the end month against the month before */
export const defaultBridgeMonths = (end: string) => ({ base: shiftMonth(end, -1), current: end })

// ── «جدول جزئیات ماهانه» (§13) ──
export const tableRowsOf = (ds: Dataset, r: Range, year: number | null) => ds.records.filter((x) => x.month >= AXIS[r.from] && x.month <= AXIS[r.to] && (year == null || yearOf(x.month) === year))
export function yearCounts(ds: Dataset, r: Range): { year: number; n: number }[] {
  const years = [...new Set(axisMonths(r).map(yearOf))]
  return years.map((year) => ({ year, n: tableRowsOf(ds, r, year).length }))
}
/** Page numbers with «…» gaps */
export function pageItems(page: number, pages: number): (number | '…')[] {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1)
  if (page <= 3) return [1, 2, 3, 4, '…', pages]
  if (page >= pages - 2) return [1, '…', pages - 3, pages - 2, pages - 1, pages]
  return [1, '…', page - 1, page, page + 1, '…', pages]
}

export const TABLE_HEAD = ['ماه', 'ماده', 'بخش', 'مقدار', 'واحد', 'تغییر مقدار', 'نرخ ریالی', 'تغییر نرخ', 'میلیون ریال', 'تغییر مبلغ', 'هزار دلار', 'تغییر دلاری', 'دلار / واحد استاندارد', 'نسخه', 'پیگیری', 'خانه‌ها', 'منبع'] as const
/** UTF-8 with BOM, Persian header, the 17 table columns */
export function toCsv(rows: PurchaseRecord[]): string {
  const esc = (v: string | number | null) => {
    const s = v == null ? '' : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const lines = rows.map((x) => [x.month, x.item, x.source, x.qty, x.unit, x.qtyChangePct, x.rateRial, x.rateChangePct, x.amountMr, x.amountChangePct, x.usdThousand, x.usdChangePct, x.usdPerUnit, x.reportVersion, x.trackingNo, x.cellRange, 'کدال'].map(esc).join(','))
  return `\uFEFF${[TABLE_HEAD.join(','), ...lines].join('\r\n')}`
}
