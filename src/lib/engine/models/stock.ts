import type { StockFacts } from '../facts'
import { build, val } from '../params'
import { EXTENDED_DAYS, runStock } from '../stock'
import type { Arrival } from '../stock'
import { days, fa, num, pct, tons } from '../fmt'
import type { CostLine, Metric, ModelRun, Params, ScenarioModel, Template, VarDef } from '../types'

/** Inventory types: shortage (1), forecast run-out (2), demand spike (9) — one stock simulation */
export type StockKind = 'shortage' | 'forecast' | 'demand'

export function stockModel(f: StockFacts, kind: StockKind): ScenarioModel {
  const hasInbound = f.inbound.length > 0
  const vars: VarDef[] = [
    kind === 'shortage'
      ? { key: 'consumption', role: 'assumption', label: 'مصرف روزانه', unit: 'تن', min: 1, max: Math.ceil(f.consumption * 2), step: 0.5, source: 'از سیستم انبار', group: 'تقاضا' }
      : { key: 'growth', role: 'assumption', label: kind === 'demand' ? 'افزایش تقاضا نسبت به پیش‌بینی' : 'رشد مصرف', unit: '٪', min: 0, max: 80, step: 5, source: kind === 'demand' ? 'از سیستم فروش' : 'از پیش‌بینی مصرف', group: 'تقاضا' },
    ...(hasInbound ? [{ key: 'inboundDelay', role: 'assumption', label: 'تأخیر بیشتر محموله ورودی', unit: 'روز', min: 0, max: 15, step: 1, source: 'از سیستم حمل', group: 'زمان و مسیر' } as VarDef] : []),
    { key: 'transfer', role: 'action', seek: true, label: `مقدار انتقال از ${f.transfer.source}`, unit: 'تن', min: 0, max: Math.round(f.transfer.surplus * 1.4), step: 5, source: `از سیستم ${f.transfer.source}`, group: 'تأمین و حمل', limit: { max: f.transfer.surplus, text: `حداکثر مازاد ${f.transfer.source.replace('انبار ', '')} ${fa(f.transfer.surplus)} تن است.` } },
    { key: 'transferDays', role: 'action', dependsOn: 'transfer', label: 'زمان رسیدن انتقال', unit: 'روز', min: 1, max: 7, step: 1, source: 'از سیستم حمل', group: 'تأمین و حمل' },
    { key: 'purchase', role: 'action', seek: true, label: 'مقدار خرید', unit: 'تن', min: 0, max: 400, step: 5, source: 'از سیستم خرید', group: 'تأمین و حمل' },
    { key: 'purchaseDays', role: 'action', dependsOn: 'purchase', label: 'زمان تحویل خرید', unit: 'روز', min: 3, max: 30, step: 1, source: 'از سیستم خرید', group: 'تأمین و حمل' },
    ...(hasInbound ? [{ key: 'advance', role: 'action', label: 'جلو انداختن تحویل محموله ورودی', unit: 'روز', min: 0, max: 10, step: 1, source: 'از سیستم خرید', group: 'تأمین و حمل' } as VarDef] : []),
    { key: 'transferCost', role: 'advanced', for: 'transfer', label: 'هزینه حمل هر تن', unit: 'میلیون تومان', min: 0.5, max: 5, step: 0.1, source: 'از سیستم حمل', group: 'هزینه' },
    { key: 'purchaseCost', role: 'advanced', for: 'purchase', label: 'قیمت خرید هر تن', unit: 'میلیون تومان', min: 10, max: 40, step: 0.5, source: 'از سیستم خرید', group: 'هزینه' },
  ]
  const horizon = kind === 'forecast' ? 30 : 14
  const base = build(
    vars,
    {
      ...(kind === 'shortage' ? { consumption: f.consumption } : { growth: f.growth ?? 0 }),
      ...(hasInbound ? { inboundDelay: 0, advance: 0 } : {}),
      transfer: 0,
      transferDays: f.transfer.days,
      purchase: 0,
      purchaseDays: f.purchase.days,
      transferCost: f.transfer.costPerTon,
      purchaseCost: f.purchase.costPerTon,
    },
    horizon,
  )

  const rate = (p: Params) => (kind === 'shortage' ? val(p, 'consumption') : f.consumption * (1 + val(p, 'growth') / 100))
  const inboundDays = (p: Params) => f.inbound.map((s) => Math.max(1, s.day + val(p, 'inboundDelay') - val(p, 'advance')))
  const arrivals = (p: Params): (Arrival & { label: string })[] => [
    ...f.inbound.map((s, i) => ({ qty: s.qty, day: inboundDays(p)[i], label: 'محموله ورودی' })),
    ...(val(p, 'transfer') > 0 ? [{ qty: val(p, 'transfer'), day: val(p, 'transferDays'), label: 'رسیدن انتقال' }] : []),
    ...(val(p, 'purchase') > 0 ? [{ qty: val(p, 'purchase'), day: val(p, 'purchaseDays'), label: 'رسیدن خرید' }] : []),
  ]

  const run = (p: Params): ModelRun => {
    const c = rate(p)
    const h = p.horizon
    const arr = arrivals(p)
    const r = runStock(f.stock, c, arr, h)
    const ext = runStock(f.stock, c, arr, EXTENDED_DAYS)
    // Confidence: lower for larger moves, slower supply, higher demand and a later inbound shipment
    let confidence = 90
    if (val(p, 'transfer') > 0) confidence = 82 - Math.max(0, val(p, 'transfer') - 100) * 0.1
    if (val(p, 'purchase') > 0) confidence = Math.min(confidence, 64)
    if (c > f.consumption) confidence -= Math.round(((c - f.consumption) / f.consumption) * 35)
    confidence -= val(p, 'inboundDelay') * 2
    if (kind === 'demand') confidence -= 8
    confidence = Math.max(20, Math.round(confidence))
    const spread = (100 - confidence) / 10
    const end = r.series[h]
    const firstShort = r.firstShort
    return {
      series: r.series,
      band: r.series.map((_, d) => (1 + d) * spread),
      min: r.min,
      values: {
        after: Math.round(((f.stock + val(p, 'transfer') + val(p, 'purchase')) / f.safety) * 100),
        end: Math.round((end / f.safety) * 100),
        short: r.shortageDays,
        min: Math.round(r.min),
        empty: r.emptyDay ?? h + 1,
        gap: r.shortageDays,
        cover: firstShort === null ? h : firstShort - 1,
        unmet: Math.round(r.unmet),
      },
      cost: Math.round(val(p, 'transfer') * val(p, 'transferCost') + val(p, 'purchase') * val(p, 'purchaseCost')),
      confidence,
      emptyDay: ext.emptyDay,
      // «کافی برای حدود n روز»: the first run-out after the horizon (one inside it, before an arrival, is not it)
      enoughUntil: r.shortageDays === 0 && end < 7 * c ? (ext.emptyDays.find((d) => d > h) ?? null) : null,
      firstShort: r.firstShort,
    }
  }

  const endMetric: Metric = { key: 'end', label: 'موجودی در پایان افق', labelAt: (h) => `موجودی در پایان ${fa(h)} روز`, short: 'موجودی پایان افق', fmt: (v) => `${pct(v)} حد ایمن`, bad: () => false, neutral: true }
  const metrics: Record<StockKind, [Metric, Metric]> = {
    shortage: [endMetric, { key: 'short', label: 'روزهای کمبود', short: 'کمبود', fmt: days, bad: (v) => v > 0, good: (v) => v === 0 }],
    forecast: [
      { key: 'empty', label: 'زمان تا اتمام', short: 'تا تمام شدن', fmt: (v) => days(v), bad: (v) => v < 10, better: 'higher' },
      { key: 'gap', label: 'روزهای کمبود تا رسیدن تأمین', short: 'کمبود', fmt: (v) => (v > 0 ? days(v) : 'به‌موقع'), bad: (v) => v > 0, good: (v) => v === 0 },
    ],
    demand: [
      { key: 'cover', label: 'پوشش موجودی', short: 'پوشش', fmt: days, bad: (v) => v < 7, better: 'higher' },
      { key: 'unmet', label: 'کمبود احتمالی', short: 'کمبود (تن)', unit: 'تن', fmt: num, bad: (v) => v > 0, good: (v) => v === 0 },
    ],
  }
  const deficit = Math.max(0, f.safety - f.stock)
  const demandPatch: Record<string, number> = kind === 'shortage' ? { consumption: +(f.consumption * 1.2).toFixed(1) } : { growth: (f.growth ?? 0) + 20 }
  const templates: Template[] = [
    { key: 'demand', group: 'stress', name: 'افزایش تقاضا ۲۰٪', note: 'مصرف روزانه ۲۰٪ بیشتر برای کل افق', patch: demandPatch },
    ...(hasInbound
      ? ([
          { key: 'port', group: 'stress', name: 'تأخیر محموله ورودی ۷ روز', note: 'محموله در راه ۷ روز دیرتر می‌رسد', patch: { inboundDelay: 7 } },
          { key: 'worst', group: 'stress', name: 'بدترین حالت', note: 'تقاضا +۲۰٪ و تأخیر ۷ روز با هم', patch: { ...demandPatch, inboundDelay: 7 } },
        ] satisfies Template[])
      : []),
    { key: 'nearest', group: 'action', name: 'انتقال از نزدیک‌ترین انبار دارای مازاد', note: `مقدار به اندازه کسری، محدود به مازاد ${f.transfer.source}`, patch: { transfer: Math.min(deficit || 40, f.transfer.surplus) } },
    { key: 'split', group: 'action', name: 'خرید فوری با هزینه بیشتر', note: 'تحویل زودتر با قیمت ۲۰٪ بیشتر', patch: { purchase: deficit || 60, purchaseDays: Math.round(f.purchase.days * 0.6), purchaseCost: +(f.purchase.costPerTon * 1.2).toFixed(1) } },
  ]

  return {
    title: `${kind === 'shortage' ? 'کمبود' : kind === 'forecast' ? 'اتمام پیش‌بینی‌شده' : 'جهش تقاضای'} ${f.item} · ${f.warehouse}`,
    metrics: metrics[kind],
    columns: kind === 'shortage' ? [{ key: 'min', label: 'کمترین موجودی', unit: 'تن', fmt: num, fmtDelta: tons, bad: (v) => v === 0, better: 'higher', neutral: true }, metrics.shortage[1]] : undefined,
    chart: { title: 'موجودی پیش‌بینی‌شده', unit: 'تن', refs: [{ value: f.safety, label: 'حد ایمن', tone: 'safe' }, ...(f.critical != null ? [{ value: f.critical, label: 'مرز بحرانی', tone: 'crit' as const }] : [])] },
    vars,
    fixed: [
      { label: 'موجودی فعلی', value: tons(f.stock), source: 'سیستم انبار' },
      { label: 'حد ایمن', value: tons(f.safety), source: 'قاعده INV-SAFE-01' },
      { label: 'مصرف روزانه (واقعی)', value: `${fa(f.consumption, 1)} تن`, source: 'سیستم انبار' },
      ...f.inbound.map((s) => ({ label: 'محموله در راه', value: `${tons(s.qty)} · روز ${fa(s.day)}`, source: 'سیستم حمل' })),
    ],
    base,
    run,
    options: {
      transfer: { key: 'transfer' },
      reallocate: { key: 'transfer' },
      supply: { key: 'purchase' },
      order: { key: 'purchase' },
      early: hasInbound && kind === 'forecast' ? { patch: { advance: 4 } } : { key: 'purchase', patch: { purchaseDays: Math.max(3, f.purchase.days - 4) } },
      combo: { patch: { transfer: f.transfer.surplus, purchase: deficit } },
    },
    optionFor: (p) => {
      const t = val(p, 'transfer')
      const b = val(p, 'purchase')
      if (t > 0 && b > 0) return { option: 'combo' }
      if (t > 0) return { option: 'transfer', amount: t }
      if (val(p, 'advance') > 0) return { option: 'early' }
      // A new purchase delivered sooner is «early» only where «early» itself is a purchase; where it means bringing
      // the shipment already ordered forward (forecast with an inbound), a new purchase is a purchase
      if (b > 0) return { option: !(hasInbound && kind === 'forecast') && val(p, 'purchaseDays') < f.purchase.days ? 'early' : 'supply', amount: b }
      return null
    },
    isCombined: (p) => [val(p, 'transfer') > 0, val(p, 'purchase') > 0, val(p, 'advance') > 0].filter(Boolean).length > 1,
    describe: (p) => describeStock(f, base, p),
    costLines: (p) => {
      const out: CostLine[] = []
      const t = val(p, 'transfer')
      const b = val(p, 'purchase')
      if (t > 0) out.push({ what: `انتقال ${tons(t)}`, rate: val(p, 'transferCost'), total: t * val(p, 'transferCost'), source: 'نرخ از سیستم حمل' })
      if (b > 0) {
        // A higher rate than the data's can only come from a ready-made scenario (the user cannot set prices)
        const extra = Math.round((val(p, 'purchaseCost') / f.purchase.costPerTon - 1) * 100)
        out.push({ what: `خرید ${tons(b)}`, rate: val(p, 'purchaseCost'), total: b * val(p, 'purchaseCost'), source: extra > 0 ? `نرخ خرید فوری: ${fa(extra)}٪ بیشتر از قیمت عادی (فرض سناریوی آماده)` : 'نرخ از سیستم خرید' })
      }
      return out
    },
    templates,
    lead: (p) => {
      const r = run(p)
      const h = p.horizon
      if (kind === 'forecast') return `تأمین بعدی روز ${fa(Math.min(...inboundDays(p), val(p, 'purchaseDays')))} می‌رسد`
      if (kind === 'demand') return `تقاضا ${fa(val(p, 'growth'))}٪ بیشتر از پیش‌بینی`
      const e = r.values.empty
      if (e > h) return `تا ${fa(h)} روز آینده تمام نمی‌شود`
      const landing = arrivals(p).find((a) => a.day === e)
      if (r.values.short === 0 && landing) return `موجودی روز ${fa(e)} به صفر می‌رسد؛ همان روز ${landing.label} ${fa(landing.qty)} تنی می‌رسد`
      return `موجودی روز ${fa(e)} تمام می‌شود`
    },
    tokens: (p) => stockTokens(f, run(p), rate(p)),
    events: (p) => arrivals(p).filter((a) => a.day <= p.horizon).map((a) => ({ day: a.day, label: a.label })),
    noActionCost: (p) => {
      const r = run(p)
      const late = hasInbound ? run(build(vars, { ...flatOf(p), inboundDelay: val(p, 'inboundDelay') + 1 }, p.horizon)) : null
      const e = r.emptyDay ?? null
      const firstRow =
        kind === 'demand'
          ? { label: 'پوشش موجودی', value: days(r.values.cover), tone: r.values.cover < 7 ? ('danger' as const) : undefined }
          : { label: 'تا صفر شدن موجودی', value: e === null ? 'در یک سال آینده نه' : `روز ${fa(e)}`, tone: e !== null && e <= p.horizon ? ('danger' as const) : undefined }
      const second =
        kind === 'demand'
          ? { label: 'کمبود احتمالی', value: tons(r.values.unmet), tone: r.values.unmet > 0 ? ('danger' as const) : undefined }
          : { label: `روزهای کمبود در ${fa(p.horizon)} روز`, value: days(r.values.short), tone: r.values.short > 0 ? ('danger' as const) : undefined }
      return [
        firstRow,
        second,
        ...(late && kind !== 'demand' ? [{ label: 'اگر محموله ورودی ۱ روز دیرتر برسد', value: `${days(late.values.short)} کمبود`, tone: late.values.short > 0 ? ('warning' as const) : undefined }] : []),
      ]
    },
    facts: f,
  }
}

const flatOf = (p: Params) => ({ ...p.assumptions, ...p.actions })

function describeStock(f: StockFacts, base: Params, p: Params): string[] {
  const out: string[] = []
  if (val(p, 'consumption') !== val(base, 'consumption')) out.push(`مصرف ${fa(val(p, 'consumption'), 1)} تن`)
  if (val(p, 'growth') !== val(base, 'growth')) out.push(`تقاضا +${fa(val(p, 'growth'))}٪`)
  if (val(p, 'inboundDelay') > 0) out.push(`محموله ورودی ${days(val(p, 'inboundDelay'))} دیرتر`)
  if (val(p, 'transfer') > 0) out.push(`انتقال ${tons(val(p, 'transfer'))} از ${f.transfer.source}`)
  if (val(p, 'transfer') > 0 && val(p, 'transferDays') !== val(base, 'transferDays')) out.push(`رسیدن ${days(val(p, 'transferDays'))}`)
  if (val(p, 'purchase') > 0) out.push(`خرید ${tons(val(p, 'purchase'))} · ${days(val(p, 'purchaseDays'))}`)
  if (val(p, 'advance') > 0) out.push(`تحویل ${days(val(p, 'advance'))} زودتر`)
  if (val(p, 'purchaseCost') !== val(base, 'purchaseCost')) out.push(`قیمت خرید ${fa(val(p, 'purchaseCost'), 1)} میلیون`)
  if (val(p, 'transferCost') !== val(base, 'transferCost')) out.push(`هزینه حمل ${fa(val(p, 'transferCost'), 1)} میلیون`)
  return out
}

/** Numbers for the alert's texts, from the «بدون اقدام» run */
function stockTokens(f: StockFacts, r: ModelRun, c: number): Record<string, string> {
  const e = r.emptyDay ?? null
  return {
    stock: fa(f.stock),
    safety: fa(f.safety),
    pct: pct((f.stock / f.safety) * 100),
    deficit: fa(Math.max(0, f.safety - f.stock)),
    consumption: fa(c, 1),
    empty: e === null ? 'بیش از یک سال' : `حدود ${fa(e)} روز`,
    emptyDay: e === null ? '—' : fa(e),
    short: fa(r.values.short),
    late: fa(r.values.gap),
    cover: fa(r.values.cover),
    growth: fa(f.growth ?? 0),
    inbound: f.inbound[0] ? `${tons(f.inbound[0].qty)} روز ${fa(f.inbound[0].day)}` : '',
    inboundQty: f.inbound[0] ? fa(f.inbound[0].qty) : '',
    inboundDay: f.inbound[0] ? fa(f.inbound[0].day) : '',
  }
}
