import { useEffect, useRef, useState } from 'react'
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { ChartContainer, ChartTooltip } from '../../components/ui/chart'
import { Select } from '../../components/ui/Select'
import { rateItems, rateRows } from '../../lib/industry/derive'
import type { RateRow } from '../../lib/industry/derive'
import { fa, fixedTicks } from '../../lib/industry/format'
import { MONTH_AXIS, Card, OverflowMark, Tip, stateOf, tipLabel } from './parts'
import type { CardCtx } from './parts'
import { useWheelZoom } from './useWheelZoom'

const H = 250
const TOP = 18
const PANES = [
  { key: 'usd', title: 'دلار بر تن', color: 'var(--raw-emerald-600)', axis: fixedTicks(2200, 550), unit: 'دلار بر تن' },
  { key: 'rial', title: 'میلیون ریال بر تن', color: 'var(--raw-blue-600)', axis: fixedTicks(3400, 850), unit: 'میلیون ریال بر تن' },
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
  // Wheel zoom: both charts share one window; a double-click or «نمایش همه» shows the whole range
  const [win, setWin] = useState<[number, number] | null>(null)
  useEffect(() => setWin(null), [ctx.range.from, ctx.range.to])
  const view: [number, number] = win && win[1] < all.length ? win : [0, Math.max(0, all.length - 1)]
  const zoomed = view[0] > 0 || view[1] < all.length - 1
  const rows = all.slice(view[0], view[1] + 1)
  const rialEl = useRef<HTMLDivElement>(null)
  const usdEl = useRef<HTMLDivElement>(null)
  const inset = { left: 4 + 50, right: 10 }
  useWheelZoom(rialEl, all.length > 12 ? all.length : 0, view, setWin, inset)
  useWheelZoom(usdEl, all.length > 12 ? all.length : 0, view, setWin, inset)
  return (
    <Card
      ctx={ctx}
      state={stateOf(ctx, all.length > 0)}
      title="نرخ خرید: ریالی و دلاری"
      subtitle={`نرخ‌های ماهانه ${item?.label ?? ''}`}
      guide="نرخ‌های ماهانه؛ با چرخ موس روی نمودار بزرگ‌نمایی کنید و با دوبار کلیک کل بازه را ببینید. نرخ ارز شرکت فقط برای خریدهای وارداتی طبقه‌بندی‌شده. مبلغ دلاری و نرخ دلاری از 1404/04 موجود است. نقطه‌ای که از محور بالاتر می‌رود با مثلث و مقدار نشان داده شده است."
      actions={
        item && (
          <div className="ind-bactions">
            {zoomed && (
              <button type="button" className="ind-filter__clear is-on" onClick={() => setWin(null)}>
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
          return (
            <div key={p.key} ref={p.key === 'rial' ? rialEl : usdEl} onDoubleClick={() => setWin(null)}>
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
                  <YAxis domain={[0, p.axis.max]} ticks={p.axis.ticks} allowDataOverflow tickFormatter={(v: number) => fa(v, 0)} tickLine={false} axisLine={{ stroke: 'var(--color-border)' }} width={50} />
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
                    dot={(d: { cx?: number; cy?: number; value?: number | [number, number] | null; index?: number }) => {
                      const v = Array.isArray(d.value) ? d.value[1] : d.value
                      if (v == null || d.cx == null || d.cy == null) return <g key={`${p.key}-${d.index}`} />
                      if (v > p.axis.max) return <OverflowMark key={`${p.key}-${d.index}`} cx={d.cx} top={TOP} color={p.color} text={fa(v, 1)} />
                      // No dots: the line shows the trend; only a value above the axis is marked
                      return <g key={`${p.key}-${d.index}`} />
                    }}
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
    </Card>
  )
}
