import { describe, expect, it } from 'vitest'
import { alertDetails, allAlerts } from '../data/alerts'
import type { AlertState } from './alertStore'
import { accessFor } from './access'
import type { CurrentUser } from './access'
import { buildNotifications, viewOf } from './notificationStore'
import type { AppNotification } from './notificationStore'

const ME: CurrentUser = { name: 'بهاره افجه', role: 'specialist', unit: null }
// One clock for the samples, read once, as the store sets these times once at start. Reading Date.now()
// per call gave each base() its own milliseconds, so the same event got two ids (and two notices) when
// the suite ran slowly enough for the clock to tick between builds.
const T0 = Date.now()
const minutesAgo = (m: number) => new Date(T0 - m * 60_000).toISOString()
// The store's starting samples, written out so the test does not depend on module state
const base = (): AlertState =>
  ({
    seen: {},
    records: { a11: { option: 'order', amount: 120, note: '', rec: 'ACT-869', externalRef: 'درخواست خرید ۷۶۹۰', sync: 'failed', by: ME.name } },
    actions: {},
    rejected: {},
    closed: {},
    snoozed: {},
    reminded: {},
    unitRejections: { a1: { recordedBy: ME.name, option: 'transfer', amount: 100, unit: 'واحد انبارهای جنوب', reason: 'انبار شیراز این هفته ظرفیت حمل ندارد', at: minutesAgo(10) } },
    assignments: { a4: { to: ME.name, by: 'مدیر واحد', at: minutesAgo(180) } },
    remindedBy: {},
    reassigned: {},
    takenOver: {},
    events: {},
    drafts: {},
    applied: {},
    templates: {},
    toast: null,
    undone: {},
    readings: {},
  }) as AlertState
const build = (st: AlertState, known = new Map<string, AppNotification>(), sla: Record<string, string> = {}, now = Date.now(), me: CurrentUser = ME) => buildNotifications(st, now, known, sla, allAlerts, me)
const kinds = (list: AppNotification[]) => list.map((n) => `${n.kind}:${allAlerts.find((a) => a.id === n.alertId)!.code}`).sort()

describe('notification inbox', () => {
  it('builds one notice per event from the alert state, and skips samples the state does not support', () => {
    const list = build(base())
    expect(kinds(list)).toEqual(
      [
        'unit_rejected:ALR-1042',
        'assigned:ALR-1024',
        'sla_near:ALR-1031',
        'sla_near:ALR-1044',
        'sla_passed:ALR-1047',
        'sla_passed:ALR-1041',
        'sync_failed:ALR-1045',
        'reopened:ALR-1046',
        // ALR-1050 is three days old now (its action's sample timeline), past the 12-hour «تازه» window
        'new_critical:ALR-1042',
        'new_critical:ALR-1038',
      ].sort(),
    )
    // «واحد پذیرفت» and «تصمیم تغییر کرد» have no decision to stand on
    expect(list.some((n) => n.kind === 'unit_accepted' || n.kind === 'decision_changed')).toBe(false)
  })

  it('keeps ids stable: building again (or waking reminders again) makes no copies', () => {
    const known = new Map<string, AppNotification>()
    const sla: Record<string, string> = {}
    const a = build(base(), known, sla)
    const b = build(base(), known, sla)
    expect(b.map((n) => n.id)).toEqual(a.map((n) => n.id))
    expect(new Set(b.map((n) => n.id)).size).toBe(b.length)
  })

  it('a handled notice moves to «اطلاع‌رسانی», loses its link and says «رسیدگی شد»', () => {
    const known = new Map<string, AppNotification>()
    build(base(), known)
    const st = base()
    st.records = { ...st.records, a1: { option: 'supply', amount: 172, note: '', rec: 'REC-900', externalRef: 'x' } }
    delete st.unitRejections.a1
    const n = build(st, known).find((x) => x.kind === 'unit_rejected')!
    expect(n.resolved).toBe(true)
    expect(n.category).toBe('info')
    expect(n.cta).toBeUndefined()
    expect(n.parts.at(-1)!.text).toBe(' · رسیدگی شد')
  })

  it('a reminder that falls due adds one unread «نیاز به اقدام» notice', () => {
    const st = base()
    st.reminded = { a5: minutesAgo(1) }
    const list = build(st)
    const due = list.filter((n) => n.kind === 'reminder_due')
    expect(due).toHaveLength(1)
    expect(viewOf(list, {}).isRead(due[0])).toBe(false)
  })

  it('a deadline that runs out replaces its «نزدیک» notice', () => {
    const known = new Map<string, AppNotification>()
    const sla: Record<string, string> = {}
    build(base(), known, sla)
    const later = build(base(), known, sla, Date.now() + 60 * 60_000)
    expect(later.some((n) => n.kind === 'sla_near' && n.alertId === 'a3')).toBe(false)
    expect(later.some((n) => n.kind === 'sla_passed' && n.alertId === 'a3')).toBe(true)
  })

  it('tab counts add up and match the bell; «همه خوانده شد» on one tab leaves the other', () => {
    const list = build(base())
    const v = viewOf(list, {})
    expect(v.counts.all).toBe(v.counts.act + v.counts.info)
    const read = Object.fromEntries(v.listFor('act').map((n) => [n.id, true as const]))
    const after = viewOf(list, read)
    expect(after.counts.act).toBe(0)
    expect(after.counts.info).toBe(v.counts.info)
  })

  it('the user’s own actions make no notice', () => {
    const st = base()
    st.rejected = { a2: { option: 'refer', reason: 'x', note: '', rec: 'REC-1' } }
    st.closed = { a7: { reason: 'رفع شد', note: '' } }
    expect(kinds(build(st))).toEqual(kinds(build(base())))
  })
})

// ۷-۵ · Who may act, and who gets which notice
describe('access and recipients', () => {
  const withSamples = () => {
    const st = base()
    st.reassigned = { a5: { to: 'مریم صادقی', by: 'مدیر واحد انبارهای جنوب', from: ME.name, at: minutesAgo(95) } }
    return st
  }
  const alert = (code: string) => allAlerts.find((a) => a.code === code)!
  const tabOf = (list: AppNotification[], code: string, kind: string) => list.find((n) => n.alertCode === code && n.kind === kind)?.category

  it('a viewer has nothing in «نیاز به اقدام»', () => {
    const list = build(withSamples(), undefined, undefined, undefined, { ...ME, role: 'viewer' })
    expect(viewOf(list, {}).listFor('act')).toHaveLength(0)
    expect(list.length).toBeGreaterThan(0)
  })

  it('another unit: the ALR-1042 notice is information only, with no link', () => {
    const list = build(withSamples(), undefined, undefined, undefined, { ...ME, unit: 'واحد تأمین' })
    const n = list.find((x) => x.alertCode === 'ALR-1042' && x.kind === 'unit_rejected')!
    expect(n.category).toBe('info')
    expect(n.cta).toBeUndefined()
    expect(accessFor(alert('ALR-1042'), alertDetails.a1, withSamples(), { ...ME, unit: 'واحد تأمین' }).block).toEqual({ kind: 'other_unit', unit: 'واحد انبارهای جنوب' })
  })

  it('ALR-1019 is with مریم صادقی: moved, holder named, the old holder told', () => {
    const acc = accessFor(alert('ALR-1019'), alertDetails.a5, withSamples(), ME)
    expect(acc.canAct).toBe(false)
    expect(acc.holder).toBe('مریم صادقی')
    expect(acc.block?.kind).toBe('moved')
    const list = build(withSamples())
    expect(tabOf(list, 'ALR-1019', 'reassigned_away')).toBe('info')
    // مریم صادقی herself gets «ارجاع به شما»
    const hers = build(withSamples(), undefined, undefined, undefined, { name: 'مریم صادقی', role: 'specialist', unit: 'واحد انبارهای جنوب' })
    expect(tabOf(hers, 'ALR-1019', 'assigned')).toBe('act')
  })

  it('ALR-1044 held by رضا کریمی stays in «نیاز به اقدام»; after «ادامه می‌دهم» the user may act and he is told', () => {
    const st = withSamples()
    expect(accessFor(alert('ALR-1044'), alertDetails.a9, st, ME).block?.kind).toBe('held')
    expect(tabOf(build(st), 'ALR-1044', 'sla_near')).toBe('act')
    st.takenOver = { a9: { by: ME.name, from: 'رضا کریمی', at: minutesAgo(0) } }
    expect(accessFor(alert('ALR-1044'), alertDetails.a9, st, ME).canAct).toBe(true)
    const his = build(st, undefined, undefined, undefined, { name: 'رضا کریمی', role: 'specialist', unit: 'واحد تأمین' })
    expect(tabOf(his, 'ALR-1044', 'takeover')).toBe('info')
  })

  it('undoing a reassignment removes the notices it made', () => {
    const known = new Map<string, AppNotification>()
    build(withSamples(), known)
    expect([...known.values()].some((n) => n.kind === 'reassigned_away')).toBe(true)
    build(base(), known)
    expect([...known.values()].some((n) => n.kind === 'reassigned_away')).toBe(false)
  })

  it('a blocked user always sees who holds it; only managers may reassign', () => {
    for (const a of allAlerts) {
      const acc = accessFor(a, alertDetails[a.id], withSamples(), { ...ME, unit: 'واحد تأمین' })
      if (!acc.canAct) expect(acc.holder).toBeTruthy()
      expect(acc.canReassign).toBe(false)
    }
    expect(accessFor(alert('ALR-1042'), alertDetails.a1, withSamples(), { ...ME, role: 'manager' }).canReassign).toBe(true)
  })
})
