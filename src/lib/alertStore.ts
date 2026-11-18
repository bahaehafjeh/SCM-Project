import { useSyncExternalStore } from 'react'
import type { Severity, TimelineEvent } from '../data/alerts'
import { alertDetails, allAlerts } from '../data/alerts'
import { sampleActions } from '../data/actions'
import type { Params, ScenarioSnapshot } from './engine'
import { arrivalDays, modelFor } from './engine'
import { currentUser } from './access'
import { DAY, acceptWindow, isOpen, kindOfOption, managerOf, stepsOf } from './actionRules'
import { formatNumber } from './format'

/**
 * Alert handling state shared by the dashboard, the alerts page and the scenario page, local to
 * the session until the alert service exists. Every action appends a traceable event (actor or
 * source system) to the alert's history.
 */
export const CURRENT_USER = 'بهاره افجه'
/** Actor of reminder events (a system source: grey ring in the history) */
export const REMINDER_ACTOR = 'سیستم یادآوری'

export interface AlertRecord {
  option: string
  amount?: number
  note: string
  /** The action it made on «اقدام‌ها» (ACT-…); a combined decision makes two, this is the first */
  rec: string
  externalRef: string
  scenario?: { id: string; name: string }
  /** Fixed copy of the scenario the decision was weighed with (facts, assumptions, actions, outcome, time) */
  snapshot?: ScenarioSnapshot
  /** ISO time of the record, for the forecast-versus-actual check */
  at?: string
  /** Executing system sync: failed falls back to a manual update in the queue */
  sync?: 'ok' | 'failed' | 'manual'
  /** Who recorded it: the unit's answer and a failed sync go back to this person */
  by?: string
}
// ── Actions (actions-page-prompt §1–§3): a unit's commitment to carry out a decision ──
export type ActionStatus = 'new' | 'counter' | 'doing' | 'blocked' | 'verify' | 'closed' | 'rejected' | 'cancel'
export type ActionKind = 'buy' | 'move' | 'doc' | 'refer' | 'other'
export interface ActionStep {
  label: string
  /** ISO time it was recorded */
  done?: string
  /** Recorded by the executing system */
  auto?: boolean
  /** Who recorded it by hand */
  by?: string
}
export interface ActionItem {
  id: string
  /** Empty when the alert is no longer listed (closed long ago) */
  alertId: string
  alertCode: string
  severity?: Severity
  item?: string
  option: string
  amount?: number
  title: string
  kind: ActionKind
  /** The unit responsible (the option's owner) */
  unit: string
  /** The person carrying it out; empty = «بدون مسئول» */
  owner?: string
  requester: string
  status: ActionStatus
  sentAt: string
  acceptedAt?: string
  /** ISO time the unit must accept by (severity: 2 / 8 / 24 hours) */
  acceptDueAt?: string
  /** A counter-proposal paused the time to accept: what was left, in ms */
  acceptLeft?: number
  due?: string
  steps: ActionStep[]
  externalRef?: string
  sync?: 'ok' | 'failed' | 'manual'
  blocked?: { reason: string; since: string }
  counter?: { amount?: number; split?: string; due?: string; reason: string; by: string; at: string }
  rejection?: { reason: string; note?: string; by: string; at: string }
  verify?: { day: number; of: number; inBand: boolean }
  /** Late: the unit proposes a new due date, the requester accepts it */
  dueProposal?: { due: string; reason: string; by: string; at: string }
  /** The requester's note when sending */
  note?: string
  /** Two actions of one combined decision */
  groupId?: string
  /** Delivered: the 7-day check runs from here */
  doneAt?: string
  closedAt?: string
  cancel?: { reason: string; by: string; at: string }
  /** The unit's manager was told (late, blocked, or the time to accept ran out) */
  managerToldAt?: string
  /** The requester sent a reminder while it waited for acceptance */
  remindedAt?: string
}

export interface AlertClosure {
  reason: string
  note: string
  by?: string
}
export interface AlertRejection {
  option: string
  reason: string
  note: string
  rec: string
}
export interface AlertSnooze {
  label: string
  until: string
  /** ISO time the reminder falls due; the alert goes back to «نیازمند بررسی» then */
  dueAt?: string
  /** Who set the reminder: «یادآوری رسید» goes to this person */
  by?: string
}

export type ScenarioOrigin = 'reference' | 'alert' | 'user' | 'template'
export interface Scenario {
  /** Permanent id (SCN-…), never reused and independent of the row */
  id: string
  /** Display number in the table, «۰» is the reference */
  n: number
  name: string
  origin: ScenarioOrigin
  params: Params
  /** Values the scenario started from, to mark what the user changed */
  initial: Params
  /** Alert option this scenario stands for, if any */
  option?: string
  /** Name and origin it was made with, for «برگشت به پیشنهاد / حالت اولیه» */
  initialName?: string
  initialOrigin?: ScenarioOrigin
  /** The name follows the actions (8-ه); «تغییر نام» turns it off. Unset counts as on. */
  autoName?: boolean
}
export interface ScenarioDraft {
  list: Scenario[]
  selected: number
  saved: boolean
  /** ISO time of the last autosave */
  savedAt?: string
  /** Shared assumptions (role 'assumption' only), applied to every scenario, «بدون اقدام» included */
  assumptions: Record<string, number>
}
export interface AppliedScenario {
  id: string
  name: string
  option: string
  amount: number
  /** Only the actions travel to the alert; facts and assumptions stay as they are */
  params: Params
  /** Assumptions the scenario was weighed with that differ from the alert's (shown on the card) */
  assumed: string[]
  /** Amount the option had before the scenario */
  was?: number
  /** Fixed copy at the moment of applying */
  snapshot: ScenarioSnapshot
}

export interface AlertToastState {
  text: string
  undo?: () => void
  key: number
  /** The alert the message is about: shown inside its panel, and dropped when another alert opens */
  alertId?: string
}
/** Ready-made scenarios managed in settings (prompt §8.4): per alert type, with who may use and create */
export interface TemplateEntry {
  key: string
  name: string
  note: string
  group: 'stress' | 'action'
  patch: Record<string, number>
  builtIn: boolean
}
export type Role = 'viewer' | 'specialist' | 'manager'
export interface TemplateSettings {
  /** Built-in templates switched off for this type */
  hidden: string[]
  custom: TemplateEntry[]
  use: Role[]
  create: Role[]
}

interface State {
  seen: Record<string, true>
  records: Record<string, AlertRecord>
  rejected: Record<string, AlertRejection>
  closed: Record<string, AlertClosure>
  snoozed: Record<string, AlertSnooze>
  /** A reminder fell due: «یادآوری رسید» until a decision, closing, or a new reminder */
  reminded: Record<string, string>
  /** A unit turned down a recorded action: the alert is back in «نیازمند بررسی» (TEMPORARY sample until the unit service exists) */
  unitRejections: Record<string, UnitRejection>
  /** The alert was referred to the current user */
  assignments: Record<string, Assignment>
  /** Who set each reminder that fell due (the «یادآوری رسید» notice goes to them) */
  remindedBy: Record<string, string>
  /** A manager moved the responsibility to another person or unit */
  reassigned: Record<string, Reassignment>
  /** Someone continued the review another person had open («ادامه می‌دهم») */
  takenOver: Record<string, { by: string; from: string; at: string }>
  events: Record<string, TimelineEvent[]>
  drafts: Record<string, ScenarioDraft>
  applied: Record<string, AppliedScenario>
  /** Template settings per alert kind (e.g. «موجودی کمتر از حد ایمن») */
  templates: Record<string, TemplateSettings>
  toast: AlertToastState | null
  /** A record or rejection that was just undone: the panel restores the choice instead of resetting */
  undone: Record<string, AlertUndo>
  /** Data updates that arrived after a decision: day since the record → actual value */
  readings: Record<string, { day: number; value: number }[]>
  /** Actions by id (ACT-…); each open one has its alert record */
  actions: Record<string, ActionItem>
}
export interface UnitRejection {
  /** Who recorded the action the unit turned down */
  recordedBy: string
  option: string
  amount?: number
  unit: string
  reason: string
  /** ISO time */
  at: string
}
export interface Reassignment {
  to: string
  by: string
  /** Who held it before (gets «… به {to} ارجاع شد») */
  from: string
  note?: string
  at: string
}
export interface Assignment {
  /** The person (or unit) it was referred to */
  to: string
  by: string
  note?: string
  /** ISO time */
  at: string
}
/** What an undo hands back to the panel (kept until the next record) */
export interface AlertUndo {
  kind: 'record' | 'reject'
  option: string
  amount?: number
  note: string
  label: string
  at: number
}

const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000).toISOString()

// Samples (TEMPORARY until the action service exists): the actions, their alert records and history
const samples = sampleActions(Date.now())

let state: State = {
  seen: {},
  records: samples.records,
  rejected: {},
  closed: {},
  snoozed: {},
  reminded: {},
  // Samples (TEMPORARY until the unit and assignment services exist): times relative to the page load
  unitRejections: { a1: { recordedBy: CURRENT_USER, option: 'transfer', amount: 100, unit: 'واحد انبارهای جنوب', reason: 'انبار شیراز این هفته ظرفیت حمل ندارد', at: minutesAgo(10) } },
  assignments: { a4: { to: CURRENT_USER, by: 'مدیر واحد', note: 'پیش از پایان هفته تصمیم بگیرید.', at: minutesAgo(180) } },
  remindedBy: {},
  // ALR-1019 was referred to مریم صادقی by the unit manager (TEMPORARY sample)
  reassigned: { a5: { to: 'مریم صادقی', by: 'مدیر واحد انبارهای جنوب', from: CURRENT_USER, at: minutesAgo(95) } },
  takenOver: {},
  events: {
    ...samples.events,
    a5: [{ text: 'هشدار به مریم صادقی ارجاع شد', time: '۹۵ دقیقه پیش', actor: 'مدیر واحد انبارهای جنوب' }],
  },
  drafts: {},
  applied: {},
  templates: {},
  toast: null,
  undone: {},
  readings: {},
  actions: Object.fromEntries(samples.actions.map((a) => [a.id, a])),
}
const subs = new Set<() => void>()
const update = (patch: Partial<State>) => {
  state = { ...state, ...patch }
  subs.forEach((f) => f())
}
const without = <T>(map: Record<string, T>, id: string) => {
  const rest = { ...map }
  delete rest[id]
  return rest
}
const log = (id: string, text: string, actor = currentUser().name, action?: string, message?: boolean) => update({ events: { ...state.events, [id]: [...(state.events[id] ?? []), { text, time: 'همین الان', actor, ...(action ? { action } : {}), ...(message ? { message } : {}) }] } })

let toastTimer: ReturnType<typeof setTimeout> | undefined
export function notify(text: string, undo?: () => void, alertId?: string) {
  clearTimeout(toastTimer)
  update({ toast: { text, undo, key: Date.now(), alertId } })
  toastTimer = setTimeout(() => update({ toast: null }), 6000)
}
export function dismissToast() {
  clearTimeout(toastTimer)
  update({ toast: null })
}

// Sample ids: actions go on from the samples (ACT-881…889), rejected suggestions keep their own
// REC series, and the executing system's references start after the samples' (۷۷۰۲)
let actSeq = 889
let recSeq = 880
let refSeq = 1
const refFor = (kind: string) => {
  const n = refSeq++
  return kind === 'transfer' ? `حواله انبار ${4521 + n}` : kind === 'supply' ? `درخواست خرید ${7702 + n}` : `ارجاع ${3108 + n}`
}
const faDigits = (s: string) => s.replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[+d])

/** A message about one alert */
const notifyFor = (id: string, text: string, undo?: () => void) => notify(text, undo, id)

const fillN = (t: string, n?: number) => t.replace('{n}', formatNumber(n ?? 0))
/** First number in a text («انتقال ۱۴۰ تن …» → 140) */
const firstNumber = (t: string) => {
  const m = t.replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).match(/\d+/)
  return m ? Number(m[0]) : undefined
}

/**
 * The action(s) a recorded decision makes (§1): sent to the option's unit, waiting for acceptance
 * for 2 / 8 / 24 hours by severity, due when the engine says the option takes effect. A combined
 * decision is split into its two parts, one per unit, sharing a group id.
 */
function makeActions(alertId: string, r: { option: string; amount?: number; note: string; label: string }, externalRef: string): ActionItem[] {
  const alert = allAlerts.find((a) => a.id === alertId)
  const detail = alertDetails[alertId]
  const o = detail?.options.find((x) => x.id === r.option)
  if (!alert || !detail || !o) return []
  const now = Date.now()
  const model = modelFor(alert, detail)
  const facts = detail.facts as { f?: { item?: string } } | undefined
  const dueFor = (option: string, amount?: number) => {
    const d = model ? arrivalDays(model, option, amount) : null
    return d ? new Date(now + d * DAY).toISOString() : undefined
  }
  const base = {
    alertId,
    alertCode: alert.code,
    severity: alert.severity,
    item: detail.stock?.item ?? facts?.f?.item,
    requester: currentUser().name,
    status: 'new' as const,
    sentAt: new Date(now).toISOString(),
    acceptDueAt: new Date(now + acceptWindow(alert.severity)).toISOString(),
    sync: 'ok' as const,
    note: r.note || undefined,
  }
  const t = detail.options.find((x) => x.kind === 'transfer')
  const sup = detail.options.find((x) => x.kind === 'supply')
  const parts = o.title.split(' + ')
  if (o.kind === 'combo' && parts.length === 2 && t && sup) {
    const groupId = `GRP-${actSeq + 1}`
    return (
      [
        [parts[0], t, externalRef],
        [parts[1], sup, faDigits(refFor('supply'))],
      ] as const
    ).map(([title, part, ref]) => {
      const k = kindOfOption(part)
      return { ...base, id: `ACT-${++actSeq}`, option: part.id, amount: firstNumber(title), title, kind: k.kind, unit: part.owner, steps: stepsOf(k.steps), due: dueFor(r.option, r.amount), externalRef: ref, groupId }
    })
  }
  const k = kindOfOption(o)
  return [{ ...base, id: `ACT-${++actSeq}`, option: o.id, amount: r.amount, title: r.label, kind: k.kind, unit: o.owner, steps: stepsOf(k.steps), due: dueFor(o.id, r.amount), externalRef }]
}

export const alertActions = {
  /** Opening an alert marks it seen once */
  see(id: string) {
    if (state.seen[id]) return
    update({ seen: { ...state.seen, [id]: true } })
    log(id, 'هشدار دیده شد')
  },
  /** `snapshot`: fixed copy of the scenario, taken now, when the recorded option is the applied scenario's */
  record(id: string, r: { option: string; kind: string; amount?: number; note: string; label: string; toast: string; snapshot?: ScenarioSnapshot }) {
    const before = state.records[id]
    const beforeActions = state.actions
    const applied = state.applied[id]
    const scenario = applied && applied.option === r.option ? { id: applied.id, name: applied.name } : undefined
    const externalRef = faDigits(refFor(r.kind))
    // The decision becomes an action for the option's unit (two for a combined decision, §1)
    const made = makeActions(id, r, externalRef)
    // A changed decision cancels the action it replaces (owner decision); its history stays
    const now = new Date().toISOString()
    const me = currentUser().name
    const replaced = Object.values(state.actions).filter((a) => a.alertId === id && isOpen(a))
    const actions = { ...state.actions }
    for (const a of replaced) actions[a.id] = { ...a, status: 'cancel', cancel: { reason: 'تصمیم تغییر کرد', by: me, at: now } }
    for (const a of made) actions[a.id] = a
    const rec: AlertRecord = {
      option: r.option,
      amount: r.amount,
      note: r.note,
      rec: made[0]?.id ?? `ACT-${++actSeq}`,
      externalRef,
      scenario,
      snapshot: scenario ? r.snapshot : undefined,
      at: now,
      by: me,
    }
    // A decision ends any reminder
    update({ actions, records: { ...state.records, [id]: rec }, undone: without(state.undone, id), snoozed: without(state.snoozed, id), reminded: without(state.reminded, id), unitRejections: without(state.unitRejections, id), assignments: without(state.assignments, id) })
    for (const a of replaced) log(id, `اقدام ${a.id} لغو شد · دلیل: تصمیم تغییر کرد`, me, a.id)
    log(id, `${before ? 'تصمیم تغییر کرد: ' : ''}${r.label} ثبت شد · ${made.map((a) => a.id).join(' و ')}${scenario ? ` · سناریوی پیوست: ${scenario.id}` : ''}`, me, made[0]?.id)
    for (const a of made) log(id, `${a.title} برای ${a.unit} فرستاده شد · ${a.id}`, me, a.id)
    log(id, `${rec.externalRef} ثبت شد`, r.kind === 'transfer' || r.kind === 'supply' ? 'سیستم انبار' : 'سامانه ارجاع', made[0]?.id)
    notifyFor(id, r.toast, () => {
      update({
        actions: beforeActions,
        records: before ? { ...state.records, [id]: before } : without(state.records, id),
        undone: { ...state.undone, [id]: { kind: 'record', option: r.option, amount: r.amount, note: r.note, label: r.label, at: Date.now() } },
      })
      log(id, `ثبت «${r.label}» لغو شد · ${rec.externalRef} هم لغو شد`)
    })
  },
  /** Rejects the system's suggestion only: the alert stays open and keeps its state. `label`: the option with its amount */
  reject(id: string, option: string, reason: string, note: string, label?: string) {
    const rec = `REC-${++recSeq}`
    update({ rejected: { ...state.rejected, [id]: { option, reason, note, rec } } })
    log(id, `پیشنهاد سیستم رد شد · ${rec} · دلیل: ${reason}`)
    notifyFor(id, label ? `پیشنهاد «${label}» رد شد؛ هشدار باز می‌ماند.` : 'پیشنهاد رد شد؛ هشدار باز می‌ماند.', () => alertActions.unreject(id))
  },
  /** Undo of a rejection (from the message or the card's chip): the suggestion comes back selected */
  unreject(id: string) {
    const r = state.rejected[id]
    if (!r) return
    update({
      rejected: without(state.rejected, id),
      undone: { ...state.undone, [id]: { kind: 'reject', option: r.option, note: '', label: '', at: Date.now() } },
    })
    log(id, 'رد پیشنهاد لغو شد')
  },
  close(id: string, reason: string, note: string) {
    // An action under its effect check closes with its alert (§3: «یا هشدار مبدأ بسته شود»)
    const checking = Object.values(state.actions).filter((a) => a.alertId === id && a.status === 'verify')
    const actions = { ...state.actions }
    for (const a of checking) actions[a.id] = { ...a, status: 'closed', closedAt: new Date().toISOString() }
    update({ actions, closed: { ...state.closed, [id]: { reason, note, by: currentUser().name } }, snoozed: without(state.snoozed, id), reminded: without(state.reminded, id), unitRejections: without(state.unitRejections, id), assignments: without(state.assignments, id) })
    log(id, `بسته شد دستی · ${reason}`)
    for (const a of checking) log(id, `هشدار بسته شد · اقدام ${a.id} بسته شد`, 'موتور سنجش', a.id)
    notifyFor(id, `هشدار بسته شد · دلیل: ${reason}`, () => update({ closed: without(state.closed, id) }))
  },
  reopen(id: string) {
    update({ closed: without(state.closed, id) })
    log(id, 'هشدار دوباره باز شد')
    notifyFor(id, 'هشدار دوباره باز شد')
  },
  snooze(id: string, label: string, until: string, dueAt?: string) {
    update({ snoozed: { ...state.snoozed, [id]: { label, until, dueAt, by: currentUser().name } }, reminded: without(state.reminded, id) })
    log(id, `یادآوری تنظیم شد · ${until}`)
    notifyFor(id, `یادآوری ${label} تنظیم شد`, () => update({ snoozed: without(state.snoozed, id) }))
  },
  unsnooze(id: string) {
    if (!state.snoozed[id]) return
    update({ snoozed: without(state.snoozed, id) })
    log(id, 'یادآوری لغو شد')
    notifyFor(id, 'یادآوری لغو شد')
  },
  /** The reminder fell due: back to «نیازمند بررسی» with «یادآوری رسید»; runs once per reminder */
  wake(id: string) {
    if (!state.snoozed[id]) return
    update({ snoozed: without(state.snoozed, id), reminded: { ...state.reminded, [id]: state.snoozed[id].dueAt ?? new Date().toISOString() }, remindedBy: { ...state.remindedBy, [id]: state.snoozed[id].by ?? CURRENT_USER } })
    log(id, 'موعد یادآوری رسید', REMINDER_ACTOR)
  },
  /** Manager: move the responsibility; undo puts everything back, the notices it made included */
  reassign(id: string, to: string, holder: string, note?: string) {
    const before = state.reassigned[id]
    const by = currentUser().name
    update({ reassigned: { ...state.reassigned, [id]: { to, by, from: holder, note: note || undefined, at: new Date().toISOString() } } })
    log(id, `${by} هشدار را به ${to} ارجاع داد${note ? ` · یادداشت: ${note}` : ''}`)
    notifyFor(id, `به ${to} ارجاع شد`, () => {
      update({ reassigned: before ? { ...state.reassigned, [id]: before } : without(state.reassigned, id) })
      log(id, `ارجاع به ${to} لغو شد`)
    })
  },
  /** «ادامه می‌دهم» on someone else's open review */
  takeOver(id: string, from: string) {
    const by = currentUser().name
    update({ takenOver: { ...state.takenOver, [id]: { by, from, at: new Date().toISOString() } } })
    log(id, `${by} بررسی را از ${from} ادامه داد`)
  },
  saveDraft(id: string, draft: ScenarioDraft) {
    pendingDrafts.delete(id)
    update({ drafts: { ...state.drafts, [id]: { ...draft, savedAt: new Date().toISOString() } } })
  },
  reviewedScenarios(id: string) {
    log(id, 'سناریو بررسی شد')
  },
  setTemplates(kind: string, t: TemplateSettings) {
    update({ templates: { ...state.templates, [kind]: t } })
  },
  /** Only the scenario's actions land on the option; the panel shows a success row (not a toast) */
  apply(id: string, a: AppliedScenario) {
    update({ applied: { ...state.applied, [id]: a } })
    log(id, `سناریوی ${a.id} «${a.name}» روی هشدار اعمال شد`)
  },
  /** Sync failed: the action is tracked by hand on «اقدام‌ها» */
  manualSync(id: string) {
    const r = state.records[id]
    if (!r) return
    const a = state.actions[r.rec]
    update({ records: { ...state.records, [id]: { ...r, sync: 'manual' } }, ...(a ? { actions: { ...state.actions, [a.id]: { ...a, sync: 'manual' as const } } } : {}) })
    log(id, `پیگیری ${r.rec} دستی شد`)
    notifyFor(id, 'پیگیری دستی شد. نزدیک مهلت یادآوری می‌شود.')
  },
  /** The panel has shown the undo notice; it is not shown again */
  clearUndo(id: string) {
    if (state.undone[id]) update({ undone: without(state.undone, id) })
  },
  unapply(id: string) {
    update({ applied: without(state.applied, id) })
    log(id, 'اعمال سناریو لغو شد')
  },
  /** A source system reports a new value after the decision (design review: ?reading=day:value) */
  addReading(id: string, day: number, value: number) {
    update({ readings: { ...state.readings, [id]: [...(state.readings[id] ?? []), { day, value }] } })
  },
}

// ── Action lifecycle (§3): the status changes only by a button, each change logged with who and why ──
const keyOf = (a: ActionItem) => a.alertId || a.alertCode
const put = (a: ActionItem, patch: Partial<ActionItem>) => update({ actions: { ...state.actions, [a.id]: { ...a, ...patch } } })
const say = (a: ActionItem, text: string, actor = currentUser().name, message = false) => log(keyOf(a), text, actor, a.id, message)
const nowIso = () => new Date().toISOString()
const titleFor = (a: ActionItem, amount?: number) => {
  const o = alertDetails[a.alertId]?.options.find((x) => x.id === a.option)
  return o && o.kind !== 'combo' && o.title.includes('{n}') ? fillN(o.title, amount) : a.title
}
/** The alert's record follows the action: amount changes, and a rejected or cancelled action takes the record away */
const recordOf = (a: ActionItem) => (a.alertId && (state.records[a.alertId]?.rec === a.id || (a.groupId && Object.values(state.actions).some((x) => x.groupId === a.groupId && x.id === state.records[a.alertId]?.rec))) ? state.records[a.alertId] : undefined)

export const actionActions = {
  /** The unit takes it on; with no owner, the one who accepts becomes the owner */
  accept(id: string) {
    const a = state.actions[id]
    if (!a || a.status !== 'new') return
    const me = currentUser().name
    // A referral is received the moment it is accepted
    const steps = a.kind === 'refer' ? a.steps.map((s, i) => (i === 0 ? { ...s, done: nowIso(), by: me } : s)) : a.steps
    put(a, { status: 'doing', owner: a.owner ?? me, acceptedAt: nowIso(), acceptDueAt: undefined, steps })
    say(a, `${me} اقدام ${a.id} را پذیرفت`)
    notify(`اقدام ${a.id} را پذیرفتید`)
  },
  /** «پیشنهاد تغییر»: the time to accept stops until the requester answers */
  counter(id: string, c: { amount?: number; split?: string; due?: string; reason: string }) {
    const a = state.actions[id]
    if (!a || a.status !== 'new') return
    const me = currentUser().name
    const left = a.acceptDueAt ? Math.max(0, Date.parse(a.acceptDueAt) - Date.now()) : undefined
    put(a, { status: 'counter', counter: { ...c, by: me, at: nowIso() }, acceptLeft: left, acceptDueAt: undefined })
    say(a, `پیشنهاد تغییر${c.split ? `: ${c.split}` : c.amount !== undefined ? `: ${formatNumber(c.amount)}` : ''} · دلیل: ${c.reason}`)
    notify('پیشنهاد تغییر برای درخواست‌دهنده فرستاده شد')
  },
  /** The requester takes the unit's version: work starts on it */
  approveCounter(id: string) {
    const a = state.actions[id]
    if (!a || a.status !== 'counter' || !a.counter) return
    const c = a.counter
    const amount = c.amount ?? a.amount
    const rec = recordOf(a)
    update({
      actions: { ...state.actions, [a.id]: { ...a, status: 'doing', amount, due: c.due ?? a.due, owner: a.owner ?? c.by, title: titleFor(a, amount), acceptedAt: nowIso(), acceptLeft: undefined, counter: undefined } },
      ...(rec ? { records: { ...state.records, [a.alertId]: { ...rec, amount } } } : {}),
    })
    say(a, `تغییر پیشنهادی ${c.by} تأیید شد${c.split ? ` · ${c.split}` : ''}`)
    notify('تغییر تأیید شد؛ اجرا شروع می‌شود')
  },
  /** The requester keeps the first request: back to waiting, the paused time runs on */
  declineCounter(id: string) {
    const a = state.actions[id]
    if (!a || a.status !== 'counter') return
    const left = a.acceptLeft ?? acceptWindow(a.severity)
    put(a, { status: 'new', counter: undefined, acceptLeft: undefined, acceptDueAt: new Date(Date.now() + left).toISOString() })
    say(a, 'پیشنهاد تغییر رد شد؛ همان درخواست اولیه می‌ماند')
    notify('همان درخواست اولیه برای واحد ماند')
  },
  /** The unit turns it down: the alert goes back to «نیازمند بررسی», as `unitRejections` does */
  reject(id: string, reason: string, note?: string) {
    const a = state.actions[id]
    if (!a || (a.status !== 'new' && a.status !== 'counter')) return
    const me = currentUser().name
    const why = note?.trim() || reason
    const rec = recordOf(a)
    update({
      actions: { ...state.actions, [a.id]: { ...a, status: 'rejected', rejection: { reason, note: note?.trim() || undefined, by: me, at: nowIso() }, acceptDueAt: undefined } },
      ...(rec && a.alertId
        ? {
            records: without(state.records, a.alertId),
            unitRejections: { ...state.unitRejections, [a.alertId]: { recordedBy: a.requester, option: a.option, amount: a.amount, unit: a.unit, reason: why, at: nowIso() } },
          }
        : {}),
    })
    say(a, `${a.unit} اقدام ${a.id} را رد کرد · دلیل: ${why}`)
    notify('اقدام رد شد؛ هشدار به «نیازمند بررسی» برگشت')
  },
  /** Only the requester; the alert goes back to «نیازمند بررسی» (both parts of a combined decision) */
  cancel(id: string) {
    const a = state.actions[id]
    if (!a || !isOpen(a)) return
    const me = currentUser().name
    const group = a.groupId ? Object.values(state.actions).filter((x) => x.groupId === a.groupId && isOpen(x)) : [a]
    const rec = recordOf(a)
    const actions = { ...state.actions }
    for (const x of group) actions[x.id] = { ...x, status: 'cancel', cancel: { reason: 'لغو توسط درخواست‌دهنده', by: me, at: nowIso() }, acceptDueAt: undefined }
    update({ actions, ...(rec && a.alertId ? { records: without(state.records, a.alertId) } : {}) })
    for (const x of group) say(x, `اقدام ${x.id} لغو شد`)
    notify('اقدام لغو شد؛ هشدار به «نیازمند بررسی» برگشت')
  },
  /** The unit's manager hands it to one of the unit */
  refer(id: string, to: string) {
    const a = state.actions[id]
    if (!a || !isOpen(a)) return
    put(a, { owner: to })
    say(a, `اقدام ${a.id} به ${to} سپرده شد`)
    notify(`به ${to} سپرده شد`)
  },
  /** The next step, by hand; with «ثبت نشد» the name of who recorded it stays */
  step(id: string) {
    const a = state.actions[id]
    if (!a || a.status !== 'doing') return
    const i = a.steps.findIndex((x) => !x.done)
    if (i < 0 || i === a.steps.length - 1) return
    const me = currentUser().name
    put(a, { steps: a.steps.map((x, j) => (j === i ? { ...x, done: nowIso(), by: me } : x)) })
    say(a, `مرحلهٔ «${a.steps[i].label}» ثبت شد${a.sync === 'failed' ? ' (دستی)' : ''}`)
  },
  retrySync(id: string) {
    const a = state.actions[id]
    if (!a || a.sync !== 'failed') return
    const rec = recordOf(a)
    update({ actions: { ...state.actions, [a.id]: { ...a, sync: 'ok' } }, ...(rec ? { records: { ...state.records, [a.alertId]: { ...rec, sync: 'ok' } } } : {}) })
    say(a, `${a.externalRef ?? 'درخواست'} دوباره فرستاده شد و ثبت شد`, 'پایش یکپارچگی')
    notify('ثبت در سیستم اجرایی انجام شد')
  },
  block(id: string, reason: string) {
    const a = state.actions[id]
    if (!a || a.status !== 'doing') return
    put(a, { status: 'blocked', blocked: { reason, since: nowIso() } })
    say(a, `مانع اعلام شد: ${reason}`)
    notify('مانع برای درخواست‌دهنده اعلام شد')
  },
  unblock(id: string) {
    const a = state.actions[id]
    if (!a || a.status !== 'blocked') return
    put(a, { status: 'doing', blocked: undefined })
    say(a, `مانع رفع شد${a.blocked ? `: ${a.blocked.reason}` : ''}`)
    notify('مانع رفع شد؛ اجرا ادامه دارد')
  },
  /** «اعلام انجام» on the last step: the 7-day effect check starts */
  done(id: string) {
    const a = state.actions[id]
    if (!a || a.status !== 'doing') return
    const me = currentUser().name
    const at = nowIso()
    put(a, { status: 'verify', doneAt: at, verify: { day: 0, of: 7, inBand: true }, steps: a.steps.map((x) => (x.done ? x : { ...x, done: at, by: me })), dueProposal: undefined })
    say(a, 'انجام شد · سنجش اثر ۷ روزه شروع شد')
    notify('انجام شد؛ اثر تا ۷ روز سنجیده می‌شود')
  },
  /** Late: the unit proposes a new due date */
  proposeDue(id: string, due: string, reason: string) {
    const a = state.actions[id]
    if (!a || !isOpen(a)) return
    put(a, { dueProposal: { due, reason, by: currentUser().name, at: nowIso() } })
    say(a, `موعد تازه پیشنهاد شد · دلیل: ${reason}`)
    notify('موعد تازه برای درخواست‌دهنده فرستاده شد')
  },
  acceptDue(id: string) {
    const a = state.actions[id]
    if (!a?.dueProposal) return
    put(a, { due: a.dueProposal.due, dueProposal: undefined })
    say(a, 'موعد تازه پذیرفته شد')
    notify('موعد تازه پذیرفته شد')
  },
  /** Tell the unit's manager (late, blocked, or no answer in time) */
  tellManager(id: string) {
    const a = state.actions[id]
    if (!a) return
    const m = managerOf(a.unit) ?? `مدیر ${a.unit}`
    put(a, { managerToldAt: nowIso() })
    say(a, `به ${m} اطلاع داده شد`)
    notify(`به ${m} اطلاع داده شد`)
  },
  /** The requester's reminder while the unit has not answered */
  remind(id: string) {
    const a = state.actions[id]
    if (!a || a.status !== 'new') return
    put(a, { remindedAt: nowIso() })
    say(a, `یادآوری برای ${a.owner ?? a.unit} فرستاده شد`)
    notify('یادآوری فرستاده شد')
  },
  /** The requester changes the request before it is accepted */
  edit(id: string, amount: number | undefined, note: string) {
    const a = state.actions[id]
    if (!a || a.status !== 'new') return
    const rec = recordOf(a)
    update({
      actions: { ...state.actions, [a.id]: { ...a, amount, note: note.trim() || undefined, title: titleFor(a, amount) } },
      ...(rec ? { records: { ...state.records, [a.alertId]: { ...rec, amount, note: note.trim() } } } : {}),
    })
    say(a, `درخواست ویرایش شد${amount !== undefined && amount !== a.amount ? ` · مقدار ${formatNumber(amount)}` : ''}`)
    notify('درخواست ویرایش شد')
  },
  message(id: string, text: string) {
    const a = state.actions[id]
    if (!a || !text.trim()) return
    say(a, text.trim(), currentUser().name, true)
  },
}

/** The 7-day check ran out in range: the action closes (the shell calls it with the minute tick) */
export function settleChecks(now = Date.now()) {
  for (const a of Object.values(state.actions)) {
    if (a.status !== 'verify' || !a.doneAt || !a.verify?.inBand) continue
    if (now - Date.parse(a.doneAt) < 7 * DAY) continue
    put(a, { status: 'closed', closedAt: new Date(now).toISOString(), verify: { ...a.verify, day: 7 } })
    say(a, 'اثر ۷ روز در بازهٔ پیش‌بینی ماند · اقدام بسته شد', 'موتور سنجش')
  }
}

/**
 * The draft of an alert, or a new one made once: a draft made but not yet saved is kept here so its
 * scenario ids stay the same across renders and visits.
 */
const pendingDrafts = new Map<string, ScenarioDraft>()
export function draftFor(id: string, make: () => ScenarioDraft): ScenarioDraft {
  const saved = state.drafts[id]
  if (saved) return saved
  let d = pendingDrafts.get(id)
  if (!d) {
    d = make()
    pendingDrafts.set(id, d)
  }
  return d
}

export function useAlertState() {
  return useSyncExternalStore(
    (cb) => {
      subs.add(cb)
      return () => subs.delete(cb)
    },
    () => state,
  )
}

export const defaultTemplateSettings = (): TemplateSettings => ({ hidden: [], custom: [], use: ['specialist', 'manager'], create: ['manager'] })

export type AlertState = State

/** The four tabs of the alerts page (and every count that must match them) */
export type AlertBucket = 'review' | 'handling' | 'snoozed' | 'closed'
type BucketState = Pick<State, 'closed' | 'records' | 'snoozed'>

/** A reminder still waiting: no due time (older entries) or a due time still ahead */
export const isSnoozed = (st: Pick<State, 'snoozed'>, id: string, now = Date.now()) => {
  const s = st.snoozed[id]
  return !!s && (!s.dueAt || Date.parse(s.dueAt) > now)
}

/**
 * Pure: which tab an alert belongs to. Closed → «بسته‌شده»; a recorded decision → «در حال رسیدگی»
 * (even with a reminder); a reminder not yet due → «معوق»; everything else → «نیازمند بررسی».
 */
export function alertBucket(st: BucketState, alert: { id: string }, now = Date.now()): AlertBucket {
  if (st.closed[alert.id]) return 'closed'
  if (st.records[alert.id]) return 'handling'
  if (isSnoozed(st, alert.id, now)) return 'snoozed'
  return 'review'
}

/** Ids whose reminder is due at `now` (to wake) */
export function dueReminders(st: Pick<State, 'snoozed' | 'records' | 'closed'>, now = Date.now()): string[] {
  return Object.entries(st.snoozed)
    .filter(([id, s]) => !st.records[id] && !st.closed[id] && !!s.dueAt && Date.parse(s.dueAt) <= now)
    .map(([id]) => id)
}

/** Wakes every due reminder; the app shell calls it every minute and when the page is shown again */
export function wakeDueReminders(now = Date.now()) {
  for (const id of dueReminders(state, now)) alertActions.wake(id)
}

/** Alerts per tab, from the same rule everywhere (menu, bell, dashboard, tabs) */
export function bucketCounts(st: BucketState, list: { id: string }[], now = Date.now()): Record<AlertBucket, number> {
  const c: Record<AlertBucket, number> = { review: 0, handling: 0, snoozed: 0, closed: 0 }
  for (const a of list) c[alertBucket(st, a, now)]++
  return c
}
