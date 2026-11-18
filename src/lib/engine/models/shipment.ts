import type { CustomsFacts, DelayFacts, StopFacts, SurplusFacts } from '../facts'
import { build, val } from '../params'
import { bandOf, days, fa, money, num, pct, range, tons } from '../fmt'
import type { ModelRun, Params, ScenarioModel, VarDef } from '../types'
import { activeCount, diff, metricCost, minOf } from './common'

// ── Type 3 · surplus: stock above its maximum level ──
export function surplusModel(f: SurplusFacts): ScenarioModel {
  const vars: VarDef[] = [
    { key: 'demand', role: 'assumption', label: 'مصرف روزانه', unit: 'تن', min: 2, max: 15, step: 0.5, source: 'از سیستم انبار', group: 'تقاضا' },
    { key: 'transferOut', role: 'action', label: `انتقال به ${f.dest.name}`, unit: 'تن', min: 0, max: 200, step: 10, source: `از سیستم ${f.dest.name}`, group: 'تأمین و حمل', limit: { max: f.dest.room, text: `ظرفیت خالی ${f.dest.name} ${fa(f.dest.room)} تن است.` } },
    { key: 'transferDays', role: 'action', dependsOn: 'transferOut', label: 'زمان انتقال', unit: 'روز', min: 1, max: 7, step: 1, source: 'از سیستم حمل', group: 'تأمین و حمل' },
    { key: 'pauseDays', role: 'action', label: 'توقف سفارش‌های دوره‌ای', unit: 'روز', min: 0, max: 30, step: 1, source: 'از سیستم خرید', group: 'تأمین و حمل' },
    { key: 'freight', role: 'advanced', for: 'transferOut', label: 'کرایه حمل هر تن', unit: 'میلیون تومان', min: 0.5, max: 5, step: 0.1, source: 'از سیستم حمل', group: 'هزینه' },
  ]
  const base = build(vars, { demand: f.demand, transferOut: 0, transferDays: f.dest.days, pauseDays: 0, freight: f.dest.costPerTon }, 30)
  const run = (p: Params): ModelRun => {
    let s = f.stock
    const series = [s]
    let holding = 0
    for (let d = 1; d <= p.horizon; d++) {
      s = Math.max(0, s - val(p, 'demand'))
      if (d === val(p, 'transferDays')) s = Math.max(0, s - val(p, 'transferOut'))
      if (d % f.every === 0 && d > val(p, 'pauseDays')) s += f.order
      holding += Math.max(0, s - f.max) * 0.04
      series.push(s)
    }
    const confidence = val(p, 'transferOut') > 0 ? 80 : 86
    return { series, band: bandOf(series, confidence, 0.6), min: minOf(series), values: { left: Math.max(0, series.at(-1)! - f.max), hold: Math.round(holding) }, cost: Math.round(val(p, 'transferOut') * val(p, 'freight')), confidence }
  }
  const metrics: ScenarioModel['metrics'] = [
    { key: 'left', label: 'مازاد باقی‌مانده', unit: 'تن', fmt: num, bad: (v) => v > 50, good: (v) => v === 0 },
    { key: 'hold', label: 'هزینه نگهداری', fmt: (v) => `${money(v)} تومان`, bad: (v) => v > 150, money: true },
  ]
  return {
    title: `مازاد ${f.item} · ${f.warehouse}`,
    metrics,
    chart: {
      title: 'موجودی در برابر حد بالا',
      unit: 'تن',
      refs: [
        { value: f.max, label: 'حد بالا', tone: 'crit' },
        { value: f.safety, label: 'حد ایمن', tone: 'safe' },
      ],
    },
    vars,
    fixed: [
      { label: 'موجودی فعلی', value: tons(f.stock), source: 'سیستم انبار' },
      { label: 'حد بالا', value: tons(f.max), source: 'قاعده INV-MAX-01' },
      { label: 'سفارش دوره‌ای', value: `${tons(f.order)} هر ${days(f.every)}`, source: 'سیستم خرید' },
    ],
    base,
    run,
    options: { transferOut: { key: 'transferOut' }, pause: { key: 'pauseDays' } },
    optionFor: (p) => (val(p, 'transferOut') > 0 ? { option: 'transferOut', amount: val(p, 'transferOut') } : val(p, 'pauseDays') > 0 ? { option: 'pause', amount: val(p, 'pauseDays') } : null),
    isCombined: (p) => activeCount(p, ['transferOut', 'pauseDays']) > 1,
    costLines: (p) => (val(p, 'transferOut') > 0 ? [{ what: `انتقال ${tons(val(p, 'transferOut'))}`, rate: val(p, 'freight'), total: val(p, 'transferOut') * val(p, 'freight'), source: 'کرایه از سیستم حمل' }] : []),
    describe: (p) => [...diff(p, base, 'demand', (v) => `مصرف ${fa(v, 1)} تن`), ...(val(p, 'transferOut') ? [`انتقال ${tons(val(p, 'transferOut'))} به ${f.dest.name}`] : []), ...(val(p, 'pauseDays') ? [`توقف سفارش ${days(val(p, 'pauseDays'))}`] : [])],
    templates: [
      { key: 'slow', group: 'stress', name: 'کاهش تقاضا ۳۰٪', note: 'مصرف روزانه ۳۰٪ کمتر', patch: { demand: +(f.demand * 0.7).toFixed(1) } },
      { key: 'move', group: 'action', name: 'انتقال مازاد به نزدیک‌ترین انبار', note: 'به اندازه مازاد، محدود به ظرفیت مقصد', patch: { transferOut: Math.min(f.stock - f.max, f.dest.room) } },
      { key: 'pause', group: 'action', name: 'توقف سفارش تا رسیدن به حد بالا', note: 'سفارش‌های دوره‌ای ۲۱ روز متوقف', patch: { pauseDays: 21 } },
    ],
    tokens: () => ({ stock: fa(f.stock), max: fa(f.max), surplus: fa(f.stock - f.max) }),
    noActionCost: (p) => metricCost(metrics, run(p)),
    facts: f,
  }
}

// ── Type 4 · shipment delay: the waiting item's stock until the shipment lands ──
export function delayModel(f: DelayFacts): ScenarioModel {
  // «Affected» = stock at arrival under the critical level. With the rule's figure use it; without it the
  // old half-of-safety stands in.
  // TODO: needs f.critical
  const criticalLevel = f.critical ?? f.safety / 2
  const vars: VarDef[] = [
    { key: 'port', role: 'assumption', label: 'انتظار در لنگرگاه', unit: 'روز', min: 0, max: 15, step: 1, source: 'از سیستم حمل', group: 'زمان و مسیر' },
    { key: 'weather', role: 'assumption', label: 'توقف به دلیل شرایط جوی', unit: 'روز', min: 0, max: 6, step: 1, source: 'از سیستم حمل', group: 'زمان و مسیر' },
    { key: 'expedite', role: 'action', label: 'تسریع تخلیه (صرفه‌جویی)', unit: 'روز', min: 0, max: 4, step: 1, source: 'از واحد حمل‌ونقل', group: 'زمان و مسیر' },
    { key: 'alt', role: 'action', label: 'مسیر جایگزین (صرفه‌جویی)', unit: 'روز', min: 0, max: 5, step: 1, source: 'از واحد حمل‌ونقل', group: 'زمان و مسیر' },
    { key: 'transfer', role: 'action', seek: true, label: `انتقال موقت ${f.item} از ${f.bridge.source}`, unit: 'تن', min: 0, max: 120, step: 10, source: `از سیستم ${f.bridge.source}`, group: 'تأمین و حمل', limit: { max: f.bridge.surplus, text: `مازاد ${f.item} در ${f.bridge.source} ${fa(f.bridge.surplus)} تن است.` } },
  ]
  const base = build(vars, { port: f.anchorage, weather: f.weather, expedite: 0, alt: 0, transfer: 0 }, 14)
  const run = (p: Params): ModelRun => {
    const final = Math.max(0, val(p, 'port') + val(p, 'weather') - val(p, 'expedite') - val(p, 'alt'))
    const arrival = Math.max(1, final - f.elapsed)
    let s = f.stock
    let atArrival = 0
    const series = [s]
    for (let d = 1; d <= p.horizon; d++) {
      s = Math.max(0, s - f.use)
      if (d === f.bridge.days) s += val(p, 'transfer')
      if (d === arrival) {
        atArrival = s
        s += f.share
      }
      series.push(s)
    }
    const confidence = val(p, 'expedite') || val(p, 'alt') ? 76 : 70
    return { series, band: bandOf(series, confidence, 0.8), min: minOf(series), values: { final, affected: atArrival < criticalLevel ? 1 : 0, arrival }, cost: val(p, 'expedite') * 45 + val(p, 'alt') * 35 + val(p, 'transfer') * 1.5, confidence }
  }
  const metrics: ScenarioModel['metrics'] = [
    { key: 'final', label: 'تأخیر نهایی', short: 'تأخیر', fmt: days, bad: (v) => v > 3, good: (v) => v <= 2 },
    { key: 'affected', label: 'اقلام متأثر', short: 'کالای متأثر', fmt: (v) => `${fa(v)} قلم`, bad: (v) => v > 0, good: (v) => v === 0 },
  ]
  return {
    title: `تأخیر محموله ${f.item} · ${f.port}`,
    metrics,
    chart: { title: `موجودی ${f.item} تا رسیدن محموله`, unit: 'تن', refs: [{ value: f.safety, label: 'حد ایمن', tone: 'safe' }, ...(f.critical != null ? [{ value: f.critical, label: 'مرز بحرانی', tone: 'crit' as const }] : [])] },
    vars,
    fixed: [
      { label: `موجودی ${f.item}`, value: tons(f.stock), source: 'سیستم انبار' },
      { label: 'محموله', value: `${tons(f.shipment)} · سهم این انبار ${tons(f.share)}`, source: 'سیستم حمل' },
    ],
    base,
    run,
    options: { refer: { patch: { expedite: 2 } }, transfer: { key: 'transfer' }, eta: {} },
    optionFor: (p) => (val(p, 'transfer') > 0 && (val(p, 'expedite') || val(p, 'alt')) ? { option: 'combo' } : val(p, 'transfer') > 0 ? { option: 'transfer', amount: val(p, 'transfer') } : val(p, 'expedite') > 0 || val(p, 'alt') > 0 ? { option: 'refer' } : null),
    isCombined: (p) => val(p, 'transfer') > 0 && activeCount(p, ['expedite', 'alt']) > 0,
    describe: (p) => [
      ...diff(p, base, 'port', (v) => `لنگرگاه ${days(v)}`),
      ...diff(p, base, 'weather', (v) => `جوی ${days(v)}`),
      ...(val(p, 'expedite') ? [`تسریع ${days(val(p, 'expedite'))}`] : []),
      ...(val(p, 'alt') ? [`مسیر جایگزین −${days(val(p, 'alt'))}`] : []),
      ...(val(p, 'transfer') ? [`انتقال ${tons(val(p, 'transfer'))} از ${f.bridge.source}`] : []),
    ],
    templates: [
      { key: 'port7', group: 'stress', name: 'تأخیر بندر ۷ روز', note: 'انتظار در لنگرگاه ۷ روز بیشتر', patch: { port: f.anchorage + 7 } },
      { key: 'storm', group: 'stress', name: 'ادامه شرایط جوی', note: '۳ روز توقف بیشتر', patch: { weather: f.weather + 3 } },
      { key: 'fast', group: 'action', name: 'تسریع تخلیه با هزینه', note: 'اولویت پهلوگیری، ۲ روز زودتر', patch: { expedite: 2 } },
      { key: 'bridge', group: 'action', name: 'پوشش موقت از انبار دیگر', note: 'انتقال ۶۰ تن تا رسیدن محموله', patch: { transfer: 60 } },
    ],
    lead: (p) => `رسیدن حدود روز ${fa(run(p).values.arrival)}`,
    events: (p) => [...(val(p, 'transfer') > 0 && f.bridge.days <= p.horizon ? [{ day: f.bridge.days, label: 'رسیدن انتقال' }] : []), ...(run(p).values.arrival <= p.horizon ? [{ day: run(p).values.arrival, label: 'محموله ورودی' }] : [])],
    tokens: (p) => {
      const r = run(p)
      return { shipment: fa(f.shipment), delay: fa(r.values.final), arrival: fa(r.values.arrival), ratio: pct((f.stock / f.safety) * 100) }
    },
    noActionCost: (p) => {
      const r = run(p)
      const low = r.series.slice(0, r.values.arrival + 1)
      return [...metricCost(metrics, r), { label: `${f.item} تا رسیدن`, value: `حدود ${pct((Math.min(...low) / f.safety) * 100)} حد ایمن`, tone: 'danger' as const }]
    },
    facts: f,
  }
}

// ── Type 5 · shipment stopped: recovery time and the risk of losing the cargo ──
export function stopModel(f: StopFacts): ScenarioModel {
  const vars: VarDef[] = [
    { key: 'stop', role: 'assumption', label: 'ادامه توقف (برآورد)', unit: 'روز', min: 0, max: 10, step: 1, source: 'از سیستم حمل', group: 'زمان و مسیر' },
    { key: 'contact', role: 'action', label: 'پیگیری با حمل‌کننده (صرفه‌جویی)', unit: 'روز', min: 0, max: 2, step: 1, source: 'از واحد حمل‌ونقل', group: 'زمان و مسیر' },
    { key: 'reroute', role: 'action', label: 'تغییر مسیر (صرفه‌جویی)', unit: 'روز', min: 0, max: 3, step: 1, source: 'از واحد حمل‌ونقل', group: 'زمان و مسیر' },
  ]
  const base = build(vars, { stop: f.stop, contact: 0, reroute: 0 }, 14)
  const run = (p: Params): ModelRun => {
    const recovery = Math.max(0, val(p, 'stop') - val(p, 'contact') - val(p, 'reroute'))
    const risk = Math.min(90, 8 + recovery * 6)
    const series = range(p.horizon).map((d) => (d < recovery ? 8 + d * 6 : 5))
    const confidence = 62
    return { series, band: bandOf(series, confidence, 0.4), min: minOf(series), values: { recovery, risk }, cost: val(p, 'reroute') * 80 + val(p, 'contact') * 5, confidence }
  }
  const metrics: ScenarioModel['metrics'] = [
    { key: 'recovery', label: 'زمان بازیابی', fmt: days, bad: (v) => v > 3, good: (v) => v <= 1 },
    { key: 'risk', label: 'ریسک از دست رفتن', fmt: pct, bad: (v) => v > 25, good: (v) => v <= 15 },
  ]
  return {
    title: `توقف محموله ${f.item} · ${f.place}`,
    metrics,
    chart: { title: 'ریسک از دست رفتن محموله', unit: '٪', refs: [{ value: 30, label: 'آستانه ریسک', tone: 'crit' }] },
    vars,
    fixed: [
      { label: 'بی‌خبری از موقعیت', value: `${fa(f.silentHours)} ساعت`, source: 'سیستم حمل' },
      { label: 'محموله', value: `${tons(f.qty)} ${f.item}`, source: 'سیستم حمل' },
    ],
    base,
    run,
    options: { contact: { key: 'contact', patch: { contact: 1 } }, reroute: { key: 'reroute' } },
    optionFor: (p) => (val(p, 'reroute') > 0 && val(p, 'contact') > 0 ? { option: 'combo' } : val(p, 'reroute') > 0 ? { option: 'reroute', amount: val(p, 'reroute') } : val(p, 'contact') > 0 ? { option: 'contact', amount: val(p, 'contact') } : null),
    isCombined: (p) => activeCount(p, ['contact', 'reroute']) > 1,
    describe: (p) => [...diff(p, base, 'stop', (v) => `توقف ${days(v)}`), ...(val(p, 'contact') ? ['پیگیری با حمل‌کننده'] : []), ...(val(p, 'reroute') ? [`تغییر مسیر −${days(val(p, 'reroute'))}`] : [])],
    templates: [
      { key: 'long', group: 'stress', name: 'توقف طولانی ۸ روزه', note: 'دو برابر برآورد فعلی', patch: { stop: f.stop * 2 } },
      { key: 'reroute', group: 'action', name: 'تغییر مسیر به چابهار', note: '۲ روز صرفه‌جویی با هزینه بیشتر', patch: { reroute: 2 } },
    ],
    tokens: (p) => ({ hours: fa(f.silentHours), risk: pct(run(p).values.risk), qty: fa(f.qty) }),
    noActionCost: (p) => metricCost(metrics, run(p)),
    facts: f,
  }
}

// ── Type 6 · stuck in customs: days to release and demurrage ──
export function customsModel(f: CustomsFacts): ScenarioModel {
  const vars: VarDef[] = [
    { key: 'docs', role: 'action', label: 'زمان تکمیل مدارک', unit: 'روز', min: 0, max: 10, step: 1, source: 'از سامانه گمرک', group: 'زمان و مسیر' },
    { key: 'clear', role: 'assumption', label: 'ترخیص پس از مدارک', unit: 'روز', min: 1, max: 5, step: 1, source: 'از سامانه گمرک', group: 'زمان و مسیر' },
    { key: 'rate', role: 'advanced', label: 'دموراژ روزانه', unit: 'میلیون تومان', min: 60, max: 200, step: 10, source: 'از قرارداد حمل', group: 'هزینه' },
  ]
  const base = build(vars, { docs: f.docs, clear: f.clear, rate: f.rate }, 14)
  const run = (p: Params): ModelRun => {
    const release = val(p, 'docs') + val(p, 'clear')
    const series = range(p.horizon).map((d) => Math.min(d, release) * val(p, 'rate'))
    const confidence = val(p, 'docs') === 0 ? 80 : 60
    return { series, band: bandOf(series, confidence, 0.15), min: 0, values: { release, demurrage: release * val(p, 'rate') }, cost: 0, confidence }
  }
  const metrics: ScenarioModel['metrics'] = [
    { key: 'release', label: 'روز تا ترخیص', short: 'زمان ترخیص', fmt: days, bad: (v) => v > 3, good: (v) => v <= 2 },
    { key: 'demurrage', label: 'هزینه دموراژ', short: 'دموراژ', fmt: (v) => `${money(v)} تومان`, bad: (v) => v > f.budget, money: true },
  ]
  return {
    title: `ترخیص محموله ${f.item} · ${f.port}`,
    metrics,
    chart: { title: 'هزینه دموراژ انباشته', unit: 'میلیون تومان', refs: [{ value: f.budget, label: 'سقف بودجه', tone: 'crit' }] },
    vars,
    fixed: [
      { label: 'ماندن تا امروز', value: days(f.dwell), source: 'سامانه گمرک' },
      { label: 'محموله', value: `${tons(f.qty)} ${f.item}`, source: 'سیستم حمل' },
    ],
    base,
    run,
    options: { docs: { patch: { docs: 0 } }, eta: {} },
    optionFor: (p) => (val(p, 'docs') < f.docs ? { option: 'docs' } : null),
    isCombined: () => false,
    describe: (p) => [...diff(p, base, 'docs', (v) => `مدارک ${days(v)}`), ...diff(p, base, 'clear', (v) => `ترخیص ${days(v)}`), ...diff(p, base, 'rate', (v) => `دموراژ ${money(v)}`)],
    templates: [
      { key: 'slow', group: 'stress', name: 'قطعی دوباره سامانه گمرک', note: '۳ روز تأخیر بیشتر در ترخیص', patch: { clear: f.clear + 3 } },
      { key: 'docs', group: 'action', name: 'تکمیل فوری مدارک', note: 'گواهی بهداشت امروز ارسال شود', patch: { docs: 0 } },
    ],
    tokens: (p) => ({ qty: fa(f.qty), dwell: fa(f.dwell), release: fa(run(p).values.release) }),
    noActionCost: (p) => metricCost(metrics, run(p)),
    facts: f,
  }
}
