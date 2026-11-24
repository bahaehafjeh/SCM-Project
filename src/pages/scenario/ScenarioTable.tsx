import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { ArrowDown, ArrowUp, Info, MoreHorizontal } from 'lucide-react'
import type { AlertDetail } from '../../data/overview'
import type { Scenario } from '../../lib/alertStore'
import { metricLabel, money, moneyMetric, netCost } from '../../lib/engine'
import type { Metric, ModelRun, Params, ScenarioModel } from '../../lib/engine'
import { fa } from '../../components/overview/AlertParts'
import { Popover } from './Popover'
import { COLORS, MAX_SCENARIOS, RISK_LABEL, SHORTAGE_KEYS, canApply, changedFromInitial, resolveOption, netWords, riskOf, versusBase } from './helpers'
import type { UnitRejection } from './helpers'

export type RowAction = 'dup' | 'rename' | 'revert' | 'delete'

/**
 * One row per scenario: choose · scenario (type tag) · the type's two metrics (the outcome one with
 * «نسبت به بدون اقدام» under it) · cost of the action · risk · ⋯. Runs are with the shared assumptions
 * and the page's horizon. Changed figures light up for a moment. Below 768 px rows become cards.
 */
export function ScenarioTable(p: {
  m: ScenarioModel
  detail: AlertDetail
  list: Scenario[]
  runs: ModelRun[]
  horizon: number
  selected: number
  /** The row carrying «پیشنهادی» (pickRowId) */
  pickRow?: string | null
  loading: boolean
  stale: boolean
  viewer: boolean
  /** A row just added: lit for a moment (8-ه) */
  fresh?: string | null
  /** Free places in the table; a copy needs one */
  room: number
  onSelect: (i: number) => void
  onRename: (i: number, name: string) => void
  onAction: (i: number, a: RowAction) => void
  /** Each row's effective params (for the cost breakdown) */
  params: Params[]
  /** A unit's rejection: the rows whose option it covers carry its chip (§3) */
  unit?: UnitRejection | null
  /** Rows whose own arrival lands after the horizon, by id → the day (§7) */
  lateArrival?: Record<string, number>
}) {
  const { m, list, runs, horizon } = p
  const [menu, setMenu] = useState<number | null>(null)
  const [renaming, setRenaming] = useState<number | null>(null)
  const menuBtn = useRef<Record<number, HTMLButtonElement | null>>({})
  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({})
  const cols: [Metric, Metric] = m.columns ?? m.metrics
  const base = runs[0]

  // Change feedback: a figure that differs from the last render lights up for 1.2 s
  const prev = useRef(new Map<string, string>())
  const shownNow = new Map<string, string>()
  const flash = (k: string, text: string) => {
    shownNow.set(k, text)
    return prev.current.has(k) && prev.current.get(k) !== text
  }
  useEffect(() => {
    prev.current = new Map(shownNow)
  })

  useEffect(() => {
    if (p.fresh) rowRefs.current[p.fresh]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [p.fresh])
  useEffect(() => {
    if (menu === null) return
    const close = () => {
      menuBtn.current[menu]?.focus()
      setMenu(null)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    const onDown = (e: MouseEvent) => !(e.target as Element).closest('.scn-rowmenu') && setMenu(null)
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onDown)
    }
  }, [menu])

  // §2 / §3 · What risk is made of: the critical line only when the model has one; confidence is an estimate
  const hasCrit = m.chart.refs.some((r) => r.tone === 'crit')
  const riskHelp = `ریسک: احتمال کمبود${hasCrit ? ' یا رسیدن به مرز بحرانی' : ''} در این بازه. اطمینان: این برآورد چقدر قابل اتکاست.`
  const tone = (c: Metric, v: number) => (c.neutral ? '' : c.bad(v) ? 'is-bad' : c.good?.(v) ? 'is-good' : '')
  // «بدون کمبود» (green) only when the stock never reaches zero in the horizon. Demand met to the last ton
  // while the store hits zero (the risk column says so) reads «۰ روز», uncoloured: the two never disagree.
  const touchesZero = (r: ModelRun) => r.emptyDay != null && r.emptyDay <= horizon
  const shortageCell = (c: Metric, r: ModelRun) => SHORTAGE_KEYS.includes(c.key) && c.key !== 'gap' && r.values[c.key] === 0 && !!c.good?.(0)
  const cellText = (c: Metric, r: ModelRun) => (shortageCell(c, r) && !touchesZero(r) ? 'بدون کمبود' : c.fmt(r.values[c.key]))
  const cellTone = (c: Metric, r: ModelRun) => (shortageCell(c, r) && touchesZero(r) ? '' : tone(c, r.values[c.key]))
  const act = (i: number, a: RowAction) => {
    setMenu(null)
    if (a === 'rename') setRenaming(i)
    else p.onAction(i, a)
  }
  const cell = (k: string, text: string, extra?: React.ReactNode) => (
    <span key={text} className={flash(k, text) ? 'scn-flash' : undefined}>
      {text}
      {extra}
    </span>
  )

  return (
    <div className="scn-table-wrap scn-table-wrap--flush">
      <table className="scn-table scn-table--v5">
        <colgroup>
          <col className="c-pick" />
          <col className="c-name" />
          <col className="c-num" />
          <col className="c-num" />
          <col className="c-cost" />
          <col className="c-risk" />
          <col className="c-menu" />
        </colgroup>
        <thead>
          <tr>
            <th scope="col">
              <span className="visually-hidden">انتخاب</span>
            </th>
            <th scope="col">سناریو</th>
            <th scope="col">{metricLabel(cols[0], horizon)}</th>
            <th scope="col">{metricLabel(cols[1], horizon)}</th>
            <th scope="col">هزینهٔ اقدام (تومان)</th>
            <th scope="col">
              ریسک
              <span className="ov-guide scn-th-guide" tabIndex={0} aria-label="راهنما" aria-describedby="scn-risk-guide">
                <Info size={14} aria-hidden="true" />
                <span id="scn-risk-guide" role="tooltip" className="ov-guide__pop">
                  {riskHelp}
                </span>
              </span>
            </th>
            <th scope="col">
              <span className="visually-hidden">بیشتر</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {list.map((s, i) => {
            const r = runs[i]
            const ref = s.origin === 'reference'
            const risk = riskOf(m, cols, r, horizon)
            // §3 · The option this row stands for, if a unit turned it down
            const match = !ref && p.unit ? resolveOption(p.detail, m, p.params[i]) : null
            const rejected = !!match && !!p.unit?.blocked(match.option)
            const late = p.lateArrival?.[s.id]
            const lines = ref ? [] : (m.costLines?.(p.params[i]) ?? [])
            const can = ref ? null : canApply(p.detail, m, p.params[i], p.unit)
            const combinedNo = can && !can.ok && can.code === 'combined' ? can.reason : null
            const changed = !ref && changedFromInitial(m, s)
            return (
              <tr
                key={s.id}
                ref={(el) => {
                  rowRefs.current[s.id] = el
                }}
                tabIndex={-1}
                className={`${i === p.selected ? 'is-selected' : ''} ${ref ? 'is-reference' : ''} ${p.fresh === s.id ? 'scn-row--new' : ''}`}
                style={{ '--row': COLORS[i % COLORS.length] } as CSSProperties}
                onClick={() => p.onSelect(i)}
              >
                <td data-label="انتخاب">
                  <input type="radio" name="scenario" checked={i === p.selected} onChange={() => p.onSelect(i)} aria-label={`انتخاب سناریوی ${s.name}`} />
                </td>
                <th scope="row" className="scn-name" data-label="سناریو">
                  <span className="scn-name__line">
                    <span className="scn-dot" aria-hidden="true" />
                    {renaming === i ? (
                      <input
                        className="scn-rename"
                        autoFocus
                        defaultValue={s.name}
                        aria-label="نام سناریو"
                        onClick={(e) => e.stopPropagation()}
                        onBlur={(e) => {
                          p.onRename(i, e.target.value.trim() || s.name)
                          setRenaming(null)
                        }}
                        onKeyDown={(e) => (e.key === 'Enter' ? (e.target as HTMLInputElement).blur() : e.key === 'Escape' && setRenaming(null))}
                      />
                    ) : (
                      <span className="scn-name__label" title={s.name}>
                        {s.name}
                      </span>
                    )}
                  </span>
                  {combinedNo && (
                    <span className="scn-name__meta">
                      <span className="status-chip scn-tag scn-tag--blocked" title={combinedNo}>
                        ترکیبی · قابل اعمال نیست
                      </span>
                    </span>
                  )}
                  {rejected && (
                    <span className="scn-name__meta">
                      <span className="status-chip status-chip--danger scn-rejected" title={p.unit!.reason}>
                        رد شد توسط {p.unit!.unit}
                      </span>
                    </span>
                  )}
                  {late && <span className="scn-late">رسیدن روز {fa(late)}، بعد از پایان پیش‌بینی</span>}
                  {s.id === p.pickRow && (
                    <span className="scn-name__meta">
                      {/* Why it is suggested, from the data only (§4): on hover or focus, not written under the name */}
                      <span className="scn-tip-host" tabIndex={0} onClick={(e) => e.stopPropagation()}>
                        <span className="status-chip scn-tag scn-tag--pick">پیشنهادی</span>
                        <span className="scn-src__tip" role="tooltip">
                          {(() => {
                            const o = p.detail.options.find((x) => x.id === s.option)
                            return [o?.reason, o?.effect].filter(Boolean).join(' · ')
                          })()}
                        </span>
                      </span>
                    </span>
                  )}
                </th>
                {p.loading ? (
                  [0, 1, 2, 3].map((k) => (
                    <td key={k}>
                      <span className="ov-skel" />
                    </td>
                  ))
                ) : (
                  <>
                    {cols.map((c, ci) => (
                      <td key={c.key} data-label={metricLabel(c, horizon)} className={cellTone(c, r)}>
                        {/* A zero shortage reads as «بدون کمبود», not «۰ روز» */}
                        {cell(`${s.id}:${c.key}`, cellText(c, r))}
                        {(() => {
                          const vs = ref ? null : versusBase(c, r, base)
                          return (
                            vs && (
                              <span className={`scn-mark scn-mark--${vs.tone}`} title={vs.full}>
                                <span aria-hidden="true">
                                  {vs.arrow === '▲' ? <ArrowUp size={12} strokeWidth={2.5} /> : <ArrowDown size={12} strokeWidth={2.5} />}
                                  {vs.text}
                                </span>
                                <span className="visually-hidden">{vs.full}</span>
                              </span>
                            )
                          )
                        })()}
                        {ci === 1 && r.enoughUntil != null && <span className="scn-until">کافی برای حدود {fa(r.enoughUntil)} روز</span>}
                        {ci === 0 && p.stale && <span className="scn-stale">داده قدیمی</span>}
                      </td>
                    ))}
                    <td data-label="هزینهٔ اقدام (تومان)" onClick={(e) => e.stopPropagation()}>
                      {ref ? (
                        <span className="is-muted">بدون هزینهٔ اقدام</span>
                      ) : (
                        (() => {
                          // Only what the action itself costs; the problem's own money is its column, and «خالص» joins the two
                          const net = netCost(m, r, base)
                          const nw = net === null ? null : netWords(net)
                          const mm = moneyMetric(m)
                          const figure = r.cost === 0 ? <span className="is-muted">بدون هزینهٔ مستقیم</span> : cell(`${s.id}:cost`, money(r.cost))
                          const netLine = nw && (
                            <span className={`scn-mark scn-mark--${nw.tone === 'same' ? 'same' : nw.tone} scn-net`} title={nw.full}>
                              <span aria-hidden="true">
                                {nw.arrow === '▲' ? <ArrowUp size={12} strokeWidth={2.5} /> : nw.arrow === '▼' ? <ArrowDown size={12} strokeWidth={2.5} /> : null}
                                خالص {nw.text}
                              </span>
                              <span className="visually-hidden">{nw.full}</span>
                            </span>
                          )
                          if (lines.length === 0 && net === null) return figure
                          return (
                            <>
                              <Popover label="هزینهٔ این سناریو" className="scn-cost" button={figure}>
                                {lines.map((l) => (
                                  <div key={l.what} className="scn-costline">
                                    <span>
                                      {l.what} × {fa(l.rate, l.rate % 1 ? 1 : 0)} میلیون = {money(l.total)} تومان
                                    </span>
                                    <span className="scn-block__sub">{l.source}</span>
                                  </div>
                                ))}
                                <div className="scn-costsum">
                                  <span>جمع هزینهٔ اقدام</span>
                                  <strong>{r.cost === 0 ? 'بدون هزینهٔ مستقیم' : `${money(r.cost)} تومان`}</strong>
                                </div>
                                {mm && nw && (
                                  <div className="scn-costnet">
                                    <div>
                                      <span>تغییر {mm.label}</span>
                                      <span>
                                        {(() => {
                                          const d = r.values[mm.key] - base.values[mm.key]
                                          return d === 0 ? 'بدون تغییر' : `${money(Math.abs(d))} ${d > 0 ? 'بیشتر' : 'کمتر'}`
                                        })()}
                                      </span>
                                    </div>
                                    <div className="scn-costnet__total">
                                      <span>خالص نسبت به بدون اقدام</span>
                                      <strong>{nw.text}</strong>
                                    </div>
                                  </div>
                                )}
                              </Popover>
                              {netLine}
                            </>
                          )
                        })()
                      )}
                    </td>
                    <td data-label="ریسک">
                      <span className="scn-risk">
                        <span className={`status-chip status-chip--${risk.level === 'high' ? 'danger' : risk.level === 'medium' ? 'warn' : 'ok'}`} title={risk.reason}>
                          {RISK_LABEL[risk.level]}
                        </span>
                        {!ref && <span className="scn-risk__conf">اطمینان {fa(r.confidence)}٪</span>}
                      </span>
                    </td>
                  </>
                )}
                <td className="scn-rowmenu" onClick={(e) => e.stopPropagation()}>
                  {!p.viewer && !ref && (
                    <button
                      ref={(el) => {
                        menuBtn.current[i] = el
                      }}
                      type="button"
                      className="aicon-btn"
                      aria-haspopup="menu"
                      aria-expanded={menu === i}
                      onClick={() => setMenu(menu === i ? null : i)}
                      aria-label={`گزینه‌های سناریوی ${s.name}`}
                    >
                      <MoreHorizontal size={16} aria-hidden="true" />
                    </button>
                  )}
                  {menu === i && (
                    <div className="tb-menu scn-rowmenu__pop" role="menu">
                      <button type="button" role="menuitem" className="tb-menu__item" autoFocus aria-disabled={p.room <= 0 || undefined} title={p.room <= 0 ? `جدول پر است (${fa(MAX_SCENARIOS)} از ${fa(MAX_SCENARIOS)})؛ یک سناریو را از منوی ⋯ حذف کنید.` : undefined} onClick={() => p.room > 0 && act(i, 'dup')}>
                        <span className="tb-menu__label">کپی این سناریو</span>
                      </button>
                      <button type="button" role="menuitem" className="tb-menu__item" onClick={() => act(i, 'rename')}>
                        <span className="tb-menu__label">تغییر نام</span>
                      </button>
                      <button type="button" role="menuitem" className="tb-menu__item" aria-disabled={!changed || undefined} onClick={() => changed && act(i, 'revert')}>
                        <span className="tb-menu__label">برگشت به حالت اولیه</span>
                      </button>
                      <div className="tb-menu__sep" role="separator" />
                      <button type="button" role="menuitem" className="tb-menu__item tb-menu__item--danger" onClick={() => act(i, 'delete')}>
                        <span className="tb-menu__label">حذف</span>
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
