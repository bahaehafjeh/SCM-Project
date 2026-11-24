import csv from '../../../public/data/purchases_1404-02_1405-06.csv?raw'
import { describe, expect, it } from 'vitest'
import { parseCsv } from './data'
import { DEFAULT_RANGE, indexRecords } from './derive'
import { sampleHistory } from './sample'
<<<<<<< HEAD
import { salesRecords, salesYearCounts, SALES_PRODUCTS, productValue, topProducts, salesCsv, salesTableRows, compareYears, fiscalLines, fiscalStart, fiscalYearOf, monthOfYear, salesKpis, sampleSales, yearCompareRows, yearMonthNames } from './sales'
=======
import { monthlySalesRows, PROD_SALES_PRODUCTS, productionVsSalesRows, salesRecords, salesYearCounts, SALES_PRODUCTS, productValue, topProducts, salesCsv, salesTableRows, compareYears, fiscalLines, fiscalStart, fiscalYearOf, monthOfYear, salesKpis, sampleSales, yearCompareRows, yearMonthNames } from './sales'
>>>>>>> scm-v1/main

const real = parseCsv(csv)
const ds = indexRecords([...real, ...sampleHistory(real)])
const sales = sampleSales(ds)

describe('sales sample', () => {
  it('has one sample row per purchase month, the same on every build', () => {
    expect(sales.months).toEqual(ds.months)
    expect([...sales.byMonth.values()].every((x) => x.sample)).toBe(true)
    expect(sampleSales(ds).byMonth.get('1405/06')).toEqual(sales.byMonth.get('1405/06'))
  })
  it('net = domestic + export + services − returns', () => {
    const x = sales.byMonth.get('1405/06')!
    expect(Math.abs(x.domestic + x.export + x.services - x.returns - x.net)).toBeLessThanOrEqual(2)
  })
})

describe('fiscal year (دی → آذر)', () => {
  it('names a fiscal year by the year it ends in', () => {
    expect(fiscalYearOf('1404/10')).toBe(1405)
    expect(fiscalYearOf('1405/09')).toBe(1405)
    expect(fiscalStart(1405)).toBe('1404/10')
    expect(monthOfYear(1405, 0, 'fiscal')).toBe('1404/10')
    expect(monthOfYear(1405, 11, 'fiscal')).toBe('1405/09')
    expect(monthOfYear(1405, 0, 'calendar')).toBe('1405/01')
    expect(yearMonthNames('fiscal')[0]).toBe('دی')
    expect(yearMonthNames('calendar')[0]).toBe('فروردین')
  })
  it('accumulates the fiscal year to the end month', () => {
    const f = fiscalLines(sales, '1405/06', 'mr')
    expect(f.fy).toBe(1405)
    expect(f.upTo).toBe(8)
    const sum = Array.from({ length: 9 }, (_, i) => sales.byMonth.get(f.labels[i])!.net).reduce((a, x) => a + x, 0)
    expect(f.cur[8]).toBeCloseTo(sum / 1e3, 6)
  })
  it('leaves a dollar cumulative empty when a month has no rate (missing is not zero)', () => {
    // 1404/02 and 1404/03 have no dollar figure in the purchase file
    expect(fiscalLines(sales, '1404/06', 'usd').cur[8]).toBeNull()
  })
})

describe('sales KPI and year comparison', () => {
  it('reads the end month of the range', () => {
    const r = salesKpis(sales, ds, DEFAULT_RANGE, 'mr')!
    const net = r.kpis.find((k) => k.id === 'net')!
    expect(net.value).toBe(sales.byMonth.get('1405/06')!.net / 1e3)
    const yoy = r.kpis.find((k) => k.id === 'yoy')!
    expect(yoy.value).toBeCloseTo((sales.byMonth.get('1405/06')!.net / sales.byMonth.get('1404/06')!.net - 1) * 100, 6)
  })
  it('compares five years and leaves months after the end empty', () => {
    expect(compareYears('1405/06', 'fiscal')).toEqual([1405, 1404, 1403, 1402, 1401])
    const rows = yearCompareRows(sales, '1405/06', 'fiscal', 'mr', [1405])
    expect(rows).toHaveLength(12)
    expect(rows[8].y1405).toBe(sales.byMonth.get('1405/06')!.net / 1e3)
    expect(rows[9].y1405).toBeNull()
  })
})

describe('«تحلیل فروش» table', () => {
  it('splits each type total over its products', () => {
    const x = sales.byMonth.get('1405/06')!
    const sumOf = (t: string) => x.items.filter((i) => i.type === t).reduce((a, i) => a + i.mr, 0)
    expect(Math.abs(sumOf('فروش داخلی') - x.domestic)).toBeLessThanOrEqual(10)
    expect(Math.abs(sumOf('صادراتی') - x.export)).toBeLessThanOrEqual(10)
    expect(Math.abs(sumOf('خدمات') - x.services)).toBeLessThanOrEqual(10)
  })
  it('compares the end month with the month before and a year earlier; shares add to 100', () => {
    const rows = salesTableRows(sales, '1405/06', 'amount', 'mr')
    const r = rows[0]
    const it = (m: string) => sales.byMonth.get(m)!.items.find((i) => i.key === r.key)!.mr / 1e3
    expect(r.cur).toBe(it('1405/06'))
    expect(r.prev).toBe(it('1405/05'))
    expect(r.yearAgo).toBe(it('1404/06'))
    expect(rows.reduce((a, x) => a + (x.share ?? 0), 0)).toBeCloseTo(100, 0)
  })
  it('writes a CSV with a byte-order mark and one line per product', () => {
    const rows = salesTableRows(sales, '1405/06', 'qty', 'mr')
    const text = salesCsv(rows, '1405/06', 'qty', 'mr')
    expect(text.charCodeAt(0)).toBe(0xfeff)
    expect(text.split('\n')).toHaveLength(rows.length + 1)
  })
})

describe('«تغییرات نرخ فروش محصولات»', () => {
  const months = ['1405/04', '1405/05', '1405/06']
  it('reads rate as amount over quantity, and leaves it empty without a quantity', () => {
    const it0 = sales.byMonth.get('1405/06')!.items[0]
    expect(productValue(sales, '1405/06', it0.key, 'rate', 'mr')).toBeCloseTo(it0.mr / it0.qty, 6)
    expect(productValue(sales, '1405/06', 'نیست|فروش داخلی', 'rate', 'mr')).toBeNull()
  })
  it('picks the leading products by amount or by quantity', () => {
    const top3 = topProducts(sales, months, 'amount', 3)
    expect(top3).toHaveLength(3)
    const amt = (k: string) => months.reduce((a, m) => a + sales.byMonth.get(m)!.items.find((i) => i.key === k)!.mr, 0)
    expect(amt(top3[0])).toBeGreaterThanOrEqual(amt(top3[1]))
    expect(topProducts(sales, months, 'qty', 5)).toHaveLength(5)
    expect(SALES_PRODUCTS.filter((p) => p.label.includes('صادراتی'))).toHaveLength(2)
  })
})

describe('«جزئیات فروش در بازه»', () => {
  it('lists the range newest first, skips empty rows and compares with the same product a month earlier', () => {
    const rows = salesRecords(sales, ds, DEFAULT_RANGE, null)
    expect(rows[0].month).toBe('1405/06')
    expect(rows.every((r) => r.amountBr > 0 || r.qty > 0)).toBe(true)
    const r = rows[0]
    const before = sales.byMonth.get('1405/05')!.items.find((i) => i.key === r.key)!
    expect(r.amountChangePct).toBeCloseTo(((r.amountBr * 1e3) / before.mr - 1) * 100, 6)
  })
  it('counts rows per year and filters by year', () => {
    const counts = salesYearCounts(sales, ds, DEFAULT_RANGE)
    const total = counts.reduce((a, y) => a + y.n, 0)
    expect(total).toBe(salesRecords(sales, ds, DEFAULT_RANGE, null).length)
    expect(salesRecords(sales, ds, DEFAULT_RANGE, 1404).every((x) => x.month.startsWith('1404'))).toBe(true)
  })
})
<<<<<<< HEAD
=======

describe('«فروش ماهانه» & «تولید در برابر فروش»', () => {
  it('breaks monthly sales into positive streams and negative returns + discounts', () => {
    const rows = monthlySalesRows(sales, ds, DEFAULT_RANGE, 'mr', 'monthly')
    const last = rows[rows.length - 1]
    const raw = sales.byMonth.get(last.month)!
    expect(last.domestic).toBeCloseTo(raw.domestic / 1e3, 4)
    expect(last.returns!).toBeLessThanOrEqual(0)
    expect(last.discounts!).toBeLessThanOrEqual(0)
    expect(Math.abs(last.returns! + last.discounts!) * 1e3).toBeCloseTo(raw.returns, 1)

    const cum = monthlySalesRows(sales, ds, DEFAULT_RANGE, 'mr', 'cumulative')
    const decIdx = cum.findIndex((r) => r.month === '1404/10')
    expect(cum[decIdx].domestic).toBeCloseTo(rows[decIdx].domestic!, 4)
  })

  it('follows the range: monthly for <= 24 months and yearly for 3y / 10y', () => {
    const prod = PROD_SALES_PRODUCTS[0].value
    const yr = productionVsSalesRows(sales, ds, DEFAULT_RANGE, prod)
    expect(yr.byYear).toBe(true)
    expect(yr.rows.length).toBeGreaterThanOrEqual(3)
    for (const r of yr.rows) {
      expect(r.sales).toBe(r.domestic + r.export)
      expect(r.production).toBeGreaterThan(0)
    }
    const shortRange = { from: DEFAULT_RANGE.to - 5, to: DEFAULT_RANGE.to }
    const mo = productionVsSalesRows(sales, ds, shortRange, prod)
    expect(mo.byYear).toBe(false)
    expect(mo.rows).toHaveLength(6)
    expect(mo.rows[mo.rows.length - 1].topLabel).toBe('۱۴۰۵')
  })
})
>>>>>>> scm-v1/main
