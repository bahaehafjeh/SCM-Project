import { useRef, useState } from 'react'
import type { KeyboardEvent, ReactNode } from 'react'
import { AlertTriangle, ChevronLeft, Info, Lightbulb, Link2, Search, Split, TrendingDown, TrendingUp, X } from 'lucide-react'
import { COUNTRY_FA, GOODS, MODE_LABEL, MONTHS, chokepointById, routeById } from '../../data/routes'
import type { Chokepoint, Month, TradeRoute } from '../../data/routes'
import { LAST_COMPLETE, LEVEL_LABEL, breakdownOf, cpValue, dependencyOf, filterRoutes, hasRouteFilters, insights, isIncompleteMonth, rankedChokepoints, routeValue, shareChange3m, shareOf, totalsOf } from '../../lib/routes/metrics'
import type { Filters, Level } from '../../lib/routes/metrics'
import { GOOD_SLUG } from '../../lib/routes/url'
import type { RoutesState } from '../../lib/routes/url'
import { notify } from '../../lib/alertStore'
import { fa, fa1, fa2, gregorianMonth, km, money, persianMonth } from './format'

const LevelChip = ({ level }: { level: Level }) => <span className={`rchip rchip--${level}`}>وابستگی {LEVEL_LABEL[level]}</span>
const Dot = ({ level }: { level: Level }) => <span className={`rdot rdot--${level}`} aria-hidden="true" />
const pct = (n: number) => `${fa1(n)}٪`

export interface PanelProps {
  s: RoutesState
  f: Filters
  hoverCp: string | null
  onHoverCp: (id: string | null) => void
  select: (patch: Partial<RoutesState>) => void
  set: (patch: Partial<RoutesState>) => void
  onTable: (tab: 'routes') => void
}

/** The panel is always about what is selected on the map (routes-map-prompt §6) */
export function DetailPanel(p: PanelProps) {
  const cp = p.s.cp ? chokepointById(p.s.cp) : undefined
  const route = p.s.route ? routeById(p.s.route) : undefined
  const crumbs: { label: string; go?: () => void }[] = [{ label: p.s.iran ? 'به سمت ایران' : 'همهٔ جریان‌ها', go: cp || route ? () => p.select({ cp: null, route: null }) : undefined }]
  if (cp) crumbs.push({ label: cp.name, go: route ? () => p.select({ route: null }) : undefined })
  if (route) crumbs.push({ label: `${short(route.from.name)} ← ${short(route.to.name)}` })
  return (
    <div className="rpanel__inner">
      <nav className="rcrumbs" aria-label="سطح جزئیات">
        {crumbs.map((c, i) => (
          <span key={i} className="rcrumbs__item">
            {i > 0 && <ChevronLeft size={12} aria-hidden="true" />}
            {c.go ? (
              <button type="button" className="ov-link" onClick={c.go}>
                {c.label}
              </button>
            ) : (
              <span aria-current="page">{c.label}</span>
            )}
          </span>
        ))}
      </nav>
      {p.s.month && (
        <button type="button" className="rchip rchip--month" title={gregorianMonth(p.s.month)} onClick={() => p.set({ month: null })} aria-label={`برداشتن ماه ${persianMonth(p.s.month)}`}>
          فقط {persianMonth(p.s.month)}
          <X size={12} aria-hidden="true" />
        </button>
      )}
      {route ? <RoutePanel {...p} r={route} /> : cp ? <ChokepointPanel {...p} cp={cp} /> : <OverviewPanel {...p} />}
    </div>
  )
}
const short = (name: string) => name.replace(/^بندر\s/, '')

// ── Overview ──
function OverviewPanel(p: PanelProps) {
  const [all, setAll] = useState(false)
  const t = totalsOf(p.f)
  const ranked = rankedChokepoints(p.f)
  const max = Math.max(1, ...ranked.map((x) => x.share))
  const list = all ? ranked : ranked.slice(0, 6)
  const notes = insights(p.f)
  const fromRoutes = hasRouteFilters(p.f)
  const routes = filterRoutes(p.f)
  const big = ranked[0]
  if (p.s.iran) {
    const origins = new Set(routes.map((r) => r.originCountry))
    return (
      <>
        <header className="rpanel__head">
          <h2 className="rpanel__title">به سمت ایران</h2>

          <button type="button" className="ov-link rpanel__back" onClick={() => p.set({ iran: false })}>
            برگشت به جهان
          </button>
        </header>
        <Stats
          items={[
            { label: 'ارزش واردات', value: fa1(t.value), unit: 'میلیارد دلار' },
            { label: 'مسیرها', value: fa(t.routes) },
            { label: 'کشور مبدأ', value: fa(origins.size) },
          ]}
        />
        {big && big.share > 60 && (
          <p className="ralert" role="note">
            <AlertTriangle size={15} aria-hidden="true" />
            {pct(big.share)} واردات دریایی به بنادر ایران از {big.cp.short === 'هرمز' ? 'هرمز' : big.cp.name} می‌گذرد.
          </p>
        )}
        <Section title="از کدام گلوگاه‌ها به ما می‌رسد">
          <CpList list={ranked} max={max} {...p} />
        </Section>
      </>
    )
  }
  return (
    <>
      <header className="rpanel__head">
        <h2 className="rpanel__title">همهٔ جریان‌ها</h2>
      </header>
      <Stats
        items={[
          { label: 'ارزش تجارت', value: fa1(t.value), unit: 'میلیارد دلار' },
          { label: 'تجارت‌ها', value: fa(t.trades) },
          { label: 'مسیرها', value: fa(t.routes) },
          t.tonnesBn >= 1 ? { label: 'وزن معتبر', value: fa1(Math.round(t.tonnesBn * 100) / 100), unit: 'میلیارد تن' } : { label: 'وزن معتبر', value: fa1(t.tonnesBn * 1000), unit: 'میلیون تن' },
        ]}
      />
      <p className="rnote">
        {fromRoutes ? (
          <>عددها از {fa(routes.length)} مسیر نمونهٔ مطابق فیلتر حساب شده‌اند؛ سهم گلوگاه‌ها از ارزش همین مسیرهاست و جمعشان ۱۰۰ نمی‌شود.</>
        ) : (
          <>
            {money(t.routed)} ({fa(Math.round((t.routed / t.value) * 100))}٪) مسیر ثبت‌شده دارد؛ سهم گلوگاه‌ها از همین مبلغ است و جمعشان ۱۰۰ نمی‌شود.
          </>
        )}
      </p>
      <Section title="گلوگاه‌ها به ترتیب سهم">
        <CpList list={list} max={max} {...p} />
        {ranked.length > 6 && (
          <button type="button" className="ov-link rmore-link" onClick={() => setAll(!all)}>
            {all ? 'کمتر' : `همه (${fa(ranked.length)})`}
          </button>
        )}
      </Section>
      {notes.length > 0 && (
        <Section title="چه چیزی مهم است">
          <ul className="rinsights">
            {notes.map((n) => (
              <li key={n.kind}>
                <span className={`rinsights__icon is-${n.tone}`} aria-hidden="true">
                  {n.tone === 'up' ? <TrendingUp size={16} /> : n.tone === 'down' ? <TrendingDown size={16} /> : <Info size={16} />}
                </span>
                <span>
                  <strong>{n.main}</strong>
                  <span className="rinsights__sub">{n.sub}</span>
                </span>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </>
  )
}

/** Chokepoints with a share bar; hover lights the marker on the map and back */
function CpList({ list, max, hoverCp, onHoverCp, select }: { list: { cp: Chokepoint; value: number; share: number }[]; max: number } & PanelProps) {
  return (
    <ol className="rcps">
      {list.map(({ cp, value, share }) => {
        const level = dependencyOf(cp).level
        return (
          <li key={cp.id}>
            <button type="button" className={`rcps__row ${hoverCp === cp.id ? 'is-hover' : ''}`} onMouseEnter={() => onHoverCp(cp.id)} onMouseLeave={() => onHoverCp(null)} onFocus={() => onHoverCp(cp.id)} onBlur={() => onHoverCp(null)} onClick={() => select({ cp: cp.id, route: null })}>
              <Dot level={level} />
              <span className="rcps__name">{cp.short}</span>
              <span className="rcps__bar" aria-hidden="true">
                <span className={`rbar rbar--${level}`} style={{ width: `${(share / max) * 100}%` }} />
              </span>
              <span className="rcps__share">{pct(share)}</span>
              <span className="rcps__value">{money(value, false)}</span>
              <span className="visually-hidden">میلیارد دلار، وابستگی {LEVEL_LABEL[level]}</span>
            </button>
          </li>
        )
      })}
    </ol>
  )
}

// ── Chokepoint ──
const TABS = [
  { key: 'summary', label: 'خلاصه' },
  { key: 'goods', label: 'کالاها' },
  { key: 'routes', label: 'مسیرها' },
  { key: 'countries', label: 'کشورها' },
] as const
type Tab = (typeof TABS)[number]['key']

function ChokepointPanel(p: PanelProps & { cp: Chokepoint }) {
  const [tab, setTab] = useState<Tab>('summary')
  const refs = useRef<Record<string, HTMLButtonElement | null>>({})
  const { cp } = p
  const d = dependencyOf(cp)
  const fromRoutes = hasRouteFilters(p.f)
  const through = filterRoutes(p.f).filter((r) => r.chokepoints.includes(cp.id))
  const bd = breakdownOf(cp.id)
  const value = cpValue(cp, p.f)
  const share = shareOf(cp, p.f)
  const change = shareChange3m(cp)
  const routesN = fromRoutes ? through.length : cp.routes
  const tradesN = fromRoutes ? Math.round(through.reduce((t, r) => t + r.trades * (routeValue(r, p.f) / r.value), 0)) : cp.trades
  const origins = bd ? bd.origins.length : new Set(through.map((r) => r.originCountry)).size
  const onKey = (e: KeyboardEvent) => {
    const i = TABS.findIndex((t) => t.key === tab)
    const to = e.key === 'ArrowLeft' ? i + 1 : e.key === 'ArrowRight' ? i - 1 : null
    if (to === null) return
    e.preventDefault()
    const next = TABS[(to + TABS.length) % TABS.length].key
    setTab(next)
    refs.current[next]?.focus()
  }
  return (
    <>
      <header className="rpanel__head rpanel__head--stack">
        <div className="rpanel__titleline">
          <h2 className="rpanel__title">{cp.name}</h2>
          <LevelChip level={d.level} />
        </div>
        <p className="rpanel__sub">
          {fa(routesN)} مسیر · {fa(tradesN)} تجارت{origins ? ` · ${fa(origins)} کشور مبدأ اصلی` : ''}
        </p>
      </header>
      <div className="rtabs" role="tablist" aria-label={`جزئیات ${cp.name}`} onKeyDown={onKey}>
        {TABS.map((t) => (
          <button
            key={t.key}
            ref={(el) => {
              refs.current[t.key] = el
            }}
            type="button"
            role="tab"
            id={`rtab-${t.key}`}
            aria-selected={tab === t.key}
            aria-controls={`rtabp-${t.key}`}
            tabIndex={tab === t.key ? 0 : -1}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`rtabp-${tab}`} aria-labelledby={`rtab-${tab}`} className="rtabpanel">
        {tab === 'summary' && (
          <>
            <div className="rcells">
              <div>
                <span className="rcells__label">ارزش عبوری</span>
                <span className="rcells__value">
                  {fa1(Math.round(value * 10) / 10)} <small>میلیارد دلار</small>
                </span>
              </div>
              <div>
                <span className="rcells__label">
                  سهم
                  <InfoTip id="rshare" text="سهم گلوگاه = ارزش عبوری ÷ ارزش مسیردار؛ جمع سهم‌ها ۱۰۰ نمی‌شود، چون یک تجارت از چند گلوگاه می‌گذرد." />
                </span>
                <span className="rcells__value">{pct(share)}</span>
              </div>
              <div>
                <span className="rcells__label">۳ ماه اخیر</span>
                <span className={`rcells__value rchange ${change > 0 ? 'is-up' : change < 0 ? 'is-down' : ''}`} title="تغییر سهم در ۳ ماه کامل اخیر؛ قرمز یعنی وابستگی بیشتر شده">
                  {change === 0 ? 'بدون تغییر' : `${change > 0 ? '▲' : '▼'} ${fa1(Math.abs(change))}`}
                  {change !== 0 && <small> واحد درصد</small>}
                </span>
              </div>
            </div>
            <Section title="میزان وابستگی">
              <p className="rdep__score">
                <strong>{fa(d.score)}</strong> از ۱۰۰ <span className="rdep__not">احتمال اختلال نیست</span>
              </p>
              <span className="rdep__scale" aria-hidden="true">
                <span className="rdep__mark" style={{ insetInlineStart: `${d.score}%` }} />
              </span>
              <dl className="rdep__parts">
                {[
                  ['ارزش عبوری', d.parts.value],
                  ['تعداد تجارت', d.parts.trades],
                  ['تمرکز کالا', d.parts.concentration],
                ].map(([label, v]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>
                      <span className="rbar rbar--grey" style={{ width: `${v}%` }} aria-hidden="true" />
                      <span>{fa(v as number)}</span>
                    </dd>
                  </div>
                ))}
              </dl>
            </Section>
            <Section title="ارزش ماهانه">
              <MonthBars values={cp.monthly} month={p.s.month} onMonth={(m) => p.set({ month: m })} />
            </Section>
            {cp.alt && (
              <Section title="جایگزین">
                <p className="ralt">{cp.alt}</p>
              </Section>
            )}
            <Actions cp={cp} />
          </>
        )}
        {tab === 'goods' && (
          <BarList
            note={bd && !fromRoutes ? 'تفکیک بقیهٔ کالاها در دادهٔ نمونه نیست.' : `از ${fa(through.length)} مسیر نمونهٔ این گلوگاه.`}
            rows={bd && !fromRoutes ? bd.goods.map(([n, v]) => ({ key: n, label: n, value: v })) : goodsOf(through, p.f)}
            onPick={(name) => p.set({ goods: [GOOD_SLUG[name as (typeof GOODS)[number]]] })}
          />
        )}
        {tab === 'routes' && <RouteList routes={through} f={p.f} total={cp.routes} onPick={(id) => p.select({ route: id })} onTable={() => p.onTable('routes')} />}
        {tab === 'countries' && (
          <>
            <Section title="مبدأ">
              <BarList rows={bd && !fromRoutes ? bd.origins.map(([c, v]) => ({ key: c, label: COUNTRY_FA[c] ?? c, value: v })) : countriesOf(through, p.f, 'originCountry')} onPick={(c) => p.set({ origin: [c] })} />
            </Section>
            <Section title="مقصد">
              <BarList rows={bd && !fromRoutes ? bd.dests.map(([c, v]) => ({ key: c, label: COUNTRY_FA[c] ?? c, value: v })) : countriesOf(through, p.f, 'destCountry')} onPick={(c) => p.set({ dest: [c] })} />
            </Section>
            {!(bd && !fromRoutes) && <p className="rlimit">محدودیت داده: کشورها از {fa(through.length)} مسیر نمونهٔ این گلوگاه‌اند.</p>}
          </>
        )}
      </div>
    </>
  )
}

const goodsOf = (routes: TradeRoute[], f: Filters) => {
  const m = new Map<string, number>()
  for (const r of routes) {
    const scale = routeValue(r, f) / r.value
    for (const g of r.goods) m.set(g.name, (m.get(g.name) ?? 0) + g.value * scale)
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([n, v]) => ({ key: n, label: n, value: v }))
}
const countriesOf = (routes: TradeRoute[], f: Filters, k: 'originCountry' | 'destCountry') => {
  const m = new Map<string, number>()
  for (const r of routes) m.set(r[k], (m.get(r[k]) ?? 0) + routeValue(r, f))
  return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([c, v]) => ({ key: c, label: COUNTRY_FA[c] ?? c, value: v }))
}

function BarList({ rows, onPick, note }: { rows: { key: string; label: string; value: number }[]; onPick: (key: string) => void; note?: string }) {
  const max = Math.max(1e-9, ...rows.map((r) => r.value))
  if (!rows.length) return <p className="rlimit">محدودیت داده: برای این بخش داده‌ای در نمونه نیست.</p>
  return (
    <>
      <ol className="rbars">
        {rows.map((r) => (
          <li key={r.key}>
            <button type="button" onClick={() => onPick(r.key)} title="فیلتر روی همین">
              <span className="rbars__label">{r.label}</span>
              <span className="rbars__bar" aria-hidden="true">
                <span className="rbar rbar--brand" style={{ width: `${(r.value / max) * 100}%` }} />
              </span>
              <span className="rbars__value">{money(r.value, false)}</span>
            </button>
          </li>
        ))}
      </ol>
      {note && <p className="rlimit">{note}</p>}
    </>
  )
}

function RouteList({ routes, f, total, onPick, onTable }: { routes: TradeRoute[]; f: Filters; total: number; onPick: (id: string) => void; onTable: () => void }) {
  const [q, setQ] = useState('')
  const shown = [...routes].sort((a, b) => routeValue(b, f) - routeValue(a, f)).filter((r) => `${r.from.name} ${r.to.name} ${r.from.code} ${r.to.code}`.includes(q.trim()))
  return (
    <>
      <label className="rsearch">
        <Search size={14} aria-hidden="true" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="جستجوی بندر…" aria-label="جستجوی مسیر" />
      </label>
      <ol className="rroutes">
        {shown.map((r) => (
          <li key={r.id}>
            <button type="button" onClick={() => onPick(r.id)}>
              <span className="rroutes__name">
                {short(r.from.name)} ← {short(r.to.name)}
              </span>
              <span className="rroutes__meta">
                {r.goods[0].name} · {fa(r.activeMonths)} ماه فعال
              </span>
              <span className="rroutes__value">{money(routeValue(r, f), false)}</span>
            </button>
          </li>
        ))}
      </ol>
      <button type="button" className="ov-link rmore-link" onClick={onTable}>
        {fa(routes.length)} مسیر نمونه از {fa(total)} · در نمای جدول ←
      </button>
    </>
  )
}

// ── Route ──
function RoutePanel(p: PanelProps & { r: TradeRoute }) {
  const { r } = p
  const value = routeValue(r, p.f)
  return (
    <>
      <header className="rpanel__head rpanel__head--stack">
        <div className="rpanel__titleline">
          <h2 className="rpanel__title">
            {r.from.name} ← {r.to.name}
          </h2>
        </div>
        <p className="rpanel__sub">
          {COUNTRY_FA[r.originCountry] ?? r.originCountry} ← {COUNTRY_FA[r.destCountry] ?? r.destCountry}
          <span className="rchip rchip--mode">
            {MODE_LABEL[r.mode]}
            {r.modeEstimated && (
              <>
                {' · برآورد'}
                <InfoTip id="rmode" text="روش حمل از بندرهای بارگیری و تخلیه و نوع محموله برآورد شده است، نه ردیابی کشتی." />
              </>
            )}
          </span>
        </p>
      </header>
      <div className="rcells rcells--4">
        <div>
          <span className="rcells__label">ارزش</span>
          <span className="rcells__value">
            {fa2(Math.round(value * 100) / 100)} <small>م‌د</small>
          </span>
        </div>
        <div>
          <span className="rcells__label">حجم</span>
          <span className="rcells__value">
            {fa2(r.tonnes)} <small>میلیون تن</small>
          </span>
        </div>
        <div>
          <span className="rcells__label">تجارت</span>
          <span className="rcells__value">{fa(r.trades)}</span>
        </div>
        <div>
          <span className="rcells__label">ماه فعال</span>
          <span className="rcells__value">
            {fa(r.activeMonths)} <small>از {fa(MONTHS.length)}</small>
          </span>
        </div>
      </div>
      <Section title="مسیر" aside={km(r.km)}>
        <ol className="rstrip">
          <li className="rstrip__port" title={`${r.from.name} · ${r.from.code}`}>
            <span className="rstrip__sq" aria-hidden="true" />
            <span>{short(r.from.name)}</span>
          </li>
          {r.chokepoints.map((id, i) => {
            const c = chokepointById(id)!
            return (
              <li key={id}>
                <button type="button" className={`rstrip__cp rstrip__cp--${dependencyOf(c).level}`} onClick={() => p.select({ cp: id, route: null })} aria-label={`${i + 1}. ${c.name}`}>
                  <span className="rstrip__n">{fa(i + 1)}</span>
                  <span>{c.short}</span>
                </button>
              </li>
            )
          })}
          <li className="rstrip__port" title={`${r.to.name} · ${r.to.code}`}>
            <span className="rstrip__sq" aria-hidden="true" />
            <span>{short(r.to.name)}</span>
          </li>
        </ol>
      </Section>
      <Section title="کالاها">
        <table className="rgoods">
          <thead>
            <tr>
              <th scope="col">کالا</th>
              <th scope="col">شکل محموله</th>
              <th scope="col">شناور</th>
              <th scope="col">ارزش (م‌د)</th>
            </tr>
          </thead>
          <tbody>
            {r.goods.map((g) => (
              <tr key={g.name}>
                <th scope="row">{g.name}</th>
                <td>{g.form}</td>
                <td>{g.vessel}</td>
                <td>{fa1(g.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>
      {r.alternative && (
        <Section title="جایگزین">
          <p className="ralt">
            از {r.alternative.via}: {km(r.alternative.km)} ({fa(r.alternative.extraKm)}+) · حدود {fa(r.alternative.extraDays)} روز بیشتر · بدون {listFa(r.alternative.skips.map((x) => chokepointById(x)!.short))}
          </p>
        </Section>
      )}
      <Actions />
    </>
  )
}
const listFa = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join('، ')} و ${xs[xs.length - 1]}`)

// ── Shared pieces ──
function Section({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="rsec">
      <h3 className="rsec__title">
        {title}
        {aside && <span className="rsec__aside">{aside}</span>}
      </h3>
      {children}
    </section>
  )
}
function Stats({ items }: { items: { label: string; value: string; unit?: string }[] }) {
  return (
    <dl className="rstats">
      {items.map((x) => (
        <div key={x.label}>
          <dt>{x.label}</dt>
          <dd>
            {x.value}
            {x.unit && <small>{x.unit}</small>}
          </dd>
        </div>
      ))}
    </dl>
  )
}
function InfoTip({ id, text }: { id: string; text: string }) {
  return (
    <span className="rinfo" tabIndex={0} aria-label="توضیح" aria-describedby={id}>
      <Info size={12} aria-hidden="true" />
      <span id={id} role="tooltip" className="rinfo__pop">
        {text}
      </span>
    </span>
  )
}
/** Monthly bars: 28 px, the incomplete month hatched; a click reads that month */
function MonthBars({ values, month, onMonth }: { values: number[]; month: Month | null; onMonth: (m: Month | null) => void }) {
  const max = Math.max(...values)
  return (
    <div className="rmonths" role="group" aria-label="ارزش ماهانه">
      {values.map((v, i) => {
        const m = MONTHS[i]
        return (
          <button
            key={m}
            type="button"
            className={`rmonths__bar ${isIncompleteMonth(m) ? 'is-incomplete' : ''} ${month === m ? 'is-on' : ''} ${i === LAST_COMPLETE ? 'is-last' : ''}`}
            style={{ height: `${Math.max(8, (v / max) * 100)}%` }}
            title={`${persianMonth(m)} · ${money(v)}${isIncompleteMonth(m) ? ' · ماه ناقص' : ''}`}
            aria-label={`${persianMonth(m)}: ${money(v)}${isIncompleteMonth(m) ? '، ماه ناقص' : ''}`}
            onClick={() => onMonth(month === m ? null : m)}
          />
        )
      })}
    </div>
  )
}

/**
 * Actions (§7): planning only, nothing is handed to a unit. The scenario engine has no chokepoint
 * closure model, so that button is off with «به‌زودی»; «ثبت پیشنهاد» has no page to go to.
 */
function Actions({ cp }: { cp?: Chokepoint }) {
  const copy = () => {
    navigator.clipboard?.writeText(window.location.href).then(
      () => notify('لینک کپی شد'),
      () => notify('کپی لینک انجام نشد'),
    )
  }
  return (
    <section className="ractions">
      <button type="button" className="abtn abtn--primary ractions__main" disabled title="به‌زودی: سناریوی بسته شدن گلوگاه">
        <Split size={16} aria-hidden="true" />
        {cp ? `سناریوی بسته شدن ${cp.short}` : 'سناریوی بسته شدن یکی از گلوگاه‌ها'}
      </button>
      <div className="ractions__row">
        <button type="button" className="abtn abtn--secondary abtn--sm" disabled title="به‌زودی">
          <Lightbulb size={14} aria-hidden="true" />
          ثبت پیشنهاد
        </button>
        <button type="button" className="aicon-btn ractions__share" onClick={copy} aria-label="کپی لینک همین نما" title="کپی لینک همین نما">
          <Link2 size={16} aria-hidden="true" />
        </button>
      </div>
    </section>
  )
}
