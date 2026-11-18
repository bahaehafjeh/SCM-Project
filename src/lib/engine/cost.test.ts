import { describe, expect, it } from 'vitest'
import { alertDetails, allAlerts } from '../../data/alerts'
import { modelFor, netCost, paramsForOption, val, withValues } from './index'
import type { ScenarioModel } from './types'

/**
 * scenario-cost-fix §4: `cost` is only the money paid to carry the action out; the problem's own
 * money (holding, demurrage, price impact) stays a metric, and «خالص» joins the two in one place.
 */
const modelled = allAlerts.map((a) => ({ a, m: modelFor(a, alertDetails[a.id]) })).filter((x): x is { a: (typeof allAlerts)[number]; m: ScenarioModel } => !!x.m)
const optionParams = (code: string) => {
  const { a, m } = modelled.find((x) => x.a.code === code)!
  return { m, d: alertDetails[a.id] }
}

describe('cost invariants, every modelled alert', () => {
  it('there are modelled alerts to check', () => expect(modelled.length).toBeGreaterThan(8))
  for (const { a, m } of modelled) {
    const d = alertDetails[a.id]
    const runs = d.options.filter((o) => m.options[o.id]).map((o) => paramsForOption(m, o.id, o.amount))
    it(`${a.code}: «بدون اقدام» costs nothing`, () => {
      expect(m.run(m.base).cost).toBe(0)
    })
    it(`${a.code}: changing one assumption never changes the action's cost`, () => {
      for (const p of runs)
        for (const v of m.vars.filter((x) => x.role === 'assumption')) {
          const other = val(p, v.key) === v.max ? v.min : v.max
          expect(m.run(withValues(m, p, { [v.key]: other })).cost).toBe(m.run(p).cost)
        }
    })
    it(`${a.code}: «خالص» = money metric change + cost`, () => {
      const mm = m.metrics.find((x) => x.money)
      const base = m.run(m.base)
      for (const p of runs) {
        const r = m.run(p)
        expect(netCost(m, r, base)).toBe(mm ? Math.round(r.values[mm.key] - base.values[mm.key] + r.cost) : null)
      }
    })
  }
})

describe('ALR-1037 · surplus of liquid oil (daily use 6 t)', () => {
  const { m } = optionParams('ALR-1037')
  const base = m.run(m.base)
  const row = (patch: Record<string, number>) => {
    const r = m.run(withValues(m, m.base, patch))
    return { left: r.values.left, hold: r.values.hold, cost: r.cost, net: netCost(m, r, base) }
  }
  it('no action: 190 t left, holding 174, no cost', () => {
    expect({ left: base.values.left, hold: base.values.hold, cost: base.cost }).toEqual({ left: 190, hold: 174, cost: 0 })
  })
  it('transfer 130 t: freight 182, net 37 more', () => expect(row({ transferOut: 130 })).toEqual({ left: 60, hold: 29, cost: 182, net: 37 }))
  // The 90 t row of the screenshot moves in 3 days (2 days gives holding 70, net 22)
  it('transfer 90 t in 3 days: freight 126, net 25 more', () => expect(row({ transferOut: 90, transferDays: 3 })).toEqual({ left: 100, hold: 73, cost: 126, net: 25 }))
  it('pause 11 days: no direct cost, net 58 less', () => expect(row({ pauseDays: 11 })).toEqual({ left: 130, hold: 116, cost: 0, net: -58 }))
  it('freight 1 a tonne: cost 130, net 15 less, holding unchanged', () => expect(row({ transferOut: 130, freight: 1 })).toEqual({ left: 60, hold: 29, cost: 130, net: -15 }))
})

describe('ALR-1031 · rice stuck in Chabahar customs', () => {
  const { m } = optionParams('ALR-1031')
  const base = m.run(m.base)
  it('no action: demurrage 600', () => expect(base.values.demurrage).toBe(600))
  it('papers now: demurrage 240, no direct cost, net 360 less', () => {
    const r = m.run(paramsForOption(m, 'docs'))
    expect({ dem: r.values.demurrage, cost: r.cost, net: netCost(m, r, base) }).toEqual({ dem: 240, cost: 0, net: -360 })
  })
})
