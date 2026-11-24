import { describe, expect, it } from 'vitest'
import { alertByCode, alertDetails, allAlerts } from '../../data/alerts'
import { initialDraft, isActionOption } from '../../pages/scenario/helpers'
import { arrivalDays, modelFor, paramsForOption, snoozeWindow, val } from './index'

const modelled = allAlerts.map((a) => ({ a, d: alertDetails[a.id], m: modelFor(a, alertDetails[a.id]) })).filter((x) => x.m)

// ز۱ · Parity: the panel, the scenario table and the reject modal read the same numbers
describe('one engine for the alert panel and the scenario page', () => {
  it('every type with a model has one; data types have none', () => {
    expect(modelled.length).toBe(13)
    for (const kind of ['داده قدیمی', 'همگام‌سازی ناموفق', 'مهلت گذشته']) {
      const a = allAlerts.find((x) => x.kind === kind)!
      expect(modelFor(a, alertDetails[a.id])).toBeNull()
    }
  })

  for (const { a, d, m } of modelled) {
    it(`${a.code}: option cards equal their table rows`, () => {
      const draft = initialDraft(d, m!)
      for (const o of d.options.filter((x) => isActionOption(m!, x.id))) {
        const panel = m!.run(paramsForOption(m!, o.id, o.amount))
        const row = draft.list.find((s) => s.option === o.id)
        expect(row, `row for ${o.id}`).toBeTruthy()
        const table = m!.run(row!.params)
        for (const k of m!.metrics.map((x) => x.key)) expect(table.values[k]).toBe(panel.values[k])
        expect(table.cost).toBe(panel.cost)
        expect(table.confidence).toBe(panel.confidence)
      }
    })

    it(`${a.code}: «بدون اقدام» is the same in the panel, the table and the reject modal`, () => {
      const draft = initialDraft(d, m!)
      const panel = m!.run(m!.base)
      const table = m!.run(draft.list[0].params)
      expect(table.values).toEqual(panel.values)
      // The reject modal's rows come from the engine, first, followed by the data's descriptive rows
      const engineRows = m!.noActionCost(m!.base)
      expect(d.noActionCost.slice(0, engineRows.length)).toEqual(engineRows)
      // No number is left as a {token} in the alert's texts
      for (const t of [d.summary, d.happened, ...d.impact.map((s) => s.value), ...d.noActionCost.map((s) => s.value)]) expect(t).not.toMatch(/\{\w+\}/)
    })
  }
})

// ز۲ · ALR-1042 by hand: stock 48 t, 8 t a day, 200 t inbound on day 6, safety 220 t.
// Horizon 21 days: the alert's latest option (supply, day 14) plus a week (§7).
// Each day consumes first, then that day's arrivals land.
//   No action: 40 32 24 16 8 → day 6: 0, +200 = 200 → day 14: 136 → day 21: 136 − 7×8 = 80 t = 36 % of safety.
//              Never below zero, so 0 shortage days; lowest point 0 t on day 6.
//   Transfer 100 t on day 2: day 2 32 + 100 = 132 → day 6 100 + 200 = 300 → day 21 180 t = 82 %;
//              lowest 32 t; cost 100 × 1.8 = 180 million; confidence 82 %.
//   Supply 172 t on day 14: as no action until day 14: 136 + 172 = 308 → day 21 252 t = 115 %; cost 172 × 24.4 ≈ 4197.
//   Transfer 140 + supply 172: day 6 340 → day 14 276 + 172 = 448 → day 21 392 t = 178 %; cost 252 + 4196.8 ≈ 4449;
//              confidence min(82 − 4, 64) = 64 %.
//   Inbound one day later (day 7): day 7 needs 8 t from an empty store → 1 shortage day.
//   Snooze: the transfer can land by day 5 (stock 8 t) — 3 days later than planned; day 6 would touch 0.
describe('ALR-1042 checked by hand', () => {
  const a = alertByCode('ALR-1042')!
  const d = alertDetails[a.id]
  const m = modelFor(a, d)!

  it('no action', () => {
    const r = m.run(m.base)
    expect(m.base.horizon).toBe(21)
    expect(r.series).toEqual([48, 40, 32, 24, 16, 8, 200, 192, 184, 176, 168, 160, 152, 144, 136, 128, 120, 112, 104, 96, 88, 80])
    expect(r.values.end).toBe(36)
    expect(r.values.short).toBe(0)
    expect(r.values.min).toBe(0)
    expect(r.emptyDay).toBe(6)
  })
  it('transfer 100 t', () => {
    const r = m.run(paramsForOption(m, 'transfer', 100))
    expect(r.values.end).toBe(82)
    expect(r.values.min).toBe(32)
    expect(r.cost).toBe(180)
    expect(r.confidence).toBe(82)
  })
  it('supply 172 t', () => {
    const r = m.run(paramsForOption(m, 'supply', 172))
    expect(r.series[14]).toBe(308)
    expect(r.values.end).toBe(115)
    expect(r.cost).toBe(4197)
  })
  it('transfer 140 t + supply 172 t (combined option)', () => {
    const p = paramsForOption(m, 'combo')
    expect(val(p, 'transfer')).toBe(140)
    expect(val(p, 'purchase')).toBe(172)
    const r = m.run(p)
    expect(r.series[14]).toBe(448)
    expect(r.values.end).toBe(178)
    expect(r.cost).toBe(4449)
    expect(r.confidence).toBe(64)
    expect(m.optionFor(p)?.option).toBe('combo')
  })
  it('one day of extra inbound delay means one shortage day', () => {
    const late = paramsForOption(m, 'transfer', 0)
    late.assumptions.inboundDelay = 1
    expect(m.run(late).values.short).toBe(1)
    expect(d.noActionCost.find((r) => r.label.includes('۱ روز دیرتر'))?.value).toBe('۱ روز کمبود')
  })
  it('texts and the snooze window', () => {
    expect(d.summary).toBe('۲۲٪ حد ایمن · کسری ۱۷۲ تن · ۶ روز دیگر تمام می‌شود')
    expect(snoozeWindow(m, { id: 'transfer', amount: 100 }).latest).toBe(3)
  })
  it('the horizon actually run names the end-stock metric', () => {
    expect(m.metrics[0].labelAt!(30)).toBe('موجودی در پایان ۳۰ روز')
  })
})

// Follow-up «رسیدن پیش‌بینی‌شده»: the arrival days come from the engine, the same ones the cards use
describe('arrival days of a recorded option', () => {
  const m = (code: string) => {
    const a = alertByCode(code)!
    return modelFor(a, alertDetails[a.id])!
  }
  it('stock options', () => {
    expect(arrivalDays(m('ALR-1042'), 'transfer', 100)).toBe(2)
    expect(arrivalDays(m('ALR-1042'), 'supply', 172)).toBe(14)
    expect(arrivalDays(m('ALR-1042'), 'combo')).toBe(14)
    expect(arrivalDays(m('ALR-1024'), 'early', 150)).toBe(20)
  })
  it('a shipment transfer, and nothing for a referral', () => {
    expect(arrivalDays(m('ALR-1038'), 'transfer', 60)).toBe(3)
    expect(arrivalDays(m('ALR-1042'), 'refer')).toBeNull()
  })
})

// §2 · «کافی برای حدود n روز» is the first run-out after the horizon, not the one before the inbound shipment
describe('enough until', () => {
  const a = alertByCode('ALR-1042')!
  const m = modelFor(a, alertDetails[a.id])!
  it('ALR-1042, no action, 30 days: day 6 is inside and refilled; the next run-out is day 31', () => {
    // 200 t lands on day 6 → 200 − 8 × 25 = 0 on day 31
    expect(m.run({ ...m.base, horizon: 30 }).enoughUntil).toBe(31)
  })
  it('nothing when the stock lasts more than a week past the horizon', () => {
    expect(m.run(m.base).enoughUntil).toBeNull()
  })
})

// §7 · One horizon per alert, from its own data
describe('automatic horizon', () => {
  const h = (code: string) => {
    const a = alertByCode(code)!
    return modelFor(a, alertDetails[a.id])!.base.horizon
  }
  it('the latest option arrival plus a week (ALR-1042: supply on day 14 → 21)', () => {
    expect(h('ALR-1042')).toBe(21)
  })
  it('or the latest shipment on its way, if later (ALR-1024: inbound on day 24 → 31)', () => {
    expect(h('ALR-1024')).toBe(31)
  })
  it('models without arrivals keep their own (customs ALR-1031: 14, surplus ALR-1037: 30)', () => {
    expect(h('ALR-1031')).toBe(14)
    expect(h('ALR-1037')).toBe(30)
  })
})
