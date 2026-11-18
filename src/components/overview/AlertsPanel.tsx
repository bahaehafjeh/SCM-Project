import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useSearchParams } from 'react-router-dom'
import { alerts } from '../../data/overview'
import type { AlertType, Severity } from '../../data/overview'
import { formatNumber } from '../../lib/format'
import { alertBucket, useAlertState } from '../../lib/alertStore'
import { Panel } from './Panel'
import { AlertPanel, STEP_KEYS } from './AlertPanel'
import type { StepKey } from './AlertPanel'
import { AlertFilters, AlertRow, AlertToast, useAlertPanelProps } from './AlertRow'

/** Alerts needing review (sample). Urgent items sit apart from informational content, per control-tower practice. */
export function AlertsPanel() {
  const [sev, setSev] = useState<Severity | 'all'>('all')
  const [type, setType] = useState<AlertType | 'all'>('all')
  const ref = useRef<HTMLDivElement>(null)
  const st = useAlertState()
  // Deep link: ?alert=<code>&step=<step> opens that alert's panel on that step
  const [params, setParams] = useSearchParams()
  const openCode = params.get('alert')
  const initialStep = (STEP_KEYS as readonly string[]).includes(params.get('step') ?? '') ? (params.get('step') as StepKey) : undefined
  const openAlert = useCallback((code: string) => setParams({ alert: code }, { replace: true }), [setParams])
  // On close, focus returns to the row's arrow (spec §16)
  const dismiss = useCallback(() => {
    const code = new URLSearchParams(window.location.search).get('alert')
    const a = alerts.find((x) => x.code === code)
    setParams({}, { replace: true })
    if (a) requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-alert="${a.id}"]`)?.focus())
  }, [setParams])
  const selfLink = (code: string, step?: StepKey) => `/?alert=${code}${step ? `&step=${step}` : ''}`

  // «هشدارهای محموله» in the shipment panel opens this list filtered to shipments.
  useEffect(() => {
    const on = (e: Event) => {
      setSev('all')
      const detail = (e as CustomEvent<AlertType | 'all'>).detail
      setType(detail)
      const el = ref.current
      if (!el) return
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      const start = window.scrollY
      el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' })
      // Some environments ignore smooth scrolling; make sure the list is reached anyway.
      if (!reduce) setTimeout(() => window.scrollY === start && el.scrollIntoView({ block: 'center' }), 500)
    }
    window.addEventListener('ov:show-alerts', on)
    return () => window.removeEventListener('ov:show-alerts', on)
  }, [])

  // Four rows visible, the rest scroll
  const listRef = useRef<HTMLUListElement>(null)
  useLayoutEffect(() => {
    const list = listRef.current
    if (!list) return
    const fit = () => {
      const rows = list.children
      if (rows.length <= 4) return list.style.removeProperty('max-height')
      const fourth = rows[3] as HTMLElement
      list.style.maxHeight = `${fourth.offsetTop + fourth.offsetHeight + 4}px`
    }
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [sev, type])

  const open = alerts.filter((a) => !st.closed[a.id])
  // The list is the «نیازمند بررسی» tab: no decision, no reminder pending (a deep link still opens any open alert)
  const review = alerts.filter((a) => alertBucket(st, a) === 'review')
  const snoozedN = alerts.filter((a) => alertBucket(st, a) === 'snoozed').length
  const shown = review.filter((a) => (sev === 'all' || a.severity === sev) && (type === 'all' || a.type === type))
  const current = openCode ? open.find((a) => a.code === openCode) ?? null : null
  const panel = useAlertPanelProps(current, shown, openAlert, dismiss, selfLink)

  return (
    <div id="ov-alerts" ref={ref} className="alerts-wrap">
      <Panel
        title="هشدارهای نیازمند بررسی"
        titleAdornment={<span className="ov-dot ov-dot--danger ov-dot--pulse" aria-hidden="true" />}
        subtitle={`${formatNumber(review.length)} هشدار · به ترتیب شدت و زمان`}
        index={4}
        sample
        actions={
          <Link to="/alerts" className="ov-link">
            همه هشدارها
          </Link>
        }
        guide={
          <>
            روی هر هشدار بزنید تا وضعیت، راه‌های اقدام و پیگیری آن در پنل کناری باز شود.
          </>
        }
      >
        {review.length > 0 && <AlertFilters list={review} sev={sev} onSev={setSev} type={type} onType={setType} showType={false} />}

        <ul key={`${sev}-${type}`} ref={listRef} className="alerts" aria-live="polite">
          {shown.map((a, i) => (
            <AlertRow key={a.id} alert={a} index={i} selected={openCode === a.code} onOpen={() => openAlert(a.code)} />
          ))}
          {open.length === 0 ? (
            <li className="alerts__empty">
              <span>هشدار بازی نیست.</span>
              <Link to="/alerts" className="ov-link">
                هشدارهای بسته‌شده
              </Link>
            </li>
          ) : review.length === 0 ? (
            <li className="alerts__gap">هشداری منتظر بررسی نیست.</li>
          ) : (
            shown.length === 0 && <li className="alerts__gap">هشداری با این فیلتر نیست.</li>
          )}
        </ul>
        {snoozedN > 0 && (
          <p className="alerts__snoozed">
            <Link to="/alerts?tab=snoozed" className="ov-link">
              {formatNumber(snoozedN)} هشدار معوق
            </Link>
          </p>
        )}
      </Panel>

      {panel && <AlertPanel key={panel.alert.id} {...panel} initialStep={initialStep} />}
      <AlertToast overPanel={!!panel} />
    </div>
  )
}
