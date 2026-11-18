import type { IncidentFacts, PoFacts, PriceFacts, RiskFacts } from '../facts'
import { build, val } from '../params'
import { bandOf, days, fa, money, num, pct, range, tons } from '../fmt'
import type { ModelRun, Params, ScenarioModel, VarDef } from '../types'
import { activeCount, diff, metricCost, minOf } from './common'

// ── Type 7 · supplier non-delivery: quantity supplied and delay ──
export function poModel(f: PoFacts): ScenarioModel {
  const vars: VarDef[] = [
    { key: 'fill', role: 'assumption', label: 'نرخ تحویل باقی‌مانده', unit: '٪', min: 0, max: 100, step: 5, source: 'از سیستم خرید', group: 'تأمین و حمل' },
    { key: 'delay', role: 'assumption', label: 'تأخیر تأمین‌کننده', unit: 'روز', min: 0, max: 30, step: 1, source: 'از سیستم خرید', group: 'زمان و مسیر' },
    { key: 'alt', role: 'action', label: `سهم ${f.altSupplier}`, unit: '٪', min: 0, max: 100, step: 5, source: 'از فهرست تأمین‌کنندگان', group: 'تأمین و حمل' },
  ]
  const base = build(vars, { fill: f.fill, delay: f.delay, alt: 0 }, 30)
  const run = (p: Params): ModelRun => {
    const remaining = f.ordered - f.delivered
    const main = remaining * (1 - val(p, 'alt') / 100) * (val(p, 'fill') / 100)
    const altQty = (remaining * val(p, 'alt')) / 100
    const series = range(p.horizon).map((d) => f.delivered + (d >= val(p, 'delay') ? main : 0) + (d >= f.altDays ? altQty : 0))
    const supplied = series.at(-1)!
    const lastDay = Math.max(main > 0 ? val(p, 'delay') : 0, altQty > 0 ? f.altDays : 0)
    const confidence = val(p, 'alt') > 0 ? 74 : 58
    return { series, band: bandOf(series, confidence, 0.5), min: minOf(series), values: { supplied, delay: supplied < f.ordered - 1 ? lastDay + 99 : lastDay }, cost: altQty * 3, confidence }
  }
  const metrics: ScenarioModel['metrics'] = [
    { key: 'supplied', label: 'مقدار تأمین‌شده', unit: 'تن', fmt: (v) => `${num(v)} / ${num(f.ordered)}`, fmtDelta: tons, bad: (v) => v < f.ordered - 1, good: (v) => v >= f.ordered - 1, better: 'higher' },
    { key: 'delay', label: 'تأخیر', fmt: (v) => (v > 90 ? 'تأمین ناقص' : days(v)), fmtDelta: days, bad: (v) => v > 7, good: (v) => v <= 7 },
  ]
  return {
    title: `سفارش خرید ${f.item} · ${f.supplier}`,
    metrics,
    chart: { title: 'تحویل انباشته سفارش', unit: 'تن', refs: [{ value: f.ordered, label: 'مقدار سفارش', tone: 'safe' }] },
    vars,
    fixed: [
      { label: 'سفارش', value: `${tons(f.ordered)} · ${f.po}`, source: 'سیستم خرید' },
      { label: 'تحویل‌شده', value: tons(f.delivered), source: 'سیستم انبار' },
    ],
    base,
    run,
    options: { chase: { patch: { delay: 6, fill: 80 } }, altSupplier: { key: 'alt' }, split: { patch: { alt: 40 } } },
    optionFor: (p) => (val(p, 'alt') >= 50 ? { option: 'altSupplier', amount: val(p, 'alt') } : val(p, 'alt') > 0 ? { option: 'split' } : null),
    isCombined: () => false,
    describe: (p) => [...diff(p, base, 'fill', (v) => `تحویل ${pct(v)}`), ...diff(p, base, 'delay', (v) => `تأخیر ${days(v)}`), ...(val(p, 'alt') ? [`جایگزین ${pct(val(p, 'alt'))} از ${f.altSupplier}`] : [])],
    templates: [
      { key: 'zero', group: 'stress', name: 'توقف کامل تحویل', note: 'باقی‌مانده سفارش تحویل نمی‌شود', patch: { fill: 0 } },
      { key: 'alt', group: 'action', name: 'سفارش کامل از جایگزین', note: `کل باقی‌مانده از ${f.altSupplier}`, patch: { alt: 100 } },
    ],
    tokens: () => ({ pct: pct((f.delivered / f.ordered) * 100), delay: fa(f.delay), po: f.po, remaining: fa(f.ordered - f.delivered) }),
    noActionCost: (p) => metricCost(metrics, run(p)),
    facts: f,
  }
}

// ── Type 8 · supplier risk: share at risk and the cost of diversifying ──
export function riskModel(f: RiskFacts): ScenarioModel {
  const vars: VarDef[] = [
    { key: 'outage', role: 'assumption', label: 'قطع تأمین‌کننده', unit: 'روز', min: 0, max: 60, step: 5, source: 'فرض سناریو', group: 'ریسک' },
    { key: 'diversify', role: 'action', label: 'انتقال سهم به دیگران', unit: '٪', min: 0, max: 60, step: 5, source: 'از فهرست تأمین‌کنندگان', group: 'تأمین و حمل' },
  ]
  const base = build(vars, { outage: 0, diversify: 0 }, 30)
  const run = (p: Params): ModelRun => {
    const exposure = Math.max(0, f.share - val(p, 'diversify'))
    const series = range(p.horizon).map((d) => f.share - val(p, 'diversify') * Math.min(1, d / 14))
    const lost = Math.round((exposure / 100) * val(p, 'outage') * f.daily)
    // Few comparable cases: estimates stay weak (below 50 %)
    const confidence = 45
    return { series, band: bandOf(series, confidence, 0.3), min: minOf(series), values: { exposure, lost }, cost: val(p, 'diversify') * 12, confidence }
  }
  const metrics: ScenarioModel['metrics'] = [
    { key: 'exposure', label: 'سهم در معرض ریسک', fmt: pct, bad: (v) => v > f.cap, good: (v) => v <= 30 },
    { key: 'lost', label: 'کمبود در صورت قطع', unit: 'تن', fmt: num, bad: (v) => v > 0 },
  ]
  return {
    title: `ریسک تأمین‌کننده ${f.item} · ${f.supplier}`,
    metrics,
    chart: { title: 'سهم خرید از تأمین‌کننده پرریسک', unit: '٪', refs: [{ value: f.cap, label: 'سقف تمرکز', tone: 'crit' }] },
    vars,
    fixed: [
      { label: 'امتیاز تأمین‌کننده', value: `${fa(f.score)} از ۱۰۰`, source: 'داده تأمین‌کنندگان' },
      { label: 'سهم فعلی', value: pct(f.share), source: 'سیستم خرید' },
    ],
    base,
    run,
    options: { diversify: { key: 'diversify' }, contract: {} },
    optionFor: (p) => (val(p, 'diversify') > 0 ? { option: 'diversify', amount: val(p, 'diversify') } : null),
    isCombined: () => false,
    describe: (p) => [...(val(p, 'outage') ? [`قطع ${days(val(p, 'outage'))}`] : []), ...(val(p, 'diversify') ? [`تنوع‌بخشی ${pct(val(p, 'diversify'))}`] : [])],
    templates: [
      { key: 'cut30', group: 'stress', name: 'قطع ۳۰ روزه تأمین‌کننده', note: `هیچ تحویلی از ${f.supplier} برای یک ماه`, patch: { outage: 30 } },
      { key: 'div', group: 'action', name: `کاهش تمرکز به زیر ${fa(f.cap)}٪`, note: '۲۵٪ سهم به تأمین‌کنندگان دیگر', patch: { diversify: 25 } },
    ],
    lead: () => `تمرکز ${pct(f.share)} می‌ماند`,
    tokens: () => ({ score: fa(f.score), share: pct(f.share) }),
    noActionCost: (p) => {
      const cut = run(build(vars, { outage: 30, diversify: 0 }, p.horizon))
      return [
        { label: 'سهم در معرض', value: pct(run(p).values.exposure), tone: 'danger' as const },
        { label: 'کمبود در صورت قطع ۳۰ روزه', value: `حدود ${tons(cut.values.lost)}`, tone: 'danger' as const },
      ]
    },
    facts: f,
  }
}

// ── Type 10 · price / FX / tariff: cost impact and value exposed ──
export function priceModel(f: PriceFacts): ScenarioModel {
  const vars: VarDef[] = [
    { key: 'fx', role: 'assumption', label: 'تغییر نرخ ارز', unit: '٪', min: -10, max: 40, step: 1, source: 'از داده بازار', group: 'هزینه' },
    { key: 'tariff', role: 'assumption', label: 'تغییر تعرفه', unit: '٪', min: 0, max: 20, step: 1, source: 'از داده تجارت', group: 'هزینه' },
    { key: 'hedge', role: 'action', label: 'سهم پوشش ریسک ارزی', unit: '٪', min: 0, max: 100, step: 5, source: 'از واحد مالی', group: 'ریسک' },
    { key: 'forward', role: 'action', label: 'پیش‌خرید با نرخ امروز', unit: 'تن', min: 0, max: 400, step: 20, source: 'از سیستم خرید', group: 'تأمین و حمل', limit: { max: f.room, text: `ظرفیت خالی انبارها برای پیش‌خرید ${fa(f.room)} تن است.` } },
  ]
  const base = build(vars, { fx: f.fx, tariff: 0, hedge: 0, forward: 0 }, 30)
  const monthly = f.monthly * f.price
  const run = (p: Params): ModelRun => {
    const change = (val(p, 'fx') + val(p, 'tariff')) / 100
    const exposed = monthly * (1 - val(p, 'hedge') / 100) - val(p, 'forward') * f.price
    const impact = Math.max(0, exposed) * change
    const series = range(p.horizon).map((d) => (impact * d) / p.horizon)
    const confidence = 66
    return { series, band: bandOf(series, confidence, 0.2), min: 0, values: { impact: Math.round(impact), exposed: Math.round(Math.max(0, exposed)) }, cost: Math.round(val(p, 'hedge') * 6), confidence }
  }
  const metrics: ScenarioModel['metrics'] = [
    { key: 'impact', label: 'اثر بر هزینه', fmt: (v) => `${money(v)} تومان`, bad: (v) => v > f.threshold, money: true },
    { key: 'exposed', label: 'ارزش در معرض', fmt: (v) => `${money(v)} تومان`, bad: (v) => v > 8000 },
  ]
  return {
    title: `افزایش نرخ ارز واردات ${f.item}`,
    metrics,
    chart: { title: 'هزینه اضافه انباشته', unit: 'میلیون تومان', refs: [{ value: f.threshold, label: 'آستانه اثر', tone: 'crit' }] },
    vars,
    fixed: [
      { label: 'خرید ماهانه', value: tons(f.monthly), source: 'سیستم خرید' },
      { label: 'قیمت هر تن', value: `${fa(f.price, 1)} میلیون تومان`, source: 'داده بازار' },
    ],
    base,
    run,
    options: { hedge: { key: 'hedge' }, forward: { key: 'forward' } },
    optionFor: (p) => (activeCount(p, ['hedge', 'forward']) > 1 ? { option: 'combo' } : val(p, 'forward') > 0 ? { option: 'forward', amount: val(p, 'forward') } : val(p, 'hedge') > 0 ? { option: 'hedge', amount: val(p, 'hedge') } : null),
    isCombined: (p) => activeCount(p, ['hedge', 'forward']) > 1,
    describe: (p) => [...diff(p, base, 'fx', (v) => `ارز ${v > 0 ? '+' : ''}${fa(v)}٪`), ...(val(p, 'tariff') ? [`تعرفه +${fa(val(p, 'tariff'))}٪`] : []), ...(val(p, 'hedge') ? [`پوشش ${pct(val(p, 'hedge'))}`] : []), ...(val(p, 'forward') ? [`پیش‌خرید ${tons(val(p, 'forward'))}`] : [])],
    templates: [
      { key: 'fx25', group: 'stress', name: 'جهش ارز ۲۵٪', note: 'نرخ ارز دو برابر تغییر فعلی', patch: { fx: 25 } },
      { key: 'tariff', group: 'stress', name: 'افزایش تعرفه ۱۰٪', note: 'هم‌زمان با تغییر ارز', patch: { tariff: 10 } },
      { key: 'hedge', group: 'action', name: 'پوشش نیمی از خرید', note: 'قرارداد آتی برای ۵۰٪ خرید ماه', patch: { hedge: 50 } },
    ],
    tokens: (p) => ({ fx: fa(f.fx), impact: money(run(p).values.impact), monthly: fa(f.monthly) }),
    noActionCost: (p) => metricCost(metrics, run(p)),
    facts: f,
  }
}

// ── Type 11 · incident: several alerts sharing one root cause ──
export function incidentModel(f: IncidentFacts): ScenarioModel {
  const vars: VarDef[] = [
    { key: 'duration', role: 'assumption', label: 'ادامه ازدحام بندر', unit: 'روز', min: 0, max: 20, step: 1, source: 'از سیستم حمل', group: 'زمان و مسیر' },
    { key: 'alt', role: 'action', label: `مسیر جایگزین ${f.alt} (صرفه‌جویی)`, unit: 'روز', min: 0, max: 6, step: 1, source: 'از واحد حمل‌ونقل', group: 'زمان و مسیر' },
  ]
  const base = build(vars, { duration: f.duration, alt: 0 }, 14)
  const run = (p: Params): ModelRun => {
    const effective = Math.max(0, val(p, 'duration') - val(p, 'alt'))
    const short = f.items.map((i) => Math.max(0, effective - i.cover))
    const series = range(p.horizon).map((d) => f.items.filter((i) => d > i.cover && d <= effective).length)
    const confidence = 64
    return { series, band: bandOf(series, confidence, 0.05), min: minOf(series), values: { items: short.filter((s) => s > 0).length, worst: Math.max(...short) }, cost: val(p, 'alt') * 90, confidence }
  }
  const metrics: ScenarioModel['metrics'] = [
    { key: 'items', label: 'اقلام درگیر', fmt: (v) => `${fa(v)} قلم`, bad: (v) => v > 0, good: (v) => v === 0 },
    { key: 'worst', label: 'بیشترین روز کمبود', fmt: days, bad: (v) => v > 0, good: (v) => v === 0 },
  ]
  return {
    title: `رویداد ازدحام ${f.port}`,
    metrics,
    chart: { title: 'تعداد اقلام در کمبود', unit: 'قلم', refs: [{ value: f.items.length, label: 'همه اقلام', tone: 'crit' }] },
    vars,
    fixed: f.items.map((i) => ({ label: `پوشش ${i.name}`, value: days(i.cover), source: 'سیستم انبار' })),
    base,
    run,
    options: { reroute: { key: 'alt' }, notify: {} },
    optionFor: (p) => (val(p, 'alt') > 0 ? { option: 'reroute', amount: val(p, 'alt') } : null),
    isCombined: () => false,
    describe: (p) => [...diff(p, base, 'duration', (v) => `ازدحام ${days(v)}`), ...(val(p, 'alt') ? [`مسیر ${f.alt} −${days(val(p, 'alt'))}`] : [])],
    templates: [
      { key: 'long', group: 'stress', name: 'ادامه ازدحام ۱۵ روزه', note: 'بدترین برآورد بندر', patch: { duration: 15 } },
      { key: 'alt', group: 'action', name: `انتقال محموله‌ها به ${f.alt}`, note: '۴ روز صرفه‌جویی برای همه اقلام', patch: { alt: 4 } },
    ],
    lead: (p) => `ازدحام حدود ${days(val(p, 'duration'))} ادامه دارد`,
    tokens: (p) => ({ duration: fa(val(p, 'duration')), count: fa(f.items.length), items: fa(run(p).values.items) }),
    noActionCost: (p) => metricCost(metrics, run(p)),
    facts: f,
  }
}
