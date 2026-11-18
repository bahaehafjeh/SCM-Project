/**
 * TEMPORARY access rules until the user and permission service exists. Every caller asks only
 * `currentUser()` and `accessFor()`; nothing else decides who may act on an alert.
 *
 * Design review parameters, kept for the whole session once given (sessionStorage):
 *   ?role=viewer | specialist | manager   ?unit=واحد تأمین (or ?unit=all)   ?user=رضا کریمی
 */
import { currentUser as signedIn } from '../config/user'
import type { AlertDetail, AlertItem } from '../data/alerts'
import type { AlertState, Role } from './alertStore'

export interface CurrentUser {
  name: string
  role: Role
  /** null = works across units (the default user, «ذخایر راهبردی») */
  unit: string | null
}

/** TEMPORARY sample directory: people and the unit they belong to */
export const PEOPLE: { name: string; unit: string | null; manager?: true }[] = [
  { name: signedIn.name, unit: null },
  { name: 'سارا احمدی', unit: 'واحد انبارهای جنوب' },
  { name: 'مریم صادقی', unit: 'واحد انبارهای جنوب' },
  { name: 'علی رضایی', unit: 'واحد انبارهای جنوب' },
  { name: 'رضا کریمی', unit: 'واحد تأمین' },
  // Actions-page samples (§9-1): the supply unit's manager and one specialist per executing unit
  { name: 'حمید نوری', unit: 'واحد تأمین', manager: true },
  { name: 'رضا کاظمی', unit: 'واحد حمل‌ونقل' },
  { name: 'علی رستمی', unit: 'واحد بازرگانی و ترخیص' },
]
/** Who a manager can refer an alert to */
export const REASSIGN_TARGETS = ['مریم صادقی', 'سارا احمدی', 'علی رضایی', 'واحد تأمین', 'واحد حمل‌ونقل', 'واحد بازرگانی و ترخیص']

const KEY = 'scm-preview'
const ROLES: Role[] = ['viewer', 'specialist', 'manager']
function previewParams(): Record<string, string> {
  let saved: Record<string, string> = {}
  try {
    saved = JSON.parse(sessionStorage.getItem(KEY) ?? '{}')
  } catch {
    /* storage blocked: the URL alone decides */
  }
  const q = typeof window === 'undefined' ? new URLSearchParams() : new URLSearchParams(window.location.search)
  let changed = false
  for (const k of ['role', 'unit', 'user']) {
    const v = q.get(k)
    if (v !== null && saved[k] !== v) {
      saved[k] = v
      changed = true
    }
  }
  if (changed) {
    try {
      sessionStorage.setItem(KEY, JSON.stringify(saved))
    } catch {
      /* not kept across pages */
    }
  }
  return saved
}

/** TEMPORARY: name from ?user= (default the signed-in user), role from ?role= (default specialist), unit from ?unit= or the person's unit */
export function currentUser(): CurrentUser {
  const p = previewParams()
  const name = p.user?.trim() || signedIn.name
  const role = ROLES.includes(p.role as Role) ? (p.role as Role) : 'specialist'
  const unit = p.unit && p.unit !== 'all' ? p.unit : p.unit === 'all' ? null : (PEOPLE.find((x) => x.name === name)?.unit ?? null)
  return { name, role, unit }
}

export type ActBlock = { kind: 'viewer' } | { kind: 'held'; by: string; since: string } | { kind: 'moved'; to: string; at: string } | { kind: 'closed'; by?: string; reason: string } | { kind: 'other_unit'; unit: string }

export interface Access {
  /** The decision and follow-up buttons are enabled */
  canAct: boolean
  /** Who is responsible now (person or unit), always filled */
  holder: string
  block?: ActBlock
  /** Manager only, in any state but closed */
  canReassign: boolean
}

/** «به شما» or «به واحد شما»: a referral that names this user or their unit */
export const isMine = (to: string | undefined, me: CurrentUser) => !!to && (to === me.name || (!!me.unit && to === me.unit))

/** Who may act on an alert now. The first rule that holds wins. */
export function accessFor(alert: Pick<AlertItem, 'id' | 'lockedBy'>, detail: Pick<AlertDetail, 'owner'> | undefined, st: AlertState, me: CurrentUser = currentUser()): Access {
  const id = alert.id
  const owner = detail?.owner ?? '—'
  const manager = me.role === 'manager'
  const re = st.reassigned[id]
  const asg = st.assignments[id]
  const take = st.takenOver[id]
  const lockName = take?.by ?? alert.lockedBy?.name
  const holder = re?.to ?? lockName ?? (asg && isMine(asg.to, me) ? me.name : owner)
  const base = { holder, canReassign: manager }
  const closed = st.closed[id]
  if (closed) return { canAct: false, holder: owner, canReassign: false, block: { kind: 'closed', by: closed.by, reason: closed.reason } }
  if (me.role === 'viewer') return { ...base, canAct: false, block: { kind: 'viewer' } }
  if (re && !isMine(re.to, me)) return { ...base, canAct: false, block: { kind: 'moved', to: re.to, at: re.at } }
  const referred = isMine(re?.to, me) || isMine(asg?.to, me)
  if (me.unit && owner !== me.unit && !referred && !manager) return { ...base, canAct: false, block: { kind: 'other_unit', unit: owner } }
  if (lockName && lockName !== me.name && !(take && take.by === me.name)) return { ...base, canAct: false, block: { kind: 'held', by: lockName, since: take ? take.at : (alert.lockedBy?.since ?? '') } }
  return { ...base, canAct: true }
}

/** «فقط مریم صادقی می‌تواند اقدام کند» — every disabled action says who can */
export const onlyHolder = (a: Access) => `فقط ${a.holder} می‌تواند اقدام کند`
