import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
<<<<<<< HEAD
import { Database, Download, Link2, MapPinOff, PanelRightOpen, X } from 'lucide-react'
import { routeById as routeConfigById } from '../../config/routes'
import { PageHeader } from '../../components/PageHeader'
import { AlertToast } from '../../components/overview/AlertRow'
import { notify } from '../../lib/alertStore'
=======
import { Database, MapPinOff, PanelRightOpen, X } from 'lucide-react'
import { routeById as routeConfigById } from '../../config/routes'
import { PageHeader } from '../../components/PageHeader'
import { AlertToast } from '../../components/overview/AlertRow'
>>>>>>> scm-v1/main
import { COUNTRY_FA, MODE_LABEL, MONTHS, ROUTES, chokepointById, routeById } from '../../data/routes'
import type { Mode, Month } from '../../data/routes'
import { filterRoutes, hasRouteFilters } from '../../lib/routes/metrics'
import type { Filters } from '../../lib/routes/metrics'
import { GOOD_SLUG, parseState, serializeState } from '../../lib/routes/url'
import type { RoutesState } from '../../lib/routes/url'
import { FilterCard } from './FilterCard'
import { MapView } from './MapView'
import { TimeLapse, ViewBar, ZoomColumn } from './MapControls'
import { MapFooter } from './MapFooter'
import { DetailPanel } from './DetailPanel'
<<<<<<< HEAD
import { RoutesTable, downloadCsv } from './RoutesTable'
=======
import { RoutesTable } from './RoutesTable'
>>>>>>> scm-v1/main
import type { TableTab } from './RoutesTable'
import { fa, gregorianMonth } from './format'
import '../../components/overview/overview.css'
import '../../components/overview/alerts-flow.css'
import './RoutesPage.css'

const PANEL_KEY = 'routes.panel'
const webgl = () => {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}
const readPanel = () => {
  try {
    return localStorage.getItem(PANEL_KEY) !== 'closed'
  } catch {
    return true
  }
}

/**
 * «نقشه مسیرها» (routes-map-prompt): which chokepoints the trade of essential goods passes, and where
 * we depend on them. Analytical, not live: the routes are built from ports, not tracked ships.
 */
export function RoutesPage() {
  const route = routeConfigById('trade-routes')
  const [params, setParams] = useSearchParams()
  const s = useMemo(() => parseState(params.toString()), [params])
  const [hoverCp, setHoverCp] = useState<string | null>(null)
  const [panelOpen, setPanelOpen] = useState(readPanel)
  const [tableTab, setTableTab] = useState<TableTab>('cps')
  const [mapFailed, setMapFailed] = useState(() => !webgl())
  const [wide, setWide] = useState(() => window.matchMedia('(min-width: 1280px)').matches)
  const [compact, setCompact] = useState(() => window.matchMedia('(max-width: 767px)').matches)
  const bodyRef = useRef<HTMLDivElement>(null)

  /** Selections go to history (Back returns a level); filters replace */
  const write = useCallback((next: RoutesState, push: boolean) => setParams(serializeState(next), { replace: !push }), [setParams])
  const set = useCallback((patch: Partial<RoutesState>) => write({ ...s, ...patch }, false), [s, write])
  const select = useCallback(
    (patch: Partial<RoutesState>) => {
      const next = { ...s, ...patch }
      // Opening a route with an alternative turns its layer on (§6-4)
      const r = patch.route ? routeById(patch.route) : undefined
      if (r?.alternative && !next.layers.includes('alt')) next.layers = [...next.layers, 'alt']
      write(next, true)
      if (!panelOpen && (patch.cp || patch.route)) setPanelOpen(true)
    },
    [s, write, panelOpen],
  )

  const f: Filters = s
  const routes = useMemo(() => filterRoutes(f), [f])
  const noResult = hasRouteFilters(f) && routes.length === 0
  const view = mapFailed ? 'table' : s.view
  const iranAvailable = ROUTES.some((r) => r.destCountry === 'IR')

  useEffect(() => {
    try {
      localStorage.setItem(PANEL_KEY, panelOpen ? 'open' : 'closed')
    } catch {
      /* storage blocked: the panel opens each visit */
    }
  }, [panelOpen])
  useEffect(() => {
    const a = window.matchMedia('(min-width: 1280px)')
    const b = window.matchMedia('(max-width: 767px)')
    const on = () => (setWide(a.matches), setCompact(b.matches))
    a.addEventListener('change', on)
    b.addEventListener('change', on)
    return () => (a.removeEventListener('change', on), b.removeEventListener('change', on))
  }, [])
  // Esc goes up one level (route → chokepoint → everything)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return
      const el = e.target as HTMLElement
      if (/input|textarea|select/i.test(el.tagName) || el.closest('[role="dialog"], .rfield__pop, .rfilters.is-open')) return
      if (s.route) select({ route: null })
      else if (s.cp) select({ cp: null })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [s.route, s.cp, select])
  // The map and the panel reach the bottom of the window (24 px margin, at least 640)
  useLayoutEffect(() => {
    const el = bodyRef.current
    if (!el) return
    const fit = () => el.style.setProperty('--rbody-h', `${Math.max(640, window.innerHeight - (el.getBoundingClientRect().top + window.scrollY) - 24)}px`)
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [compact])

<<<<<<< HEAD
  const copyLink = () =>
    navigator.clipboard?.writeText(window.location.href).then(
      () => notify('لینک کپی شد'),
      () => notify('کپی لینک انجام نشد'),
    )
=======
>>>>>>> scm-v1/main
  const onCp = useCallback((id: string) => select({ cp: id, route: null }), [select])
  const onRoute = useCallback((id: string) => select({ route: id }), [select])

  // No result: one button per active filter, with the routes its removal brings back (§12)
  const removals = noResult ? removalsOf(s) : []

  const panel = (
    <aside className={`rpanel ${panelOpen ? '' : 'is-closed'}`} aria-label="جزئیات">
      {panelOpen && (
        <button type="button" className="aicon-btn rpanel__close" aria-expanded aria-label="بستن جزئیات" title="بستن جزئیات" onClick={() => setPanelOpen(false)}>
          <X size={16} aria-hidden="true" />
        </button>
      )}
      {panelOpen && <DetailPanel s={s} f={f} hoverCp={hoverCp} onHoverCp={setHoverCp} select={select} set={set} onTable={(t) => (setTableTab(t), set({ view: 'table' }))} />}
    </aside>
  )

  return (
    <div className="routes-page">
      <PageHeader
        title={route.label}
        description="جریان تجارت کالاهای اساسی از کدام گلوگاه‌ها می‌گذرد و کجا وابسته‌ایم."
        meta={
          <div className="rhead">
            <span className="rhead__data">
              <Database size={14} aria-hidden="true" />
              داده: {gregorianMonth(MONTHS[0])} تا {gregorianMonth(MONTHS[MONTHS.length - 1])} · ماه آخر ناقص
            </span>
<<<<<<< HEAD
            <button type="button" className="rhead__btn" onClick={() => downloadCsv(view === 'table' ? tableTab : 'cps', f)} aria-label="خروجی CSV همین نما" title="خروجی CSV همین نما">
              <Download size={16} aria-hidden="true" />
            </button>
            <button type="button" className="rhead__btn" onClick={copyLink} aria-label="کپی لینک همین نما" title="کپی لینک همین نما">
              <Link2 size={16} aria-hidden="true" />
            </button>
=======
>>>>>>> scm-v1/main
          </div>
        }
      />
      <FilterCard s={s} set={set} compact={compact} />
      <p className="visually-hidden" aria-live="polite">
        {hasRouteFilters(f) ? `${fa(routes.length)} مسیر` : ''}
      </p>

      <div ref={bodyRef} className={`rbody ${panelOpen ? '' : 'is-collapsed'} ${wide ? '' : 'is-overlay'} ${compact ? 'is-sheet' : ''}`}>
        <section className={`rmapcard ${view === 'table' ? 'is-table' : ''} ${view === '3d' ? 'is-globe' : ''}`} aria-label="نقشه مسیرها">
          {s.iran && <div className="riran">فقط تجارت‌هایی که مقصدشان بندرهای ایران است</div>}
          {mapFailed && <div className="riran riran--error">نقشه در این مرورگر نمایش داده نمی‌شود؛ همان داده در جدول آمده است.</div>}
          <div className="rmapcard__stage">
            {/* One place for the view bar and the panel button, whatever the view */}
            <div className="rctl-pos rctl-pos--top">
              <ViewBar view={view} onView={(v) => set({ view: v })} iran={s.iran} onIran={(on) => set({ iran: on })} iranAvailable={iranAvailable} />
            </div>
            {!panelOpen && (
              <div className="rctl-pos rctl-pos--panel">
                <button type="button" className="rglass-btn" aria-expanded={false} aria-label="نمایش جزئیات" title="نمایش جزئیات" onClick={() => setPanelOpen(true)}>
                  <PanelRightOpen size={16} aria-hidden="true" />
                </button>
              </div>
            )}
            {view === 'table' ? (
              <RoutesTable f={f} tab={tableTab} onTab={setTableTab} onCp={onCp} onRoute={onRoute} />
            ) : (
              <MapView view={view} f={f} routes={routes} cp={s.cp} route={s.route} layers={s.layers} iran={s.iran} hoverCp={hoverCp} onHoverCp={setHoverCp} onSelectCp={onCp} onSelectRoute={onRoute} onMapError={() => setMapFailed(true)}>
                {(api) => (
                  <>
                    <div className="rctl-pos rctl-pos--zoom">
                      <ZoomColumn onIn={api.zoomIn} onOut={api.zoomOut} onLocate={api.locate} />
                    </div>
                    <div className="rctl-pos rctl-pos--time">
                      <TimeLapse month={s.month} onMonth={(m: Month | null) => set({ month: m })} />
                    </div>
                    {noResult && (
                      <div className="rempty" role="status">
                        <MapPinOff size={24} aria-hidden="true" />
                        <strong>با این فیلترها مسیری نیست</strong>
                        <p>هیچ مسیر نمونه‌ای هم‌زمان با {removals.map((r) => `«${r.label}»`).join(' و ')} جور نیست.</p>
                        <div className="rempty__actions">
                          {removals.map((r) => (
                            <button key={r.label} type="button" className="abtn abtn--secondary abtn--sm" onClick={() => set(r.patch)} disabled={r.n === 0}>
                              حذف «{r.label}» · {fa(r.n)} مسیر
                            </button>
                          ))}
                          <button type="button" className="ov-link" onClick={() => set({ goods: [], origin: [], dest: [], mode: [], lp: [], up: [], via: [], q: null, form: [], iran: false })}>
                            پاک کردن همهٔ فیلترها
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </MapView>
            )}
          </div>
          {view !== 'table' && <MapFooter layers={s.layers} onLayers={(layers) => set({ layers })} />}
        </section>
        {panel}
      </div>
      <AlertToast />
    </div>
  )
}

/** For each active route filter: what removing it would bring back */
function removalsOf(s: RoutesState): { label: string; patch: Partial<RoutesState>; n: number }[] {
  const out: { label: string; patch: Partial<RoutesState> }[] = []
  const names = (k: 'origin' | 'dest') => s[k].map((c) => COUNTRY_FA[c] ?? c).join('، ')
  const goodName = (slug: string) => Object.entries(GOOD_SLUG).find(([, v]) => v === slug)?.[0] ?? slug
  if (s.goods.length) out.push({ label: `کالا: ${s.goods.map(goodName).join('، ')}`, patch: { goods: [] } })
  if (s.origin.length) out.push({ label: `مبدأ: ${names('origin')}`, patch: { origin: [] } })
  if (s.dest.length) out.push({ label: `مقصد: ${names('dest')}`, patch: { dest: [] } })
  if (s.mode.length) out.push({ label: `روش حمل: ${s.mode.map((m: Mode) => MODE_LABEL[m]).join('، ')}`, patch: { mode: [] } })
  if (s.via.length) out.push({ label: `گلوگاه: ${s.via.map((v) => chokepointById(v)?.short ?? v).join('، ')}`, patch: { via: [] } })
  if (s.lp.length) out.push({ label: 'بندر بارگیری', patch: { lp: [] } })
  if (s.up.length) out.push({ label: 'بندر تخلیه', patch: { up: [] } })
  if (s.q) out.push({ label: `چارک ${fa(s.q)}`, patch: { q: null } })
  if (s.form.length) out.push({ label: 'شکل محموله', patch: { form: [] } })
  if (s.iran) out.push({ label: 'به سمت ایران', patch: { iran: false } })
  return out.map((x) => ({ ...x, n: filterRoutes({ ...s, ...x.patch }).length }))
}
