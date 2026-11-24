import csv from '../../../public/data/purchases_1404-02_1405-06.csv?raw'
import { describe, expect, it } from 'vitest'
import { parseCsv } from './data'
import { DEFAULT_RANGE, indexRecords } from './derive'
import { sampleHistory } from './sample'
import {
  DEFAULT_ENERGY_KEYS,
  ENERGY_CARRIERS,
  carrierValue,
  codalEnergyForecast,
  energyBreakdownRows,
  energyBreakdownYears,
  energyForecast,
  energyForecastCsv,
  energyKpis,
  energyRecords,
  energyRecordsCsv,
  energyTrendSeries,
  energyTrendSummary,
  energyYearCompareRows,
  energyYearCounts,
  sampleEnergy,
} from './energy'

const real = parseCsv(csv)
const ds = indexRecords([...real, ...sampleHistory(real)])
const energy = sampleEnergy(ds)

describe('energy sample', () => {
  it('generates one deterministic sample row per purchase month with 5 carriers', () => {
    expect(energy.months).toEqual(ds.months)
    expect([...energy.byMonth.values()].every((x) => x.sample && x.items.length === ENERGY_CARRIERS.length)).toBe(true)
    expect(sampleEnergy(ds).byMonth.get('1405/06')).toEqual(energy.byMonth.get('1405/06'))
  })

  it('keeps totalMr equal to the sum of carrier items and preserves missing FX rates as null', () => {
    const end = energy.byMonth.get('1405/06')!
    expect(end.totalMr).toBe(end.items.reduce((a, it) => a + it.mr, 0))
    expect(energy.byMonth.get('1404/02')!.rate).toBeNull()
    expect(carrierValue(energy, '1404/02', 'gas', 'cost', 'usd')).toBeNull()
    expect(carrierValue(energy, '1404/02', 'gas', 'qty', 'usd')).toBeGreaterThan(0)
  })
})

describe('energy KPIs & fiscal water lines', () => {
  it('computes all 4 KPIs on the end month and accumulates well water over the fiscal year', () => {
    const res = energyKpis(energy, ds, DEFAULT_RANGE, 'mr')!
    expect(res.kpis.map((k) => k.id)).toEqual(['totalCost', 'gas', 'electricity', 'wellWater'])
    const total = res.kpis.find((k) => k.id === 'totalCost')!
    expect(total.value).toBeCloseTo(energy.byMonth.get('1405/06')!.totalMr / 1e3, 6)
    expect(res.waterFiscal.fy).toBe(1405)
    expect(res.waterFiscal.upTo).toBe(8)
    const waterSum = Array.from({ length: 9 }, (_, i) => {
      const m = res.waterFiscal.labels[i]
      return energy.byMonth.get(m)!.items.find((x) => x.key === 'wellWater')!.qty
    }).reduce((a, x) => a + x, 0)
    expect(res.waterFiscal.cur[8]).toBe(waterSum)
  })
})

describe('energy trend & year comparison', () => {
  const months = ['1405/04', '1405/05', '1405/06']

  it('keeps cost unnormalized and normalizes heterogeneous units in qty/rate modes', () => {
    const cost = energyTrendSeries(energy, months, 'cost', 'mr', DEFAULT_ENERGY_KEYS)
    expect(cost.normalized).toBe(false)

    const mixedQty = energyTrendSeries(energy, months, 'qty', 'mr', ['gas', 'electricity'])
    expect(mixedQty.normalized).toBe(true)
    expect(mixedQty.chartRows[0].gas).toBeCloseTo(100, 6)
    expect(mixedQty.chartRows[0].electricity).toBeCloseTo(100, 6)
    expect(mixedQty.rawRows[0].gas).toBe(energy.byMonth.get('1405/04')!.items.find((x) => x.key === 'gas')!.qty)

    const sameUnitQty = energyTrendSeries(energy, months, 'qty', 'mr', ['gas', 'wellWater'])
    expect(sameUnitQty.normalized).toBe(false)
    expect(sameUnitQty.unitLabel).toBe('مترمکعب')
  })

  it('computes summary shares adding toward 100% across all carriers', () => {
    const allKeys = ENERGY_CARRIERS.map((c) => c.key)
    const rows = energyTrendSummary(energy, '1405/06', allKeys, 'mr')
    expect(rows).toHaveLength(ENERGY_CARRIERS.length)
    expect(rows.reduce((a, r) => a + (r.share ?? 0), 0)).toBeCloseTo(100, 1)
  })

  it('builds 12 fiscal rows and leaves months after end null', () => {
    const rows = energyYearCompareRows(energy, '1405/06', 'mr', [1405, 1404])
    expect(rows).toHaveLength(12)
    expect(rows[8].y1405).toBeCloseTo(energy.byMonth.get('1405/06')!.totalMr / 1e3, 6)
    expect(rows[9].y1405).toBeNull()
  })
})

describe('energy breakdown, forecast & details CSV', () => {
  it('breaks down each month across carriers and preserves missing USD rates', () => {
    const rows = energyBreakdownRows(energy, ds, DEFAULT_RANGE, 'usd')
    const missing = rows.find((r) => r.month === '1404/02')!
    expect(missing.missingRate).toBe(true)
    expect(missing.total).toBeNull()
    const ok = rows.find((r) => r.month === '1405/06')!
    expect(ok.missingRate).toBe(false)
    const parts = (ok.gas ?? 0) + (ok.electricity ?? 0) + (ok.diesel ?? 0) + (ok.wellWater ?? 0) + (ok.pipedWater ?? 0)
    expect(parts).toBeCloseTo(ok.total!, 4)

    const yrs = energyBreakdownYears(energy, ds, DEFAULT_RANGE, 'mr')
    expect(yrs.length).toBeGreaterThanOrEqual(3)
    expect(yrs[yrs.length - 1].year).toBe(1405)
  })

  it('returns Codal-reported physical energy forecast rows with ytd + rem = full', () => {
    const cf = codalEnergyForecast(energy, '1405/06')!
    expect(cf.rows.map((r) => r.key)).toEqual(['gas', 'electricity', 'wellWater'])
    expect(cf.rows[0].ytdQty).toBe(33_961_424)
    expect(cf.rows[0].remQty).toBe(60_000_000)
    expect(cf.rows[0].fullQty).toBe(93_961_424)
    expect(cf.rows[1].fullQty).toBe(78_923)
    expect(cf.rows[2].fullQty).toBe(2_643_001)
  })

  it('projects remaining fiscal months so ytd + rem = fullYear and exports UTF-8 BOM CSV', () => {
    const f = energyForecast(energy, '1405/06', 'mr')!
    expect(f.fy).toBe(1405)
    expect(f.elapsedMonths).toBe(9)
    expect(f.remainingMonths).toBe(3)
    expect(f.ytdTotalCost! + f.remTotalCost!).toBeCloseTo(f.fullTotalCost!, 6)
    const csvText = energyForecastCsv(f, 'mr')
    expect(csvText.charCodeAt(0)).toBe(0xfeff)
    expect(csvText.split('\n')).toHaveLength(f.items.length + 1)
  })

  it('orders detail records newest month first and filters by year cleanly', () => {
    const all = energyRecords(energy, ds, DEFAULT_RANGE, null)
    expect(all[0].month).toBe('1405/06')
    const counts = energyYearCounts(energy, ds, DEFAULT_RANGE)
    expect(counts.reduce((a, c) => a + c.n, 0)).toBe(all.length)
    expect(energyRecords(energy, ds, DEFAULT_RANGE, 1404).every((r) => r.month.startsWith('1404'))).toBe(true)
    const csvText = energyRecordsCsv(all.slice(0, 5))
    expect(csvText.charCodeAt(0)).toBe(0xfeff)
    expect(csvText.split('\n')).toHaveLength(6)
  })
})
