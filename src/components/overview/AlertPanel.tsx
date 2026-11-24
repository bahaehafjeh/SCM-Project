import { useEffect, useId, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Link, useLocation } from 'react-router-dom'
import {
  AlarmClock,
  Plus,
  ArrowRight,
  ChartLine,
  ChevronDown,
  CircleCheck,
  CircleX,
  Copy,
  Eye,
  Lock,
  RefreshCcw,
  RotateCcw,
  Link as LinkIcon,
  FileCheck2,
  History,
  Info,
  Lightbulb,
  Maximize2,
  MoreHorizontal,
  Network,
  Paperclip,
  Pencil,
  Split,
  ThumbsDown,
  Building2,
  UserRoundCheck,
  Share2,
  UserRound,
  X,
  XCircle,
} from 'lucide-react'
import { alertByCode, slaPassed as slaPassedNow } from '../../data/alerts'
import { markAlertRead } from '../../lib/notificationStore'
import { REASSIGN_TARGETS, accessFor, currentUser, onlyHolder } from '../../lib/access'
import type { AlertDetail, AlertItem, AlertOption } from '../../data/alerts'
import { CURRENT_USER, alertActions, dismissToast, isSnoozed, notify, useAlertState } from '../../lib/alertStore'
import { arrivalDays, metricLabel, modelFor, paramsForOption, snapshot } from '../../lib/engine'
import { formatPersianDate } from '../../lib/format'
import { isSystemPick, unitBlockedFor } from '../../lib/recommend'
import { STATUS_LABEL, acceptLeft, currentStep, doneCount, isLate, lateDays as actLateDays, verifyDay } from '../../lib/actionRules'
import { dateOf, hm } from '../../pages/actions/fmt'
import type { Params, ScenarioModel } from '../../lib/scenarioModels'
import { ChainImpact } from './ChainImpact'
import { Block, Bold, DoneMark, Evidence, Rows, SeverityChip, StateChip, confidenceLabel, fa, lifecycle, typeLabel } from './AlertParts'
import { CloseModal, SnoozeModal, rejectReasons } from './AlertModals'
import { IconButton } from '../ui/IconButton'

export { severityLabel, typeLabel, SeverityChip } from './AlertParts'

// Manual close needs a reason; reasons feed rule improvement (spec §6)
const STEPS = ['وضعیت', 'انتخاب اقدام', 'پیگیری'] as const
export const STEP_KEYS = ['status', 'decision', 'followup'] as const
export type StepKey = (typeof STEP_KEYS)[number]

const fill = (s: string, n?: number) => s.replace('{n}', fa(n ?? 0))

/** Model inputs for an option, or the scenario applied to it; null when the type has no model */
function paramsFor(model: ScenarioModel | null, o: AlertOption, amount: number | undefined, applied?: Params): Params | null {
  if (!model || !model.options[o.id]) return null
  return applied ?? paramsForOption(model, o.id, amount)
}
/** Preview parameters for design review: ?role=viewer (read only), ?state=loading (metrics loading) */
const preview = () => new URLSearchParams(window.location.search)

export interface AlertPanelProps {
  alert: AlertItem
  detail: AlertDetail
  next: AlertItem | null
  /** overlay: side panel over the page; inline: detail column on the alerts page */
  variant?: 'overlay' | 'inline'
  initialStep?: StepKey
  /** Link that reopens this alert where it is shown now (dashboard or alerts page) */
  selfLink: (step?: StepKey) => string
  onOpenNext: () => void
  onDismiss: () => void
}

/**
 * Alert panel (prompt §6): header, then three steps in one column — وضعیت → تصمیم → پیگیری. A
 * finished step folds to a one-line recap (row clickable, pencil, chevron); the current step is
 * open; later steps are muted. Every number carries its source; every action lands in «سابقه».
 */
// History entries counted when the user last opened the list, per alert (this session)
const historySeen = new Map<string, number>()
/** Colours for a pair of figures: neutral ones never; amber when bad; green only if none is bad */
const toneSet = (metrics: { bad: (v: number) => boolean; good?: (v: number) => boolean; neutral?: boolean }[], vals: number[]) => {
  const anyBad = metrics.some((m, i) => !m.neutral && m.bad(vals[i]))
  return metrics.map((m, i) => (m.neutral ? undefined : m.bad(vals[i]) ? 'warning' : !anyBad && m.good?.(vals[i]) ? 'success' : undefined))
}

// Entries made by a system get a grey ring; people's entries the primary one
/** «۱۰ دقیقه پیش» for an ISO time */
const agoOf = (at: string) => {
  const m = Math.max(0, Math.floor((Date.now() - Date.parse(at)) / 60_000))
  return m < 1 ? 'همین الان' : m < 60 ? `${fa(m)} دقیقه پیش` : m < 1440 ? `${fa(Math.floor(m / 60))} ساعت پیش` : `${fa(Math.floor(m / 1440))} روز پیش`
}
const isSystem = (actor: string) => /^(سیستم|سامانه|موتور|پایش)/.test(actor)

export function AlertPanel({ alert, detail, next, variant = 'overlay', initialStep, selfLink, onOpenNext, onDismiss }: AlertPanelProps) {
  const overlay = variant === 'overlay'
  const titleId = useId()
  const st = useAlertState()
  const id = alert.id
  const record = st.records[id]
  const rejected = st.rejected[id]
  const applied = st.applied[id]
  const undone = !record ? st.undone[id] : undefined
  const [step, setStep] = useState(() => (initialStep ? STEP_KEYS.indexOf(initialStep) : record ? 2 : 0))
  const [expanded, setExpanded] = useState<Record<number, boolean>>({})
  const isOpen = (i: number) => i === step || !!expanded[i]
  // A unit turned down an action: that option, and a combined one that leans on the same transfer, cannot be chosen
  const unitRej = !record ? st.unitRejections[id] : undefined
  const unitBlocked = unitBlockedFor(detail, st, id)
  const firstChoice = applied?.option ?? record?.option ?? undone?.option ?? detail.options.find((o) => o.recommended && rejected?.option !== o.id && !unitBlocked(o))?.id ?? detail.options.find((o) => !unitBlocked(o))?.id ?? detail.options[0].id
  // A link to another step of the same alert (e.g. from the bell) moves the open panel there
  const loc = useLocation()
  useEffect(() => {
    if (initialStep) setStep(STEP_KEYS.indexOf(initialStep))
  }, [initialStep, id, loc.key])
  // «انتخاب اقدام دیگر»: focus lands on the first option that can still be chosen
  useEffect(() => {
    if (new URLSearchParams(loc.search).get('focus') !== 'options') return
    requestAnimationFrame(() => bodyRef.current?.querySelector<HTMLElement>('.aopt__pick:not([disabled])')?.focus())
  }, [loc.key, loc.search])
  const [choice, setChoice] = useState(firstChoice)
  const [showOthers, setShowOthers] = useState(false)
  const [menu, setMenu] = useState(false)
  const [hist, setHist] = useState(false)
  const [modal, setModal] = useState<null | 'snooze' | 'close'>(null)
  // Inline «رد پیشنهاد» form on the suggested card (no second layer); not part of the link
  const [rejecting, setRejecting] = useState(false)
  const [rejReason, setRejReason] = useState<string | null>(null)
  const [rejNote, setRejNote] = useState('')
  const rejLinkRef = useRef<HTMLButtonElement>(null)
  const rejReasonsRef = useRef<HTMLDivElement>(null)
  const rejTitleId = useId()
  const rejHintId = useId()
  const recordHintId = useId()
  const rejRefocus = useRef(false)
  const closeReject = (refocus = true) => {
    rejRefocus.current = refocus
    setRejecting(false)
  }
  // After «انصراف» or Esc, focus goes back to «این پیشنهاد مناسب نیست» once it is rendered again
  useEffect(() => {
    if (rejecting || !rejRefocus.current) return
    rejRefocus.current = false
    rejLinkRef.current?.focus()
  }, [rejecting])
  const [decisionNote, setDecisionNote] = useState(record?.note ?? undone?.note ?? '')
  const [noteOpen, setNoteOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const model = modelFor(alert, detail)
  // Who may act: the only source (lib/access); the panel re-checks on every render, never trusting the notice
  const access = accessFor(alert, detail, st)
  const me = currentUser()
  const viewer = access.block?.kind === 'viewer'
  const actOff = !access.canAct
  const actTip = actOff && !viewer ? onlyHolder(access) : undefined
  const [reassigning, setReassigning] = useState(false)
  const [reTo, setReTo] = useState<string | null>(null)
  const [reNote, setReNote] = useState('')
  const loading = preview().get('state') === 'loading'
  // Soft lock (prompt §4): another person is on it; acting is allowed after this warning
  // Opened from a parent alert's list (e.g. an incident's children): kept for this panel's life
  const [parent] = useState(() => {
    const c = preview().get('parent')
    return c ? (alertByCode(c) ?? null) : null
  })
  const locked = access.block?.kind === 'held'
  const stale = alert.flags?.includes('stale')
  // Today's state, not the notice's: a deadline that ran out while the page was open counts as passed
  const slaPassed = slaPassedNow(alert)
  const reopened = alert.flags?.includes('reopened')
  const closedNow = st.closed[id]

  // Opening an alert, from anywhere, marks it seen and its notifications read
  useEffect(() => {
    alertActions.see(id)
    markAlertRead(id)
  }, [id])
  useEffect(() => {
    const t = st.toast
    if (t?.alertId && t.alertId !== id) dismissToast()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])
  // A scenario applied while the panel was away selects its option
  useEffect(() => {
    if (applied) setChoice(applied.option)
  }, [applied])
  // An undo hands the choice back: the decision reopens with the same option, amount and note,
  // and a notice says what was undone, so nothing appears to reset
  const undoSeen = useRef(undone?.at)
  useEffect(() => {
    if (!undone || undone.at === undoSeen.current) return
    undoSeen.current = undone.at
    setChoice(undone.option)
    if (undone.kind === 'record') {
      setDecisionNote(undone.note)
      go(1)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [undone?.at])
  useEffect(() => {
    if (!record) setStep((s) => (s === 2 ? 1 : s))
  }, [record])

  // Esc closes the menu, then the overlay; focus moves into the overlay on open
  // Focus moves into the overlay once, on open (not on every state change below)
  useEffect(() => {
    if (overlay) panelRef.current?.focus()
  }, [overlay])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || modal) return
      // The reject form closes first; focus goes back to its link
      if (rejecting) closeReject()
      else if (hist) setHist(false)
      else if (menu) setMenu(false)
      else if (overlay) onDismiss()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [hist, menu, modal, onDismiss, overlay, rejecting])
  useEffect(() => {
    if (!menu && !hist) return
    const off = (e: MouseEvent) => {
      if (!(e.target as Element).closest('.apanel__menu-wrap')) setMenu(false)
      if (!(e.target as Element).closest('.ahist-wrap')) setHist(false)
    }
    document.addEventListener('mousedown', off)
    return () => document.removeEventListener('mousedown', off)
  }, [menu, hist])

  // The open step is part of the link, so a deep link reopens the same state
  const go = (s: number) => {
    setStep(s)
    setExpanded({})
    bodyRef.current?.scrollTo({ top: 0 })
    window.history.replaceState(window.history.state, '', selfLink(STEP_KEYS[s]))
  }

  const amountOf = (o: AlertOption) => (applied?.option === o.id ? applied.amount : record?.option === o.id ? record.amount : o.amount)
  const option = detail.options.find((o) => o.id === choice)!
  const amount = amountOf(option)
  const recommended = detail.options.find((o) => o.recommended && o.confidence >= 50)
  const canReject = !!recommended && !rejected && !record && !closedNow && !unitBlocked(recommended)
  const scenarioLink = model ? `/planning/scenarios?alert=${alert.code}&from=${encodeURIComponent(selfLink('decision'))}` : null
  const metricLabels: [string, string] | null = model ? [metricLabel(model.metrics[0], model.base.horizon), metricLabel(model.metrics[1], model.base.horizon)] : detail.metrics
  const unchanged = !!record && choice === record.option && amount === record.amount && decisionNote.trim() === record.note

  // The type's two metrics, from the model when the type has one
  const tonesOf = (vals: number[]): [string?, string?] => toneSet(model!.metrics, vals) as [string?, string?]
  const valuesOf = (o: AlertOption): { values: [string, string] | null; tones: [string?, string?]; until?: number | null } => {
    const p = paramsFor(model, o, amountOf(o), applied?.option === o.id ? applied.params : undefined)
    if (p && model) {
      const r = model.run(p)
      const vals = model.metrics.map((m) => r.values[m.key])
      return { values: [model.metrics[0].fmt(vals[0]), model.metrics[1].fmt(vals[1])], tones: tonesOf(vals), until: r.enoughUntil }
    }
    return { values: o.values ?? null, tones: [] }
  }
  const confidenceOf = (o: AlertOption) => {
    const p = paramsFor(model, o, amountOf(o), applied?.option === o.id ? applied.params : undefined)
    return p && model ? model.run(p).confidence : o.confidence
  }
  const noActionRun = model ? model.run(model.base) : null
  // «بدون اقدام» in words from the same run as the figures; other types keep the alert's text
  const noActionLead = model?.lead ? model.lead(model.base) : detail.noAction.lead
  const history = [...detail.timeline, ...(st.events[id] ?? [])].filter((e) => !(e.actor === CURRENT_USER && e.text === 'هشدار دیده شد'))
  if (!historySeen.has(id)) historySeen.set(id, history.length)
  const fresh = history.length > (historySeen.get(id) ?? 0)
  const [, entityPlace] = (() => {
    const k = detail.entity.indexOf(' · ')
    return k < 0 ? [detail.entity, ''] : [detail.entity.slice(0, k), detail.entity.slice(k + 3)]
  })()

  const record_ = () => {
    // The applied scenario's fixed copy goes with the decision when the recorded option is the scenario's
    const snap = model && applied && applied.option === choice ? snapshot(model, applied.params, applied.id, applied.name) : undefined
    alertActions.record(id, { option: choice, kind: option.kind, amount, note: decisionNote.trim(), label: fill(option.title, amount), toast: option.toast, snapshot: snap })
    go(2)
  }
  const copyLink = () => {
    const url = new URL(selfLink(STEP_KEYS[step]), window.location.origin).toString()
    navigator.clipboard?.writeText(url).then(
      () => notify(`لینک ${alert.code} کپی شد`),
      () => notify('کپی لینک انجام نشد'),
    )
  }

  // ── Step heads: number or tick, title; finished steps get a recap row, pencil and chevron ──
  const done = (i: number) => i < step
  const stepHead = (i: number) => {
    const open = isOpen(i)
    const toggle = () => (i === 1 && done(1) ? go(1) : setExpanded((e) => ({ ...e, [i]: !open })))
    return (
      <header className="astep__head">
        <span className="astep__num" aria-hidden="true">
          {done(i) ? (
            <svg viewBox="0 0 24 24" className="astep__tick">
              <path d="M6 12.5l4 4L18.5 8" pathLength={1} />
            </svg>
          ) : (
            fa(i + 1)
          )}
        </span>
        <h3 className="astep__title">{STEPS[i]}</h3>
        {i < step && (
          <span className="astep__tools">
            {done(i) && i > 0 && (
              <button type="button" className="aicon-btn" onClick={toggle} aria-label={`ویرایش ${STEPS[i]}`} title="ویرایش">
                <Pencil size={15} aria-hidden="true" />
              </button>
            )}
            {done(i) && (
              <button type="button" className="aicon-btn astep__toggle" aria-expanded={open} onClick={() => setExpanded((e) => ({ ...e, [i]: !open }))} aria-label={open ? `بستن ${STEPS[i]}` : `نمایش ${STEPS[i]}`} title={open ? 'بستن' : 'نمایش'}>
                <ChevronDown size={16} aria-hidden="true" />
              </button>
            )}
          </span>
        )}
      </header>
    )
  }
  const recap = (i: number, text: ReactNode) => (
    <button type="button" className="astep__summary astep__summary--btn" onClick={() => (i === 1 ? go(1) : setExpanded((e) => ({ ...e, [i]: true })))}>
      {text}
    </button>
  )

  // ── Step 1 · وضعیت ──
  const status = (
    <div className="astep__content">
      <div className={`alead alead--${alert.severity}`}>
        <p>
          <Bold text={detail.happened} />
        </p>
      </div>
      <Block
        title="شواهد"
        icon={ChartLine}
        aside={
          <span className="ainfo" tabIndex={0} aria-label={`منبع داده: ${detail.source}`}>
            <Info size={14} aria-hidden="true" />
            <span className="ainfo__tip" role="tooltip">
              {detail.source}
            </span>
          </span>
        }
      >
        <Evidence evidence={detail.evidence} severity={alert.severity} />
      </Block>
      <Block title="علت‌ها" icon={Lightbulb} collapsible={!!detail.why} count={detail.why?.length}>
        {detail.why ? (
          <ul className="adrivers">
            {detail.why.map((w) => (
              <li key={w.text}>
                <span>{w.text}</span>
                {w.share && <span className="adrivers__share">{w.share}</span>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="amuted">علت در داده‌ها دیده نمی‌شود.{detail.whyNote ? ` ${detail.whyNote}` : ''}</p>
        )}
        {detail.why && <span className="asource">سهم هر علت تخمینی است.</span>}
      </Block>
      <Block title="اثر روی زنجیره" icon={Network}>
        <ChainImpact alertId={alert.id} impact={detail.impact} />
      </Block>
      {detail.related && (
        <Block title={alert.type === 'incident' ? 'هشدارهای زیرمجموعه' : 'هشدارهای مرتبط'} icon={LinkIcon} collapsible count={detail.related.length}>
          <ul className="arelated">
            {detail.related.map((r) => (
              <li key={r.title}>
                {r.code !== '—' ? (
                  <Link to={`/alerts/${r.code}?parent=${alert.code}`} className="arelated__link">
                    <span dir="ltr" className="scn-code">
                      {r.code}
                    </span>
                    {r.title}
                  </Link>
                ) : (
                  <span className="arelated__link is-muted">{r.title}</span>
                )}
                {r.note && <span className="status-chip status-chip--muted">{r.note}</span>}
              </li>
            ))}
          </ul>
        </Block>
      )}
      <p className="arule-line">قاعده: {detail.rule.text}</p>
    </div>
  )

  // ── Option card: title, meta, the type's two metrics ──
  const card = (o: AlertOption, opts: { appliedCard?: boolean } = {}) => {
    const selected = choice === o.id
    const conf = confidenceOf(o)
    const weak = o.kind !== 'refer' && conf > 0 && conf < 50
    const { values, tones, until } = valuesOf(o)
    const isRejected = rejected?.option === o.id
    const byUnit = unitBlocked(o)
    // Same rule as the scenario table's «پیشنهاد سیستم» (lib/recommend)
    const badge = isSystemPick(o, conf, rejected?.option, byUnit) && !opts.appliedCard
    // «این پیشنهاد مناسب نیست»: only on the suggestion, with the same rules the footer button had
    const rejectable = canReject && recommended?.id === o.id && !viewer && !opts.appliedCard
    const formHere = rejecting && rejectable
    const dimmed = rejecting && !formHere
    // The card is a holder: the radio picks, the link and the form sit beside it (a button cannot hold them)
    return (
      <div key={o.id} className={`aopt aopt--card ${selected ? 'is-selected' : ''} ${badge ? 'is-recommended' : ''} ${isRejected ? 'is-rejected' : ''} ${dimmed ? 'is-dimmed' : ''} ${byUnit ? 'is-unit-rejected' : ''}`} inert={dimmed || undefined}>
        {badge && <span className="aopt__tag">پیشنهادی</span>}
        {byUnit && <span className="status-chip status-chip--danger aopt__unit">رد شد توسط {unitRej!.unit}</span>}
        <button type="button" role="radio" aria-checked={selected} className="aopt__pick" disabled={byUnit} onClick={() => setChoice(o.id)}>
          <span className="aopt__row">
            <span className="aopt__radio" aria-hidden="true" />
            <span className="aopt__body">
              <span className="aopt__title">{fill(o.title, amountOf(o))}</span>
              <span className="aopt__note">{o.effect}</span>
            </span>
            {conf > 0 && (
              <span className={`aopt__conf ${weak ? 'is-weak' : ''}`}>
                {confidenceLabel(conf)}
                {weak && ' · تخمین ضعیف'}
              </span>
            )}
          </span>
          {loading && metricLabels ? (
            <span className="ametrics">
              {metricLabels.map((m) => (
                <span key={m} className="ametrics__cell">
                  <span className="ametrics__label">{m}</span>
                  <span className="ov-skel" />
                </span>
              ))}
            </span>
          ) : values && metricLabels ? (
            <span className="ametrics">
              {metricLabels.map((m, i) => (
                <span key={m} className="ametrics__cell">
                  <span className="ametrics__label">{m}</span>
                  <span className={`ametrics__value ${tones[i] ? `astats__v--${tones[i]}` : ''}`}>{values[i]}</span>
                </span>
              ))}
            </span>
          ) : metricLabels ? (
            <span className="ametrics ametrics--pending">نتیجه به تصمیم واحد بستگی دارد</span>
          ) : null}
          {/* Fine within the horizon but under a week of stock at its end: say how long it lasts */}
          {until != null && !loading && <span className="aopt__until">کافی برای حدود {fa(until)} روز</span>}
          {opts.appliedCard && applied && (
            <>
              {applied.was !== undefined && applied.was !== applied.amount && (
                <span className="achange">
                  مقدار: <s>{fa(applied.was)} تن</s> ← <strong>{fa(applied.amount)} تن</strong>
                </span>
              )}
              <span className="afrom">
                <Split size={14} aria-hidden="true" />
                از سناریوی{' '}
                <span dir="ltr" className="scn-code">
                  {applied.id}
                </span>
                {scenarioLink && (
                  <Link to={scenarioLink} className="ov-link" onClick={(e) => e.stopPropagation()}>
                    باز کردن سناریو
                  </Link>
                )}
              </span>
              {/* The figures above use the alert's real facts; the scenario was weighed with other assumptions */}
              {applied.assumed.length > 0 && <span className="aassumed">سنجیده‌شده با فرض: {applied.assumed.join('، ')}</span>}
            </>
          )}
        </button>
        {/* Rejected: still selectable; undo until a decision is recorded */}
        {isRejected && (
          <span className="status-chip status-chip--muted aopt__rejected">
            رد شد · {rejected.reason}
            {!record && (
              <>
                {' · '}
                <button type="button" className="ov-link" onClick={() => alertActions.unreject(id)}>
                  واگرد
                </button>
              </>
            )}
          </span>
        )}
        {rejectable && !formHere && (
          <button
            ref={rejLinkRef}
            type="button"
            className="aopt__reject-link"
            disabled={actOff}
            title={locked ? 'اول در پیام بالا «ادامه می‌دهم» را بزنید.' : actTip}
            onClick={(e) => {
              e.stopPropagation()
              setChoice(o.id)
              setRejReason(null)
              setRejNote('')
              setRejecting(true)
              requestAnimationFrame(() => rejReasonsRef.current?.querySelector<HTMLElement>('button')?.focus())
            }}
          >
            <ThumbsDown size={13} aria-hidden="true" />
            این پیشنهاد مناسب نیست
          </button>
        )}
        {formHere && rejectForm(o)}
      </div>
    )
  }

  // Inline reject form: the cost of doing nothing, a required reason, an optional note
  const rejectForm = (o: AlertOption) => {
    const reasons = rejectReasons(alert, detail, { ...o, amount: amountOf(o) })
    const needsNote = rejReason === 'دلیل دیگر' && !rejNote.trim()
    const blocked = !rejReason || needsNote
    const lead = (noActionLead ?? '').replace(/[.؛]\s*$/, '')
    return (
      <form
        className="areject"
        aria-labelledby={rejTitleId}
        onSubmit={(e) => {
          e.preventDefault()
          if (blocked || !rejReason) return
          alertActions.reject(id, o.id, rejReason, rejNote.trim(), fill(o.title, amountOf(o)))
          closeReject(false)
          const alt = detail.options.find((x) => x.id !== o.id)
          if (alt) setChoice(alt.id)
          // The result is read out: focus moves to the message row
          requestAnimationFrame(() => panelRef.current?.querySelector<HTMLElement>('.amsg')?.focus())
        }}
      >
        <h4 id={rejTitleId} className="areject__title">
          چرا این پیشنهاد مناسب نیست؟
        </h4>
        <p className="areject__cost">
          <Info size={14} aria-hidden="true" />
          <span>اگر هیچ اقدامی نشود: {lead}. پیشنهاد رد می‌شود، نه هشدار.</span>
        </p>
        <div ref={rejReasonsRef} className="areject__reasons" role="radiogroup" aria-required="true" aria-label="دلیل رد">
          {reasons.map((r) => (
            <button key={r} type="button" role="radio" aria-checked={rejReason === r} aria-pressed={rejReason === r} className="chip" onClick={() => setRejReason(r)}>
              {r}
            </button>
          ))}
        </div>
        <label className={`afield ${rejecting ? 'is-dimmed' : ''}`} inert={rejecting || undefined}>
          <span className="afield__label">
            توضیح <span className="afield__opt">{rejReason === 'دلیل دیگر' ? '(لازم)' : '(اختیاری)'}</span>
          </span>
          <textarea className="afield__input afield__input--sm" rows={2} maxLength={300} value={rejNote} onChange={(e) => setRejNote(e.target.value)} />
          <span className="afield__count">{fa(rejNote.length)} / ۳۰۰</span>
        </label>
        <div className="areject__actions">
          <button type="submit" className="abtn abtn--sm abtn--danger-outline" disabled={blocked} aria-describedby={blocked ? rejHintId : undefined}>
            رد این پیشنهاد
          </button>
          <button type="button" className="abtn abtn--sm abtn--ghost" onClick={() => closeReject()}>
            انصراف
          </button>
          <span className="areject__note">بعداً قابل واگرد است</span>
        </div>
        {blocked && (
          <p id={rejHintId} className="areasons__hint">
            {!rejReason ? 'یک دلیل انتخاب کنید' : 'برای «دلیل دیگر» توضیح لازم است'}
          </p>
        )}
      </form>
    )
  }

  // ── Step 2 · تصمیم ──
  const appliedOption = applied ? detail.options.find((o) => o.id === applied.option) : undefined
  // Rows the user has in a saved draft (the reference not counted)
  const draftCount = st.drafts[id] ? st.drafts[id].list.length - 1 : 0
  const others = appliedOption ? detail.options.filter((o) => o.id !== appliedOption.id) : []
  const decision = (
    <div className="astep__content">
      {/* Back from the scenario page: a row inside the step (not a toast), with undo */}
      {applied && !record && (
        <div className="aapplied" role="status">
          <CircleCheck size={15} aria-hidden="true" />
          <p>سناریوی «{applied.name}» روی هشدار اعمال شد</p>
          <button type="button" className="ov-link" onClick={() => alertActions.unapply(id)}>
            برگرداندن
          </button>
        </div>
      )}
      {undone && (
        <div className="aundo" role="status">
          <RotateCcw size={15} aria-hidden="true" />
          <p>
            {undone.kind === 'record' ? (
              <>
                <strong>ثبت «{undone.label}» لغو شد.</strong> انتخاب و توضیح شما حفظ شده است.
              </>
            ) : (
              <>
                <strong>رد پیشنهاد لغو شد.</strong> پیشنهاد سیستم دوباره انتخاب شد.
              </>
            )}
          </p>
          <button type="button" className="aicon-btn" onClick={() => alertActions.clearUndo(id)} aria-label="بستن پیام" title="بستن">
            <X size={14} aria-hidden="true" />
          </button>
        </div>
      )}
      {/* Reference point: what happens if nothing is done. Read-only, so it looks unlike the options below */}
      <section className={`abase ${rejecting ? 'is-dimmed' : ''}`} inert={rejecting || undefined} aria-label="بدون اقدام · مبنای مقایسه" title="مبنای مقایسه: اگر هیچ اقدامی نشود">
        <strong className="abase__title">بدون اقدام</strong>
        <ul className="abase__facts">
          <li>{noActionLead}</li>
          {model && noActionRun
            ? model.metrics.map((m, i) => {
                // The reference is never green: doing nothing is not a result to aim for
                const tone = toneSet(
                  model.metrics,
                  model.metrics.map((x) => noActionRun.values[x.key]),
                )[i]
                return (
                  <li key={m.key}>
                    <span className="abase__k">{m.labelAt ? m.labelAt(model.base.horizon).replace('موجودی در پایان', 'موجودی پس از') : (m.short ?? metricLabel(m))}:</span>
                    <b className={tone === 'warning' ? 'is-bad' : ''}>{m.fmt(noActionRun.values[m.key])}</b>
                  </li>
                )
              })
            : detail.metrics &&
              detail.noAction.values &&
              detail.metrics.map((m, i) => (
                <li key={m}>
                  <span className="abase__k">{m}:</span>
                  <b>{detail.noAction.values![i]}</b>
                </li>
              ))}
        </ul>
      </section>
      <div className="aopts" role="radiogroup" aria-label="راه‌های اقدام">
        {appliedOption ? (
          <>
            {card(appliedOption, { appliedCard: true })}
            <button type="button" className={`aothers ${rejecting ? 'is-dimmed' : ''}`} inert={rejecting || undefined} aria-expanded={showOthers} onClick={() => setShowOthers(!showOthers)}>
              <span>
                <strong>{fa(others.length)} گزینه دیگر</strong> · {others.map((o) => fill(o.title, amountOf(o))).join(' · ')}
              </span>
              <ChevronDown size={16} aria-hidden="true" />
            </button>
            {showOthers && others.map((o) => card(o))}
          </>
        ) : (
          // A rejected suggestion goes to the end of the list (display order only)
          [...detail.options.filter((o) => o.id !== rejected?.option), ...detail.options.filter((o) => o.id === rejected?.option)].map((o) => card(o))
        )}
      </div>
      {scenarioLink && (
        <div className={`ascenario ${rejecting ? 'is-dimmed' : ''}`} inert={rejecting || undefined}>
          <Link to={scenarioLink} className="abtn abtn--secondary abtn--block">
            <Split size={16} aria-hidden="true" />
            {applied ? 'ویرایش در سناریوسازی' : draftCount ? `ادامه در سناریوسازی (${fa(draftCount)} سناریو)` : (detail.scenarioLabel ?? 'سنجیدن در سناریوسازی')}
          </Link>
          <p className="amodal__hint">
            {applied ? (
              <>
                <Paperclip size={13} aria-hidden="true" /> سناریو هنگام ثبت به‌عنوان مدرک تصمیم پیوست می‌شود
              </>
            ) : (
              <>
                <Info size={13} aria-hidden="true" /> گزینه‌ها با داده‌های همین هشدار باز می‌شوند؛ چیزی ثبت نمی‌شود.
              </>
            )}
          </p>
        </div>
      )}
      {noteOpen || decisionNote ? (
        <label className="afield">
          <span className="afield__label">
            توضیح تکمیلی <span className="afield__opt">(اختیاری)</span>
          </span>
          <textarea
            className="afield__input afield__input--sm"
            rows={2}
            maxLength={300}
            autoFocus={noteOpen && !decisionNote}
            value={decisionNote}
            onChange={(e) => setDecisionNote(e.target.value)}
            onBlur={() => {
              // Opened but left empty: fold back to «+ افزودن توضیح»
              if (!decisionNote.trim()) {
                setDecisionNote('')
                setNoteOpen(false)
              }
            }}
            placeholder="مثلاً: با مسئول انبار مبدأ هماهنگ شده است."
          />
          <span className="afield__count">{fa(decisionNote.length)} / ۳۰۰</span>
        </label>
      ) : (
        <button type="button" className={`ov-link anote-add ${rejecting ? 'is-dimmed' : ''}`} inert={rejecting || undefined} onClick={() => setNoteOpen(true)} aria-label="افزودن توضیح تکمیلی">
          <Plus size={14} aria-hidden="true" />
          افزودن توضیح
        </button>
      )}
    </div>
  )

  // ── Step 3 · پیگیری ──
  const f = detail.stock
  const ratio = f ? f.stock / f.safety : 0
  const tl = detail.evidence.kind === 'timeline' ? detail.evidence.steps : null
  const tlDone = tl ? tl.filter((s) => s.done).length : 0
  // Forecast versus actual, from the fixed copy recorded with the decision: day k forecast vs day k actual
  const snap = record?.snapshot
  const readings = st.readings[id] ?? []
  const previewReading = preview().get('reading')?.split(':').map(Number)
  const latest = readings.at(-1) ?? (snap && previewReading?.length === 2 ? { day: previewReading[0], value: previewReading[1] } : undefined)
  const k = latest && snap ? Math.min(latest.day, snap.outcome.series.length - 1) : 0
  const lo = snap ? snap.outcome.series[k] - snap.outcome.band[k] : 0
  const hi = snap ? snap.outcome.series[k] + snap.outcome.band[k] : 0
  const inBand = !!latest && latest.value >= lo && latest.value <= hi
  const recordedOption = record ? detail.options.find((o) => o.id === record.option) : undefined
  // The system the action was sent to, where the option's kind says which one
  const targetSystem = recordedOption?.kind === 'supply' ? 'سیستم خرید' : recordedOption?.kind === 'transfer' ? 'سیستم انبار' : null
  // The title says what is under way, not when the alert closes (that is `autoClose`, below)
  const k0 = recordedOption?.kind
  const doing = k0 === 'transfer' ? 'انتقال در راه' : k0 === 'supply' || k0 === 'combo' ? 'سفارش در جریان' : k0 === 'refer' ? `منتظر اقدام ${recordedOption?.owner}` : `منتظر به‌روزرسانی ${recordedOption?.owner}`
  // Expected arrival: a moved good from the engine's arrival days (the same days as the card), a
  // shipment from its delivery milestone; nothing for a referral or a sample record without a time
  const moving = k0 === 'transfer' || k0 === 'supply' || k0 === 'combo'
  const days = moving && model && record?.at ? arrivalDays(model, record.option, record.amount) : null
  const due = days !== null && record?.at ? new Date(Date.parse(record.at) + days * 86_400_000) : null
  const lateDays = due && !closedNow ? Math.floor((Date.now() - due.getTime()) / 86_400_000) : 0
  // Only a date the engine works out from when the decision was recorded; a milestone text from the sample data can be long past
  const arrival = due ? formatPersianDate(due) : null
  // The action(s) this decision made on «اقدام‌ها»: a combined decision has two
  const recAction = record ? st.actions[record.rec] : undefined
  const recActions = recAction?.groupId ? Object.values(st.actions).filter((x) => x.groupId === recAction.groupId) : recAction ? [recAction] : []
  // Where the action really stands on «اقدام‌ها»: not accepted yet, a counter-proposal, its own steps, or the effect check
  const nowMs = Date.now()
  const act = recAction
  const actView = (() => {
    if (!act) return null
    const owner = act.owner ?? act.unit
    const cur = currentStep(act)
    const left = acceptLeft(act, nowMs)
    switch (act.status) {
      case 'new':
        return { tone: 'wait', title: `منتظر پذیرش ${owner}`, line: left !== null && left > 0 ? `${hm(left)} تا مهلت پذیرش` : 'مهلت پذیرش گذشت؛ به مدیر واحد اطلاع داده شد', note: 'هنوز شروع نشده؛ بعد از پذیرش، مرحله‌های اجرا این‌جا دیده می‌شوند.' }
      case 'counter':
        return { tone: 'wait', title: `${act.counter?.by ?? owner} پیشنهاد تغییر داده`, line: act.requester === CURRENT_USER ? 'تصمیم با شماست؛ تا پاسخ، مهلت پذیرش متوقف است.' : `منتظر تصمیم ${act.requester}`, note: act.counter?.reason ? `دلیل: ${act.counter.reason}` : undefined }
      case 'doing':
      case 'blocked':
        return {
          tone: act.status === 'blocked' ? 'warn' : isLate(act, nowMs) ? 'late' : 'live',
          title: act.status === 'blocked' ? `مانع · ${act.blocked?.reason ?? ''}` : `در حال اجرا · ${owner}`,
          steps: { done: doneCount(act), total: act.steps.length, label: cur?.label },
          line: act.due ? (isLate(act, nowMs) ? `موعد ${dateOf(act.due)} · ${fa(actLateDays(act, nowMs))} روز گذشته` : `موعد ${dateOf(act.due)}`) : undefined,
        }
      case 'verify':
        return { tone: act.verify?.inBand === false ? 'warn' : 'done', title: act.verify?.inBand === false ? 'انجام شد · انحراف از پیش‌بینی' : 'انجام شد · سنجش اثر', line: `روز ${fa(verifyDay(act, nowMs))} از ۷${act.doneAt ? ` · تحویل ${dateOf(act.doneAt)}` : ''}` }
      case 'closed':
        return { tone: 'done', title: 'بسته شد · اثر در بازهٔ پیش‌بینی ماند', line: act.closedAt ? dateOf(act.closedAt) : undefined }
      default:
        return { tone: 'wait', title: STATUS_LABEL[act.status] }
    }
  })()
  const followup = record && recordedOption && (
    <div className="astep__content">
      <section className={`astatus ${actView ? `astatus--${actView.tone}` : ''}`}>
        <h4 className="astatus__state">
          <span className="astatus__dot" aria-hidden="true" />
          {actView ? actView.title : `در حال انجام · ${doing}`}
        </h4>
        {actView?.line && <p className="astatus__line">{actView.line}</p>}
        {/* The action's own steps (not the shipment's milestones) */}
        {actView?.steps && (
          <div className="astatus__bar">
            <span className="astatus__label">{actView.steps.label ? `مرحلهٔ فعلی: ${actView.steps.label}` : 'مراحل'}</span>
            <span className="astatus__value">
              {fa(actView.steps.done)} از {fa(actView.steps.total)} مرحله
            </span>
            <span className="aprogress" style={{ '--p': `${(actView.steps.done / (actView.steps.total || 1)) * 100}%` } as CSSProperties} />
          </div>
        )}
        {actView?.note && <p className="astatus__close">{actView.note}</p>}
        {/* The problem itself, from its source: the stock against its safety level */}
        {f && (
          <div className="astatus__bar">
            <span className="astatus__label">موجودی الان</span>
            <span className="astatus__value">
              {fa(f.stock)} از {fa(f.safety)} تن
            </span>
            <span className="aprogress" style={{ '--p': `${Math.min(100, ratio * 100)}%` } as CSSProperties}>
              <span className="aprogress__mark" style={{ insetInlineStart: '50%' }} />
            </span>
            <span className="aprogress__legend">
              <span>مرز بحرانی</span>
              <span>حد ایمن</span>
            </span>
          </div>
        )}
        {!actView && tl && (
          <div className="astatus__bar">
            <span className="astatus__label">مراحل انجام‌شده</span>
            <span className="astatus__value">{`${fa(tlDone)} از ${fa(tl.length)} مرحله`}</span>
            <span className="aprogress" style={{ '--p': `${(tlDone / (tl.length || 1)) * 100}%` } as CSSProperties} />
          </div>
        )}
        {arrival && (
          <p className="astatus__close astatus__eta">
            رسیدن پیش‌بینی‌شده: {arrival}
            {lateDays > 0 && <strong className="astatus__late"> · {fa(lateDays)} روز دیرتر</strong>}
          </p>
        )}
        <p className="asource">
          به‌روز شده {detail.checks.last} · {detail.checks.source}
        </p>
        <p className="astatus__close">{detail.autoClose}</p>
        {act && (
          <Link to={`/planning/actions/${act.id}`} className="ov-link astatus__open">
            باز کردن اقدام <span dir="ltr">{act.id}</span>
          </Link>
        )}
      </section>

      {record.sync === 'failed' && (
        <div className="abanner abanner--danger" role="alert">
          <RefreshCcw size={16} aria-hidden="true" />
          <p>
            <strong>{targetSystem ? `ثبت در ${targetSystem} انجام نشد.` : 'ثبت انجام نشد.'}</strong> سیستم پاسخ نداد؛ تا رفع مشکل، وضعیت را دستی به‌روز کنید.
          </p>
          {!viewer && (
            <button type="button" className="abtn abtn--secondary abtn--sm" disabled={actOff} title={actTip} onClick={() => alertActions.manualSync(id)}>
              پیگیری دستی
            </button>
          )}
        </div>
      )}
      <Block title="ردیابی" icon={FileCheck2}>
        <Rows
          items={[
            { label: 'مسئول اجرا', value: recAction?.owner ? `${recAction.owner} · ${recAction.unit}` : recordedOption.owner },
            ...recActions.map((x) => ({
              label: recActions.length > 1 ? `اقدام · ${x.unit}` : 'اقدام',
              value: (
                <>
                  <Link to={`/planning/actions/${x.id}`} dir="ltr" className="scn-code">
                    {x.id}
                  </Link>
                  {' · '}
                  {STATUS_LABEL[x.status]}
                </>
              ),
            })),
            // The executing system's reference and whether it took it: only when there is one
            ...(record.externalRef || recActions.length === 0
              ? [
                  {
                    label: 'شماره‌ها',
                    value: (
                      <>
                        {recActions.length === 0 && (
                          <>
                            <span dir="ltr" className="scn-code">
                              {record.rec}
                            </span>
                            {' · '}
                          </>
                        )}
                        {record.externalRef && (
                          <>
                            {record.externalRef}
                            {' · '}
                          </>
                        )}
                        <span className={record.sync === 'failed' ? 'astats__v--danger' : record.sync === 'manual' ? 'astats__v--muted' : 'astats__v--success'}>{record.sync === 'failed' ? 'ثبت نشد' : record.sync === 'manual' ? 'پیگیری دستی' : '✓ ثبت شد'}</span>
                      </>
                    ),
                  },
                ]
              : []),
            ...(record.scenario ? [{ label: 'سناریوی پیوست', value: `${record.scenario.id} · ${record.scenario.name}` }] : []),
            ...(record.note ? [{ label: 'توضیح', value: record.note }] : []),
          ]}
        />
      </Block>

      {snap && model && (
        <Block title="پیش‌بینی در برابر واقعیت" icon={ChartLine} aside={latest ? <span className={`status-chip ${inBand ? 'status-chip--ok' : 'status-chip--warn'}`}>{inBand ? 'در بازه' : 'انحراف از پیش‌بینی'}</span> : undefined}>
          {!latest ? (
            <p className="amuted">مقایسه بعد از اولین به‌روزرسانی داده نمایش داده می‌شود.</p>
          ) : (
            <>
              <dl className="acost__figs acost__figs--plain">
                <div>
                  <dt>پیش‌بینی روز {fa(latest.day)}</dt>
                  <dd>
                    {fa(Math.max(0, Math.round(lo)))} تا {fa(Math.round(hi))} {model.chart.unit}
                  </dd>
                </div>
                <div>
                  <dt>واقعی روز {fa(latest.day)}</dt>
                  <dd>
                    {fa(Math.round(latest.value))} {model.chart.unit}
                  </dd>
                </div>
                <div>
                  <dt>مبنای پیش‌بینی</dt>
                  <dd>
                    <span dir="ltr" className="scn-code">
                      {snap.id}
                    </span>{' '}
                    · اطمینان {fa(snap.outcome.confidence)}٪
                  </dd>
                </div>
              </dl>
              {!inBand && scenarioLink && (
                <Link to={scenarioLink} className="abtn abtn--secondary abtn--sm">
                  <Split size={14} aria-hidden="true" />
                  بازبینی در سناریوسازی
                </Link>
              )}
            </>
          )}
        </Block>
      )}
    </div>
  )

  const msg = st.toast && st.toast.alertId === id ? st.toast : null
  const msgRow = msg && (
    <div key={msg.key} className="amsg" role="status" tabIndex={-1}>
      <DoneMark small />
      <span className="amsg__text">{msg.text}</span>
      {msg.undo && (
        <button
          type="button"
          className="ov-link"
          onClick={() => {
            msg.undo?.()
            dismissToast()
          }}
        >
          برگرداندن
        </button>
      )}
      <button type="button" className="aicon-btn" onClick={dismissToast} aria-label="بستن پیام" title="بستن">
        <X size={14} aria-hidden="true" />
      </button>
    </div>
  )

  const panel = (
    <div ref={panelRef} className={`apanel apanel--${variant}`} role={overlay ? 'dialog' : 'region'} aria-modal={overlay || undefined} aria-labelledby={titleId} tabIndex={-1}>
      <header className="apanel__head">
        {parent && (
          <Link to={`/alerts/${parent.code}`} className="aparent">
            <ArrowRight size={15} aria-hidden="true" />
            <span>
              بازگشت به <strong>{parent.title}</strong>
            </span>
          </Link>
        )}
        <div className="apanel__bar">
          <SeverityChip severity={alert.severity} />
          {lifecycle(st, alert).label !== 'دیده‌شده' && <StateChip st={st} alert={alert} />}
          {reopened && <span className="status-chip status-chip--muted">بازگشایی‌شده</span>}
          <div className="apanel__tools">
            <div className="ahist-wrap">
              <IconButton
                size="sm"
                label={`سابقه هشدار، ${fa(history.length)} رویداد${fresh ? '، رویداد تازه' : ''}`}
                aria-haspopup="dialog"
                aria-expanded={hist}
                onClick={() => {
                  historySeen.set(id, history.length)
                  setHist(!hist)
                  setMenu(false)
                }}
              >
                <History size={17} aria-hidden="true" />
                <span className="tb-icon__count" aria-hidden="true">
                  {fa(history.length)}
                </span>
                {fresh && <span className="tb-icon__dot" aria-hidden="true" />}
              </IconButton>
              {hist && (
                <div className="ahist" role="dialog" aria-label="سابقه هشدار">
                  <p className="ahist__title">
                    سابقه <span className="ahist__count">{fa(history.length)}</span>
                  </p>
                  <ol className="ahist__list">
                    {[...history].reverse().map((e, i) => (
                      <li key={i} className={isSystem(e.actor) ? 'is-system' : ''}>
                        <span className="ahist__text">{e.text}</span>
                        <span className="ahist__meta">
                          {e.actor === CURRENT_USER ? 'شما' : e.actor} · {e.time}
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
            <div className="apanel__menu-wrap">
              <IconButton size="sm" label="گزینه‌های بیشتر" aria-haspopup="menu" aria-expanded={menu} onClick={() => (setMenu(!menu), setHist(false))}>
                <MoreHorizontal size={17} aria-hidden="true" />
              </IconButton>
              {menu && (
                <div className="tb-menu amenu" role="menu" aria-label="گزینه‌های هشدار">
                  <button
                    type="button"
                    role="menuitem"
                    className="tb-menu__item"
                    onClick={() => {
                      setMenu(false)
                      copyLink()
                    }}
                  >
                    <Copy size={17} aria-hidden="true" />
                    <span className="tb-menu__label">کپی لینک</span>
                  </button>
                  {overlay && (
                    <Link to={`/alerts/${alert.code}?step=${STEP_KEYS[step]}`} role="menuitem" className="tb-menu__item">
                      <Maximize2 size={17} aria-hidden="true" />
                      <span className="tb-menu__label">باز کردن در صفحه کامل</span>
                    </Link>
                  )}
                  <button
                    type="button"
                    role="menuitem"
                    className="tb-menu__item"
                    aria-disabled={actOff || undefined}
                    title={actTip}
                    onClick={() => {
                      if (actOff) return
                      setMenu(false)
                      setModal('snooze')
                    }}
                  >
                    <AlarmClock size={17} aria-hidden="true" />
                    <span className="tb-menu__label">یادآوری بعداً</span>
                  </button>
                  {access.canReassign && (
                    <button
                      type="button"
                      role="menuitem"
                      className="tb-menu__item"
                      onClick={() => {
                        setMenu(false)
                        setReTo(null)
                        setReNote('')
                        setReassigning(true)
                      }}
                    >
                      <Share2 size={17} aria-hidden="true" />
                      <span className="tb-menu__label">ارجاع دوباره…</span>
                    </button>
                  )}
                  <div className="tb-menu__sep" role="separator" />
                  <button
                    type="button"
                    role="menuitem"
                    className="tb-menu__item tb-menu__item--danger"
                    aria-disabled={actOff || undefined}
                    title={actTip}
                    onClick={() => {
                      if (actOff) return
                      setMenu(false)
                      setModal('close')
                    }}
                  >
                    <CircleX size={17} aria-hidden="true" />
                    <span className="tb-menu__label">بستن هشدار</span>
                  </button>
                </div>
              )}
            </div>
            <IconButton size="sm" label="بستن پنل" className="tb-icon--plain" onClick={onDismiss}>
              <X size={17} aria-hidden="true" />
            </IconButton>
          </div>
        </div>
        <p className="apanel__meta">
          {typeLabel[alert.type]} · {alert.ago} · {detail.owner}
        </p>
        <h2 id={titleId} className="apanel__title">
          {alert.title}
          {entityPlace && (
            <>
              <span className="apanel__sep" aria-hidden="true">
                |
              </span>
              <span className="apanel__place">{entityPlace}</span>
            </>
          )}
        </h2>
      </header>

      <div ref={bodyRef} className={`apanel__body ${stale ? 'is-stale' : ''}`}>
        {access.block?.kind === 'held' && (
          <div className="abanner" role="status">
            <Lock size={16} aria-hidden="true" />
            <p>
              <strong>در دست {access.block.by}</strong> از {access.block.since}. اگر ادامه دهید، به او خبر داده می‌شود.
            </p>
            <button type="button" className="abtn abtn--secondary abtn--sm" onClick={() => alertActions.takeOver(id, access.holder)}>
              ادامه می‌دهم
            </button>
          </div>
        )}
        {closedNow && (
          <div className="abanner" role="status">
            <CircleCheck size={16} aria-hidden="true" />
            <p>
              <strong>این هشدار بسته شده است</strong>
              {closedNow.by && <> · توسط {closedNow.by}</>} · دلیل: {closedNow.reason}
            </p>
            {(closedNow.by === me.name || me.role === 'manager') && (
              <button type="button" className="abtn abtn--secondary abtn--sm" onClick={() => alertActions.reopen(id)}>
                بازگشایی
              </button>
            )}
          </div>
        )}
        {access.block?.kind === 'moved' && (
          <div className="abanner" role="status">
            <UserRoundCheck size={16} aria-hidden="true" />
            <p>
              <strong>این هشدار الان با {access.block.to} است.</strong> از {agoOf(access.block.at)}.
            </p>
          </div>
        )}
        {access.block?.kind === 'other_unit' && (
          <div className="abanner" role="status">
            <Building2 size={16} aria-hidden="true" />
            <p>
              <strong>مسئول این هشدار {access.block.unit} است.</strong> شما می‌توانید ببینید، ولی تصمیم با آن واحد است.
            </p>
          </div>
        )}
        {reassigning && access.canReassign && (
          <section className="areassign" aria-labelledby={`${titleId}-re`}>
            <h3 id={`${titleId}-re`} className="astep__title">
              ارجاع دوباره
            </h3>
            <p className="aclose__hint">الان با {access.holder} است. به چه کسی ارجاع شود؟</p>
            <div className="aclose__reasons" role="radiogroup" aria-label="ارجاع به">
              {REASSIGN_TARGETS.filter((t) => t !== access.holder).map((t) => (
                <button key={t} type="button" role="radio" aria-checked={reTo === t} className="chip" onClick={() => setReTo(t)}>
                  {t}
                </button>
              ))}
            </div>
            <label className="afield">
              <span className="afield__label">
                یادداشت <span className="afield__opt">(اختیاری)</span>
              </span>
              <textarea className="afield__input afield__input--sm" rows={2} maxLength={300} value={reNote} onChange={(e) => setReNote(e.target.value)} />
            </label>
            <div className="areassign__foot">
              <button
                type="button"
                className="abtn abtn--primary abtn--sm"
                disabled={!reTo}
                onClick={() => {
                  if (!reTo) return
                  alertActions.reassign(id, reTo, access.holder, reNote.trim())
                  setReassigning(false)
                }}
              >
                ارجاع
              </button>
              <button type="button" className="abtn abtn--ghost abtn--sm" onClick={() => setReassigning(false)}>
                انصراف
              </button>
            </div>
          </section>
        )}
        {unitRej && (
          <div className="abanner abanner--danger" role="status">
            <XCircle size={16} aria-hidden="true" />
            <p>
              <strong>
                {unitRej.unit} {fill(detail.options.find((o) => o.id === unitRej.option)?.title ?? '', unitRej.amount)} را رد کرد.
              </strong>{' '}
              دلیل: {unitRej.reason}
              <span className="abanner__muted">
                {' · '}
                {agoOf(unitRej.at)}. یک اقدام دیگر انتخاب کنید.
              </span>
            </p>
          </div>
        )}
        {st.assignments[id] && !record && (
          <div className="abanner" role="status">
            <UserRound size={16} aria-hidden="true" />
            <p>
              <strong>{st.assignments[id].by} این هشدار را به شما ارجاع داد.</strong>
              {st.assignments[id].note && <> یادداشت: {st.assignments[id].note}</>}
            </p>
          </div>
        )}
        {st.reminded[id] && !record && !closedNow && (
          <div className="abanner" role="status">
            <AlarmClock size={16} aria-hidden="true" />
            <p>
              <strong>یادآوری شما رسید.</strong>
            </p>
            {!viewer && (
              <button type="button" className="abtn abtn--secondary abtn--sm" disabled={actOff} title={actTip} onClick={() => setModal('snooze')}>
                یادآوری دوباره
              </button>
            )}
          </div>
        )}
        {slaPassed && !record && !closedNow && (
          <div className="abanner abanner--danger">
            <AlarmClock size={16} aria-hidden="true" />
            <p>
              <strong>مهلت رسیدگی گذشته است.</strong> هشدار خودکار به مدیر {detail.owner} ارجاع شد.
            </p>
          </div>
        )}
        {stale && (
          <div className="abanner abanner--warning">
            <RefreshCcw size={16} aria-hidden="true" />
            <p>
              <strong>داده قدیمی.</strong> اعداد بر اساس داده {alert.staleSince} است و ممکن است تغییر کرده باشد.
            </p>
          </div>
        )}
        {reopened && (
          <div className="abanner">
            <History size={16} aria-hidden="true" />
            <p>همان شرط در کمتر از ۷۲ ساعت برگشت. تصمیم قبلی در «سابقه» است.</p>
          </div>
        )}
        {isSnoozed(st, id) && (
          <div className="abanner" role="status">
            <AlarmClock size={16} aria-hidden="true" />
            <p>یادآوری برای {st.snoozed[id].until} تنظیم شده است.</p>
            {!viewer && (
              <button type="button" className="abtn abtn--secondary abtn--sm" onClick={() => alertActions.unsnooze(id)}>
                لغو یادآوری
              </button>
            )}
          </div>
        )}
        {viewer && (
          <div className="abanner">
            <Eye size={16} aria-hidden="true" />
            <p>
              <strong>فقط مشاهده.</strong> برای ثبت تصمیم یا رد پیشنهاد دسترسی ندارید؛ سناریوها را می‌توانید ببینید.
            </p>
          </div>
        )}
        {
          <ol className="asteps">
            <li className={`astep ${step === 0 ? 'is-current' : 'is-done'}`}>
              {stepHead(0)}
              {step === 0 && msgRow}
              {isOpen(0) ? status : recap(0, detail.summary)}
            </li>
            <li className={`astep ${step === 1 ? 'is-current' : step > 1 ? 'is-done' : 'is-todo'}`}>
              {stepHead(1)}
              {step === 1 && msgRow}
              {step === 1 && (isOpen(1) ? decision : recap(1, fill(option.title, amount)))}
              {step > 1 &&
                recap(
                  1,
                  <>
                    {record ? fill(detail.options.find((o) => o.id === record.option)!.title, record.amount) : fill(option.title, amount)}
                    {record?.scenario && <span className="astep__note">بر اساس سناریوی {record.scenario.id}</span>}
                  </>,
                )}
            </li>
            <li className={`astep ${step === 2 ? 'is-current' : 'is-todo'}`}>
              {stepHead(2)}
              {step === 2 && msgRow}
              {step === 2 && (isOpen(2) ? followup : recap(2, `در حال انجام · ${recordedOption?.owner ?? ''}`))}
            </li>
          </ol>
        }
      </div>

      <footer className="apanel__foot">
        {step === 0 ? (
          <button type="button" className="abtn abtn--primary" onClick={() => go(1)}>
            انتخاب اقدام
          </button>
        ) : step === 1 ? (
          <>
            {!viewer && (
              <button type="button" className="abtn abtn--primary" onClick={record_} disabled={unchanged || actOff || rejecting || unitBlocked(option)} aria-describedby={rejecting ? recordHintId : undefined} title={locked ? 'اول در پیام بالا «ادامه می‌دهم» را بزنید.' : actTip}>
                {record ? (unchanged ? 'این تصمیم ثبت شده است' : 'ثبت تصمیم جدید') : fill(option.cta, amount)}
              </button>
            )}
            <button
              type="button"
              className="abtn abtn--secondary"
              onClick={() => {
                if (rejecting) closeReject(false)
                if (record) go(2)
                else go(0)
              }}
            >
              {record ? 'انصراف' : 'برگشت'}
            </button>
            {rejecting && (
              <p id={recordHintId} className="apanel__foot-hint">
                تا فرم رد باز است، ثبت غیرفعال است.
              </p>
            )}
          </>
        ) : (
          <>
            <button type="button" className="abtn abtn--primary" onClick={next ? onOpenNext : onDismiss}>
              {next ? 'هشدار بعدی' : 'بستن'}
            </button>
            {next && (
              <button type="button" className="abtn abtn--secondary" onClick={onDismiss}>
                بستن
              </button>
            )}
          </>
        )}
      </footer>
    </div>
  )

  const modals = (
    <>
      {modal === 'close' && (
        <CloseModal
          onClose={() => setModal(null)}
          onConfirm={(reason, note) => {
            alertActions.close(id, reason, note)
            setModal(null)
            onDismiss()
          }}
        />
      )}
      {modal === 'snooze' && (
        <SnoozeModal
          alert={alert}
          detail={detail}
          onClose={() => setModal(null)}
          onConfirm={(label, until, dueAt) => {
            alertActions.snooze(id, label, until, dueAt)
            setModal(null)
            onDismiss()
          }}
        />
      )}
    </>
  )

  if (!overlay)
    return (
      <>
        {panel}
        {modals}
      </>
    )
  return createPortal(
    <div className="apanel-layer">
      <div className="apanel-scrim" onClick={onDismiss} aria-hidden="true" />
      {panel}
      {modals}
    </div>,
    document.body,
  )
}
