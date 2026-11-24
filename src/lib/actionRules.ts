import type { CurrentUser } from './access'
import { PEOPLE } from './access'
import type { ActionItem, ActionKind, ActionStatus, ActionStep } from './alertStore'
import type { Severity } from '../data/alerts'

/**
 * The rules of «اقدام‌ها», pure so every count (cards, chips, tabs, sidebar badge) comes from the
 * same place as the rows. Spec: actions-page-prompt §2–§6.
 */

export const DAY = 86_400_000
const HOUR = 3_600_000

/** Steps by kind (§2). A re-route is a «انتقال» with its own steps; «سایر» has two (owner decision) */
export const STEP_TEMPLATES = {
  buy: ['ثبت درخواست خرید', 'تأیید پیش‌فاکتور', 'صدور سفارش', 'ارسال', 'تحویل در انبار'],
  move: ['صدور حواله', 'بارگیری', 'در راه', 'تحویل'],
  doc: ['ثبت پرونده', 'گواهی', 'ترخیص'],
  refer: ['دریافت', 'پاسخ واحد'],
  reroute: ['ثبت تغییر', 'حرکت', 'تخلیه', 'رسیدن'],
  other: ['ثبت', 'انجام'],
} as const
export type StepTemplate = keyof typeof STEP_TEMPLATES
export const stepsOf = (t: StepTemplate): ActionStep[] => STEP_TEMPLATES[t].map((label) => ({ label }))

export const KIND_LABEL: Record<ActionKind, string> = { buy: 'خرید', move: 'انتقال', doc: 'مدارک', refer: 'ارجاع', other: 'سایر' }

/**
 * An alert option → the action's kind and steps. Supply and diversifying purchases are «خرید»;
 * transfers and re-routes are «انتقال»; papers «مدارک»; referrals «ارجاع»; the rest «سایر».
 */
export function kindOfOption(o: { id: string; kind: string }): { kind: ActionKind; steps: StepTemplate } {
  if (o.kind === 'supply' || o.id === 'diversify') return { kind: 'buy', steps: 'buy' }
  if (o.kind === 'transfer') return { kind: 'move', steps: 'move' }
  if (o.id === 'reroute') return { kind: 'move', steps: 'reroute' }
  if (o.kind === 'docs') return { kind: 'doc', steps: 'doc' }
  if (o.kind === 'refer') return { kind: 'refer', steps: 'refer' }
  return { kind: 'other', steps: 'other' }
}

/** Time the unit has to accept, by the alert's severity (§2) */
export const ACCEPT_HOURS: Record<Severity, number> = { critical: 2, high: 8, medium: 24 }
export const acceptWindow = (sev: Severity | undefined) => ACCEPT_HOURS[sev ?? 'medium'] * HOUR

export const STATUS_LABEL: Record<ActionStatus, string> = {
  new: 'منتظر پذیرش',
  counter: 'پیشنهاد تغییر',
  doing: 'در حال اجرا',
  blocked: 'مانع',
  verify: 'سنجش اثر',
  closed: 'بسته شد',
  rejected: 'رد شد',
  cancel: 'لغو شد',
}

export const isOpen = (a: Pick<ActionItem, 'status'>) => a.status !== 'closed' && a.status !== 'rejected' && a.status !== 'cancel'

/** Past its due date while still being carried out */
export const isLate = (a: ActionItem, now: number) => (a.status === 'doing' || a.status === 'blocked') && !!a.due && Date.parse(a.due) < now
export const lateDays = (a: ActionItem, now: number) => (isLate(a, now) ? Math.max(1, Math.floor((now - Date.parse(a.due!)) / DAY)) : 0)
/** Blocked, or the executing system did not take it */
export const isStuck = (a: ActionItem) => isOpen(a) && (a.status === 'blocked' || a.sync === 'failed')

/** Milliseconds left to accept; null when not waiting for acceptance (a counter pauses it) */
export const acceptLeft = (a: ActionItem, now: number) => (a.status === 'new' && a.acceptDueAt ? Date.parse(a.acceptDueAt) - now : null)

export const unitOf = (name: string) => PEOPLE.find((p) => p.name === name)?.unit ?? null
export const managerOf = (unit: string) => PEOPLE.find((p) => p.unit === unit && p.manager)?.name ?? null
export const membersOf = (unit: string) => PEOPLE.filter((p) => p.unit === unit).map((p) => p.name)

/** A specialist or manager of the unit the action was sent to */
export const inUnit = (a: Pick<ActionItem, 'unit'>, me: CurrentUser) => me.role !== 'viewer' && !!me.unit && me.unit === a.unit
/** May carry the action out: its owner, or anyone in the unit while it has none */
export const isDoer = (a: ActionItem, me: CurrentUser) => me.role !== 'viewer' && (a.owner === me.name || (!a.owner && inUnit(a, me)))
export const isUnitManager = (a: ActionItem, me: CurrentUser) => me.role === 'manager' && inUnit(a, me)
export const isRequester = (a: ActionItem, me: CurrentUser) => me.role !== 'viewer' && a.requester === me.name

export type Turn = 'closed' | 'mine' | 'others' | 'flow'
export const TURN_LABEL: Record<Turn, string> = { mine: 'منتظر شما', flow: 'در جریان', others: 'منتظر دیگران', closed: 'بسته‌شده' }

/** Whose move it is (§4). The first rule that holds wins. */
export function turnOf(a: ActionItem, me: CurrentUser, now = Date.now()): Turn {
  if (!isOpen(a)) return 'closed'
  // A viewer acts on nothing: only whether the unit or the requester holds it
  if (me.role === 'viewer') return a.status === 'new' || a.status === 'counter' ? 'others' : 'flow'
  const owner = a.owner === me.name
  if (a.status === 'new' && (owner || (!a.owner && inUnit(a, me)))) return 'mine'
  if (a.status === 'counter' && a.requester === me.name) return 'mine'
  if (owner && (a.status === 'blocked' || (a.status === 'doing' && (a.sync === 'failed' || isLate(a, now))))) return 'mine'
  if (a.status === 'counter' && (owner || inUnit(a, me))) return 'others'
  if (a.status === 'new' && a.requester === me.name) return 'others'
  return 'flow'
}

export type Tone = 'red' | 'orange' | 'blue' | null
/**
 * The row's only colour (§6): red for time (late, or under 2 hours to accept for whoever must
 * answer), orange for stuck, blue for «منتظر شما». Red wins over orange, orange over blue.
 */
export function toneOf(a: ActionItem, me: CurrentUser, now = Date.now()): Tone {
  if (!isOpen(a)) return null
  const turn = turnOf(a, me, now)
  const left = acceptLeft(a, now)
  if (isLate(a, now) || (turn === 'mine' && left !== null && left < 2 * HOUR)) return 'red'
  if (isStuck(a)) return 'orange'
  if (turn === 'mine') return 'blue'
  return null
}

// ── Tabs (§5-3) ──
export type ActionTab = 'mine' | 'unit' | 'all'
export const TAB_LABEL: Record<ActionTab, string> = { mine: 'کارهای من', unit: 'واحد من', all: 'همه' }
/** Only the tabs this person may see; no locked tab */
export function tabsFor(me: CurrentUser): ActionTab[] {
  const t: ActionTab[] = []
  if (me.role !== 'viewer') t.push('mine')
  if (me.role !== 'viewer' && me.unit) t.push('unit')
  if (me.role === 'manager' || me.role === 'viewer' || !me.unit) t.push('all')
  return t
}
export function inTab(a: ActionItem, tab: ActionTab, me: CurrentUser): boolean {
  if (tab === 'all') return true
  // What reached my unit (owner decision: requests sent from it stay in the sender's «کارهای من»)
  if (tab === 'unit') return !!me.unit && a.unit === me.unit
  return a.owner === me.name || a.requester === me.name || (!a.owner && (a.status === 'new' || a.status === 'counter') && inUnit(a, me))
}
/** A tab's count: its open actions (closed ones are behind the «بسته‌شده» chip) */
export const tabCount = (list: ActionItem[], tab: ActionTab, me: CurrentUser) => list.filter((a) => isOpen(a) && inTab(a, tab, me)).length

// ── Cards (§5-2) ──
export type CardKey = 'mine' | 'late' | 'stuck' | 'week'
export const inWeek = (a: ActionItem, now: number) => isOpen(a) && a.status !== 'verify' && !!a.due && Date.parse(a.due) >= now && Date.parse(a.due) - now <= 7 * DAY && !isLate(a, now)
export const cardTest: Record<CardKey, (a: ActionItem, me: CurrentUser, now: number) => boolean> = {
  mine: (a, me, now) => turnOf(a, me, now) === 'mine',
  late: (a, _me, now) => isLate(a, now),
  stuck: (a) => isStuck(a),
  week: (a, _me, now) => inWeek(a, now),
}
export function cardCounts(list: ActionItem[], me: CurrentUser, now: number): Record<CardKey, ActionItem[]> {
  const open = list.filter(isOpen)
  return {
    mine: open.filter((a) => cardTest.mine(a, me, now)),
    late: open.filter((a) => cardTest.late(a, me, now)),
    stuck: open.filter((a) => cardTest.stuck(a, me, now)),
    week: open.filter((a) => cardTest.week(a, me, now)),
  }
}

/** The deadline that matters to me: the time to accept while it runs, else the due date */
export const deadlineOf = (a: ActionItem, me: CurrentUser, now: number): number | null => {
  const left = acceptLeft(a, now)
  if (left !== null && turnOf(a, me, now) === 'mine') return now + left
  // Delivered or finished: no deadline left, so it goes after the work still to do
  if (!isOpen(a) || a.status === 'verify') return null
  return a.due ? Date.parse(a.due) : null
}

// ── Order (§5-4) ──
export type SortKey = 'urgency' | 'due' | 'newest' | 'severity'
const TONE_RANK: Record<string, number> = { red: 0, blue: 1, orange: 2, none: 3 }
const SEV_RANK: Record<string, number> = { critical: 0, high: 1, medium: 2 }
const by = (x: number | null, y: number | null) => (x ?? Infinity) - (y ?? Infinity)
/**
 * «فوریت»: late and under-2-hours first, then «منتظر شما», then stuck, then the rest; inside each,
 * the nearest deadline first. The tiers are the row colours, so the order reads like the colours.
 */
export function sortActions(list: ActionItem[], key: SortKey, me: CurrentUser, now: number): ActionItem[] {
  const urgency = (a: ActionItem, b: ActionItem) => TONE_RANK[toneOf(a, me, now) ?? 'none'] - TONE_RANK[toneOf(b, me, now) ?? 'none'] || by(deadlineOf(a, me, now), deadlineOf(b, me, now)) || b.sentAt.localeCompare(a.sentAt)
  const cmp: Record<SortKey, (a: ActionItem, b: ActionItem) => number> = {
    urgency,
    due: (a, b) => by(a.due ? Date.parse(a.due) : null, b.due ? Date.parse(b.due) : null) || urgency(a, b),
    newest: (a, b) => b.sentAt.localeCompare(a.sentAt),
    severity: (a, b) => (SEV_RANK[a.severity ?? ''] ?? 3) - (SEV_RANK[b.severity ?? ''] ?? 3) || urgency(a, b),
  }
  return [...list].sort(cmp[key])
}

// ── Progress (§5-6) ──
export const doneCount = (a: Pick<ActionItem, 'steps'>) => a.steps.filter((s) => s.done).length
export const currentStep = (a: Pick<ActionItem, 'steps'>) => a.steps.find((s) => !s.done) ?? null
/** One line: «۲ از ۵ · صدور سفارش», the problem inside it when there is one */
export function progressOf(a: ActionItem, now: number): { text: string; pct: number; tone: 'red' | 'orange' | 'green' | null; notStarted: boolean } {
  const n = a.steps.length
  const d = doneCount(a)
  const pct = n ? (d / n) * 100 : 0
  const fa = (x: number) => x.toLocaleString('fa-IR')
  if (a.status === 'verify' || a.status === 'closed') return { text: a.status === 'verify' ? 'تحویل شد' : 'انجام شد', pct: 100, tone: 'green', notStarted: false }
  if (a.status === 'rejected') return { text: 'رد شد', pct: 0, tone: null, notStarted: true }
  if (a.status === 'cancel') return { text: 'لغو شد', pct: 0, tone: null, notStarted: true }
  if (a.status === 'new' || a.status === 'counter' || d === 0) return { text: 'شروع نشده', pct: 0, tone: null, notStarted: true }
  const cur = currentStep(a)
  const head = `${fa(d)} از ${fa(n)}`
  if (a.status === 'blocked') return { text: `${head} · مانع: ${cur?.label ?? ''}`, pct, tone: 'orange', notStarted: false }
  if (a.sync === 'failed') return { text: `${head} · ثبت نشد`, pct, tone: 'orange', notStarted: false }
  return { text: `${head} · ${cur?.label ?? ''}`, pct, tone: isLate(a, now) ? 'red' : null, notStarted: false }
}

/** Day of the 7-day check, counted from delivery */
export const verifyDay = (a: ActionItem, now: number) => (a.doneAt ? Math.min(7, Math.max(0, Math.floor((now - Date.parse(a.doneAt)) / DAY))) : 0)

// ── Search (§5-4) ──
const digits = (s: string) => s.replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
export const normSearch = (s: string) => digits(s).replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/‌/g, ' ').toLowerCase().trim()
/** Which field matched: the external reference is highlighted in the row */
export function searchHit(a: ActionItem, q: string): null | 'ref' | 'other' {
  const w = normSearch(q)
  if (!w) return 'other'
  const fields = [a.id, a.alertCode, a.item ?? '', a.owner ?? '']
  if (fields.some((f) => normSearch(f).includes(w))) return 'other'
  if (a.externalRef && normSearch(a.externalRef).includes(w)) return 'ref'
  return null
}
