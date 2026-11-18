import type { AlertDetail, AlertItem, AlertStat } from '../../data/alerts'
import { stockModel } from './models/stock'
import { customsModel, delayModel, stopModel, surplusModel } from './models/shipment'
import { incidentModel, poModel, priceModel, riskModel } from './models/supply'
import type { ScenarioModel } from './types'
import { arrivalDays } from './params'

export * from './types'
export * from './facts'
export * from './params'
export { money, confidenceWord, rangeAt } from './fmt'
export { snoozeWindow } from './snooze'
export { netCost, moneyMetric } from './net'

/**
 * The scenario model of an alert, built from its type (kind) and its facts. Types without a model
 * (stale data, failed sync, missed deadline) return null.
 */
const cache = new Map<string, ScenarioModel | null>()
export function modelFor(alert: Pick<AlertItem, 'id' | 'kind'>, detail: AlertDetail | undefined): ScenarioModel | null {
  if (cache.has(alert.id)) return cache.get(alert.id)!
  const m = detail ? make(alert.kind ?? '', detail) : null
  if (m && detail) withAutoHorizon(m, detail)
  cache.set(alert.id, m)
  return m
}

const LONG = 365
const WEEK = 7
/**
 * One horizon per alert, from the alert's own data: the latest arrival among its options (at their
 * own amounts) and the shipments already on their way, plus a week; at least 7 and at most 60 days.
 * Models without arrivals keep their own. Rows the user builds never move it, so verdicts stay put.
 * The alert panel, the scenario table, the chart and the decision snapshot all read this one value.
 */
function withAutoHorizon(m: ScenarioModel, d: AlertDetail) {
  if (!m.events) return
  // Arrivals are read over a long run: a horizon cut short must not hide the arrival that sets it
  const long: ScenarioModel = { ...m, base: { ...m.base, horizon: LONG } }
  const inbound = m.events(long.base).map((e) => e.day)
  const options = d.options.map((o) => arrivalDays(long, o.id, o.amount)).filter((x): x is number => x != null)
  const latestOption = options.length ? Math.max(...options) : -1
  const latestInbound = inbound.length ? Math.max(...inbound) : -1
  const latest = Math.max(latestOption, latestInbound)
  if (latest < 0) return
  m.base = { ...m.base, horizon: Math.min(60, Math.max(WEEK, latest + WEEK)) }
  m.horizonFrom = { day: latest, from: latestOption >= latestInbound ? 'option' : 'inbound' }
}

function make(kind: string, d: AlertDetail): ScenarioModel | null {
  const fx = d.facts
  switch (kind) {
    case 'موجودی کمتر از حد ایمن':
      return d.stock ? stockModel(d.stock, 'shortage') : null
    case 'پیش‌بینی اتمام موجودی':
      return d.stock ? stockModel(d.stock, 'forecast') : null
    case 'جهش تقاضا':
      return d.stock ? stockModel(d.stock, 'demand') : null
    case 'مازاد موجودی':
      return fx?.kind === 'surplus' ? surplusModel(fx.f) : null
    case 'تأخیر محموله':
      return fx?.kind === 'delay' ? delayModel(fx.f) : null
    case 'توقف یا اختلال محموله':
      return fx?.kind === 'stop' ? stopModel(fx.f) : null
    case 'گیر در ترخیص':
      return fx?.kind === 'customs' ? customsModel(fx.f) : null
    case 'عدم تحویل تأمین‌کننده':
      return fx?.kind === 'po' ? poModel(fx.f) : null
    case 'ریسک تأمین‌کننده':
      return fx?.kind === 'risk' ? riskModel(fx.f) : null
    case 'تغییر قیمت، ارز یا تعرفه':
      return fx?.kind === 'price' ? priceModel(fx.f) : null
    case 'رویداد':
      return fx?.kind === 'incident' ? incidentModel(fx.f) : null
    // داده قدیمی، همگام‌سازی ناموفق، مهلت گذشته: no scenario
    default:
      return null
  }
}

/** Replace {token}s in a text with the model's numbers */
const fill = (text: string, t: Record<string, string>) => text.replace(/\{(\w+)\}/g, (all, k: string) => t[k] ?? all)

/**
 * The alert's texts with their numbers from the engine («بدون اقدام» run): summary, happened,
 * impact, the «بدون اقدام» lead and the cost of doing nothing. Descriptive words stay in the data.
 */
export function withFigures(alert: Pick<AlertItem, 'id' | 'kind'>, detail: AlertDetail): AlertDetail {
  const m = modelFor(alert, detail)
  if (!m) return detail
  const t = m.tokens(m.base)
  const stat = (s: AlertStat): AlertStat => ({ ...s, value: fill(s.value, t), items: s.items?.map((x) => fill(x, t)) })
  return {
    ...detail,
    summary: fill(detail.summary, t),
    happened: fill(detail.happened, t),
    impact: detail.impact.map(stat),
    why: detail.why?.map((w) => ({ ...w, text: fill(w.text, t), share: w.share && fill(w.share, t) })) ?? null,
    noAction: { lead: m.lead ? m.lead(m.base) : fill(detail.noAction.lead, t), values: null },
    // Engine rows first, then the data's non-numeric rows (who is affected, what stays unknown)
    noActionCost: [...m.noActionCost(m.base), ...detail.noActionCost.map(stat)],
  }
}
