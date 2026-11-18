import type { AlertDetail, AlertOption } from '../../data/overview'
import type { Scenario, ScenarioDraft, ScenarioOrigin } from '../../lib/alertStore'
import { activeActions, money, newScenarioId, paramsForOption, val, withValues } from '../../lib/engine'
import type { Metric, ModelRun, Params, ScenarioModel } from '../../lib/engine'
import { fa } from '../../components/overview/AlertParts'
import { onlyHolder } from '../../lib/access'
import type { Access } from '../../lib/access'

/** Row colour = its chart line; the reference keeps the danger red of «بدون اقدام» */
// None orange, amber or green (the risk chips' colours) and no sky (too close to primary). Cyan is the
// 600 shade: the 500 one is only 2.4:1 on a white card, under the 3:1 a chart line needs.
export const COLORS = ['var(--raw-slate-400)', 'var(--color-primary)', 'var(--raw-fuchsia-500)', 'var(--raw-violet-500)', 'var(--raw-cyan-600)', 'var(--raw-amber-500)']
/** Rows the table holds, the reference included */
export const MAX_SCENARIOS = 6
export const ORIGIN: Record<ScenarioOrigin, string> = {
  reference: 'مبنای مقایسه',
  alert: 'گزینهٔ هشدار',
  user: 'ساخته شما',
  template: 'آماده',
}

export const fill = (s: string, n?: number) => s.replace('{n}', fa(n ?? 0))
const roleOf = (m: ScenarioModel, key: string) => m.vars.find((v) => v.key === key)?.role

/** The shared assumptions at their real values (the alert's data) */
export const baseAssumptions = (m: ScenarioModel) => Object.fromEntries(m.vars.filter((v) => v.role === 'assumption').map((v) => [v.key, val(m.base, v.key)]))

/** What a scenario actually runs with: its actions and prices + the page's shared assumptions; the alert's horizon */
export const effective = (d: ScenarioDraft, s: Scenario): Params => ({
  actions: s.params.actions,
  assumptions: { ...s.params.assumptions, ...d.assumptions },
  horizon: s.params.horizon,
})

/**
 * Any saved draft, brought to today's rules: shared assumptions (from the data when missing), the
 * alert's one horizon on every row (§7), and prices back to how the row started — the data's, or a
 * ready-made scenario's own rate (§5: nobody sets prices by hand any more).
 */
export function normalizeDraft(d: ScenarioDraft, m: ScenarioModel): ScenarioDraft {
  const h = m.base.horizon
  const prices = m.vars.filter((v) => v.role === 'advanced')
  const fix = (x: Params, from: Params): Params => ({ ...x, horizon: h, assumptions: { ...x.assumptions, ...Object.fromEntries(prices.map((v) => [v.key, val(from, v.key)])) } })
  const list = d.list.map((s) => ({
    ...s,
    params: fix(s.params, s.initial),
    initial: fix(s.initial, s.initial),
    initialName: s.initialName ?? s.name,
    initialOrigin: s.initialOrigin ?? s.origin,
    // A row named by hand before (the old «renamed» flag) keeps its name
    autoName: s.autoName ?? !(s as Scenario & { renamed?: boolean }).renamed,
  }))
  const { horizon: _old, ...rest } = d as ScenarioDraft & { horizon?: number }
  return { ...rest, list, assumptions: d.assumptions ?? baseAssumptions(m) }
}

/**
 * A row's automatic name (§4): an alert option's own title when the row is that option, plus what else
 * differs from it (e.g. «· رسیدن ۴ روز»); otherwise what the actions are. Never prices, never assumptions.
 */
export function autoName(detail: AlertDetail, m: ScenarioModel, p: Params): string {
  const acts = (q: Params) => m.describe({ ...m.base, actions: q.actions })
  const match = resolveOption(detail, m, p)
  if (match) {
    const amount = match.amount ?? match.option.amount
    const own = new Set(acts(paramsForOption(m, match.option.id, amount)))
    const extra = acts(p).filter((x) => !own.has(x))
    return [fill(match.option.title, amount), ...extra].join(' · ')
  }
  return acts(p).slice(0, 2).join(' + ') || 'سناریوی خالی'
}

/** The alert option a scenario stands for: by id, else the option of the same kind */
export function resolveOption(detail: AlertDetail, m: ScenarioModel, p: Params): { option: AlertOption; amount?: number } | null {
  const r = m.optionFor(p)
  if (!r) return null
  // By id; else by kind, but only an option that itself means this action in the model (ALR-1024's
  // «تحویل زودتر سفارش» is kind «supply» yet brings the ordered shipment forward: not a new purchase)
  const sameAction = (x: AlertOption) => !m.options[x.id] || m.optionFor(paramsForOption(m, x.id, x.amount))?.option === r.option
  const o = detail.options.find((x) => x.id === r.option) ?? detail.options.find((x) => x.kind === r.option && sameAction(x))
  if (!o) return null
  // An option with a fixed amount (no «{n}» in its title, e.g. the combined one) is that amount only:
  // the alert would record its title, so a scenario matches it only with exactly its actions
  const fixed = fixedOptionPatch(m, o)
  if (fixed && Object.entries(fixed).some(([k, v]) => val(p, k) !== v)) return null
  return { option: o, amount: r.amount }
}

/** The actions an option with a fixed amount stands for, or null when its amount is free («{n}») */
export function fixedOptionPatch(m: ScenarioModel, o: AlertOption): Record<string, number> | null {
  const def = m.options[o.id]
  if (!def || o.title.includes('{n}')) return null
  const target = paramsForOption(m, o.id, o.amount)
  const keys = [...Object.keys(def.patch ?? {}), ...(def.key ? [def.key] : [])].filter((k) => roleOf(m, k) === 'action')
  return keys.length ? Object.fromEntries(keys.map((k) => [k, val(target, k)])) : null
}

/**
 * An option that sets actions. Referrals modelled only as better assumptions (e.g. «پیگیری با
 * تأمین‌کننده») are not scenarios: a scenario never changes assumptions on the alert's behalf.
 */
export function isActionOption(m: ScenarioModel, optionId: string) {
  const def = m.options[optionId]
  if (!def) return false
  return (def.key ? roleOf(m, def.key) === 'action' : false) || Object.keys(def.patch ?? {}).some((k) => roleOf(m, k) === 'action')
}

/** «بدون اقدام», then one row per alert option the model can simulate; ids are permanent */
export function initialDraft(detail: AlertDetail, m: ScenarioModel, blocked: (o: AlertOption) => boolean = () => false): ScenarioDraft {
  const row = (n: number, name: string, origin: ScenarioOrigin, p: Params, option?: string): Scenario => ({
    id: newScenarioId(),
    n,
    name,
    origin,
    params: p,
    initial: p,
    option,
    initialName: name,
    initialOrigin: origin,
  })
  const list: Scenario[] = [row(0, 'بدون اقدام', 'reference', m.base)]
  for (const o of detail.options) {
    if (!isActionOption(m, o.id) || list.length >= MAX_SCENARIOS) continue
    list.push(row(list.length, fill(o.title, o.amount), 'alert', paramsForOption(m, o.id, o.amount), o.id))
  }
  // Selected first: the suggestion if no unit turned it down, else any action row not turned down, else «بدون اقدام»
  const ok = (s: Scenario) => s.origin !== 'reference' && !detail.options.some((o) => o.id === s.option && blocked(o))
  const rec = list.findIndex((s) => ok(s) && s.option === detail.options.find((o) => o.recommended)?.id)
  const any = list.findIndex(ok)
  return {
    list,
    selected: rec > 0 ? rec : any > 0 ? any : 0,
    saved: false,
    assumptions: baseAssumptions(m),
  }
}

/** The action a scenario becomes on the alert: the option, «بدون اقدام» or «ترکیبی» */
export function actionOf(detail: AlertDetail, m: ScenarioModel, p: Params): { label: string; kind: 'none' | 'option' | 'combined' | 'unmatched' } {
  if (activeActions(m, p).length === 0) return { label: 'بدون اقدام', kind: 'none' }
  const match = resolveOption(detail, m, p)
  if (match)
    return {
      label: fill(match.option.title, match.amount ?? match.option.amount),
      kind: m.isCombined(p) ? 'combined' : 'option',
    }
  if (m.isCombined(p)) return { label: 'ترکیبی', kind: 'combined' }
  return { label: 'جور نیست با گزینه‌های هشدار', kind: 'unmatched' }
}

/** Shared assumptions that differ from the alert's data, in words */
export function assumedChanges(m: ScenarioModel, p: Params): string[] {
  const only: Params = {
    actions: m.base.actions,
    assumptions: {
      ...m.base.assumptions,
      ...Object.fromEntries(Object.entries(p.assumptions).filter(([k]) => roleOf(m, k) === 'assumption')),
    },
    horizon: m.base.horizon,
  }
  return m.describe(only)
}

/** How many shared assumptions differ from the alert's data */
export const changedAssumptions = (m: ScenarioModel, d: ScenarioDraft) => m.vars.filter((v) => v.role === 'assumption' && d.assumptions[v.key] !== undefined && d.assumptions[v.key] !== val(m.base, v.key)).length

/** The outcome metric (the one «نسبت به بدون اقدام» and risk read) */
export const outcomeMetric = (cols: [Metric, Metric]) => cols.find((c) => !c.neutral) ?? cols[1]

/** «۸ روز کمتر» — better is green, worse amber, same is muted */
export function versusBase(metric: Metric, run: ModelRun, base: ModelRun): { arrow: '▲' | '▼'; text: string; full: string; tone: 'better' | 'worse' } | null {
  const v = run.values[metric.key]
  const b = base.values[metric.key]
  if (Math.abs(v - b) < 1e-9) return null
  const d = Math.abs(v - b)
  const amount = metric.fmtDelta ? metric.fmtDelta(d) : metric.unit ? `${metric.fmt(d)} ${metric.unit}` : metric.fmt(d)
  // Better follows the metric's own direction (lower by default); `neutral` only mutes the figure itself
  const better = metric.better === 'higher' ? v > b : v < b
  return { arrow: v > b ? '▲' : '▼', text: amount, full: `${amount} ${v > b ? 'بیشتر' : 'کمتر'} از بدون اقدام`, tone: better ? 'better' : 'worse' }
}

/** «خالص» in words: «۳۷ میلیون بیشتر» / «۵۸ میلیون کمتر» / «برابر با بدون اقدام»; the full sentence for screen readers */
export function netWords(net: number): { arrow: '▲' | '▼' | null; text: string; full: string; tone: 'better' | 'worse' | 'same' } {
  if (net === 0) return { arrow: null, text: 'برابر با بدون اقدام', full: 'خالص برابر با بدون اقدام', tone: 'same' }
  const amount = money(Math.abs(net))
  const word = net > 0 ? 'بیشتر' : 'کمتر'
  return { arrow: net > 0 ? '▲' : '▼', text: `${amount} ${word}`, full: `خالص ${amount} تومان ${word} از بدون اقدام`, tone: net > 0 ? 'worse' : 'better' }
}

export type Risk = { level: 'high' | 'medium' | 'low'; reason: string }
/**
 * Risk of a scenario, from the run with its effective params. High: stock runs out within the horizon,
 * or the outcome misses its goal; medium: under the critical line or a weak estimate; low otherwise.
 * The reason says what really happens: «کمبود از روز n» only when demand goes unmet.
 */
export function riskOf(m: ScenarioModel, cols: [Metric, Metric], r: ModelRun, horizon: number): Risk {
  const out = outcomeMetric(cols)
  const v = r.values[out.key]
  const e = r.emptyDay
  if (e != null && e <= horizon) {
    const fs = r.firstShort
    return {
      level: 'high',
      reason: fs != null && fs <= horizon ? `کمبود از روز ${fa(fs)}` : `موجودی روز ${fa(e)} به صفر می‌رسد`,
    }
  }
  if (out.bad(v))
    return {
      level: 'high',
      reason: `${out.short ?? out.label}: ${out.fmt(v)}`,
    }
  const crit = m.chart.refs.find((x) => x.tone === 'crit')
  if (crit && r.min < crit.value) return { level: 'medium', reason: 'زیر مرز بحرانی' }
  if (r.confidence < 50) return { level: 'medium', reason: 'اطمینان پایین' }
  return { level: 'low', reason: crit ? 'بالای مرز بحرانی' : 'بدون کمبود' }
}
export const RISK_LABEL: Record<Risk['level'], string> = {
  high: 'بالا',
  medium: 'متوسط',
  low: 'کم',
}

/** Only the system's suggestion carries a tag («پیشنهادی»); every row comes from the alert anyway */
export const isSystemPickRow = (s: Scenario, systemPick: string | undefined) => s.origin === 'alert' && !!s.option && s.option === systemPick

/**
 * The one row the «پیشنهادی» tag goes on: the alert's own row for the suggested option, else the
 * first row whose actions are exactly the suggestion (re-added from the menu or built by hand).
 */
export function pickRowId(list: Scenario[], m: ScenarioModel, detail: AlertDetail, systemPick: string | undefined): string | null {
  if (!systemPick) return null
  const own = list.find((s) => isSystemPickRow(s, systemPick))
  if (own) return own.id
  const o = detail.options.find((x) => x.id === systemPick)
  if (!o || !m.options[o.id]) return null
  const p = paramsForOption(m, o.id, o.amount)
  return list.find((s) => s.origin !== 'reference' && sameActions(m, s.params, p))?.id ?? null
}

/** Short name at the end of a chart line: «ترکیبی», else the first two words */
export const shortName = (s: Scenario, combined: boolean) => (combined ? 'ترکیبی' : s.name.split(/\s+/).slice(0, 2).join(' '))

/** A scenario's actions or prices differ from what it started with */
export const changedFromInitial = (m: ScenarioModel, s: Scenario) => m.vars.some((v) => v.role === 'action' && val(s.params, v.key) !== val(s.initial, v.key))

/** A unit turned down an action (lib/recommend): who, why, and which options it covers */
export type UnitRejection = { unit: string; reason: string; blocked: (o: AlertOption) => boolean }

export type ApplyBlock = {
  reason: 'reference' | 'assumptions' | 'combined' | 'invalid' | 'closed' | 'viewer' | 'unmatched' | 'access' | 'unitRejected'
  text: string
  varKey?: string
  /** Values that would make it applicable (the alert's combined option) */ patch?: Record<string, number>
} | null

/** Why «اعمال روی هشدار» is off, in the order the user can fix it (`p`: the scenario's effective params) */
export function applyBlock(o: { sel: Scenario; p: Params; m: ScenarioModel; detail: AlertDetail; closed: boolean; viewer: boolean; access?: Access; unit?: UnitRejection | null }): ApplyBlock {
  const { sel, p, m, detail } = o
  if (o.viewer) return { reason: 'viewer', text: 'برای اعمال، دسترسی رسیدگی لازم است.' }
  if (o.closed)
    return {
      reason: 'closed',
      text: 'این هشدار بسته شده؛ سناریو نگه داشته شد.',
    }
  // Someone else holds it (moved, another unit, an open review): say who can act
  if (o.access && !o.access.canAct)
    return {
      reason: 'access',
      text: o.access.block?.kind === 'held' ? `این هشدار در دست ${o.access.holder} است؛ اول در هشدار «ادامه می‌دهم» را بزنید. سناریو نگه داشته شد.` : `${onlyHolder(o.access)}؛ سناریو نگه داشته شد.`,
    }
  if (sel.origin === 'reference')
    return {
      reason: 'reference',
      text: 'بدون اقدام را نمی‌توان اعمال کرد؛ یک سناریو با اقدام انتخاب کنید.',
    }
  if (activeActions(m, p).length === 0)
    return {
      reason: 'assumptions',
      text: assumedChanges(m, p).length ? 'این سناریو فقط بدتر شدن شرایط را می‌سنجد و اقدامی ندارد.' : 'این سناریو اقدامی ندارد.',
    }
  // The same rule as the add menu and the row tags (8-الف), in the footer's fuller words
  const c = canApply(detail, m, p, o.unit)
  if (c.ok) return null
  if (c.code === 'combined') {
    const combo = comboOption(detail, m)
    if (combo)
      return {
        reason: 'combined',
        text: `ترکیب در هشدار فقط «${combo.x.title}» است؛ مقدارها را همین کنید یا یکی را صفر کنید.`,
        patch: combo.patch,
      }
    return { reason: 'combined', text: 'این سناریو دو اقدام دارد و هشدار گزینهٔ ترکیبی ندارد؛ روی هشدار ثبت نمی‌شود.' }
  }
  if (c.code === 'unmatched') return { reason: 'unmatched', text: 'این سناریو با هیچ‌یک از گزینه‌های هشدار جور نیست.' }
  if (c.code === 'unitRejected') return { reason: 'unitRejected', text: `${o.unit!.unit} این اقدام را رد کرده است: ${o.unit!.reason}. سناریوی دیگری انتخاب کنید.` }
  return { reason: 'invalid', text: 'یکی از مقدارها از حد مجاز بیشتر است.', varKey: c.varKey }
}

/** The alert's combined option, with the actions it fixes (ALR-1042: transfer 140 + purchase 172) */
export function comboOption(detail: AlertDetail, m: ScenarioModel): { x: AlertOption; patch: Record<string, number> } | null {
  for (const x of detail.options) {
    if (x.kind !== 'combo') continue
    const patch = fixedOptionPatch(m, x)
    if (patch && Object.keys(patch).length > 1) return { x, patch }
  }
  return null
}

export type CanApply = { ok: true; option: AlertOption; amount?: number } | { ok: false; code: 'none' | 'combined' | 'unmatched' | 'unitRejected' | 'invalid'; reason: string; varKey?: string }
/**
 * 8-الف · Whether a scenario can be recorded on the alert — the one rule for the apply button, the add
 * menu and the row tags: it has an action; it is one of the alert's options; two actions only as the
 * alert's own combined option (a «transfer + pause» is not the transfer); no unit turned it down; every
 * value within its limit.
 */
export function canApply(detail: AlertDetail, m: ScenarioModel, p: Params, unit?: UnitRejection | null): CanApply {
  if (activeActions(m, p).length === 0) return { ok: false, code: 'none', reason: 'اقدامی ندارد' }
  const match = resolveOption(detail, m, p)
  if (m.isCombined(p) && (!match || match.option.kind !== 'combo')) return { ok: false, code: 'combined', reason: comboOption(detail, m) ? 'با گزینهٔ ترکیبی این هشدار جور نیست' : 'دو اقدام دارد و هشدار گزینهٔ ترکیبی ندارد' }
  if (!match) return { ok: false, code: 'unmatched', reason: 'با گزینه‌های این هشدار جور نیست' }
  if (unit && unit.blocked(match.option)) return { ok: false, code: 'unitRejected', reason: `${unit.unit} این اقدام را رد کرده` }
  const bad = m.vars.find((v) => v.limit && val(p, v.key) > v.limit.max)
  if (bad) return { ok: false, code: 'invalid', reason: 'از حد مجاز بیشتر است', varKey: bad.key }
  return { ok: true, option: match.option, amount: match.amount }
}

// ───────── 8-ب … 8-و · one action per row, the add menu, copies ─────────

/** The action variables a row is about (its kind of action, which the settings column cannot change):
 *  the option's own, those it started with, and any active now (an old combined row shows both). */
export function rowActionKeys(m: ScenarioModel, s: Scenario): string[] {
  const def = s.option ? m.options[s.option] : undefined
  const own = new Set([...(def?.key ? [def.key] : []), ...Object.keys(def?.patch ?? {})])
  return m.vars.filter((v) => v.role === 'action' && !v.dependsOn && (own.has(v.key) || val(s.initial, v.key) !== val(m.base, v.key) || val(s.params, v.key) !== val(m.base, v.key))).map((v) => v.key)
}

/** The same actions with the same values (prices and assumptions aside) */
export const sameActions = (m: ScenarioModel, a: Params, b: Params) => m.vars.filter((v) => v.role === 'action').every((v) => val(a, v.key) === val(b, v.key))

/** The row already holding these actions, or -1 */
export const duplicateRow = (m: ScenarioModel, list: Scenario[], p: Params) => list.findIndex((s) => s.origin !== 'reference' && sameActions(m, s.params, p))

/** «سناریوی دلخواه»: one action, starting at the alert option's own amount for it, else its lowest step */
export function customStart(detail: AlertDetail, m: ScenarioModel, key: string): Params {
  const v = m.vars.find((x) => x.key === key)!
  const single = detail.options.find((o) => {
    const def = m.options[o.id]
    if (!def || !isActionOption(m, o.id)) return false
    const keys = [...(def.key ? [def.key] : []), ...Object.keys(def.patch ?? {})].filter((k) => roleOf(m, k) === 'action' && !m.vars.find((x) => x.key === k)?.dependsOn)
    return keys.length === 1 && keys[0] === key
  })
  return single ? paramsForOption(m, single.id, single.amount) : withValues(m, m.base, { [key]: v.min > 0 ? v.min : v.step })
}

/** A copy's name: «{name} (۲)», numbered after the rows of the same root */
export function copyName(list: Scenario[], name: string): string {
  const root = name.replace(/\s*\([۰-۹\d]+\)$/, '')
  const same = list.filter((s) => s.name.replace(/\s*\([۰-۹\d]+\)$/, '') === root).length
  return `${root} (${fa(same + 1)})`
}

/** «ذخیرهٔ موقت · ۱۵:۲۰» */
export const timeOf = (iso?: string) => {
  if (!iso) return ''
  const d = new Date(iso)
  return `${fa(d.getHours()).padStart(2, '۰')}:${fa(d.getMinutes()).padStart(2, '۰')}`
}

// ───────── «کمترین مقدار کافی» (§9) ─────────

export type SeekGoal = 'zero' | 'crit' | 'safe'
/** The goals a model can be searched for: «not zero» always, the others only with their reference line */
export const seekGoals = (m: ScenarioModel): SeekGoal[] => ['zero', ...(m.chart.refs.some((r) => r.tone === 'crit') ? (['crit'] as const) : []), ...(m.chart.refs.some((r) => r.tone === 'safe') ? (['safe'] as const) : [])]

/**
 * The lowest value of `key`, from v.min up in v.step, that meets the goal with everything else held
 * (the shared assumptions, other actions, a dependent arrival time). Null when no value does.
 * The critical line is judged from the day this action lands (the user's decision, 2026-11-11): before
 * it no amount can help, and a stock already under the line today would make the goal impossible.
 */
export function minSufficient(m: ScenarioModel, d: ScenarioDraft, s: Scenario, key: string, goal: SeekGoal): number | null {
  const v = m.vars.find((x) => x.key === key)
  if (!v) return null
  const p = effective(d, s)
  const crit = m.chart.refs.find((r) => r.tone === 'crit')
  const safe = m.chart.refs.find((r) => r.tone === 'safe')
  // The landing day is the event only this action adds; a model without events is judged over the whole horizon
  const without = new Set((m.events?.(withValues(m, p, { [key]: 0 })) ?? []).map((e) => `${e.label}:${e.day}`))
  const landsOn = (q: Params) => {
    if (!m.events) return 0
    const days = m
      .events(q)
      .filter((e) => !without.has(`${e.label}:${e.day}`))
      .map((e) => e.day)
    return days.length ? Math.min(...days) : null
  }
  const ok = (q: Params, r: ModelRun) => {
    if (goal === 'zero') return r.emptyDay == null || r.emptyDay > p.horizon
    if (goal === 'safe') return !!safe && r.series[p.horizon] >= safe.value
    const from = landsOn(q)
    return !!crit && from != null && Math.min(...r.series.slice(from, p.horizon + 1)) >= crit.value
  }
  for (let x = v.min; x <= v.max + 1e-9; x = +(x + v.step).toFixed(4)) {
    const q = withValues(m, p, { [key]: x })
    if (ok(q, m.run(q))) return x
  }
  return null
}

// ───────── «مقایسهٔ دو سناریو» (§10) ─────────

export type CompareTone = 'better' | 'worse' | 'same' | 'neutral'
const RISK_RANK: Record<Risk['level'], number> = { low: 0, medium: 1, high: 2 }

/**
 * «الف» against «ب» on one metric: the big text and its colour. Lower is better unless the metric says
 * `better: 'higher'`; a neutral metric is never coloured. Shortage metrics read «رفع شد» / «ایجاد می‌شود»
 * when one side has it and the other does not (shortage = the metric itself is bad).
 */
export function compareMetric(c: Metric, a: number, b: number, isShortage: boolean): { text: string; tone: CompareTone } {
  if (isShortage && c.good) {
    if (!c.bad(a) && c.bad(b)) return { text: 'رفع شد', tone: 'better' }
    if (c.bad(a) && !c.bad(b)) return { text: 'ایجاد می‌شود', tone: 'worse' }
  }
  const d = a - b
  if (Math.abs(d) < 1e-9) return { text: 'بدون تفاوت', tone: 'same' }
  const mag = c.fmtDelta ? c.fmtDelta(Math.abs(d)) : `${c.fmt(Math.abs(d))}${c.unit ? ` ${c.unit}` : ''}`
  const better = c.better === 'higher' ? d > 0 : d < 0
  return {
    text: `${d > 0 ? '+' : '−'}${mag}`,
    tone: c.neutral ? 'neutral' : better ? 'better' : 'worse',
  }
}

/** Risk of the first scenario against the second: its own level, green when lower; low < medium < high */
export function compareRisk(a: Risk['level'], b: Risk['level']): { text: string; tone: CompareTone } {
  if (a === b) return { text: 'بدون تغییر', tone: 'same' }
  return {
    text: RISK_LABEL[a],
    tone: RISK_RANK[a] < RISK_RANK[b] ? 'better' : 'worse',
  }
}

/** Metric keys that mean shortage, the only ones that read «بدون کمبود» at zero (§8) */
export const SHORTAGE_KEYS = ['short', 'gap', 'unmet']
