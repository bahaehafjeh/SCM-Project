import type { CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { ArrowRightLeft, Building2, ChevronLeft, Coins, DatabaseZap, Factory, MapPin, Package, RotateCcw, Server, TrendingUp, Truck, UsersRound, Waypoints, X } from 'lucide-react'
import { alertDetails } from '../../data/alerts'
import type { AlertFlag, AlertItem, AlertType, Severity } from '../../data/alerts'
import { alertBucket, dismissToast, useAlertState } from '../../lib/alertStore'
import { formatNumber } from '../../lib/format'
import { Select } from '../ui/Select'
import type { AlertPanelProps, StepKey } from './AlertPanel'
import { lifecycle, severityLabel, typeLabel } from './AlertParts'
import { SeverityGauge } from './SeverityGauge'

// Lifecycle flags (prompt §4), in words and colour
const FLAG: Record<AlertFlag, { label: string; tone: string }> = {
  sla: { label: 'مهلت گذشته', tone: 'status-chip--danger' },
  higher: { label: 'شدت بیشتر شد', tone: 'status-chip--danger' },
  locked: { label: 'در حال بررسی', tone: 'status-chip--warn' },
  child: { label: 'زیرمجموعه رویداد', tone: 'status-chip--muted' },
  stale: { label: 'داده قدیمی', tone: 'status-chip--warn' },
  sync: { label: 'ارسال ناموفق', tone: 'status-chip--danger' },
  reopened: { label: 'بازگشایی‌شده', tone: 'status-chip--muted' },
}

const typeIcon = { inventory: Package, shipment: Truck, supplier: Factory, demand: TrendingUp, price: Coins, incident: Waypoints, data: DatabaseZap } as const

/**
 * One alert, the same on the dashboard and on the alerts page. Title «نوع · موجودیت» with its time
 * (a dot before it while unseen); under it severity in words, place and the time left to handle it
 * (red under an hour or past), then the lifecycle state and flags. Severity is also the coloured edge.
 */
export function AlertRow({
  alert,
  index,
  selected,
  onOpen,
  onReopen,
}: {
  alert: AlertItem
  index: number
  selected: boolean
  onOpen: () => void
  /** Closed alerts: no panel, a way to reopen instead */
  onReopen?: () => void
}) {
  const st = useAlertState()
  const closed = st.closed[alert.id]
  const state = lifecycle(st, alert)
  const TypeIcon = typeIcon[alert.type]
  const unseen = state.label === 'جدید'
  // What the row tells beyond severity and place: its state (not «در حال رسیدگی», which the tab already
  // says) and its flags, as plain coloured text on the end side
  const notes = [
    ...(!unseen && state.label !== 'دیده‌شده' && state.label !== 'در حال رسیدگی' ? [{ key: 'state', text: state.label, tone: state.tone === 'muted' ? 'muted' : 'info' }] : []),
    ...(alert.flags ?? []).filter((f) => f !== 'sla').map((f) => ({ key: f, text: f === 'locked' && alert.lockedBy ? `در دست ${alert.lockedBy.name}` : FLAG[f].label, tone: FLAG[f].tone.replace('status-chip--', '') })),
  ]
  return (
    <li className={`alert alert--${alert.severity} ${selected ? 'is-open' : ''} ${closed ? 'is-closed' : ''}`} style={{ '--d': `${index * 50}ms` } as CSSProperties}>
      {/* The whole row opens the panel; the arrow is the keyboard control and the visible cue */}
      <div className="alert__row" onClick={closed ? undefined : onOpen}>
        <span className={`alert__mark ov-dot--${alert.severity === 'critical' ? 'danger' : alert.severity}`} aria-hidden="true" />
        <span className="alert__type" aria-hidden="true">
          <TypeIcon size={16} />
        </span>
        <div className="alert__text">
          <p className="alert__line">
            <span className="alert__title">{alert.title}</span>
            <span className="alert__ago">{alert.ago}</span>
          </p>
          <ul className="alert__meta">
            <li className={`alert__sev alert__sev--${alert.severity}`}>
              <SeverityGauge severity={alert.severity} />
              {severityLabel[alert.severity]}
            </li>
            <li>
              <PlaceIcon place={alert.place} />
              {alert.place}
            </li>
          </ul>
        </div>
        {notes.length > 0 && (
          <ul className="alert__notes" aria-label="وضعیت">
            {notes.map((n) => (
              <li key={n.key} className={`alert__note alert__note--${n.tone}`}>
                {n.text}
              </li>
            ))}
          </ul>
        )}
        {/* Unseen: a dot on the end side, just before the arrow */}
        {unseen && !closed && <span className="alert__unseen" role="img" aria-label="دیده‌نشده" title="دیده‌نشده" />}
        {closed ? (
          onReopen && (
            <button type="button" className="abtn abtn--secondary abtn--sm" onClick={onReopen}>
              <RotateCcw size={14} aria-hidden="true" />
              بازگشایی
            </button>
          )
        ) : (
          <button type="button" className="alert__more" data-alert={alert.id} aria-label={`باز کردن جزئیات: ${alert.title}`} title="باز کردن جزئیات">
            <ChevronLeft size={18} aria-hidden="true" />
          </button>
        )}
      </div>
    </li>
  )
}

const typeOptions = [{ value: 'all', label: 'همه' }, ...(Object.keys(typeLabel) as AlertType[]).map((t) => ({ value: t, label: typeLabel[t] }))]

/** Severity chips with counts, and the type filter beside them (the alerts page; the dashboard has severity only). */
export function AlertFilters({
  list,
  sev,
  onSev,
  type,
  onType,
  showType = true,
}: {
  /** Alerts the counts are taken from */
  list: AlertItem[]
  sev: Severity | 'all'
  onSev: (s: Severity | 'all') => void
  type: AlertType | 'all'
  onType: (t: AlertType | 'all') => void
  /** The type select; without it a type set from elsewhere shows as a removable chip */
  showType?: boolean
}) {
  return (
    <div className="alerts-filters">
      <div className="chips" role="group" aria-label="فیلتر شدت">
        {(['all', 'critical', 'high', 'medium'] as const).map((s) => (
          <button key={s} type="button" className={`chip chip--sev chip--${s}`} aria-pressed={sev === s} onClick={() => onSev(s)}>
            {s !== 'all' && <span className="chip__dot" aria-hidden="true" />}
            {s === 'all' ? 'همه' : severityLabel[s]}
            <span className="chip__count">{formatNumber(s === 'all' ? list.length : list.filter((a) => a.severity === s).length)}</span>
          </button>
        ))}
      </div>
      {showType ? (
        <Select label="نوع" value={type} options={typeOptions} onChange={(v) => onType(v as AlertType | 'all')} searchPlaceholder="جستجوی نوع…" />
      ) : (
        type !== 'all' && (
          <button type="button" className="chip chip--clear" onClick={() => onType('all')} aria-label={`برداشتن فیلتر نوع: ${typeLabel[type]}`}>
            فقط {typeLabel[type]}
            <X size={13} aria-hidden="true" />
          </button>
        )
      )}
    </div>
  )
}

/**
 * Props for the panel of `current`. «هشدار بعدی» is the next alert in `list` still waiting for a
 * decision.
 */
export function useAlertPanelProps(current: AlertItem | null, list: AlertItem[], open: (code: string) => void, dismiss: () => void, selfLink: (code: string, step?: StepKey) => string): Omit<AlertPanelProps, 'variant' | 'initialStep'> | null {
  const st = useAlertState()
  if (!current || !alertDetails[current.id]) return null
  // Only alerts still waiting for review: no decision, not closed, no reminder pending
  const queue = list.filter((a) => a.id !== current.id && alertBucket(st, a) === 'review')
  const after = list.findIndex((a) => a.id === current.id)
  const next = queue.find((a) => list.indexOf(a) > after) ?? queue[0] ?? null
  return {
    alert: current,
    detail: alertDetails[current.id],
    next,
    selfLink: (step) => selfLink(current.code, step),
    onOpenNext: () => next && open(next.code),
    onDismiss: dismiss,
  }
}

/** Feedback for alert actions, with undo where the action can be taken back (spec §5.2). */
export function AlertToast({ overPanel = false }: { overPanel?: boolean }) {
  const { toast } = useAlertState()
  // A message about an alert whose panel is open is shown inside that panel instead
  if (!toast || (overPanel && toast.alertId)) return null
  return createPortal(
    <div key={toast.key} className={`atoast ${overPanel ? 'atoast--panel' : ''}`} role="status">
      <span>{toast.text}</span>
      {toast.undo && (
        <button
          type="button"
          className="atoast__undo"
          onClick={() => {
            toast.undo?.()
            dismissToast()
          }}
        >
          برگرداندن
        </button>
      )}
    </div>,
    document.body,
  )
}

/**
 * The pin only for real places. «place» also names a system, a company, a unit or a trade flow,
 * each with its own icon so the row does not claim a location it does not have.
 */
function PlaceIcon({ place }: { place: string }) {
  const I = /^(سامانه|سیستم)/.test(place) ? Server : /^(شرکت|تأمین‌کننده)/.test(place) ? Building2 : /^واحد/.test(place) ? UsersRound : /^(واردات|صادرات)/.test(place) ? ArrowRightLeft : MapPin
  return <I size={13} aria-hidden="true" />
}
