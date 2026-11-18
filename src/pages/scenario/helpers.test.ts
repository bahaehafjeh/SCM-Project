import { describe, expect, it } from 'vitest'
import { alertByCode, alertDetails } from '../../data/alerts'
import type { ScenarioDraft } from '../../lib/alertStore'
import { modelFor, paramsForOption, val, withValues } from '../../lib/engine'
import { isSystemPick } from '../../lib/recommend'
import { applyBlock, autoName, baseAssumptions, canApply, changedAssumptions, compareMetric, compareRisk, copyName, customStart, duplicateRow, effective, initialDraft, minSufficient, normalizeDraft, resolveOption, riskOf, versusBase } from './helpers'

// ALR-1042: stock 48 t, 8 t a day, 200 t inbound on day 6 (see engine.test.ts for the hand check)
const a = alertByCode('ALR-1042')!
const d = alertDetails[a.id]
const m = modelFor(a, d)!
const cols = m.columns ?? m.metrics
const delayKey = m.vars.find((v) => v.role === 'assumption' && /delay/i.test(v.key))!.key

describe('effective params: row actions + shared assumptions + one horizon', () => {
  const draft = initialDraft(d, m)

  it('takes actions from the row, assumptions from the draft, the horizon from the alert', () => {
    const row = draft.list.find((s) => s.origin === 'alert')!
    const shared: ScenarioDraft = { ...draft, assumptions: { ...draft.assumptions, [delayKey]: 2 } }
    const p = effective(shared, row)
    expect(p.actions).toEqual(row.params.actions)
    expect(p.assumptions[delayKey]).toBe(2)
    expect(p.horizon).toBe(m.base.horizon)
  })

  it('a shared assumption moves «بدون اقدام» too', () => {
    const ref = draft.list[0]
    expect(m.run(effective(draft, ref)).values.short).toBe(0)
    const later: ScenarioDraft = { ...draft, assumptions: { ...draft.assumptions, [delayKey]: 1 } }
    expect(m.run(effective(later, ref)).values.short).toBe(1)
    expect(changedAssumptions(m, later)).toBe(1)
  })

  it('an assumption a row carried before the change does not win over the shared one', () => {
    const row = { ...draft.list[0], params: withValues(m, m.base, { [delayKey]: 5 }) }
    expect(effective(draft, row).assumptions[delayKey]).toBe(val(m.base, delayKey))
  })
})

describe('riskOf', () => {
  const H = m.base.horizon

  it('stock only touching zero says so, it is not called a shortage', () => {
    const r = m.run(m.base)
    expect(r.values.short).toBe(0)
    expect(riskOf(m, cols, r, H)).toEqual({ level: 'high', reason: 'موجودی روز ۶ به صفر می‌رسد' })
  })

  it('unmet demand is «کمبود از روز n»', () => {
    const r = m.run(withValues(m, m.base, { [delayKey]: 1 }))
    expect(r.firstShort).toBe(7)
    expect(riskOf(m, cols, r, H)).toEqual({ level: 'high', reason: 'کمبود از روز ۷' })
  })

  it('a run-out past the horizon is not counted', () => {
    const r = m.run({ ...m.base, horizon: 5 })
    expect(riskOf(m, cols, r, 5).level).not.toBe('high')
  })

  it('no shortage but under the critical line is medium', () => {
    const transfer = d.options.find((o) => o.kind === 'transfer')!
    const r = m.run(paramsForOption(m, transfer.id, 100))
    expect(r.emptyDay ?? Infinity).toBeGreaterThan(H)
    expect(riskOf(m, cols, r, H)).toEqual({ level: 'medium', reason: 'زیر مرز بحرانی' })
  })
})

describe('normalizeDraft: drafts saved before this change open without error', () => {
  const fresh = initialDraft(d, m)

  it('an old draft gets the real assumptions, the model horizon and its rows’ starting name and kind', () => {
    const old = { ...fresh, list: fresh.list.map(({ initialName: _n, initialOrigin: _o, ...s }) => s) } as ScenarioDraft
    delete (old as Partial<ScenarioDraft>).assumptions
    const n = normalizeDraft({ ...old, list: old.list.map((s) => ({ ...s, params: { ...s.params, horizon: 14 } })) }, m)
    expect(n.assumptions).toEqual(baseAssumptions(m))
    for (const s of n.list) expect(s.params.horizon).toBe(m.base.horizon)
    for (const s of n.list) {
      expect(s.initialName).toBe(s.name)
      expect(s.initialOrigin).toBe(s.origin)
    }
  })

  it('a current draft keeps its shared assumptions; prices set by hand go back to the data (§5)', () => {
    const cur: ScenarioDraft = { ...fresh, assumptions: { ...fresh.assumptions, [delayKey]: 3 } }
    const hand = { ...cur, list: cur.list.map((s) => ({ ...s, params: withValues(m, s.params, { transferCost: 3 }) })) }
    const n = normalizeDraft(hand, m)
    expect(n.assumptions[delayKey]).toBe(3)
    for (const s of n.list) expect(val(s.params, 'transferCost')).toBe(val(m.base, 'transferCost'))
  })
})

describe('one rule for «پیشنهاد سیستم»', () => {
  const rec = d.options.find((o) => o.recommended)!
  it('recommended, confident, not rejected and not turned down by a unit', () => {
    expect(isSystemPick(rec, 82, undefined, false)).toBe(true)
    expect(isSystemPick(rec, 40, undefined, false)).toBe(false)
    expect(isSystemPick(rec, 82, rec.id, false)).toBe(false)
    expect(isSystemPick(rec, 82, undefined, true)).toBe(false)
    expect(isSystemPick({ ...rec, recommended: false }, 82, undefined, false)).toBe(false)
  })
})

// ───────── Phase 2 (final) ─────────
describe('critical line from the data (§2)', () => {
  it('ALR-1042 takes it from `critical` (110 t), not from half the safety level', () => {
    expect(m.chart.refs.find((r) => r.tone === 'crit')?.value).toBe(110)
  })
  it('an alert of the same model without `critical` has no critical line', () => {
    const a = alertByCode('ALR-1019')!
    const other = modelFor(a, alertDetails[a.id])!
    expect(other.chart.refs.some((r) => r.tone === 'crit')).toBe(false)
  })
})

describe('riskOf without a critical line (§2)', () => {
  const a = alertByCode('ALR-1019')!
  const other = modelFor(a, alertDetails[a.id])!
  const oc = other.columns ?? other.metrics
  it('a run without shortage is «کم · بدون کمبود», never «زیر مرز بحرانی»', () => {
    // A transfer large enough to leave no shortage; with no critical line nothing can be «زیر مرز بحرانی»
    const r = other.run(withValues(other, other.base, { transfer: 60, purchase: 200 }))
    expect(riskOf(other, oc, r, other.base.horizon)).toEqual({ level: 'low', reason: 'بدون کمبود' })
  })
  it('the same run on a model with the line can be «متوسط · زیر مرز بحرانی»', () => {
    const transfer = d.options.find((o) => o.kind === 'transfer')!
    expect(riskOf(m, cols, m.run(paramsForOption(m, transfer.id, 100)), m.base.horizon)).toEqual({ level: 'medium', reason: 'زیر مرز بحرانی' })
  })
})

describe('minSufficient (§9)', () => {
  const draft = initialDraft(d, m)
  const row = draft.list.find((s) => s.option === 'transfer')!
  // Transfer lands on day 2. Not zero: day 6 has 0 t without it, so the first step (5 t) is enough.
  // Critical (110 t) from landing on: lowest is day 5, 8 t + x → x ≥ 102 → 105. Safe at day 21 (the horizon): 48 + x + 200 − 21 × 8 = 80 + x ≥ 220 → 140, the whole surplus.
  it('finds the lowest amount per goal', () => {
    expect(minSufficient(m, draft, row, 'transfer', 'zero')).toBe(5)
    expect(minSufficient(m, draft, row, 'transfer', 'crit')).toBe(105)
    expect(minSufficient(m, draft, row, 'transfer', 'safe')).toBe(140)
  })
  // 8.5 t a day: 48 + x + 200 − 21 × 8.5 = 69.5 + x ≥ 220 → 150.5 → 155, past the 140 t surplus
  it('follows the shared assumptions; past the surplus it is still found (the page marks it)', () => {
    const more: ScenarioDraft = { ...draft, assumptions: { ...draft.assumptions, consumption: 8.5 } }
    expect(minSufficient(m, more, row, 'transfer', 'safe')).toBe(155)
  })
  it('null when no amount is enough', () => {
    const more: ScenarioDraft = { ...draft, assumptions: { ...draft.assumptions, consumption: 16 } }
    expect(minSufficient(m, more, row, 'transfer', 'safe')).toBeNull()
  })
})

describe('compare two scenarios (§10)', () => {
  const [stock, short] = cols
  it('lower is better by default; higher when the metric says so; neutral is never coloured', () => {
    expect(compareMetric(short, 0, 3, true)).toEqual({ text: 'رفع شد', tone: 'better' })
    expect(compareMetric(short, 3, 0, true)).toEqual({ text: 'ایجاد می‌شود', tone: 'worse' })
    expect(compareMetric(short, 2, 5, true).tone).toBe('better')
    expect(compareMetric(stock, 32, 0, false)).toEqual({ text: '+۳۲ تن', tone: 'neutral' })
    expect(compareMetric({ ...stock, neutral: false }, 32, 0, false).tone).toBe('better')
    expect(compareMetric({ ...stock, neutral: false }, 0, 32, false)).toEqual({ text: '−۳۲ تن', tone: 'worse' })
    expect(compareMetric(short, 0, 0, true)).toEqual({ text: 'بدون تفاوت', tone: 'same' })
  })
  it('risk: low beats medium beats high', () => {
    expect(compareRisk('medium', 'high')).toEqual({ text: 'متوسط', tone: 'better' })
    expect(compareRisk('high', 'low')).toEqual({ text: 'بالا', tone: 'worse' })
    expect(compareRisk('low', 'low')).toEqual({ text: 'بدون تغییر', tone: 'same' })
  })
})

describe('a fixed-amount option matches only its own amounts (2026-11-14)', () => {
  const combo = paramsForOption(m, 'combo')
  it('the combined option (140 t + 172 t) matches exactly those amounts', () => {
    expect(resolveOption(d, m, combo)?.option.id).toBe('combo')
  })
  it('a 50 t + 30 t scenario is not the combined option: blocked, with its amounts offered', () => {
    const mine = withValues(m, m.base, { transfer: 50, purchase: 30 })
    expect(resolveOption(d, m, mine)).toBeNull()
    const block = applyBlock({ sel: { ...initialDraft(d, m).list[1], params: mine }, p: mine, m, detail: d, closed: false, viewer: false })
    expect(block?.reason).toBe('combined')
    expect(block?.patch).toEqual({ transfer: val(combo, 'transfer'), purchase: val(combo, 'purchase') })
  })
  it('an option with a free amount («{n}») still takes any amount', () => {
    expect(resolveOption(d, m, withValues(m, m.base, { transfer: 55 }))).toMatchObject({ option: { id: 'transfer' }, amount: 55 })
  })
})

// ───────── scenario-fixes (2026-11-14) ─────────
describe('§1 · a mark beside a figure that differs from «بدون اقدام»', () => {
  const ref = m.run(m.base)
  const [minCol, shortCol] = cols
  it('transfer 100 t: «▲ ۳۲ تن» beside the lowest stock (better, though the column is neutral); nothing beside shortage', () => {
    const r = m.run(paramsForOption(m, 'transfer', 100))
    expect(versusBase(minCol, r, ref)).toEqual({ arrow: '▲', text: '۳۲ تن', full: '۳۲ تن بیشتر از بدون اقدام', tone: 'better' })
    expect(versusBase(shortCol, r, ref)).toBeNull()
  })
  it('supply 172 t: no mark at all', () => {
    const r = m.run(paramsForOption(m, 'supply', 172))
    expect(versusBase(minCol, r, ref)).toBeNull()
    expect(versusBase(shortCol, r, ref)).toBeNull()
  })
  it('inbound 7 days late: transfer 100 t has «▼ ۷ روز» (better) beside shortage', () => {
    const late = (q: ReturnType<typeof paramsForOption>) => withValues(m, q, { inboundDelay: 7 })
    const mark = versusBase(shortCol, m.run(late(paramsForOption(m, 'transfer', 100))), m.run(late(m.base)))
    expect(mark).toMatchObject({ arrow: '▼', text: '۷ روز', tone: 'better' })
  })
})

describe('§3 · a unit turned the transfer down', () => {
  const unit = { unit: 'واحد انبارهای جنوب', reason: 'انبار شیراز این هفته ظرفیت حمل ندارد', blocked: (o: { id: string }) => o.id === 'transfer' || o.id === 'combo' }
  it('the default selection skips it: supply 172 t is selected', () => {
    const dr = initialDraft(d, m, unit.blocked as never)
    expect(dr.list[dr.selected].option).toBe('supply')
  })
  it('applying the transfer, or a hand-made 120 t transfer, is blocked with the unit and its reason', () => {
    for (const amount of [100, 120]) {
      const q = paramsForOption(m, 'transfer', amount)
      const block = applyBlock({ sel: { ...initialDraft(d, m).list[1], params: q }, p: q, m, detail: d, closed: false, viewer: false, unit: unit as never })
      expect(block).toEqual({ reason: 'unitRejected', text: 'واحد انبارهای جنوب این اقدام را رد کرده است: انبار شیراز این هفته ظرفیت حمل ندارد. سناریوی دیگری انتخاب کنید.' })
    }
  })
  it('supply is not blocked', () => {
    const q = paramsForOption(m, 'supply', 172)
    expect(applyBlock({ sel: { ...initialDraft(d, m).list[2], params: q }, p: q, m, detail: d, closed: false, viewer: false, unit: unit as never })).toBeNull()
  })
})

describe('§4 · automatic names keep the option and its source', () => {
  it('an alert option at another amount: its own title', () => {
    expect(autoName(d, m, paramsForOption(m, 'transfer', 120))).toBe('انتقال ۱۲۰ تن از انبار شیراز')
  })
  it('plus what else differs from the option (arrival day)', () => {
    expect(autoName(d, m, withValues(m, paramsForOption(m, 'transfer', 90), { transferDays: 4 }))).toBe('انتقال ۹۰ تن از انبار شیراز · رسیدن ۴ روز')
  })
  it('no option: what the actions are, with the source; never the price', () => {
    const q = withValues(m, m.base, { transfer: 50, purchase: 30, transferCost: 3 })
    expect(autoName(d, m, q)).toBe('انتقال ۵۰ تن از انبار شیراز + خرید ۳۰ تن · ۱۴ روز')
  })
})

describe('the ready-made «خرید فوری با هزینه بیشتر» (2026-11-14 decisions)', () => {
  it('its 20 % higher rate is shown as the ready-made scenario\'s own, in the cost breakdown', () => {
    const t = m.templates.find((x) => x.key === 'split')!
    const lines = m.costLines!(withValues(m, m.base, t.patch))
    expect(lines.find((l) => l.what.startsWith('خرید'))?.source).toBe('نرخ خرید فوری: ۲۰٪ بیشتر از قیمت عادی (فرض سناریوی آماده)')
  })
  it('in ALR-1024 a new urgent purchase is not «تحویل زودتر سفارش» (bringing the ordered shipment forward)', () => {
    const a = alertByCode('ALR-1024')!
    const fm = modelFor(a, alertDetails[a.id])!
    const t = fm.templates.find((x) => x.key === 'split')!
    expect(resolveOption(alertDetails[a.id], fm, withValues(fm, fm.base, t.patch))).toBeNull()
  })
})

// ───────── fix 8 · one row = one action ─────────
describe('8-الف · canApply', () => {
  const a37 = alertByCode('ALR-1037')!
  const d37 = alertDetails[a37.id]
  const m37 = modelFor(a37, d37)!
  it('ALR-1037: transfer + pause is not the transfer (the silent-apply bug): two actions, no combined option', () => {
    const q = withValues(m37, paramsForOption(m37, 'transferOut', 130), { pauseDays: 21 })
    expect(canApply(d37, m37, q, null)).toMatchObject({ ok: false, code: 'combined', reason: 'دو اقدام دارد و هشدار گزینهٔ ترکیبی ندارد' })
    const sel = { ...initialDraft(d37, m37).list[1], params: q }
    expect(applyBlock({ sel, p: q, m: m37, detail: d37, closed: false, viewer: false })?.text).toBe('این سناریو دو اقدام دارد و هشدار گزینهٔ ترکیبی ندارد؛ روی هشدار ثبت نمی‌شود.')
  })
  it('ALR-1042: its own combined option can be recorded when no unit turned it down', () => {
    expect(canApply(d, m, paramsForOption(m, 'combo'), null)).toMatchObject({ ok: true, option: { id: 'combo' } })
  })
  it('a unit rejection, a value over its limit, an action the alert has no option for', () => {
    const unit = { unit: 'واحد انبارهای جنوب', reason: 'x', blocked: (o: { id: string }) => o.id === 'transfer' }
    expect(canApply(d, m, paramsForOption(m, 'transfer', 100), unit as never)).toMatchObject({ ok: false, reason: 'واحد انبارهای جنوب این اقدام را رد کرده' })
    expect(canApply(d, m, paramsForOption(m, 'transfer', 150), null)).toMatchObject({ ok: false, reason: 'از حد مجاز بیشتر است' })
    expect(canApply(d, m, customStart(d, m, 'advance'), null)).toMatchObject({ ok: false, reason: 'با گزینه‌های این هشدار جور نیست' })
  })
})

describe('8-د · the add menu', () => {
  it('ALR-1024: a ready-made scenario\'s second line is the row it makes', () => {
    const a = alertByCode('ALR-1024')!
    const dd = alertDetails[a.id]
    const mm = modelFor(a, dd)!
    for (const t of mm.templates.filter((x) => x.group === 'action')) {
      const q = withValues(mm, mm.base, t.patch)
      const line = autoName(dd, mm, q)
      const draft = initialDraft(dd, mm)
      const row = { ...draft.list[0], id: 'x', origin: 'template' as const, params: q, initial: q, name: line, autoName: true }
      const n = normalizeDraft({ ...draft, list: [...draft.list, row] }, mm)
      expect(autoName(dd, mm, effective(n, n.list.at(-1)!))).toBe(line)
    }
  })
  it('a row with the same actions and values is found (the entry says «در جدول هست»)', () => {
    const draft = initialDraft(d, m)
    expect(duplicateRow(m, draft.list, paramsForOption(m, 'transfer', 100))).toBe(draft.list.findIndex((s) => s.option === 'transfer'))
    expect(duplicateRow(m, draft.list, paramsForOption(m, 'transfer', 105))).toBe(-1)
  })
  it('«سناریوی دلخواه» starts at the alert option\'s own amount', () => {
    expect(val(customStart(d, m, 'transfer'), 'transfer')).toBe(100)
  })
})

describe('8-و · copies and names', () => {
  const a37 = alertByCode('ALR-1037')!
  const d37 = alertDetails[a37.id]
  const m37 = modelFor(a37, d37)!
  it('a copy is «{name} (۲)», then «(۳)»', () => {
    const list = initialDraft(d37, m37).list
    const name = list[1].name
    expect(copyName(list, name)).toBe(`${name} (۲)`)
    expect(copyName([...list, { ...list[1], name: `${name} (۲)` }], `${name} (۲)`)).toBe(`${name} (۳)`)
  })
  it('a copy changed to 100 t is named after its value', () => {
    expect(autoName(d37, m37, paramsForOption(m37, 'transferOut', 100))).toBe('انتقال ۱۰۰ تن به انبار مشهد')
  })
})
