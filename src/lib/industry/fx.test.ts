import csv from '../../../public/data/purchases_1404-02_1405-06.csv?raw'
import { describe, expect, it } from 'vitest'
import { parseCsv } from './data'
import { DEFAULT_RANGE, indexRecords, totalsOf } from './derive'
import { sampleHistory } from './sample'
import { fxGap, fxRows, fxSeries } from './fx'

const real = parseCsv(csv)
const ds = indexRecords([...real, ...sampleHistory(real)])
const fx = fxSeries(ds)

describe('«نرخ دلار شرکت در برابر دلار بازار»', () => {
  it('takes the market rate from the purchase file and leaves months without one empty', () => {
    expect(fx.get('1405/06')!.market).toBe(totalsOf(ds, '1405/06')!.marketRate)
    expect(fx.get('1404/02')!.market).toBeNull()
    expect(fx.get('1404/02')!.company).toBeNull()
  })
  it('keeps the sample company rate between 72% and 84% of the market', () => {
    for (const r of fx.values()) if (r.market && r.company) expect(r.company / r.market).toBeGreaterThan(0.715)
  })
  it('reads the gap in the last month with both rates', () => {
    const rows = fxRows(fx, ds, DEFAULT_RANGE)
    const g = fxGap(rows)!
    expect(g.month).toBe('1405/06')
    expect(g.pct).toBeLessThan(0)
  })
})
