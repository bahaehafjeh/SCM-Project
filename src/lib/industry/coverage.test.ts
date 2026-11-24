import csv from '../../../public/data/purchases_1404-02_1405-06.csv?raw'
import { describe, expect, it } from 'vitest'
import { parseCsv } from './data'
import { indexRecords } from './derive'
import { sampleHistory } from './sample'
import { buildCoverageModel, COVERAGE_MONTHS, COVERAGE_TABLES, COVERAGE_YEARS } from './coverage'
import { fa } from './format'
import { DATA_SYMBOL, SYMBOLS } from './symbols'

const real = parseCsv(csv)
const ds = indexRecords([...real, ...sampleHistory(real)])

describe('«پوشش داده و کنترل کیفیت»', () => {
  const model = buildCoverageModel(ds)

  it('covers 3 symbols, 120 months (1395/07 to 1405/06), 11 calendar years, and 4 tables', () => {
    expect(SYMBOLS).toHaveLength(3)
    expect(COVERAGE_MONTHS).toHaveLength(120)
    expect(COVERAGE_MONTHS[0]).toBe('1395/07')
    expect(COVERAGE_MONTHS[COVERAGE_MONTHS.length - 1]).toBe('1405/06')
    expect(COVERAGE_YEARS).toHaveLength(11)
    expect(COVERAGE_TABLES).toHaveLength(4)
  })

  it('matches exact KPI totals and 12-row table summary across the 1,440 symbol × month × table cells', () => {
    expect(model.summary.symbolCount).toBe(3)
    expect(model.summary.monthCount).toBe(120)
    expect(model.summary.totalCells).toBe(1440)
    expect(model.summary.extractedCells).toBe(599)
    expect(fa(model.summary.extractedPct, 1)).toBe('۴۱٫۶')
    expect(model.summary.totalReports).toBe(425)
    expect(model.summary.multiVersionMonths).toBe(53)
    expect(model.summary.failedChecks).toBe(12)
    expect(model.summary.discontinuities).toBe(250)
    expect(model.tableSummaryRows).toHaveLength(12)
    expect(model.nonExtractedCells).toHaveLength(841)
  })

  it('reflects real غبشهر CSV purchases coverage and stored check logs such as غگل 1396/07', () => {
    const purchases = model.tables.find((t) => t.table.id === 'purchases')!
    const ghab = purchases.rows.find((r) => r.symbol === DATA_SYMBOL)!
    const y1404 = ghab.years.find((y) => y.year === 1404)!
    const m02 = y1404.months.find((m) => m.month === '1404/02')!
    const m04 = y1404.months.find((m) => m.month === '1404/04')!
    expect(m02.status).toBe('extracted')
    expect(m02.checkDetail).toBeTruthy()
    expect(m04.status).toBe('extracted')
    expect(m04.isRealCsv).toBe(true)
    expect(m04.rowCount).toBeGreaterThan(0)

    const sales = model.tables.find((t) => t.table.id === 'sales')!
    const gogl = sales.rows.find((r) => r.shortName === 'غگل')!
    const y1396 = gogl.years.find((y) => y.year === 1396)!
    const m9607 = y1396.months.find((m) => m.month === '1396/07')!
    expect(m9607.status).toBe('extracted')
    expect(m9607.checkDetail).toContain("No module named 'xlrd'")
  })
})
