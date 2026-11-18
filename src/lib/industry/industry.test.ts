import csv from '../../../public/data/purchases_1404-02_1405-06.csv?raw'
import { describe, expect, it } from 'vitest'
import { parseCsv } from './data'
import type { PurchaseRecord } from './data'
import { DEFAULT_RANGE, PRESETS, barGeometry, bridgeScale, computeBridge, cumulativeRows, dataMonthsIn, endMonth, indexRecords, kpisOf, pageItems, shareGroups, tableRowsOf, toCsv, trendRows, yearCounts } from './derive'
import { fa, niceTicks, pct, signed } from './format'
import { AXIS, monthName } from './months'

const records = parseCsv(csv)
const ds = indexRecords(records)
const r1 = (x: number | null | undefined) => (x == null ? x : Math.round(x * 10) / 10)

describe('format (§4)', () => {
  it('writes the spec examples', () => {
    expect(fa(167203.986, 1)).toBe('۱۶۷٬۲۰۴٫۰')
    expect(fa(-81299.3, 1)).toBe('−۸۱٬۲۹۹٫۳')
    expect(signed(382.783, 1)).toBe('+۳۸۲٫۸')
    expect(pct(-41.1, 1)).toBe('−۴۱٫۱٪')
    expect(fa(1924050, 0)).toBe('۱٬۹۲۴٬۰۵۰')
    expect(fa(null)).toBe('—')
    expect(signed(-0.04, 1)).toBe('۰٫۰')
  })
  it('names months', () => {
    expect(monthName('1405/06')).toBe('شهریور ۱۴۰۵')
    expect(AXIS).toHaveLength(126)
    expect([AXIS[0], AXIS[125]]).toEqual(['1395/01', '1405/06'])
    expect([AXIS[DEFAULT_RANGE.from], AXIS[DEFAULT_RANGE.to]]).toEqual(['1402/07', '1405/06'])
  })
  it('nice ticks', () => {
    expect(niceTicks(167204)).toMatchObject({ step: 50000, max: 200000 })
    expect(niceTicks(98)).toMatchObject({ step: 25, max: 100 })
  })
})

describe('data (§5)', () => {
  it('reads 136 rows over 17 months', () => {
    expect(records).toHaveLength(136)
    expect(ds.months).toHaveLength(17)
    expect([ds.months[0], ds.months[16]]).toEqual(['1404/02', '1405/06'])
  })
})

describe('KPI (§7)', () => {
  const k = kpisOf(ds, DEFAULT_RANGE, 'usd')!
  it('reads the end month', () => {
    expect(fa(k[0].value, 1)).toBe('۵۱٬۱۸۴٫۴')
    expect(pct(k[0].change, 1)).toBe('−۴۱٫۱٪')
    expect(fa(k[1].value, 0)).toBe('۳۴٬۰۸۷')
    expect(pct(k[1].change, 1)).toBe('−۴۵٫۱٪')
    expect(fa(k[2].value, 1)).toBe('۵۹٫۲')
    expect(k[2].change).toBeNull()
    expect(fa(k[3].value, 0)).toBe('۱٬۹۲۴٬۰۵۰')
    expect(Math.abs(k[3].change!)).toBeLessThan(0.05)
  })
  it('has one bar per month with data, null where there is no dollar figure', () => {
    expect(k[0].bars).toHaveLength(17)
    expect(k[0].bars.slice(0, 2)).toEqual([null, null])
  })
})

describe('filter (§5)', () => {
  it('presets count back from the last month', () => {
    const months = (id: string) =>
      dataMonthsIn(
        ds,
        PRESETS.find((x) => x.id === id)!,
      )
    expect(months('1m')).toEqual(['1405/06'])
    expect(months('3m')).toEqual(['1405/04', '1405/05', '1405/06'])
    expect(months('6m')).toHaveLength(6)
    expect(months('1y')[0]).toBe('1404/07')
    expect(months('1y')).toHaveLength(12)
    expect(months('all')).toHaveLength(17)
    expect(months('3y')).toHaveLength(17)
    expect(
      endMonth(
        ds,
        PRESETS.find((x) => x.id === '1y')!,
      ),
    ).toBe('1405/06')
  })
  it('a range with no data leaves every card empty', () => {
    const empty = { from: 0, to: 10 }
    expect(endMonth(ds, empty)).toBeNull()
    expect(kpisOf(ds, empty, 'usd')).toBeNull()
    expect(cumulativeRows(ds, empty)).toEqual([])
    expect(tableRowsOf(ds, empty, null)).toEqual([])
  })
  it('trend rows span every axis month, empty where there is no data', () => {
    const rows = trendRows(ds, DEFAULT_RANGE, 'amount', 'usd', ['s0'])
    expect(rows).toHaveLength(36)
    expect(
      trendRows(
        ds,
        PRESETS.find((x) => x.id === 'all')!,
        'amount',
        'usd',
        ['s0'],
      ),
    ).toHaveLength(126)
    expect(rows[0].s0).toBeNull()
  })
})

describe('«سهم مواد» (§10)', () => {
  it('ranks 1405/06 by USD', () => {
    const s = shareGroups(ds, '1405/06', 'usd')!
    const [imp, dom] = s.groups
    expect(imp.source).toBe('وارداتی')
    expect(imp.items[0]).toMatchObject({ item: 'روغن خام', unit: 'تن', usd: 29110.7, mr: 56010394 })
    expect(r1(imp.items[0].share)).toBe(56.9)
    expect(dom.items[0]).toMatchObject({ item: 'روغن خام', usd: 19171, mr: 36885963 })
    expect(r1(dom.items[0].share)).toBe(37.5)
    expect(fa(s.total.usd, 1)).toBe('۵۱٬۱۸۴٫۴')
    expect(r1(imp.share)).toBe(59.2)
    expect(r1(dom.share)).toBe(40.8)
    expect([imp.items.length, dom.items.length]).toEqual([3, 6])
    const m = shareGroups(ds, '1405/06', 'mr')!
    expect(fa(s.total.mr, 0)).toBe('۹۸٬۴۸۱٬۳۴۹')
    expect(m.groups[0].items[0].mr).toBe(56010394)
  })
})

describe('computeBridge (§16)', () => {
  const b = computeBridge(records, '1405/05', '1405/06')
  const g = (id: string) => b.groups.find((x) => x.id === id)!
  it('totals', () => {
    expect([b.total.p, b.total.c, b.total.d, b.total.q, b.total.r].map(r1)).toEqual([167204.0, 98481.3, -68722.6, -81299.3, 13533.7])
  })
  it('quantity and rate', () => {
    const q = g('qtyRate')
    expect([q.p, q.c, q.d, q.q, q.r].map(r1)).toEqual([160661.9, 92896.4, -67765.6, -81299.3, 13533.7])
    expect(q.rows.map((x) => [x.source, ...[x.p, x.c, x.d, x.q, x.r].map(r1)])).toEqual([
      ['وارداتی', 102728.9, 56010.4, -46718.5, -57067.9, 10349.4],
      ['داخلی', 57933.0, 36886.0, -21047.0, -24231.4, 3184.3],
    ])
  })
  it('new, removed, no unit', () => {
    const n = g('new')
    expect([n.p, n.c, n.d].map(r1)).toEqual([0, 382.8, 382.8])
    expect(n.rows.map((x) => [x.item, r1(x.c)])).toEqual([
      ['رب گوجه فرنگی فله', 285.8],
      ['مواد شیمیایی', 97.0],
    ])
    expect(g('removed')).toMatchObject({ p: 0, c: 0, d: 0, rows: [] })
    const u = g('noUnit')
    expect([u.p, u.c, u.d].map(r1)).toEqual([6542.1, 5202.2, -1339.9])
    expect(u.rows.map((x) => [x.item, x.source, r1(x.d)])).toEqual([
      ['لوازم بسته بندی', 'داخلی', -3057.8],
      ['لوازم بسته بندی', 'وارداتی', 2154.7],
      ['مواد شیمیایی', 'داخلی', -436.8],
      ['روغن کارمزدی', 'داخلی', 0],
    ])
    expect(u.q).toBeNull()
  })
  it('steps chain from the base total to the current total', () => {
    expect(b.steps.map((s) => s.key)).toEqual(['start', 'qty', 'rate', 'new', 'removed', 'noUnit', 'end'])
    const deltas = b.steps.filter((s) => s.kind === 'delta')
    expect(deltas.reduce((s, x) => s + x.value, 0)).toBeCloseTo(b.total.d, 6)
    expect(deltas[deltas.length - 1].to).toBeCloseTo(b.total.c, 6)
  })
  it('waterfall geometry', () => {
    const sc = bridgeScale(b.steps)!
    expect(sc).toEqual({ step: 50000, axisMax: 200000 })
    const qty = barGeometry(b.steps[1], sc.axisMax)
    expect(qty.right.toFixed(2)).toBe('42.95')
    expect(qty.width.toFixed(2)).toBe('40.65')
    const start = barGeometry(b.steps[0], sc.axisMax)
    expect([start.right, start.width.toFixed(2)]).toEqual([0, '83.60'])
  })
  it('refuses a base on or after the current month', () => {
    expect(() => computeBridge(records, '1405/06', '1405/06')).toThrow(RangeError)
    expect(() => computeBridge(records, '1405/06', '1405/05')).toThrow(RangeError)
  })
  it('empty input: zeros, groups without rows', () => {
    const e = computeBridge([], '1405/05', '1405/06')
    expect(e.groups.map((x) => x.rows.length)).toEqual([0, 0, 0, 0])
    expect(e.total).toEqual({ p: 0, c: 0, d: 0, q: 0, r: 0 })
    expect(bridgeScale(e.steps)).toBeNull()
  })
  it('everything removed: a negative removed group and nothing current', () => {
    const only = records.filter((x) => x.month === '1405/05')
    const e = computeBridge(only, '1405/05', '1405/06')
    const rem = e.groups.find((x) => x.id === 'removed')!
    expect(rem.d).toBeLessThan(0)
    expect(e.total.c).toBe(0)
  })
})

describe('table (§13)', () => {
  it('counts rows per year and pages with gaps', () => {
    expect(yearCounts(ds, DEFAULT_RANGE)).toEqual([
      { year: 1402, n: 0 },
      { year: 1403, n: 0 },
      { year: 1404, n: 87 },
      { year: 1405, n: 49 },
    ])
    expect(pageItems(1, 5)).toEqual([1, 2, 3, 4, 5])
    expect(pageItems(2, 14)).toEqual([1, 2, 3, 4, '…', 14])
    expect(pageItems(13, 14)).toEqual([1, '…', 11, 12, 13, 14])
    expect(pageItems(7, 14)).toEqual([1, '…', 6, 7, 8, '…', 14])
  })
  it('exports CSV with BOM and a Persian header', () => {
    const csv = toCsv(records.slice(0, 2) as PurchaseRecord[])
    expect(csv.startsWith('\uFEFFماه,ماده,بخش')).toBe(true)
    expect(csv.split('\r\n')).toHaveLength(3)
  })
})

describe('sample history (owner request, labelled «نمونه»)', () => {
  it('fills 1395/01 to 1404/01 only, every row flagged, the same on every load', async () => {
    const { sampleHistory, SAMPLE_BEFORE } = await import('./sample')
    const a = sampleHistory(records)
    const b = sampleHistory(records)
    expect(a.length).toBeGreaterThan(500)
    expect(a).toEqual(b)
    expect(a.every((r) => r.sample && r.reportVersion === 'نمونه' && r.trackingNo == null && r.month < SAMPLE_BEFORE && r.month >= '1395/01')).toBe(true)
    expect(a.every((r) => (r.amountMr ?? 0) > 0 && (r.usdThousand ?? 0) > 0)).toBe(true)
  })
})
