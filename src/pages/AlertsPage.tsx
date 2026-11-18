import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Inbox } from 'lucide-react'
import { routeById } from '../config/routes'
import { allAlerts as alerts } from '../data/overview'
import type { AlertType, Severity } from '../data/overview'
import { formatNumber } from '../lib/format'
import { alertActions, alertBucket, bucketCounts, useAlertState } from '../lib/alertStore'
import type { AlertBucket } from '../lib/alertStore'
import { PageHeader } from '../components/PageHeader'
import { AlertPanel, STEP_KEYS } from '../components/overview/AlertPanel'
import type { StepKey } from '../components/overview/AlertPanel'
import { AlertFilters, AlertRow, AlertToast, useAlertPanelProps } from '../components/overview/AlertRow'
import '../components/overview/overview.css'
// After overview.css: the alerts × scenario styles refine its panel and option rules
import '../components/overview/alerts-flow.css'

// Below this width the detail opens as the side panel over the list instead of a column
const WIDE = '(min-width: 1100px)'

/** The four tabs, right to left; the tab lives in the address (?tab=snoozed) */
const TABS: { key: AlertBucket; label: string; empty: string }[] = [
  { key: 'review', label: 'نیازمند بررسی', empty: 'هشداری منتظر بررسی نیست.' },
  { key: 'handling', label: 'در حال رسیدگی', empty: 'هشداری در حال رسیدگی نیست.' },
  { key: 'snoozed', label: 'معوق', empty: 'هشدار معوقی نیست.' },
  { key: 'closed', label: 'بسته‌شده', empty: 'هنوز هشداری بسته نشده است.' },
]
const isTab = (t: string | null): t is AlertBucket => TABS.some((x) => x.key === t)

/**
 * «هشدارها» (spec §3.1, full alerts page): the same rows as the dashboard, wider, in four tabs
 * (alertBucket). Picking one opens its detail beside the list on the end (left) side.
 */
export function AlertsPage() {
  const route = routeById('alerts')
  // /alerts/ALR-1042?step=decision opens that alert on that step
  const { code } = useParams()
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const stepParam = params.get('step')
  const initialStep = (STEP_KEYS as readonly string[]).includes(stepParam ?? '') ? (stepParam as StepKey) : undefined
  const tabParam = params.get('tab')
  const tab: AlertBucket = isTab(tabParam) ? tabParam : 'review'
  const st = useAlertState()
  const [sev, setSev] = useState<Severity | 'all'>('all')
  const [type, setType] = useState<AlertType | 'all'>('all')
  const [wide, setWide] = useState(() => window.matchMedia(WIDE).matches)
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const pageRef = useRef<HTMLDivElement>(null)

  // The page fits the window: the list and the panel take what is left under the header, so only the
  // alert cards scroll and the panel's buttons are always in view
  useLayoutEffect(() => {
    const el = pageRef.current
    if (!el) return
    const fit = () => {
      const top = el.getBoundingClientRect().top + window.scrollY
      el.style.setProperty('--apage-h', `${Math.max(420, window.innerHeight - top - 16)}px`)
    }
    fit()
    window.addEventListener('resize', fit)
    const ro = new ResizeObserver(fit)
    if (el.parentElement) ro.observe(el.parentElement)
    return () => {
      window.removeEventListener('resize', fit)
      ro.disconnect()
    }
  }, [])

  useEffect(() => {
    const mq = window.matchMedia(WIDE)
    const on = () => setWide(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])

  const tabQuery = (t: AlertBucket) => (t === 'review' ? '' : `?tab=${t}`)
  const selfLink = (c: string, step?: StepKey) => `/alerts/${c}${step ? `?step=${step}` : ''}`
  const select = useCallback((c: string) => navigate(`/alerts/${c}${tabQuery(tab)}`, { replace: true }), [navigate, tab])
  const deselect = useCallback(() => {
    const a = alerts.find((x) => x.code === code)
    navigate(`/alerts${tabQuery(tab)}`, { replace: true })
    if (a) requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-alert="${a.id}"]`)?.focus())
  }, [code, navigate, tab])

  // A deep link to an alert in another tab moves to that tab (once per opened alert)
  useEffect(() => {
    const a = code ? alerts.find((x) => x.code === code) : null
    if (!a) return
    const b = alertBucket(st, a)
    if (b !== tab) {
      const next = new URLSearchParams(params)
      if (b === 'review') next.delete('tab')
      else next.set('tab', b)
      setParams(next, { replace: true })
    }
    // Only when the opened alert changes: a decision taken here must not move the list under the user
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code])

  const counts = bucketCounts(st, alerts)
  const base = alerts.filter((a) => alertBucket(st, a) === tab)
  const shown = base.filter((a) => (sev === 'all' || a.severity === sev) && (type === 'all' || a.type === type))
  // A closed alert does not open from its row (only «بازگشایی»)
  const current = code ? (alerts.find((a) => a.code === code && !st.closed[a.id]) ?? null) : null
  const panel = useAlertPanelProps(current, shown, select, deselect, selfLink)

  const goTab = (t: AlertBucket) => navigate(`/alerts${tabQuery(t)}`, { replace: true })
  // ←/→ (RTL: ← is the next tab), Home and End move between the tabs
  const onTabKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = TABS.findIndex((x) => x.key === tab)
    const to = e.key === 'ArrowLeft' ? i + 1 : e.key === 'ArrowRight' ? i - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? TABS.length - 1 : null
    if (to === null) return
    e.preventDefault()
    const next = TABS[(to + TABS.length) % TABS.length].key
    goTab(next)
    tabRefs.current[next]?.focus()
  }
  const emptyText = base.length === 0 ? TABS.find((x) => x.key === tab)!.empty : 'هشداری با این فیلتر نیست.'

  return (
    <div className="alerts-page">
      <PageHeader title={route.label} description={route.description} />

      <div ref={pageRef} className={`apage apage--fit ${panel && wide ? 'has-detail' : ''}`}>
        <section className="ov-panel apage__list" aria-label="فهرست هشدارها">
          <div className="apage__bar">
            <div className="seg seg--compact" role="tablist" aria-label="وضعیت هشدار" onKeyDown={onTabKey}>
              {TABS.map((t) => (
                <button
                  key={t.key}
                  ref={(el) => {
                    tabRefs.current[t.key] = el
                  }}
                  type="button"
                  role="tab"
                  aria-selected={tab === t.key}
                  aria-pressed={tab === t.key}
                  tabIndex={tab === t.key ? 0 : -1}
                  onClick={() => goTab(t.key)}
                >
                  {t.label} <span className="seg__count seg__count--chip">{formatNumber(counts[t.key])}</span>
                </button>
              ))}
            </div>
          </div>
          <AlertFilters list={base} sev={sev} onSev={setSev} type={type} onType={setType} />

          <ul key={`${tab}-${sev}-${type}`} className="alerts alerts--page" aria-live="polite">
            {shown.map((a, i) => (
              <AlertRow key={a.id} alert={a} index={i} selected={code === a.code} onOpen={() => select(a.code)} onReopen={() => alertActions.reopen(a.id)} />
            ))}
          </ul>
          {shown.length === 0 && (
            <div className="apage__empty">
              <Inbox size={22} aria-hidden="true" />
              <p>{emptyText}</p>
            </div>
          )}
        </section>

        {panel && <AlertPanel key={panel.alert.id} {...panel} initialStep={initialStep} variant={wide ? 'inline' : 'overlay'} />}
      </div>
      <AlertToast overPanel={!!panel} />
    </div>
  )
}
