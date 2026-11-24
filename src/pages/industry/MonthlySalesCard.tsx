import { useEffect, useId, useRef, useState } from 'react'
import { Area, CartesianGrid, ComposedChart, Line, ReferenceLine, XAxis, YAxis } from 'recharts'
import { ChartContainer, ChartTooltip } from '../../components/ui/chart'
import { fa, niceTicks } from '../../lib/industry/format'
import { SALES_UNIT_LABEL, monthlySalesRows } from '../../lib/industry/sales'
import type { MonthlySalesMode, MonthlySalesRow, SalesSet } from '../../lib/industry/sales'
import { MONTH_AXIS, Card, Seg, Tip, stateOf, tipLabel } from './parts'
import type { CardCtx } from './parts'
import { RangeNavigator } from './RangeNavigator'
import { useWheelZoom } from './useWheelZoom'

type SeriesKey = 'domestic' | 'export' | 'services' | 'returns' | 'discounts' | 'unclassified'

const POS_KEYS: SeriesKey[] = ['domestic', 'export', 'services', 'unclassified']
const NEG_KEYS: SeriesKey[] = ['returns', 'discounts']

const SERIES: { key: SeriesKey; label: string; color: string; neg?: boolean }[] = [
  { key: 'domestic', label: 'فروش داخلی', color: 'var(--raw-blue-600)' },
  { key: 'export', label: 'فروش صادراتی', color: 'var(--raw-orange-500)' },
  { key: 'services', label: 'خدمات', color: 'var(--raw-emerald-600)' },
  { key: 'returns', label: 'برگشت از فروش', color: 'var(--raw-red-600)', neg: true },
  { key: 'discounts', label: 'تخفیفات', color: 'var(--raw-rose-500)', neg: true },
  { key: 'unclassified', label: 'فروش بدون تفکیک بازار', color: 'var(--raw-cyan-600)' },
]

const MODES: { value: MonthlySalesMode; label: string }[] = [
  { value: 'monthly', label: 'ماهانه' },
  { value: 'cumulative', label: 'تجمعی' },
]

const H_SINGLE = 310
const H_POS = 222
const H_NEG = 122
const M_TOP = { top: 14, right: 12, bottom: 0, left: 4 }
const M_FULL = { top: 14, right: 12, bottom: 4, left: 4 }
const M_BOT = { top: 0, right: 12, bottom: 4, left: 4 }
const Y_W = 64

/** «فروش ماهانه»: dual-zone chart separating positive sales streams from negative deductions */
export function MonthlySalesCard({ ctx, sales }: { ctx: CardCtx; sales: SalesSet | null }) {
  const [mode, setMode] = useState<MonthlySalesMode>('monthly')
  const [hidden, setHidden] = useState<Set<SeriesKey>>(() => new Set())
  const [hovered, setHovered] = useState<SeriesKey | null>(null)
  const [hoverZone, setHoverZone] = useState<'pos' | 'neg' | null>(null)
  const gradId = useId().replace(/:/g, '')

  const all = ctx.ds && sales ? monthlySalesRows(sales, ctx.ds, ctx.range, ctx.unit, mode) : []
  const has = all.length > 0

  const showNav = all.length > 12
  const [win, setWin] = useState<[number, number] | null>(null)
  useEffect(() => setWin(null), [ctx.range.from, ctx.range.to])
  const span: [number, number] =
    showNav && win && win[1] < all.length
      ? win
      : showNav
        ? [all.length - 12, all.length - 1]
        : [0, Math.max(0, all.length - 1)]
  const rows = showNav ? all.slice(span[0], span[1] + 1) : all
  const zoomEl = useRef<HTMLDivElement>(null)
  useWheelZoom(zoomEl, showNav ? all.length : 0, span, setWin, { left: M_FULL.left + Y_W, right: M_FULL.right })

  const activePos = POS_KEYS.filter((k) => !hidden.has(k))
  const activeNeg = NEG_KEYS.filter((k) => !hidden.has(k))
  const hasPos = activePos.length > 0
  const hasNeg = activeNeg.length > 0 && rows.some((r) => activeNeg.some((k) => r[k] != null && Number(r[k]) < 0))

  const posMax = Math.max(
    1,
    ...rows.flatMap((r) => activePos.map((k) => Math.max(0, Number(r[k] ?? 0)))),
  )
  const posLin = niceTicks(posMax, 7)

  const negMax = Math.max(
    1,
    ...rows.flatMap((r) => activeNeg.map((k) => Math.abs(Math.min(0, Number(r[k] ?? 0))))),
  )
  const negLin = niceTicks(negMax, 4)
  const negTicks = [...negLin.ticks.map((t) => (t === 0 ? 0 : -t))].reverse()

  const unit = SALES_UNIT_LABEL[ctx.unit]
  const navValues = all.map((r) => r.domestic)

  const toggleSeries = (key: SeriesKey) => {
    setHidden((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else if (SERIES.length - next.size > 1) {
        next.add(key)
      }
      return next
    })
  }

  const opacityOf = (key: SeriesKey) => (hovered == null || hovered === key ? 1 : 0.2)
  const strokeOf = (key: SeriesKey) => (hovered === key ? 2.6 : 1.9)

  const renderTip = (zone: 'pos' | 'neg') =>
    ({ active, label, payload }: { active?: boolean; label?: unknown; payload?: readonly { payload?: MonthlySalesRow }[] }) => {
      const row = payload?.[0]?.payload
      if (!row) return null
      const items = SERIES.filter((s) => !hidden.has(s.key) && row[s.key] != null).map((s) => ({
        key: s.key,
        name: s.label,
        color: s.color,
        value: `${fa(row[s.key], 1)} ${unit}`,
      }))
      return (
        <Tip
          active={active && hoverZone === zone}
          label={tipLabel(label)}
          items={items}
          summary={row.net != null ? { label: 'فروش خالص', value: `${fa(row.net, 1)} ${unit}` } : undefined}
        />
      )
    }

  const chartConfig = Object.fromEntries(SERIES.map((s) => [s.key, { label: s.label, color: s.color }]))

  return (
    <Card
      ctx={ctx}
      state={stateOf(ctx, has)}
      title="فروش ماهانه"
      subtitle={mode === 'monthly' ? 'به تفکیک نوع فروش؛ برگشت از فروش و تخفیفات در بخش پایین محور' : 'روند تجمعی سال مالی به تفکیک نوع فروش؛ برگشت و تخفیفات در بخش پایین محور'}
      guide={`برگشت از فروش و تخفیفات در بخش منفی مجزا زیر محور صفر با مقیاس اختصاصی رسم شده‌اند تا جزئیات آن‌ها در کنار مقادیر فروش واضح دیده شود.${showNav ? ' برای بزرگ‌نمایی از چرخ موس یا نوار زیر نمودار استفاده کنید.' : ''} داده‌ها نمونه‌اند.`}
      actions={<Seg label="حالت نمایش فروش ماهانه" value={mode} options={MODES} onChange={setMode} />}
    >
      <div ref={zoomEl} className="ind-ms-split" onDoubleClick={() => showNav && setWin([0, all.length - 1])} onMouseLeave={() => setHoverZone(null)}>
        {hasPos && (
          <div onMouseEnter={() => setHoverZone('pos')}>
            <ChartContainer
              config={chartConfig}
              className="ind-chart"
              style={{ height: hasNeg ? H_POS : H_SINGLE }}
              role="img"
              aria-label={`فروش ماهانه، بخش مثبت به تفکیک نوع فروش، ${unit}`}
            >
              <ComposedChart data={rows} syncId="monthly-sales" margin={hasNeg ? M_TOP : M_FULL}>
                <CartesianGrid vertical={false} strokeDasharray="2 4" />
                {hasNeg ? <XAxis dataKey="month" hide /> : <XAxis {...MONTH_AXIS} />}
                <YAxis
                  domain={[0, posLin.max]}
                  ticks={posLin.ticks}
                  tickFormatter={(v: number) => fa(v, 0)}
                  tickLine={false}
                  axisLine={{ stroke: 'var(--color-border)' }}
                  width={Y_W}
                />
                <ReferenceLine y={0} stroke="var(--color-unofficial-border-3, var(--color-border))" strokeWidth={1.2} />
                <ChartTooltip
                  cursor={{ stroke: 'var(--brand-shades-300)', strokeWidth: 1, strokeDasharray: '3 3' }}
                  content={renderTip('pos')}
                />
                {activePos.map((k) => {
                  const color = SERIES.find((s) => s.key === k)!.color
                  return (
                    <Line
                      key={k}
                      dataKey={k}
                      type="monotone"
                      stroke={color}
                      strokeWidth={strokeOf(k)}
                      strokeOpacity={opacityOf(k)}
                      dot={false}
                      connectNulls={false}
                      isAnimationActive={false}
                      activeDot={{ r: 4, fill: color, stroke: 'var(--color-card)', strokeWidth: 1.5 }}
                    />
                  )
                })}
              </ComposedChart>
            </ChartContainer>
          </div>
        )}

        {hasNeg && (
          <div className="ind-ms-neg" onMouseEnter={() => setHoverZone('neg')}>
            <ChartContainer
              config={chartConfig}
              className="ind-chart"
              style={{ height: hasPos ? H_NEG : H_SINGLE }}
              role="img"
              aria-label={`برگشت از فروش و تخفیفات ماهانه، ${unit}`}
            >
              <ComposedChart data={rows} syncId="monthly-sales" margin={hasPos ? M_BOT : M_FULL}>
                <defs>
                  <linearGradient id={`${gradId}-ret`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--raw-red-500)" stopOpacity={0.05} />
                    <stop offset="100%" stopColor="var(--raw-red-500)" stopOpacity={0.24} />
                  </linearGradient>
                  <linearGradient id={`${gradId}-dis`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--raw-rose-500)" stopOpacity={0.04} />
                    <stop offset="100%" stopColor="var(--raw-rose-500)" stopOpacity={0.16} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="2 4" />
                <XAxis {...MONTH_AXIS} />
                <YAxis
                  domain={[-negLin.max, 0]}
                  ticks={negTicks}
                  tickFormatter={(v: number) => (hasPos && v === 0 ? '' : fa(v, 0))}
                  tickLine={false}
                  axisLine={{ stroke: 'var(--color-border)' }}
                  width={Y_W}
                />
                <ReferenceLine y={0} stroke="var(--color-unofficial-border-3, var(--color-border))" strokeWidth={1.2} />
                <ChartTooltip
                  cursor={{ stroke: 'var(--brand-shades-300)', strokeWidth: 1, strokeDasharray: '3 3' }}
                  content={renderTip('neg')}
                />
                {!hidden.has('returns') && (
                  <Area
                    dataKey="returns"
                    type="monotone"
                    baseValue={0}
                    stroke="var(--raw-red-600)"
                    strokeWidth={strokeOf('returns')}
                    strokeOpacity={opacityOf('returns')}
                    fill={`url(#${gradId}-ret)`}
                    fillOpacity={opacityOf('returns')}
                    connectNulls={false}
                    isAnimationActive={false}
                    activeDot={{ r: 4, fill: 'var(--raw-red-600)', stroke: 'var(--color-card)', strokeWidth: 1.5 }}
                  />
                )}
                {!hidden.has('discounts') && (
                  <Area
                    dataKey="discounts"
                    type="monotone"
                    baseValue={0}
                    stroke="var(--raw-rose-500)"
                    strokeWidth={strokeOf('discounts')}
                    strokeOpacity={opacityOf('discounts')}
                    fill={`url(#${gradId}-dis)`}
                    fillOpacity={opacityOf('discounts')}
                    connectNulls={false}
                    isAnimationActive={false}
                    activeDot={{ r: 3.5, fill: 'var(--raw-rose-500)', stroke: 'var(--color-card)', strokeWidth: 1.5 }}
                  />
                )}
              </ComposedChart>
            </ChartContainer>
          </div>
        )}
      </div>

      {showNav && <RangeNavigator months={all.map((r) => r.month)} values={navValues} win={span} onChange={setWin} color="var(--raw-blue-600)" inset={{ left: M_FULL.left + Y_W, right: M_FULL.right }} />}

      <div className="ind-legend ind-legend--interactive" role="group" aria-label="راهنمای سری‌های فروش ماهانه">
        {SERIES.map((s) => {
          const isOff = hidden.has(s.key)
          return (
            <button
              key={s.key}
              type="button"
              className={`ind-legend-btn ${isOff ? 'is-off' : ''} ${hovered === s.key ? 'is-hot' : ''}`}
              aria-pressed={!isOff}
              onClick={() => toggleSeries(s.key)}
              onMouseEnter={() => !isOff && setHovered(s.key)}
              onMouseLeave={() => setHovered(null)}
              onFocus={() => !isOff && setHovered(s.key)}
              onBlur={() => setHovered(null)}
            >
              <span className="ind-legend__dot" style={{ background: s.color }} aria-hidden="true" />
              {s.label}
            </button>
          )
        })}
      </div>
    </Card>
  )
}
