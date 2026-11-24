import csv from '../../../public/data/purchases_1404-02_1405-06.csv?raw'
import { describe, expect, it } from 'vitest'
import { parseCsv } from './data'
import { DEFAULT_RANGE, indexRecords, totalsOf } from './derive'
import { sampleHistory } from './sample'
import { fxSeries } from './fx'
import { fxBalanceRows, fxBalanceYears, fxCsv, fxKpis, fxRecords, fxTableRows, fxUseTrendRows, fxYearCounts } from './fxflows'
import { sampleSales } from './sales'

const real = parseCsv(csv)
const ds = indexRecords([...real, ...sampleHistory(real)])
const fx = fxSeries(ds)
const sales = sampleSales(ds)
const rows = fxRecords(ds, fx, (m) => sales.byMonth.get(m)?.export ?? null)

describe('«منابع و مصارف ارزی»', () => {
  it('splits the imported purchases of a month over its use rows, and the export sales over its source rows', () => {
    const m = '1405/06'
    const uses = rows.filter((x) => x.month === m && x.section === 'مصارف' && x.item === 'خرید مواد اولیه').reduce((a, x) => a + x.amountMr, 0)
    expect(Math.abs(uses - totalsOf(ds, m)!.mrImport)).toBeLessThanOrEqual(3)
    const src = rows.filter((x) => x.month === m && x.section === 'منابع').reduce((a, x) => a + x.amountMr, 0)
    expect(Math.abs(src - sales.byMonth.get(m)!.export)).toBeLessThanOrEqual(2)
  })
  it('leaves the currency amount and rate empty in a month without a rate', () => {
    const r = rows.find((x) => x.month === '1404/02')!
    expect(r.rate).toBeNull()
    expect(r.amountFx).toBeNull()
  })
  it('reads the KPI of the end month; the ratio is the reported dollar rate over the market', () => {
    const res = fxKpis(rows, fx, ds, DEFAULT_RANGE)!
    const k = (id: string) => res.kpis.find((x) => x.id === id)!
    expect(k('uses').value).toBeCloseTo(rows.filter((x) => x.month === '1405/06' && x.section === 'مصارف').reduce((a, x) => a + x.amountMr, 0) / 1e3, 6)
    expect(k('ratio').value).toBeCloseTo((k('usdRate').value! / fx.get('1405/06')!.market!) * 100, 6)
  })
  it('lists the range newest first, counts rows per year and writes a CSV', () => {
    const t = fxTableRows(rows, ds, DEFAULT_RANGE, null)
    expect(t[0].month).toBe('1405/06')
    expect(fxYearCounts(rows, ds, DEFAULT_RANGE).reduce((a, y) => a + y.n, 0)).toBe(t.length)
    expect(fxCsv(t).split('\n')).toHaveLength(t.length + 1)
  })
  it('builds 4-item FX use trends honoring global unit and keeping missing USD months null', () => {
    const usd = fxUseTrendRows(rows, ds, DEFAULT_RANGE, 'amount', 'usd')
    const mr = fxUseTrendRows(rows, ds, DEFAULT_RANGE, 'amount', 'mr')
    const m1404_02_usd = usd.find((x) => x.month === '1404/02')!
    const m1404_02_mr = mr.find((x) => x.month === '1404/02')!
    expect(m1404_02_usd['raw-USD']).toBeNull()
    expect(m1404_02_mr['raw-USD']).toBeGreaterThan(0)
  })
  it('computes monthly and yearly FX balance keeping full sources and uses with hatched gap extensions', () => {
    const monthly = fxBalanceRows(rows, ds, DEFAULT_RANGE, 'mr')
    const end = monthly.find((x) => x.month === '1405/06')!
    expect(end.hatched).toBe(false)
    expect(end.surplus).toBeCloseTo(Math.max(0, (end.sources ?? 0) - (end.uses ?? 0)), 6)
    expect(end.deficit).toBeCloseTo(Math.max(0, (end.uses ?? 0) - (end.sources ?? 0)), 6)
    const maxSide = Math.max(end.sources ?? 0, end.uses ?? 0)
    expect((end.sources ?? 0) + (end.deficit ?? 0)).toBeCloseTo(maxSide, 6)
    expect((end.uses ?? 0) + (end.surplus ?? 0)).toBeCloseTo(maxSide, 6)
    expect(end.net).toBeCloseTo((end.sources ?? 0) - (end.uses ?? 0), 6)
    const years = fxBalanceYears(monthly)
    expect(years.length).toBeGreaterThan(1)
    expect(years.every((y) => !y.hatched && y.net != null)).toBe(true)
  })
})

describe('the rate KPI and the rate chart agree', () => {
  it('reads the reported dollar rate as the company rate', () => {
    const res = fxKpis(rows, fx, ds, DEFAULT_RANGE)!
    expect(res.kpis.find((x) => x.id === 'usdRate')!.value).toBeCloseTo(fx.get('1405/06')!.company!, 6)
  })
})
