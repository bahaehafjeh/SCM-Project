import { useEffect, useRef, useState } from 'react'
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts'
import { ChartContainer, ChartTooltip } from '../../components/ui/chart'
import { balancedAxis, fa, niceTicks } from '../../lib/industry/format'
import {
  DEFAULT_FX_USE_IDS,
  FX_USE_ITEMS,
  fxUseTrendRows,
} from '../../lib/industry/fxflows'
import type { FxRecord, FxTrendMode, FxTrendRow, FxUseItemId } from '../../lib/industry/fxflows'
import { dataMonthsIn } from '../../lib/industry/derive'
import { AXIS } from '../../lib/industry/months'
import { MONTH_AXIS, Card, Seg, Tip, stateOf, tipLabel } from './parts'
import type { CardCtx } from './parts'
import { RangeNavigator } from './RangeNavigator'
import { useWheelZoom } from './useWheelZoom'

const H = 320
const M = { top: 14, right: 12, bottom: 4, left: 4 }
const Y_W = 64

/** «روند اقلام ارزی»: monthly trend for the 4 FX use items in amount (global unit), raw currency amount, or reported rate */
export function FxTrendCard({ ctx, records }: { ctx: CardCtx; records: FxRecord[] }) {
  const [mode, setMode] = useState<FxTrendMode>('amount')
  const [picked, setPicked] = useState<FxUseItemId[]>(DEFAULT_FX_USE_IDS)
  const [hoverKey, setHoverKey] = useState<FxUseItemId | null>(null)

  const months = ctx.ds ? dataMonthsIn(ctx.ds, ctx.range) : []
  const has = months.length > 0 && records.length > 0
  const all = ctx.ds ? fxUseTrendRows(records, ctx.ds, ctx.range, mode, ctx.unit) : []

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
  useWheelZoom(zoomEl, showNav ? all.length : 0, span, setWin, { left: M.left + Y_W, right: M.right })

  const activeItems = FX_USE_ITEMS.filter((item) => picked.includes(item.id))
  const activeIds = activeItems.map((item) => item.id)

  const navValues = all.map((r) => {
    const vals = activeIds.map((id) => r[id]).filter((v): v is number => v != null)
    if (!vals.length) return null
    return mode === 'rate' ? vals.reduce((a, b) => a + b, 0) / vals.length : vals.reduce((a, b) => a + b, 0)
  })

  // Raw multi-currency values in «مبلغ ارزی» span different currency scales, so balanced scale keeps all currencies readable
  const useBalanced = mode === 'fx'
  const rawMax = Math.max(0, ...rows.flatMap((r) => activeIds.map((id) => Number(r[id] ?? 0))))
  const linAxis = niceTicks(rawMax, 7)
  const balAxis = balancedAxis(Math.max(rawMax, 1), 7)
  const domainMax = useBalanced ? balAxis.plotMax : linAxis.max
  const ticks = useBalanced ? balAxis.plotTicks : linAxis.ticks
  const formatTick = (v: number) => {
    if (!useBalanced) return fa(v, 0)
    const idx = balAxis.plotTicks.findIndex((t) => Math.abs(t - v) < 1e-6)
    return fa(idx >= 0 ? balAxis.ticks[idx] : v * v, 0)
  }

  const rawByMonth = new Map(rows.map((r) => [r.month, r]))
  const plotRows: FxTrendRow[] = !useBalanced
    ? rows
    : rows.map((r) => {
        const mapped: FxTrendRow = { ...r }
        for (const id of activeIds) {
          const val = r[id]
          mapped[id] = typeof val === 'number' ? balAxis.toPlot(val) : null
        }
        return mapped
      })

  const toggle = (id: FxUseItemId) => {
    setHoverKey(null)
    setPicked((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const modes: { value: FxTrendMode; label: string }[] = [
    { value: 'amount', label: ctx.unit === 'usd' ? 'معادل دلاری' : 'مبلغ ریالی' },
    { value: 'fx', label: 'مبلغ ارزی' },
    { value: 'rate', label: 'نرخ ارز' },
  ]

  const unitLabel =
    mode === 'amount'
      ? ctx.unit === 'usd'
        ? 'هزار دلار (نرخ بازار)'
        : 'میلیارد ریال'
      : mode === 'fx'
        ? 'مبلغ خام هر ارز (مقیاس متوازن)'
        : 'ریال بر واحد ارز'

  const subtitle =
    mode === 'amount'
      ? ctx.unit === 'usd'
        ? 'معادل دلاری اقلام مصارف به نرخ بازار؛ هزار دلار'
        : 'مبلغ ریالی اقلام مصارف؛ میلیارد ریال'
      : mode === 'fx'
        ? 'مبلغ ارزی اقلام مصارف بر حسب ارز گزارش‌شده (USD، EUR، CNY، AED)'
        : 'نرخ گزارش‌شده هر ارز در اقلام مصارف؛ ریال بر واحد ارز'

  const guide = `روند ۴ قلم مصارف ارزی در سه نمای مبلغ، مبلغ ارزی و نرخ ارز. در حالت «مبلغ ارزی» مقدار خام هر ارز روی مقیاس متوازن رسم می‌شود تا ارزهایی با مقیاس متفاوت هم‌زمان خوانا بمانند و نام ارز در راهنمای نقطه نمایش داده شود.${ctx.unit === 'usd' || mode !== 'amount' ? ' برای ۱۴۰۴/۰۲ و ۱۴۰۴/۰۳ نرخ ارزی ثبت نشده است.' : ''}${showNav ? ' با چرخ موس روی نمودار یا نوار پایین می‌توانید بازه زمانی را جابه‌جا و بزرگ‌نمایی کنید.' : ''} داده‌ها نمونه‌اند.`

  const formatTipVal = (id: FxUseItemId, val: number) => {
    const def = FX_USE_ITEMS.find((x) => x.id === id)!
    if (mode === 'amount') {
      return `${fa(val, 1)} ${ctx.unit === 'usd' ? 'هزار دلار' : 'میلیارد ریال'}`
    }
    if (mode === 'fx') return `${fa(val, 0)} ${def.currency}`
    return `${fa(val, 0)} ریال`
  }

  return (
    <Card
      ctx={ctx}
      state={stateOf(ctx, has)}
      title="روند اقلام ارزی"
      subtitle={subtitle}
      guide={guide}
      actions={<Seg label="شاخص اقلام ارزی" value={mode} options={modes} onChange={setMode} />}
    >
      <div className="ind-chips" role="group" aria-label="اقلام مصارف ارزی">
        {FX_USE_ITEMS.map((item) => {
          const on = picked.includes(item.id)
          const hot = hoverKey === item.id
          return (
            <button
              key={item.id}
              type="button"
              className={`ind-schip ${on ? 'is-on' : ''} ${hot ? 'is-hot' : ''}`}
              style={on ? { borderColor: `color-mix(in srgb, ${item.color} 40%, transparent)` } : undefined}
              aria-pressed={on}
              onClick={() => toggle(item.id)}
              onMouseEnter={() => on && setHoverKey(item.id)}
              onMouseLeave={() => setHoverKey(null)}
              onFocus={() => on && setHoverKey(item.id)}
              onBlur={() => setHoverKey(null)}
            >
              <span className="ind-schip__dot" style={{ background: item.color }} aria-hidden="true" />
              {item.label}
            </button>
          )
        })}
      </div>

      <div className="ind-viewbar">
        <span className="ind-viewbar__unit">{unitLabel}</span>
      </div>

      {activeItems.length === 0 ? (
        <p className="ind-empty">قلم ارزی انتخاب نشده است.</p>
      ) : (
        <>
          <div ref={zoomEl} onDoubleClick={() => showNav && setWin([0, all.length - 1])}>
            <ChartContainer
              config={Object.fromEntries(activeItems.map((x) => [x.id, { label: x.label, color: x.color }]))}
              className="ind-chart"
              style={{ height: H }}
              role="img"
              aria-label={`روند اقلام ارزی، ${unitLabel}، ${AXIS[ctx.range.from]} تا ${AXIS[ctx.range.to]}`}
            >
              <LineChart data={plotRows} margin={M}>
                <CartesianGrid vertical={false} strokeDasharray="2 4" />
                <XAxis {...MONTH_AXIS} />
                <YAxis
                  domain={[0, domainMax]}
                  ticks={ticks}
                  padding={{ bottom: 12 }}
                  tickFormatter={formatTick}
                  tickLine={false}
                  axisLine={{ stroke: 'var(--color-border)' }}
                  width={Y_W}
                />
                <ChartTooltip
                  cursor={{ stroke: 'var(--brand-shades-300)', strokeWidth: 1, strokeDasharray: '3 3' }}
                  content={({ active, label, payload }) => {
                    const rawRow = typeof label === 'string' ? rawByMonth.get(label) : undefined
                    const items = (payload ?? [])
                      .filter((p) => p.value != null)
                      .map((p) => {
                        const id = String(p.dataKey) as FxUseItemId
                        const def = FX_USE_ITEMS.find((x) => x.id === id)!
                        const rawVal = rawRow?.[id]
                        const val = typeof rawVal === 'number' ? rawVal : Number(p.value)
                        return {
                          key: id,
                          name: def.shortLabel,
                          color: def.color,
                          value: formatTipVal(id, val),
                        }
                      })
                    return <Tip active={active} label={tipLabel(label)} items={items} />
                  }}
                />
                {activeItems.map((item) => {
                  const dim = hoverKey != null && hoverKey !== item.id
                  const hot = hoverKey === item.id
                  return (
                    <Line
                      key={item.id}
                      dataKey={item.id}
                      type="linear"
                      stroke={item.color}
                      strokeWidth={hot ? 2.8 : 1.9}
                      strokeOpacity={dim ? 0.18 : 1}
                      strokeLinejoin="round"
                      connectNulls={false}
                      isAnimationActive={false}
                      activeDot={{ r: hot ? 5 : 4, fill: item.color, stroke: 'var(--color-card)', strokeWidth: 1.5 }}
                      dot={(p: { cx?: number; cy?: number; value?: number | null; index?: number }) => {
                        if (p.value == null || p.cx == null || p.cy == null || p.index == null) return <g key={`${item.id}-${p.index}`} />
                        const prevNull = p.index === 0 || plotRows[p.index - 1]?.[item.id] == null
                        const nextNull = p.index === plotRows.length - 1 || plotRows[p.index + 1]?.[item.id] == null
                        const isolated = prevNull && nextNull
                        if (plotRows.length > 24 && !isolated) return <g key={`${item.id}-${p.index}`} />
                        return (
                          <circle
                            key={`${item.id}-${p.index}`}
                            cx={p.cx}
                            cy={p.cy}
                            r={3}
                            fill="var(--color-card)"
                            stroke={item.color}
                            strokeOpacity={dim ? 0.2 : 1}
                            strokeWidth={1.6}
                          />
                        )
                      }}
                    />
                  )
                })}
              </LineChart>
            </ChartContainer>
          </div>
          {showNav && (
            <RangeNavigator
              months={all.map((r) => r.month)}
              values={navValues}
              win={span}
              onChange={setWin}
              color="var(--raw-blue-600)"
              inset={{ left: M.left + Y_W, right: M.right }}
            />
          )}
        </>
      )}
    </Card>
  )
}
