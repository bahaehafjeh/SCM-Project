import { useEffect, useRef, useState } from 'react'
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { ChartContainer, ChartTooltip } from '../../components/ui/chart'
import { rateItems, rateRows } from '../../lib/industry/derive'
import type { RateRow } from '../../lib/industry/derive'
import { fa, niceTicks } from '../../lib/industry/format'
import { Select } from '../../components/ui/Select'
import { MONTH_AXIS, Card, Tip, stateOf, tipLabel } from './parts'
import type { CardCtx } from './parts'
import { RangeNavigator } from './RangeNavigator'
import { useWheelZoom } from './useWheelZoom'

const H = 250
const TOP = 14
const PANES = [
  { key: 'usd', title: 'دلار بر تن', color: 'var(--raw-emerald-600)', unit: 'دلار بر تن' },
  { key: 'rial', title: 'میلیون ریال بر تن', color: 'var(--raw-blue-600)', unit: 'میلیون ریال بر تن' },
] as const
const DEFAULT_ITEM = 'روغن خام|داخلی'
/** The company's own FX rate for its purchases (not in the file yet) */
const COMPANY_FX = 'var(--raw-amber-500)'

/** «نرخ خرید: ریالی و دلاری» (page-prompt §12): one item's dollar and rial rates side by side */
export function RateCard({ ctx }: { ctx: CardCtx }) {
  const items = ctx.ds ? rateItems(ctx.ds) : []
  const [picked, setPicked] = useState(DEFAULT_ITEM)
  const item = items.find((s) => s.key === picked) ?? items[0]
  const all = ctx.ds && item ? rateRows(ctx.ds, ctx.range, item.key) : []
  // Default to the latest 12 months when longer ranges are active so curves never crowd; RangeNavigator & wheel let users pan/zoom
  const showNav = all.length > 12
  const [win, setWin] = useState<[number, number] | null>(null)
  useEffect(() => setWin(null), [ctx.range.from, ctx.range.to])
  const view: [number, number] = showNav && win && win[1] < all.length ? win : showNav ? [all.length - 12, all.length - 1] : [0, Math.max(0, all.length - 1)]
  const zoomed = view[0] > 0 || view[1] < all.length - 1
  const rows = showNav ? all.slice(view[0], view[1] + 1) : all
  const navValues = all.map((r) => (ctx.unit === 'usd' ? (r.usd ?? r.rial) : r.rial))
  const rialEl = useRef<HTMLDivElement>(null)
  const usdEl = useRef<HTMLDivElement>(null)
  const inset = { left: 4 + 54, right: 10 }
  useWheelZoom(rialEl, showNav ? all.length : 0, view, setWin, inset)
  useWheelZoom(usdEl, showNav ? all.length : 0, view, setWin, inset)
  return (
    <Card
      ctx={ctx}
      state={stateOf(ctx, all.length > 0)}
      title="نرخ خرید: ریالی و دلاری"
      subtitle={`نرخ‌های ماهانه ${item?.label ?? ''}`}
      guide={`نرخ‌های ماهانه خرید؛${showNav ? ' با چرخ موس روی نمودار بزرگ‌نمایی کنید، یا نوار پایین را بکشید؛ دوبار کلیک کل بازه را نشان می‌دهد.' : ''} نرخ ارز شرکت فقط برای خریدهای وارداتی طبقه‌بندی‌شده. مبلغ دلاری و نرخ دلاری از 1404/04 موجود است.`}
      actions={
        item && (
          <div className="ind-bactions">
            {zoomed && (
              <button type="button" className="ind-filter__clear is-on" onClick={() => setWin([0, all.length - 1])}>
                نمایش همه
              </button>
            )}
            <Select label="کالا" value={item.key} options={items.map((s) => ({ value: s.key, label: s.label }))} onChange={setPicked} searchPlaceholder="جستجوی کالا" />
          </div>
        )
      }
    >
      <div className="ind-rate">
        {/* Visual order right → left: rial, then dollar */}
        {[PANES[1], PANES[0]].map((p) => {
          const vals = rows.map((r) => r[p.key]).filter((v): v is number => v != null)
          const axis = niceTicks(Math.max(0, ...vals), 6)
          return (
            <div key={p.key} ref={p.key === 'rial' ? rialEl : usdEl} onDoubleClick={() => showNav && setWin([0, all.length - 1])}>
              <p className="ind-rate__title">{p.title}</p>
              <ChartContainer
                config={{ [p.key]: { label: p.title, color: p.color } }}
                className="ind-chart"
                style={{ height: H }}
                role="img"
                aria-label={`نرخ ${item?.label}، ${p.unit}، ${rows[0]?.month} تا ${rows[rows.length - 1]?.month}${vals.length ? `؛ بیشترین ${fa(Math.max(...vals), 1)}` : '؛ داده‌ای ثبت نشده است'}`}
              >
                <AreaChart data={rows} margin={{ top: TOP, right: 10, bottom: 4, left: 4 }}>
                  <defs>
                    <linearGradient id={`ind-rate-fill-${p.key}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={p.color} stopOpacity={0.22} />
                      <stop offset="100%" stopColor={p.color} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} strokeDasharray="2 4" />
                  <XAxis {...MONTH_AXIS} />
                  <YAxis domain={[0, axis.max]} ticks={axis.ticks} tickFormatter={(v: number) => fa(v, 0)} tickLine={false} axisLine={{ stroke: 'var(--color-border)' }} width={54} />
                  <ChartTooltip
                    content={({ active, label: l, payload }) => {
                      const row = payload?.[0]?.payload as RateRow | undefined
                      return <Tip active={active} label={tipLabel(l)} items={row && row[p.key] != null ? [{ key: p.key, name: p.title, color: p.color, value: fa(row[p.key], 1) }] : []} />
                    }}
                  />
                  <Area
                    dataKey={p.key}
                    type="linear"
                    stroke={p.color}
                    strokeWidth={2.2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill={`url(#ind-rate-fill-${p.key})`}
                    fillOpacity={1}
                    connectNulls={false}
                    isAnimationActive={false}
                    activeDot={{ r: 4, fill: p.color, stroke: 'var(--color-card)' }}
                    dot={false}
                  />
                </AreaChart>
              </ChartContainer>
              {/* The dollar chart names its own basis; the rial chart needs none beyond its title */}
              {p.key === 'usd' && (
                <ul className="ind-legend">
                  <li>
                    <span className="ind-legend__line" style={{ background: p.color }} aria-hidden="true" />
                    به نرخ دلار بازار
                  </li>
                  <li title="برای نرخ ارز خرید مواد شرکت هنوز داده‌ای ثبت نشده است">
                    <span className="ind-legend__line" style={{ background: COMPANY_FX }} aria-hidden="true" />
                    به نرخ ارز خرید مواد شرکت
                    <span className="ind-muted">(بدون داده)</span>
                  </li>
                </ul>
              )}
            </div>
          )
        })}
      </div>
      {showNav && <RangeNavigator months={all.map((r) => r.month)} values={navValues} win={view} onChange={setWin} color="var(--raw-blue-600)" inset={{ left: 58, right: 10 }} />}
    </Card>
  )
}
