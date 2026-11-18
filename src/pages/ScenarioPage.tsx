import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, CircleAlert, CircleCheck, Eye, Info, SlidersHorizontal, Split } from 'lucide-react'
import { routeById } from '../config/routes'
import { alertByCode, alertDetails } from '../data/overview'
import type { AlertDetail, AlertItem } from '../data/overview'
import { alertActions, defaultTemplateSettings, draftFor, notify, useAlertState } from '../lib/alertStore'
import type { Scenario, ScenarioDraft, TemplateEntry } from '../lib/alertStore'
import { modelFor, newScenarioId, snapshot, val, withValues } from '../lib/engine'
import { systemPickOf, unitBlockedFor } from '../lib/recommend'
import { accessFor, currentUser } from '../lib/access'
import type { ScenarioModel } from '../lib/engine'
import { PageHeader } from '../components/PageHeader'
import { SeverityChip, fa } from '../components/overview/AlertParts'
import { formatPersianDate } from '../lib/format'
import { AlertToast } from '../components/overview/AlertRow'
import { AddMenu } from './scenario/AddMenu'
import type { NewScenario } from './scenario/AddMenu'
import { ScenarioChart } from './scenario/ScenarioChart'
import { ScenarioStart } from './scenario/ScenarioStart'
import { ScenarioTable } from './scenario/ScenarioTable'
import type { RowAction } from './scenario/ScenarioTable'
import { SettingsColumn } from './scenario/SettingsColumn'
import { COLORS, MAX_SCENARIOS, actionOf, applyBlock, assumedChanges, baseAssumptions, changedFromInitial, effective, initialDraft, normalizeDraft, resolveOption, autoName, copyName, rowActionKeys, shortName, pickRowId } from './scenario/helpers'
import { ScenarioCompare } from './scenario/ScenarioCompare'
import '../components/overview/overview.css'
// After overview.css: the alerts × scenario styles refine its panel and option rules
import '../components/overview/alerts-flow.css'
import './ScenarioPage.css'

const preview = () => new URLSearchParams(window.location.search)

/** «سناریوسازی»: what-if scenarios built from one alert. It never records an action. */
export function ScenarioPage() {
  const route = routeById('planning-scenarios')
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const st = useAlertState()
  const alert = alertByCode(params.get('alert') ?? '')
  const detail = alert ? alertDetails[alert.id] : null
  const model = alert && detail ? modelFor(alert, detail) : null
  const from = params.get('from') || (alert ? `/alerts/${alert.code}?step=decision` : '/')

  if (!alert || !detail || !model) return <ScenarioStart title={route.label} />
  const draft = st.drafts[alert.id] ?? draftFor(alert.id, () => initialDraft(detail, model, unitBlockedFor(detail, st, alert.id)))
  return <ScenarioWorkspace key={alert.id} alert={alert} detail={detail} m={model} draft={draft} from={from} navigate={navigate} title={route.label} />
}

function ScenarioWorkspace({ alert, detail, m, draft: raw, from, navigate, title }: { alert: AlertItem; detail: AlertDetail; m: ScenarioModel; draft: ScenarioDraft; from: string; navigate: ReturnType<typeof useNavigate>; title: string }) {
  const st = useAlertState()
  // A draft saved before shared assumptions and one horizon existed opens without error
  const draft = useMemo(() => normalizeDraft(raw, m), [raw, m])
  // Who may act comes from lib/access only; a viewer sees the page read-only as before
  const access = accessFor(alert, detail, st)
  const viewer = access.block?.kind === 'viewer'
  const loading = preview().get('state') === 'loading'
  const closed = preview().get('state') === 'autoclosed' || !!st.closed[alert.id]
  const stale = !!alert.staleSince
  const [drawer, setDrawer] = useState(false)
  const sel = draft.list[draft.selected] ?? draft.list[0]
  // Every run, match and copy uses the effective params: the row's actions and prices + the shared assumptions and horizon
  const params = useMemo(() => draft.list.map((s) => effective(draft, s)), [draft])
  const runs = useMemo(() => params.map((p) => m.run(p)), [params, m])
  const selP = params[draft.selected] ?? params[0]
  const kind = alert.kind ?? ''
  const tset = st.templates[kind] ?? defaultTemplateSettings()
  const templates: TemplateEntry[] = [...m.templates.filter((t) => !tset.hidden.includes(t.key)).map((t) => ({ ...t, builtIn: true })), ...tset.custom]
  const stress = templates.filter((t) => t.group === 'stress')
  const pick = systemPickOf(detail, m, st, alert.id)?.id
  // §3 · A unit turned an action down: the alert panel's own rule, read from its data
  const unitRej = !st.records[alert.id] ? st.unitRejections[alert.id] : undefined
  const unit = unitRej ? { unit: unitRej.unit, reason: unitRej.reason, blocked: unitBlockedFor(detail, st, alert.id) } : null
  // §7 · One horizon, the alert's
  const horizon = m.base.horizon
  const assumed = assumedChanges(m, {
    ...m.base,
    assumptions: { ...m.base.assumptions, ...draft.assumptions },
  })

  // The floating assistant moves above the sticky footer, and the page keeps room for it
  const footRef = useRef<HTMLElement>(null)
  useEffect(() => {
    const body = document.body
    body.classList.add('has-scn-foot')
    const ro = new ResizeObserver(([e]) => body.style.setProperty('--scn-foot-h', `${Math.ceil(e.borderBoxSize?.[0]?.blockSize ?? e.contentRect.height)}px`))
    if (footRef.current) ro.observe(footRef.current)
    return () => {
      ro.disconnect()
      body.classList.remove('has-scn-foot')
      body.style.removeProperty('--scn-foot-h')
    }
  }, [])

  const cols = m.columns ?? m.metrics
  const save = (d: ScenarioDraft) => alertActions.saveDraft(alert.id, { ...d, saved: false })

  // §10 · Compare two scenarios: «الف» follows the selected row until set by hand; «ب» is «بدون اقدام».
  // A side whose scenario is deleted falls back to its default. Not saved.
  const [cmp, setCmp] = useState<{ a: string | null; b: string | null }>({
    a: null,
    b: null,
  })
  const [cmpOpen, setCmpOpen] = useState(false)
  const has = (id: string | null) => !!id && draft.list.some((x) => x.id === id)
  // Actions and prices: the selected row only (not «بدون اقدام», not a viewer)
  const editRow = (i: number, patch: Record<string, number>, rename = true) => {
    const s = draft.list[i]
    if (s.origin === 'reference' || viewer) return
    const p = withValues(m, s.params, patch)
    // Editing a suggestion makes it the user's own scenario
    const origin = s.origin === 'alert' ? ('user' as const) : s.origin
    // The name always says what the row does (an alert option's own title when it is one), until the user
    // names it by hand; never prices
    const name = rename && s.autoName !== false ? autoName(detail, m, p) : s.name
    save({
      ...draft,
      list: draft.list.map((x, j) => (j === i ? { ...x, params: p, origin, name } : x)),
    })
  }
  // Shared assumptions: every row, «بدون اقدام» included; `reset` starts from the data (ready states never stack)
  const setAssume = (patch: Record<string, number>, reset = false) => {
    if (viewer) return
    save({
      ...draft,
      assumptions: {
        ...(reset ? baseAssumptions(m) : draft.assumptions),
        ...patch,
      },
    })
  }
  const revert = (i: number) => {
    const s = draft.list[i]
    // Actions back to how it started, name and kind too; the shared assumptions stay
    save({
      ...draft,
      list: draft.list.map((x, j) =>
        j === i
          ? {
              ...x,
              params: s.initial,
              name: s.initialName ?? x.name,
              origin: s.initialOrigin ?? x.origin,
              autoName: true,
            }
          : x,
      ),
    })
  }
  const select = (i: number) => save({ ...draft, selected: i })
  const [fresh, setFresh] = useState<string | null>(null)
  const addRow = (it: NewScenario, at = draft.list.length) => {
    if (viewer || draft.list.length >= MAX_SCENARIOS) return
    const row: Scenario = { id: newScenarioId(), n: 0, name: it.name, origin: it.origin, params: it.params, initial: it.params, option: it.option, initialName: it.name, initialOrigin: it.origin, autoName: true }
    const list = [...draft.list.slice(0, at), row, ...draft.list.slice(at)].map((x, j) => ({ ...x, n: j }))
    save({ ...draft, list, selected: at })
    setFresh(row.id)
    window.setTimeout(() => setFresh((f) => (f === row.id ? null : f)), 1300)
    const key = rowActionKeys(m, row)[0]
    window.setTimeout(() => showVar(key), 60)
  }
  const rowAction = (i: number, a: RowAction) => {
    const s = draft.list[i]
    // 8-و · The page's only copy: same action and values, the user's own, right under its source
    if (a === 'dup') addRow({ name: copyName(draft.list, s.name), params: s.params, origin: 'user', option: s.option }, i + 1)
    if (a === 'revert') revert(i)
    if (a === 'delete') {
      const list = draft.list.filter((_, j) => j !== i).map((x, j) => ({ ...x, n: j }))
      save({
        ...draft,
        list,
        selected: Math.min(draft.selected === i ? 0 : draft.selected > i ? draft.selected - 1 : draft.selected, list.length - 1),
      })
      notify(`سناریوی «${s.name}» حذف شد`)
    }
  }

  const block = applyBlock({ sel, p: selP, m, detail, closed, viewer, access, unit })
  const match = resolveOption(detail, m, selP)
  const apply = () => {
    if (block || !match) return
    // The actions and their prices travel; the alert keeps its real facts and assumptions
    const prices = Object.fromEntries(m.vars.filter((v) => v.role === 'advanced').map((v) => [v.key, val(selP, v.key)]))
    const params = {
      actions: { ...selP.actions },
      assumptions: { ...m.base.assumptions, ...prices },
      horizon,
    }
    alertActions.apply(alert.id, {
      id: sel.id,
      name: sel.name,
      option: match.option.id,
      amount: match.amount ?? match.option.amount ?? 0,
      params,
      assumed: assumedChanges(m, selP),
      was: match.option.amount,
      snapshot: snapshot(m, selP, sel.id, sel.name),
    })
    navigate(from)
  }
  const back = () => {
    alertActions.reviewedScenarios(alert.id)
    navigate(from)
  }
  const showVar = (key?: string) => {
    if (window.matchMedia('(max-width: 1200px)').matches) setDrawer(true)
    requestAnimationFrame(() => {
      const el = document.getElementById(key ? `var-${key}` : 'scn-g-act')
      el?.scrollIntoView({ block: 'center', behavior: 'smooth' })
      el?.querySelector<HTMLElement>('input, button')?.focus()
    })
  }
  const action = actionOf(detail, m, selP)
  const pickRow = pickRowId(draft.list, m, detail, pick)
  const picked = sel.id === pickRow
  const revertLabel = sel.origin === 'reference' || !changedFromInitial(m, sel) ? null : sel.initialOrigin === 'alert' ? 'برگشت به پیشنهاد' : 'برگشت به حالت اولیه'
  // §4 · Why it is suggested: only from the data, never computed; with the option's effect
  const pickOption = picked ? detail.options.find((o) => o.id === sel.option) : undefined
  const pickNote = pickOption ? [pickOption.reason, pickOption.effect].filter(Boolean).join(' · ') : undefined
  const names = draft.list.map((s, i) => shortName(s, actionOf(detail, m, params[i]).kind === 'combined'))
  const lateArrival = useMemo(() => {
    const out: Record<string, number> = {}
    if (!m.events) return out
    params.forEach((q, i) => {
      const long = { ...q, horizon: 365 }
      const shared = new Set(m.events!({ ...long, actions: m.base.actions }).map((e) => `${e.label}:${e.day}`))
      const own = m.events!(long)
        .filter((e) => !shared.has(`${e.label}:${e.day}`))
        .map((e) => e.day)
      const last = own.length ? Math.max(...own) : 0
      if (last > horizon) out[draft.list[i].id] = last
    })
    return out
  }, [params, m, horizon, draft.list])
  const horizonWhy = m.horizonFrom ? `تا رسیدن ${m.horizonFrom.from === 'option' ? 'دیرترین گزینهٔ هشدار' : 'محمولهٔ در راه'} (روز ${fa(m.horizonFrom.day)}) و یک هفته بعد از آن` : undefined
  const aId = has(cmp.a) ? cmp.a! : sel.id
  const bId = has(cmp.b) ? cmp.b! : draft.list[0].id
  // §5 · The alert runs the same actions and prices on its real assumptions: the figure it will show there.
  // Said only when an assumption changed and the figure actually differs.
  const realFirst =
    assumed.length > 0
      ? m.run({
          actions: selP.actions,
          assumptions: { ...selP.assumptions, ...baseAssumptions(m) },
          horizon,
        }).values[cols[0].key]
      : null
  const showReal = realFirst != null && realFirst !== (runs[draft.selected] ?? runs[0]).values[cols[0].key]

  return (
    <div className="scn-page">
      <PageHeader title={title} description="پیش از تصمیم بسنجید؛ تا «اعمال روی هشدار» را نزنید، اقدامی ثبت نمی‌شود." />

      <h1 className="scn-print-title">
        سناریوهای <span dir="ltr">{alert.code}</span> · {formatPersianDate(new Date())}
      </h1>
      {/* The alert these scenarios come from, and the way back */}
      {/* No card: the alert line sits on the page, its facts as one line of text */}
      <section className="scn-context scn-context--plain" aria-label="سناریوهای این هشدار">
        <span className="scn-context__icon" aria-hidden="true">
          <Split size={18} />
        </span>
        <div className="scn-context__text">
          <div className="scn-context__titleline">
            <h2 className="scn-context__title">{m.title}</h2>
            {/* The figures the scenarios start from: on hover or focus, beside what they describe */}
            <div className="scn-basehover">
              <span className="scn-basedata__link" tabIndex={0} aria-describedby="scn-basedata">
                داده‌ی مبنا
              </span>
              <div id="scn-basedata" role="group" aria-label="داده‌ی مبنا" className="scn-basehover__pop">
                <strong className="scn-pop__title">داده‌ی مبنا</strong>
                <dl className="scn-pop__facts">
                  {m.fixed.map((f) => (
                    <div key={f.label}>
                      <dt>
                        {f.label}
                        {/* Where it comes from: on hover or focus, not written on every row */}
                        <span className="scn-src" tabIndex={0} aria-label={`منبع: ${f.source}`}>
                          <Info size={12} aria-hidden="true" />
                          <span className="scn-src__tip" role="tooltip">
                            از {f.source}
                          </span>
                        </span>
                      </dt>
                      <dd>{f.value}</dd>
                    </div>
                  ))}
                </dl>
                <span className="scn-pop__note">از سیستم‌ها خوانده می‌شوند و در سناریو تغییر نمی‌کنند.</span>
              </div>
            </div>
          </div>
          <p className="scn-context__meta">
            <SeverityChip severity={alert.severity} />
            <span aria-hidden="true"> · </span>
            <span dir="ltr">{alert.code}</span>
            <span aria-hidden="true"> · </span>
            <span className={stale ? 'is-warn' : undefined}>{stale ? `داده قدیمی: ${alert.staleSince}` : detail.source.replace(/^از /, '')}</span>
          </p>
        </div>
        <div className="scn-head__actions">
          <button type="button" className="abtn abtn--ghost abtn--sm scn-drawer-btn" aria-expanded={drawer} onClick={() => setDrawer(true)}>
            <SlidersHorizontal size={15} aria-hidden="true" />
            تنظیمات سناریو
          </button>
          <button type="button" className="scn-back" onClick={back}>
            بازگشت به هشدار
            <ArrowLeft size={16} aria-hidden="true" />
          </button>
        </div>
      </section>

      {stale && (
        <div className="abanner abanner--warning" role="status">
          <CircleAlert size={16} aria-hidden="true" />
          <p>
            <strong>محاسبه بر اساس داده {alert.staleSince} است.</strong> منبع هشدار به‌روز نشده؛ نتیجه‌ها برچسب «داده قدیمی» دارند.
          </p>
        </div>
      )}
      {closed && (
        <div className="abanner" role="status">
          <CircleCheck size={16} aria-hidden="true" />
          <p>
            <strong>این هشدار بسته شده است.</strong> سناریوها نگه داشته شدند و دیده می‌شوند، ولی روی هشدار اعمال نمی‌شوند.
          </p>
        </div>
      )}
      {viewer && (
        <div className="abanner" role="status">
          <Eye size={16} aria-hidden="true" />
          <p>
            <strong>فقط مشاهده.</strong> ساخت، تغییر و اعمال سناریو به دسترسی رسیدگی نیاز دارد.
          </p>
        </div>
      )}

      <div className="scn-grid scn-grid--v5">
        {drawer && <div className="scn-scrim" onClick={() => setDrawer(false)} aria-hidden="true" />}
        <SettingsColumn
          m={m}
          draft={draft}
          sel={sel}
          color={COLORS[draft.selected % COLORS.length]}
          picked={picked}
          pickNote={pickNote}
          revertLabel={revertLabel}
          stressTemplates={stress}
          viewer={viewer}
          open={drawer}
          onClose={() => setDrawer(false)}
          onAction={(patch) => editRow(draft.selected, patch)}
          onAssume={setAssume}
          onRevert={() => revert(draft.selected)}
        />

        <section className="ov-panel scn-results" aria-labelledby="scn-res-h">
          <p className="visually-hidden" aria-live="polite">
            سناریوی {sel.name} انتخاب شد
          </p>
          <div className="scn-results__head">
            <div className="scn-results__title">
              <h3 id="scn-res-h">مقایسهٔ سناریوها</h3>
            </div>
            <div className="scn-results__tools">
              <span className="scn-block__sub scn-horizon" title={horizonWhy}>
                پیش‌بینی {fa(horizon)} روز آینده
              </span>
              {!viewer && <AddMenu m={m} detail={detail} list={draft.list} templates={templates.filter((t) => t.group === 'action')} unit={unit} canManage={currentUser().role === 'manager'} onAdd={(it) => addRow(it)} />}
            </div>
          </div>

          {assumed.length > 0 && (
            <div className="scn-assumed">
              <span className="status-chip status-chip--warn">فرض تغییرکرده برای همه: {assumed.join('، ')}</span>
              {!viewer && (
                <button type="button" className="ov-link" onClick={() => setAssume({}, true)}>
                  برگرداندن
                </button>
              )}
            </div>
          )}

          <ScenarioTable
            m={m}
            detail={detail}
            list={draft.list}
            runs={runs}
            params={params}
            horizon={horizon}
            selected={draft.selected}
            pickRow={pickRow}
            loading={loading}
            stale={stale}
            viewer={viewer}
            fresh={fresh}
            room={MAX_SCENARIOS - draft.list.length}
            onSelect={select}
            onRename={(i, name) =>
              save({
                ...draft,
                list: draft.list.map((x, j) => (j === i ? { ...x, name, autoName: name !== x.name ? false : x.autoName } : x)),
              })
            }
            onAction={rowAction}
            unit={unit}
            lateArrival={lateArrival}
          />

          <ScenarioCompare open={cmpOpen} onToggle={() => setCmpOpen(!cmpOpen)} m={m} list={draft.list} runs={runs} horizon={horizon} names={draft.list.map((s) => s.name)} a={aId} b={bId} onA={(id) => setCmp({ ...cmp, a: id })} onB={(id) => setCmp({ ...cmp, b: id })} onSwap={() => setCmp({ a: bId, b: aId })} />

          <div className="scn-chart">
            <div className="scn-chart__head">
              <h3>
                {m.chart.title} · {fa(horizon)} روز
                <span className="ov-guide" tabIndex={0} aria-label="راهنما" aria-describedby="scn-chart-guide">
                  <Info size={16} aria-hidden="true" />
                  <span id="scn-chart-guide" role="tooltip" className="ov-guide__pop">
                    خط پررنگ سناریوی انتخاب‌شده است و نوار رنگی دورش بازهٔ برآوردی. نشانگر را روی نمودار ببرید تا عدد هر سناریو در آن روز را ببینید.
                  </span>
                </span>
              </h3>
            </div>
            {loading ? <div className="ov-skel scn-chart__skel" /> : <ScenarioChart m={m} list={draft.list} params={params} runs={runs} selected={draft.selected} horizon={horizon} names={names} />}
            <p className="scn-chart__note">
              <span>واحد: {m.chart.unit}</span>
            </p>
          </div>
        </section>
      </div>

      <p className="scn-print-note">سناریوها برآوردی‌اند و تصمیمی ثبت نکرده‌اند · ثبت نهایی در هشدار است</p>

      {/* Sticky footer: what applying does, or why it cannot */}
      <footer className="ov-panel scn-foot" ref={footRef}>
        <span className="scn-dot" style={{ background: COLORS[draft.selected % COLORS.length] }} aria-hidden="true" />
        <div className="scn-foot__text">
          {block ? (
            <p className="scn-foot__msg is-blocked" role="status">
              {block.text}
              {block.reason === 'assumptions' && (
                <button type="button" className="ov-link" onClick={() => showVar()}>
                  افزودن اقدام
                </button>
              )}
              {block.reason === 'combined' && block.patch && !viewer && (
                <button type="button" className="ov-link" onClick={() => editRow(draft.selected, block.patch!)}>
                  همین مقدارها
                </button>
              )}
              {block.reason === 'invalid' && (
                <button type="button" className="ov-link" onClick={() => showVar(block.varKey)}>
                  نمایش مقدار
                </button>
              )}
            </p>
          ) : (
            <>
              <p className="scn-foot__msg" role="status">
                {action.label}
              </p>
              <p className="scn-foot__sub">{showReal ? `در هشدار با فرض‌های واقعی: ${cols[0].label} ${cols[0].fmt(realFirst!)}${cols[0].unit ? ` ${cols[0].unit}` : ''}` : 'ثبت نهایی در هشدار است'}</p>
            </>
          )}
        </div>
        {!viewer && (
          <button type="button" className="abtn abtn--primary" disabled={!!block} aria-disabled={!!block} onClick={apply}>
            اعمال روی هشدار
          </button>
        )}
      </footer>
      <AlertToast />
    </div>
  )
}
