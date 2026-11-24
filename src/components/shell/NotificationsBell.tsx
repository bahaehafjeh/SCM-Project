import { useEffect, useId, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AlarmClock, Bell, Check, CheckCheck, CircleCheck, Clock, History, ListChecks, OctagonAlert, Pencil, RefreshCw, Scale, Settings, TrendingUp, TriangleAlert, UserRound, UserRoundCheck, XCircle } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { alerts as dashboardAlerts } from '../../data/overview'
import { formatNumber } from '../../lib/format'
import { markAlertRead, useNotifications } from '../../lib/notificationStore'
import type { AppNotification, NotifKind, NotifTab } from '../../lib/notificationStore'
import './Notifications.css'

const ICON: Record<NotifKind, LucideIcon> = {
  unit_rejected: XCircle,
  sla_near: Clock,
  sla_passed: AlarmClock,
  assigned: UserRound,
  reminder_due: AlarmClock,
  sync_failed: RefreshCw,
  reopened: History,
  new_critical: TriangleAlert,
  severity_raised: TrendingUp,
  unit_accepted: Check,
  decision_changed: Pencil,
  takeover: UserRoundCheck,
  reassigned_away: UserRoundCheck,
  act_new: ListChecks,
  act_accept_overdue: AlarmClock,
  act_accepted: Check,
  act_counter: Scale,
  act_blocked: OctagonAlert,
  act_late: Clock,
  act_done: CircleCheck,
  act_verify: CircleCheck,
}
const TABS: { key: NotifTab; label: string }[] = [
  { key: 'all', label: 'همه' },
  { key: 'act', label: 'نیاز به اقدام' },
  { key: 'info', label: 'اطلاع‌رسانی' },
]
const EMPTY: Record<NotifTab, [string, string]> = {
  all: ['اعلانی ندارید', 'رویدادهایی که به شما مربوط است، مثل رد اقدام، نزدیک شدن مهلت یا ارجاع، اینجا نشان داده می‌شود.'],
  act: ['کاری منتظر شما نیست', 'اگر واحدی اقدامی را رد کند، مهلتی نزدیک شود یا هشداری به شما ارجاع شود، اینجا نشان داده می‌شود.'],
  info: ['خبر تازه‌ای نیست', 'هشدارهای بحرانی تازه و تغییرهایی که همکاران می‌دهند اینجا می‌آید.'],
}

const fa = (n: number) => formatNumber(n)
const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
const hhmm = (d: Date) => `${fa(d.getHours()).padStart(2, '۰')}:${fa(d.getMinutes()).padStart(2, '۰')}`
/** «همین الان» · «۱۰ دقیقه پیش» · «۳ ساعت پیش» · «دیروز ۱۶:۲۰» · «۳ آبان» */
export function relTime(at: string, now = Date.now()) {
  const d = new Date(at)
  const min = Math.floor((now - d.getTime()) / 60_000)
  const yesterday = new Date(now - 86_400_000)
  if (min < 1) return 'همین الان'
  if (dayKey(d) === dayKey(new Date(now))) return min < 60 ? `${fa(min)} دقیقه پیش` : `${fa(Math.floor(min / 60))} ساعت پیش`
  if (dayKey(d) === dayKey(yesterday)) return `دیروز ${hhmm(d)}`
  return new Intl.DateTimeFormat('fa-IR-u-ca-persian', { day: 'numeric', month: 'long' }).format(d)
}
const groupOf = (at: string, now: number) => {
  const d = new Date(at)
  return dayKey(d) === dayKey(new Date(now)) ? 'امروز' : dayKey(d) === dayKey(new Date(now - 86_400_000)) ? 'دیروز' : 'قبل‌تر'
}
const plain = (n: AppNotification) => n.parts.map((p) => p.text).join('')

/**
 * The bell: the user's notification inbox (not the alert list). Unread count in a blue badge; the
 * panel has «همه / نیاز به اقدام / اطلاع‌رسانی», rows grouped by day, and opens the alert at the step
 * where the work is.
 */
export function NotificationsBell() {
  const n = useNotifications()
  const [open, setOpen] = useState(false)
  const [pulse, setPulse] = useState(false)
  const [live, setLive] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)
  const bellRef = useRef<HTMLButtonElement>(null)
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const listRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const panelId = useId()
  const titleId = useId()
  const unread = n.counts.all
  const list = n.listFor(n.tab)
  const now = Date.now()

  // A new unread notice while the panel is closed: the badge pulses once and a screen reader hears it
  const seenIds = useRef<Set<string> | null>(null)
  const unreadList = n.listFor('all').filter((x) => !n.isRead(x))
  useEffect(() => {
    const ids = new Set(unreadList.map((x) => x.id))
    if (seenIds.current) {
      const fresh = unreadList.find((x) => !seenIds.current!.has(x.id))
      if (fresh && !open) {
        setPulse(true)
        setLive(`اعلان تازه: ${plain(fresh)}`)
        setTimeout(() => setPulse(false), 700)
      }
    }
    seenIds.current = ids
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unreadList.map((x) => x.id).join('|')])

  // Closes on a route change, Esc (focus back to the bell) and a click outside
  useEffect(() => setOpen(false), [pathname])
  useEffect(() => {
    if (!open) return
    tabRefs.current[n.tab]?.focus()
    const onDown = (e: PointerEvent) => !rootRef.current?.contains(e.target as Node) && setOpen(false)
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setOpen(false)
      bellRef.current?.focus()
    }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // ← next tab, → previous (right-to-left order); Home / End
  const onTabKey = (e: ReactKeyboardEvent) => {
    const i = TABS.findIndex((t) => t.key === n.tab)
    const to = { ArrowLeft: i + 1, ArrowRight: i - 1, Home: 0, End: TABS.length - 1 }[e.key]
    if (to === undefined) return
    e.preventDefault()
    const t = TABS[(to + TABS.length) % TABS.length]
    n.setTab(t.key)
    tabRefs.current[t.key]?.focus()
  }

  const openAlert = (x: AppNotification, focusOptions = false) => {
    markAlertRead(x.alertId)
    setOpen(false)
    // A notice about an action opens the action on «اقدام‌ها»
    if (x.actionId) {
      navigate(`/planning/actions/${x.actionId}`)
      return
    }
    const q = new URLSearchParams()
    if (x.step) q.set('step', x.step)
    if (focusOptions) q.set('focus', 'options')
    const onDashboard = pathname === '/' && dashboardAlerts.some((a) => a.id === x.alertId)
    navigate(onDashboard ? `/?alert=${x.alertCode}${q.size ? `&${q}` : ''}` : `/alerts/${x.alertCode}${q.size ? `?${q}` : ''}`)
  }
  const markOne = (x: AppNotification, rowIndex: number) => {
    n.markRead(x.id)
    // Focus moves on to the next row
    requestAnimationFrame(() => listRef.current?.querySelectorAll<HTMLElement>('.nrow__main')[rowIndex + 1]?.focus())
  }

  const groups = ['امروز', 'دیروز', 'قبل‌تر'].map((g) => ({ g, items: list.filter((x) => groupOf(x.at, now) === g) })).filter((x) => x.items.length)
  const label = unread ? `اعلان‌ها، ${fa(unread)} خوانده‌نشده` : 'اعلان‌ها'
  let rowIndex = -1

  return (
    <div className="nbell" ref={rootRef}>
      <button
        ref={bellRef}
        type="button"
        className={`tb-icon tb-icon--bell ${open ? 'is-open' : ''}`}
        aria-label={label}
        title="اعلان‌ها"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => {
          setOpen((o) => !o)
          if (open) bellRef.current?.focus()
        }}
      >
        <Bell size={18} strokeWidth={1.75} aria-hidden="true" />
        {unread > 0 && (
          <span className={`nbell__badge ${pulse ? 'is-pulse' : ''}`} aria-hidden="true">
            {unread > 9 ? '۹+' : fa(unread)}
          </span>
        )}
      </button>
      <p className="visually-hidden" aria-live="polite">
        {live}
      </p>

      {open && (
        <div id={panelId} className="npanel" role="dialog" aria-labelledby={titleId}>
          <div className="npanel__head">
            <h2 id={titleId}>اعلان‌ها</h2>
            {n.counts[n.tab] > 0 && (
              <button type="button" className="npanel__all" onClick={() => n.markAllRead(n.tab)}>
                <CheckCheck size={16} aria-hidden="true" />
                همه خوانده شد
              </button>
            )}
            <span className="npanel__gear-wrap" data-tip="تنظیمات اعلان · به‌زودی">
              <button type="button" className="npanel__gear" aria-disabled="true" aria-label="تنظیمات اعلان · به‌زودی" onClick={(e) => e.preventDefault()}>
                <Settings size={16} aria-hidden="true" />
              </button>
            </span>
          </div>

          <div className="npanel__tabs" role="tablist" aria-label="نوع اعلان" onKeyDown={onTabKey}>
            {TABS.map((t) => (
              <button
                key={t.key}
                ref={(el) => {
                  tabRefs.current[t.key] = el
                }}
                type="button"
                role="tab"
                id={`${panelId}-${t.key}`}
                aria-selected={n.tab === t.key}
                aria-controls={`${panelId}-list`}
                tabIndex={n.tab === t.key ? 0 : -1}
                className="npanel__tab"
                onClick={() => n.setTab(t.key)}
              >
                {t.label}
                {n.counts[t.key] > 0 && <span className="npanel__count">{fa(n.counts[t.key])}</span>}
              </button>
            ))}
          </div>

          <div id={`${panelId}-list`} className="npanel__list" role="tabpanel" aria-labelledby={`${panelId}-${n.tab}`} ref={listRef}>
            {groups.length === 0 ? (
              <div className="npanel__empty">
                <span className="npanel__empty-icon" aria-hidden="true">
                  <CircleCheck size={24} />
                </span>
                <strong>{EMPTY[n.tab][0]}</strong>
                <p>{EMPTY[n.tab][1]}</p>
                <Link to="/alerts" className="ov-link" onClick={() => setOpen(false)}>
                  همهٔ هشدارها ←
                </Link>
              </div>
            ) : (
              groups.map(({ g, items }) => (
                <section key={g} aria-label={g}>
                  <h3 className="npanel__group">{g}</h3>
                  {items.map((x) => {
                    const read = n.isRead(x)
                    const Icon = ICON[x.kind]
                    const i = ++rowIndex
                    return (
                      <div key={x.id} className={`nrow ${read ? 'is-read' : 'is-unread'}`}>
                        <span className={`nrow__icon nrow__icon--${x.tone}`} aria-hidden="true">
                          <Icon size={16} />
                        </span>
                        <div className="nrow__body">
                          <button type="button" className="nrow__main" onClick={() => openAlert(x)} aria-label={`${plain(x)} · ${x.alertCode} · ${relTime(x.at, now)}${read ? '' : ' · خوانده‌نشده'}`}>
                            <span className="nrow__text">{x.parts.map((p, k) => (p.strong ? <strong key={k}>{p.text}</strong> : <span key={k}>{p.text}</span>))}</span>
                          </button>
                          <span className="nrow__meta">
                            <span dir="ltr" className="nrow__code">
                              {x.alertCode}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>{relTime(x.at, now)}</span>
                            {x.cta && (
                              <button type="button" className="nrow__cta" onClick={() => openAlert(x, x.cta?.focus === 'options')}>
                                {x.cta.label}
                              </button>
                            )}
                          </span>
                        </div>
                        <span className="nrow__end">
                          {!read && (
                            <>
                              <span className="nrow__dot" aria-hidden="true" />
                              <span className="nrow__check-wrap" data-tip="علامت خوانده‌شده">
                                <button type="button" className="nrow__check" aria-label="علامت خوانده‌شده" onClick={(e) => (e.stopPropagation(), markOne(x, i))}>
                                  <Check size={14} aria-hidden="true" />
                                </button>
                              </span>
                            </>
                          )}
                        </span>
                      </div>
                    )
                  })}
                </section>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
