import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts'
import { ChartLine, Table2 } from 'lucide-react'
import { ChartContainer, ChartTooltip } from '../../components/ui/chart'
import { MAX_PRODUCTS, PRODUCT_UNIT, SALES_PRODUCTS, productRows, productSummary, salesMonthsIn, topProducts } from '../../lib/industry/sales'
import type { ProductMode, SalesSet } from '../../lib/industry/sales'
import { fa, niceTicks } from '../../lib/industry/format'
import { monthName } from '../../lib/industry/months'
import { MONTH_AXIS, Card, Seg, Tip, stateOf, tipLabel } from './parts'
import { Num, TableChange } from './TablePager'
import type { CardCtx } from './parts'
import { RangeNavigator } from './RangeNavigator'
import { useWheelZoom } from './useWheelZoom'

const MAX_ROWS = 2
const H = 340
const M = { top: 14, right: 12, bottom: 4, left: 4 }
const MODES: { value: ProductMode; label: string }[] = [
  { value: 'rate', label: 'نرخ فروش' },
  { value: 'qty', label: 'مقدار فروش' },
  { value: 'amount', label: 'مبلغ فروش' },
]
type View = 'chart' | 'table'
/** Chart or table: icons only, the name in the tooltip and for screen readers */
const VIEWS = [
  { value: 'chart', label: 'نمودار', icon: ChartLine },
  { value: 'table', label: 'جدول', icon: Table2 },
] as const
/** Quick picks: the leading products of the range */
const PRESETS = [
  { id: 'top3', label: '۳ محصول اصلی', title: 'سه محصول با بیشترین مبلغ فروش در بازه', by: 'amount', n: 3 },
  { id: 'top5', label: '۵ محصول پرفروش', title: 'پنج محصول با بیشترین مقدار فروش در بازه', by: 'qty', n: 5 },
] as const
type Pick = (typeof PRESETS)[number]['id'] | string[]
const labelOf = (key: string) => SALES_PRODUCTS.find((p) => p.key === key)?.label ?? key
const colorOf = (key: string) => SALES_PRODUCTS.find((p) => p.key === key)?.color ?? 'var(--raw-neutral-400)'

/** «تغییرات نرخ فروش محصولات»: up to eight products, as lines or as a month-by-month table */
export function SalesRateCard({ ctx, sales }: { ctx: CardCtx; sales: SalesSet | null }) {
  const [mode, setMode] = useState<ProductMode>('rate')
  const [view, setView] = useState<View>('chart')
  const [pick, setPick] = useState<Pick>('top3')
  const [hoverKey, setHoverKey] = useState<string | null>(null)
  const months = sales && ctx.ds ? salesMonthsIn(sales, ctx.ds, ctx.range) : []
  const has = months.length > 0
  const preset = typeof pick === 'string' ? PRESETS.find((p) => p.id === pick)! : null
  const ids: string[] = sales ? (preset ? topProducts(sales, months, preset.by, preset.n) : (pick as string[])) : []
  // A product chip turns the quick pick into a hand-made list
  const toggle = (key: string) => {
    setHoverKey(null)
    setPick(ids.includes(key) ? ids.filter((k) => k !== key) : ids.length >= MAX_PRODUCTS ? ids : [...ids, key])
  }
  const all = sales ? productRows(sales, months, mode, ctx.unit, ids) : []

  // Past a year a navigator under the chart moves and resizes the window; the wheel zooms it
  const showNav = all.length > 12
  const [win, setWin] = useState<[number, number] | null>(null)
  useEffect(() => setWin(null), [ctx.range.from, ctx.range.to])
  const span: [number, number] = showNav && win && win[1] < all.length ? win : showNav ? [all.length - 12, all.length - 1] : [0, Math.max(0, all.length - 1)]
  const rows = showNav ? all.slice(span[0], span[1] + 1) : all
  const zoomEl = useRef<HTMLDivElement>(null)
  useWheelZoom(zoomEl, view === 'chart' && showNav ? all.length : 0, span, setWin, { left: M.left + 60, right: M.right })
  const navValues = all.map((r) => {
    const v = ids.map((k) => r[k] as number | null).filter((x): x is number => x != null)
    return v.length ? (mode === 'rate' ? v.reduce((t, x) => t + x, 0) / v.length : v.reduce((t, x) => t + x, 0)) : null
  })
  const rawMax = Math.max(0, ...rows.flatMap((r) => ids.map((k) => Number(r[k] ?? 0))))
  const axis = niceTicks(rawMax, 7)
  const unit = PRODUCT_UNIT[mode](ctx.unit)
  const end = months[months.length - 1]
  const summary = sales && end ? productSummary(sales, end, ids, ctx.unit) : []
  const TABLE_HEAD = [
    { label: 'محصول', w: '24%' },
    { label: 'نوع', w: '11%' },
    { label: 'واحد', w: '7%' },
    { label: `آخرین نرخ (${PRODUCT_UNIT.rate(ctx.unit)})`, w: '15%', num: true },
    { label: 'تغییر نرخ', w: '10%', num: true },
    { label: 'مقدار فروش', w: '11%', num: true },
    { label: `مبلغ (${PRODUCT_UNIT.amount(ctx.unit)})`, w: '13%', num: true },
    { label: 'سهم', w: '9%', num: true },
  ]
  const dec = mode === 'qty' ? 0 : 1

  // Chip folding (as in «روند خرید مواد اولیه»): keep what fits in two rows, one slot left for «+N»
  const [expanded, setExpanded] = useState(false)
  const [limit, setLimit] = useState<number | null>(null)
  const box = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    if (limit !== null || expanded || !box.current) return
    const kids = [...box.current.children] as HTMLElement[]
    const tops = [...new Set(kids.filter((k) => k.tagName === 'BUTTON').map((k) => k.offsetTop))].sort((a, b) => a - b)
    if (tops.length <= MAX_ROWS) return setLimit(Infinity)
    const fit = kids.filter((k) => k.dataset.chip != null && k.offsetTop < tops[MAX_ROWS]).length
    setLimit(Math.max(1, fit - 1))
  }, [limit, expanded, has])
  useEffect(() => {
    const el = box.current
    if (!el) return
    let w = el.clientWidth
    const ro = new ResizeObserver(() => {
      if (el.clientWidth === w) return
      w = el.clientWidth
      setLimit(null)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [has])
  const visible = expanded || limit === null ? SALES_PRODUCTS : SALES_PRODUCTS.slice(0, limit)
  const hidden = SALES_PRODUCTS.length - visible.length

  return (
    <Card
      ctx={ctx}
      state={stateOf(ctx, has)}
      title="تغییرات نرخ فروش محصولات"
      subtitle="انتخاب سریع بر اساس مبلغ یا مقدار فروش؛ حداکثر ۸ محصول"
      guide={`«محصول اصلی» بر اساس مبلغ فروش در بازه است و «پرفروش» بر اساس مقدار. نرخ = مبلغ فروش بخش بر مقدار. ${showNav ? 'با چرخ موس روی نمودار بزرگ‌نمایی کنید یا پنجره‌ی زیر نمودار را بکشید؛ دوبار کلیک کل بازه را نشان می‌دهد. ' : ''}داده‌ها نمونه‌اند.`}
      actions={
        <div className="ind-bactions">
          {/* Quick picks: two small tags beside the measure switch */}
          <div className="ind-ptags" role="group" aria-label="انتخاب سریع">
            {PRESETS.map((p) => (
              <button key={p.id} type="button" className="ind-ptag" aria-pressed={pick === p.id} title={p.title} onClick={() => setPick(p.id)}>
                {p.label}
              </button>
            ))}
          </div>
          <Seg label="شاخص" value={mode} options={MODES} onChange={setMode} />
        </div>
      }
    >
      <div ref={box} className="ind-chips" role="group" aria-label="محصولات">
        {visible.map((p) => {
          const on = ids.includes(p.key)
          return (
            <button
              key={p.key}
              data-chip=""
              type="button"
              className={`ind-schip ${on ? 'is-on' : ''} ${hoverKey === p.key ? 'is-hot' : ''}`}
              style={
                on
                  ? {
                      borderColor: `color-mix(in srgb, ${p.color} 40%, transparent)`,
                    }
                  : undefined
              }
              aria-pressed={on}
              disabled={!on && ids.length >= MAX_PRODUCTS}
              onClick={() => toggle(p.key)}
              onMouseEnter={() => on && setHoverKey(p.key)}
              onMouseLeave={() => setHoverKey(null)}
              onFocus={() => on && setHoverKey(p.key)}
              onBlur={() => setHoverKey(null)}
            >
              <span className="ind-schip__dot" style={{ background: p.color }} aria-hidden="true" />
              {p.label}
            </button>
          )
        })}
        {hidden > 0 && (
          <button type="button" className="ind-schip ind-schip--more" aria-expanded={false} aria-label={`نمایش ${fa(hidden)} محصول دیگر`} onClick={() => setExpanded(true)}>
            <span className="n">+{fa(hidden)}</span>
          </button>
        )}
        {expanded && (
          <button type="button" className="ind-schip ind-schip--more" aria-expanded onClick={() => setExpanded(false)}>
            کمتر
          </button>
        )}
      </div>

      <div className="ind-viewbar">
        <span className="ind-viewbar__unit">{view === 'chart' ? unit : end ? `${monthName(end)}؛ تغییر نسبت به ماه قبل` : null}</span>
        <div className="ind-viewbar__tools">
          <div className="seg seg--compact ind-iconseg" role="group" aria-label="شیوه‌ی نمایش">
            {VIEWS.map((v) => (
              <button key={v.value} type="button" aria-pressed={view === v.value} aria-label={v.label} title={v.label} onClick={() => setView(v.value)}>
                <v.icon size={16} aria-hidden="true" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {ids.length === 0 ? (
        <p className="ind-empty">محصولی انتخاب نشده است.</p>
      ) : view === 'chart' ? (
        <>
          <div ref={zoomEl} onDoubleClick={() => showNav && setWin([0, all.length - 1])}>
            <ChartContainer config={Object.fromEntries(ids.map((k) => [k, { label: labelOf(k), color: colorOf(k) }]))} className="ind-chart" style={{ height: H }} role="img" aria-label={`تغییرات ${MODES.find((m) => m.value === mode)!.label} محصولات، ${unit}، ${rows[0]?.month} تا ${rows[rows.length - 1]?.month}`}>
              <LineChart data={rows} margin={M}>
                <CartesianGrid vertical={false} strokeDasharray="2 4" />
                <XAxis {...MONTH_AXIS} />
                <YAxis domain={[0, axis.max]} ticks={axis.ticks} padding={{ bottom: 12 }} tickFormatter={(v: number) => fa(v, 0)} tickLine={false} axisLine={{ stroke: 'var(--color-border)' }} width={60} />
                <ChartTooltip
                  cursor={{ stroke: 'var(--brand-shades-300)', strokeWidth: 1, strokeDasharray: '3 3' }}
                  content={({ active, label, payload }) => {
                    const items = (payload ?? [])
                      .filter((p) => p.value != null)
                      .map((p) => {
                        const k = String(p.dataKey)
                        return { key: k, name: labelOf(k), color: colorOf(k), value: `${fa(Number(p.value), dec)} ${unit}` }
                      })
                    return <Tip active={active} label={tipLabel(label)} items={items} />
                  }}
                />
                {ids.map((k) => {
                  const dim = hoverKey != null && hoverKey !== k
                  const hot = hoverKey === k
                  return (
                    <Line
                      key={k}
                      dataKey={k}
                      type="linear"
                      stroke={colorOf(k)}
                      strokeWidth={hot ? 2.8 : 1.8}
                      strokeOpacity={dim ? 0.18 : 1}
                      strokeLinejoin="round"
                      connectNulls={false}
                      isAnimationActive={false}
                      activeDot={{ r: hot ? 5 : 4, fill: colorOf(k), stroke: 'var(--color-card)' }}
                      dot={rows.length > 18 ? false : (p: { cx?: number; cy?: number; value?: number | null; index?: number }) => (p.value == null || p.cx == null || p.cy == null ? <g key={`${k}-${p.index}`} /> : <circle key={`${k}-${p.index}`} cx={p.cx} cy={p.cy} r={3} fill="var(--color-card)" stroke={colorOf(k)} strokeOpacity={dim ? 0.2 : 1} strokeWidth={1.5} />)}
                    />
                  )
                })}
              </LineChart>
            </ChartContainer>
          </div>
          {showNav && <RangeNavigator months={all.map((r) => r.month)} values={navValues} win={span} onChange={setWin} color="var(--raw-blue-600)" inset={{ left: M.left + 60, right: M.right }} />}
        </>
      ) : (
        // The chosen products in the end month: rate and its change, quantity, amount and share
        <div className="ind-table">
          <table>
            <thead>
              <tr>
                {TABLE_HEAD.map((h) => (
                  <th key={h.label} scope="col" style={{ width: h.w }} className={h.num ? 'ind-num' : undefined}>
                    {h.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {summary.map((r) => (
                <tr key={r.key}>
                  <td>
                    <span className="ind-item__name">
                      <span className="ind-schip__dot" style={{ background: colorOf(r.key), opacity: 1 }} aria-hidden="true" />
                      {r.product}
                    </span>
                  </td>
                  <td>
                    <span className="ind-muted">{r.type}</span>
                  </td>
                  <td>
                    <span className="ind-muted">{r.unit}</span>
                  </td>
                  <td className="ind-num">
                    <Num v={r.rate} d={r.rate ? 1 : 0} />
                  </td>
                  <td className="ind-num">
                    <TableChange v={r.rateChange} />
                  </td>
                  <td className="ind-num">
                    <Num v={r.qty} />
                  </td>
                  <td className="ind-num">
                    <Num v={r.amount} d={r.amount ? 1 : 0} />
                  </td>
                  <td className="ind-num">{r.share == null ? <span className="ind-muted">—</span> : <span className="n">{fa(r.share, 1)}٪</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}
