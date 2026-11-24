import { useSyncExternalStore } from 'react'
import { alertDetails, allAlerts, slaMinutesLeft, slaPassed } from '../data/alerts'
import type { AlertItem } from '../data/alerts'
import { notificationSamples } from '../data/notifications'
import { accessFor, currentUser, isMine } from './access'
import type { CurrentUser } from './access'
import { alertBucket, useAlertState } from './alertStore'
import type { AlertState } from './alertStore'
import { formatNumber } from './format'
import { isLate, managerOf as unitManagerName, turnOf } from './actionRules'

/**
 * The bell's inbox: events about alerts this user owns or was given, made by someone else or a
 * system, since they last looked. Each kind goes only to its recipient (who recorded the action,
 * who holds the alert, who it was referred to…); a notice that asks for work the user may not do
 * goes to «اطلاع‌رسانی». One stable id per event, so re-rendering never makes a copy.
 */
export type NotifKind =
  | 'unit_rejected'
  | 'sla_near'
  | 'sla_passed'
  | 'assigned'
  | 'reminder_due'
  | 'sync_failed'
  | 'reopened'
  | 'new_critical'
  | 'severity_raised'
  | 'unit_accepted'
  | 'decision_changed'
  | 'takeover'
  | 'reassigned_away'
  // «اقدام‌ها» (actions-page-prompt §8): each opens the action, not the alert
  | 'act_new'
  | 'act_accept_overdue'
  | 'act_accepted'
  | 'act_counter'
  | 'act_blocked'
  | 'act_late'
  | 'act_done'
  | 'act_verify'
export type NotifCategory = 'act' | 'info'
export type NotifTab = 'all' | NotifCategory
export type NotifTone = 'danger' | 'warning' | 'info' | 'success' | 'neutral'
export interface AppNotification {
  /** Deterministic: `${kind}:${alertId}:${version}` */
  id: string
  kind: NotifKind
  category: NotifCategory
  alertId: string
  alertCode: string
  parts: { text: string; strong?: boolean }[]
  /** ISO time of the event */
  at: string
  step?: 'status' | 'decision' | 'followup'
  cta?: { label: string; focus?: 'options' }
  resolved: boolean
  tone: NotifTone
  /** Made by a reassignment: an undo removes it instead of leaving it «رسیدگی شد» */
  fromReassign?: boolean
  /** The action it is about: a click opens /planning/actions/ACT-… */
  actionId?: string
}

const loadedAt = Date.now()
const iso = (ms: number) => new Date(ms).toISOString()
/** Sample «last visit»: events before it start as read, except work still waiting for the user */
export const LAST_VISIT = iso(loadedAt - 3 * 60 * 60_000)
const ACT_KINDS: NotifKind[] = ['unit_rejected', 'sla_near', 'sla_passed', 'assigned', 'reminder_due', 'sync_failed', 'reopened', 'act_new', 'act_accept_overdue', 'act_counter', 'act_late']
const TONE: Record<NotifKind, NotifTone> = {
  unit_rejected: 'danger',
  sla_near: 'warning',
  sla_passed: 'danger',
  assigned: 'info',
  reminder_due: 'info',
  sync_failed: 'danger',
  reopened: 'warning',
  new_critical: 'danger',
  severity_raised: 'warning',
  unit_accepted: 'success',
  decision_changed: 'neutral',
  takeover: 'neutral',
  reassigned_away: 'neutral',
  act_new: 'info',
  act_accept_overdue: 'danger',
  act_accepted: 'success',
  act_counter: 'info',
  act_blocked: 'warning',
  act_late: 'danger',
  act_done: 'success',
  act_verify: 'success',
}
type Part = { text: string; strong?: boolean }
const S = (text: string): Part => ({ text, strong: true })
const T = (text: string): Part => ({ text })
/** «مدیر واحد حمل‌ونقل» — without doubling an owner that is already a manager */
const managerOf = (owner?: string) => (!owner ? 'مدیر واحد' : owner.startsWith('مدیر') ? owner : `مدیر ${owner}`)
const fill = (s: string, n?: number) => s.replace('{n}', formatNumber(n ?? 0))

/**
 * Every notification the alert state implies now, for `me`. `known` keeps events whose source has
 * gone, so they stay as «رسیدگی شد» (except those a reassignment made: an undo removes them).
 */
export function buildNotifications(st: AlertState, now: number, known: Map<string, AppNotification>, slaSince: Record<string, string>, alerts: AlertItem[] = allAlerts, me: CurrentUser = currentUser()) {
  const fresh: AppNotification[] = []
  const add = (a: AlertItem, kind: NotifKind, version: string, at: string, parts: AppNotification['parts'], step?: AppNotification['step'], cta?: AppNotification['cta'], fromReassign?: boolean) =>
    fresh.push({ id: `${kind}:${a.id}:${version}`, kind, category: ACT_KINDS.includes(kind) ? 'act' : 'info', alertId: a.id, alertCode: a.code, parts, at, step, cta, resolved: false, tone: TONE[kind], fromReassign })
  for (const a of alerts) {
    const d = alertDetails[a.id]
    const acc = accessFor(a, d, st, me)
    // «مسئول فعلی»: the one who may act now, or would after «ادامه می‌دهم»
    const holdsIt = acc.canAct || acc.block?.kind === 'held'
    const inUnit = me.unit === null || me.unit === d?.owner
    const rej = st.unitRejections[a.id]
    if (rej && rej.recordedBy === me.name) {
      const o = d?.options.find((x) => x.id === rej.option)
      add(a, 'unit_rejected', rej.at, rej.at, [S(rej.unit), T(` «${o ? fill(o.title, rej.amount) : rej.option}» را رد کرد`)], 'decision', { label: 'انتخاب اقدام دیگر', focus: 'options' })
    }
    const asg = st.assignments[a.id]
    if (asg && isMine(asg.to, me)) add(a, 'assigned', asg.at, asg.at, [S(asg.by), T(' هشدار '), S(a.title), T(' را به شما ارجاع داد')], 'status')
    const re = st.reassigned[a.id]
    if (re && isMine(re.to, me)) add(a, 'assigned', `re:${re.at}`, re.at, [S(re.by), T(' هشدار '), S(a.title), T(` را به ${re.to === me.name ? 'شما' : re.to} ارجاع داد`)], 'status', undefined, true)
    // The one who held it before: a person, or everyone in the unit that held it
    if (re && (isMine(re.from, me) || (re.from === d?.owner && inUnit)) && !isMine(re.to, me)) add(a, 'reassigned_away', `re:${re.at}`, re.at, [T('هشدار '), S(a.title), T(' به '), S(re.to), T(' ارجاع شد')], 'status', undefined, true)
    const take = st.takenOver[a.id]
    if (take && take.from === me.name) add(a, 'takeover', take.at, take.at, [S(take.by), T(' بررسی هشدار '), S(a.title), T(' را از شما ادامه داد')], 'status')
    const open = alertBucket(st, a, now) === 'review'
    const left = slaMinutesLeft(a, now)
    if (open && left !== null && left < 60 && holdsIt) {
      slaSince[a.id] ??= iso(now)
      add(a, 'sla_near', slaSince[a.id], slaSince[a.id], [T('مهلت رسیدگی '), S(a.title), T(` تا ${formatNumber(left)} دقیقهٔ دیگر تمام می‌شود`)], undefined, { label: 'رسیدگی' })
    }
    // The holder and the unit's manager (the panel says it was referred to the manager)
    if (!st.closed[a.id] && !st.records[a.id] && slaPassed(a, now) && (holdsIt || (me.role === 'manager' && inUnit))) {
      const at = a.slaDueAt ?? iso(loadedAt - 30 * 60_000)
      add(a, 'sla_passed', at, at, [T('مهلت رسیدگی '), S(a.title), T(` گذشت و هشدار به ${managerOf(d?.owner)} ارجاع شد`)], 'status')
    }
    const due = st.reminded[a.id]
    if (due && (st.remindedBy[a.id] ?? me.name) === me.name) add(a, 'reminder_due', due, due, [T('موعد یادآوری '), S(a.title), T(' رسید')])
    const rec = st.records[a.id]
    if (rec?.sync === 'failed' && rec.by === me.name) {
      const at = rec.at ?? iso(loadedAt - 6 * 60 * 60_000)
      add(a, 'sync_failed', rec.rec, at, [T('ثبت '), S(rec.externalRef), T(' در سیستم اجرایی ناموفق بود')], 'followup', { label: 'پیگیری دستی' })
    }
    if (holdsIt && a.flags?.includes('reopened') && a.createdAt) add(a, 'reopened', 'v1', a.createdAt, [T('هشدار '), S(a.title), T(' دوباره باز شد')], 'status')
    if (holdsIt && a.flags?.includes('higher') && a.createdAt) add(a, 'severity_raised', 'v1', a.createdAt, [T('شدت هشدار '), S(a.title), T(' بالا رفت')], 'status')
    // Everyone in the unit that owns it: the alert has no person yet
    if (inUnit && a.severity === 'critical' && open && a.createdAt && now - Date.parse(a.createdAt) < 12 * 3600_000 && !st.seen[a.id]) add(a, 'new_critical', 'v1', a.createdAt, [T('هشدار بحرانی تازه: '), S(a.title), T(` در ${a.place}`)], 'status')
  }
  for (const s of notificationSamples) {
    const a = alerts.find((x) => x.id === s.alertId)
    if (!a || !s.when(st, a.id) || st.records[a.id]?.by !== me.name) continue
    const at = iso(loadedAt - s.minutesAgo * 60_000)
    if (s.kind === 'unit_accepted') add(a, s.kind, st.records[a.id].rec, at, [S(s.actor), T(` ${fillRecord(a, st)} را پذیرفت`)], 'followup')
  }
  // ── Actions (§8): to whoever the change concerns; the requester's «پذیرفت» for a2 is the sample above ──
  const sampled = new Set(notificationSamples.filter((s) => s.kind === 'unit_accepted').map((s) => s.alertId))
  for (const x of Object.values(st.actions ?? {})) {
    const a = alerts.find((y) => y.id === x.alertId)
    if (!a) continue
    const act = (kind: NotifKind, version: string, at: string, parts: Part[], category?: NotifCategory) => {
      fresh.push({ id: `${kind}:${x.id}:${version}`, kind, category: category ?? (ACT_KINDS.includes(kind) ? 'act' : 'info'), alertId: a.id, alertCode: a.code, parts, at, resolved: false, tone: TONE[kind], actionId: x.id })
    }
    const mineToAccept = x.status === 'new' && turnOf(x, me, now) === 'mine'
    if (mineToAccept) act('act_new', x.sentAt, x.sentAt, [S(x.requester), T(' اقدام '), S(x.title), T(` را برای ${x.unit} فرستاد`)])
    if (x.status === 'new' && x.acceptDueAt && Date.parse(x.acceptDueAt) <= now && me.role === 'manager' && unitManagerName(x.unit) === me.name) act('act_accept_overdue', x.acceptDueAt, x.acceptDueAt, [T('مهلت پذیرش '), S(x.title), T(` گذشت و ${x.unit} هنوز پاسخ نداده`)])
    if (x.requester === me.name) {
      if (x.acceptedAt && !sampled.has(a.id)) act('act_accepted', x.acceptedAt, x.acceptedAt, [S(x.owner ?? x.unit), T(' اقدام '), S(x.title), T(' را پذیرفت')])
      if (x.status === 'counter' && x.counter) act('act_counter', x.counter.at, x.counter.at, [S(x.counter.by), T(' برای '), S(x.title), T(' پیشنهاد تغییر داد')])
      if (x.status === 'blocked' && x.blocked) act('act_blocked', x.blocked.since, x.blocked.since, [S(x.owner ?? x.unit), T(' برای '), S(x.title), T(` مانع اعلام کرد: ${x.blocked.reason}`)])
      if (x.doneAt) act('act_done', x.doneAt, x.doneAt, [S(x.owner ?? x.unit), T(' انجام '), S(x.title), T(' را اعلام کرد')])
      if (x.closedAt && x.verify) act('act_verify', x.closedAt, x.closedAt, [T('سنجش اثر '), S(x.title), T(x.verify.inBand ? ' تمام شد؛ اثر در بازه ماند' : ' انحراف نشان داد')])
    }
    // Late: work for the owner, news for the requester
    if (isLate(x, now) && x.due) {
      if (x.owner === me.name) act('act_late', x.due, x.due, [T('موعد '), S(x.title), T(' گذشت')])
      else if (x.requester === me.name) act('act_late', x.due, x.due, [T('موعد '), S(x.title), T(` گذشت · ${x.owner ?? x.unit}`)], 'info')
    }
  }
  // A deadline that has now passed replaces its «نزدیک» notice (new id, unread)
  for (const n of fresh) if (n.kind === 'sla_passed') known.delete(`sla_near:${n.alertId}:${slaSince[n.alertId]}`)
  const live = new Set(fresh.map((n) => n.id))
  // An undone reassignment takes its notices with it
  for (const [id, n] of known) if (n.fromReassign && !live.has(id)) known.delete(id)
  for (const n of fresh) known.set(n.id, n)
  return [...known.values()]
    .map((n) => {
      // An action's notice: handled when the action has moved on; its recipients were chosen above
      if (n.actionId) {
        const x = st.actions?.[n.actionId]
        const done = !x || (n.kind === 'act_new' && x.status !== 'new') || (n.kind === 'act_accept_overdue' && x.status !== 'new') || (n.kind === 'act_counter' && x.status !== 'counter') || (n.kind === 'act_late' && !isLate(x, now))
        if (done && n.category === 'act') return { ...n, resolved: true, category: 'info' as const, parts: n.resolved ? n.parts : [...n.parts, T(' · رسیدگی شد')] }
        return n
      }
      const a = alerts.find((x) => x.id === n.alertId)!
      const acc = accessFor(a, alertDetails[a.id], st, me)
      const k = acc.block?.kind
      // Moved to someone else or closed: nothing left for this user to do
      const handled = isHandled(n, st, live) || (ACT_KINDS.includes(n.kind) && (k === 'moved' || k === 'closed'))
      if (handled) return { ...n, resolved: true, category: 'info' as const, cta: undefined, parts: n.resolved ? n.parts : [...n.parts, T(' · رسیدگی شد')] }
      // Work the user may not do goes to «اطلاع‌رسانی» (a held review stays: «ادامه می‌دهم» unlocks it)
      if (n.category === 'act' && !acc.canAct && k !== 'held') return { ...n, category: 'info' as const, cta: undefined }
      return n
    })
    .sort((x, y) => y.at.localeCompare(x.at))
}

const fillRecord = (a: AlertItem, st: AlertState) => {
  const r = st.records[a.id]
  const o = alertDetails[a.id]?.options.find((x) => x.id === r.option)
  return o ? fill(o.title, r.amount) : 'تصمیم'
}

/** The «رسیدگی‌شده» rule of each kind (info kinds never need handling) */
function isHandled(n: AppNotification, st: AlertState, live: Set<string>) {
  if (!ACT_KINDS.includes(n.kind)) return false
  const decided = !!st.records[n.alertId] || !!st.closed[n.alertId]
  switch (n.kind) {
    case 'reminder_due':
      return !st.reminded[n.alertId]
    case 'sync_failed':
      return st.records[n.alertId]?.sync !== 'failed'
    default:
      return decided || !live.has(n.id)
  }
}

// ── Read state, chosen tab, and the minute tick ──
// TEMPORARY: kept in sessionStorage until the notification service exists
// Per person, so switching user (?user=) does not share read marks
const KEY = `scm-notif-read:${currentUser().name}`
const loadRead = (): Record<string, true> => {
  try {
    return JSON.parse(sessionStorage.getItem(KEY) ?? '{}')
  } catch {
    return {}
  }
}
let ui = { read: loadRead(), tab: 'all' as NotifTab, now: Date.now() }
const subs = new Set<() => void>()
const set = (patch: Partial<typeof ui>) => {
  ui = { ...ui, ...patch }
  if (patch.read) {
    try {
      sessionStorage.setItem(KEY, JSON.stringify(ui.read))
    } catch {
      /* storage blocked: read marks last for this page only */
    }
  }
  subs.forEach((f) => f())
}
const known = new Map<string, AppNotification>()
const slaSince: Record<string, string> = {}

/** Read: marked, handled, or an event before the last visit that asks nothing of the user */
export const isReadBy = (read: Record<string, true>) => (n: AppNotification) => !!read[n.id] || n.resolved || (n.category === 'info' && n.at < LAST_VISIT)

/**
 * Tabs, read state and counts over a built list. An info notice about an alert that already has
 * open work in «نیاز به اقدام» is covered by it: read, and left out of «همه» (still in «اطلاع‌رسانی»).
 * Counts are unread only, so «همه» = «نیاز به اقدام» + «اطلاع‌رسانی».
 */
export function viewOf(all: AppNotification[], read: Record<string, true>) {
  const baseRead = isReadBy(read)
  const covered = new Set(all.filter((n) => n.category === 'act' && !n.resolved).map((n) => n.alertId))
  const isRead = (n: AppNotification) => baseRead(n) || (n.category === 'info' && covered.has(n.alertId))
  const listFor = (tab: NotifTab) => all.filter((n) => (tab === 'all' ? !(n.category === 'info' && !n.resolved && covered.has(n.alertId)) : n.category === tab))
  const unread = (tab: NotifTab) => all.filter((n) => (tab === 'all' || n.category === tab) && !isRead(n)).length
  return { listFor, isRead, counts: { all: unread('all'), act: unread('act'), info: unread('info') } }
}

export function useNotifications() {
  const st = useAlertState()
  const u = useSyncExternalStore(
    (cb) => {
      subs.add(cb)
      return () => subs.delete(cb)
    },
    () => ui,
  )
  const { listFor, isRead, counts } = viewOf(buildNotifications(st, u.now, known, slaSince), u.read)
  return {
    tab: u.tab,
    listFor,
    isRead,
    counts,
    setTab: (tab: NotifTab) => set({ tab }),
    markRead: (id: string) => set({ read: { ...u.read, [id]: true } }),
    markAllRead: (tab: NotifTab) => set({ read: { ...u.read, ...Object.fromEntries(listFor(tab).map((n) => [n.id, true as const])) } }),
  }
}

/** Every notification of one alert becomes read (the user is looking at it) */
export function markAlertRead(alertId: string) {
  const ids = [...known.values()].filter((n) => n.alertId === alertId && !ui.read[n.id]).map((n) => n.id)
  if (ids.length) set({ read: { ...ui.read, ...Object.fromEntries(ids.map((id) => [id, true as const])) } })
}

/** The app shell's minute tick: deadlines count down and «نزدیک» turns into «گذشت» without a reload */
export const tickNotifications = () => set({ now: Date.now() })
