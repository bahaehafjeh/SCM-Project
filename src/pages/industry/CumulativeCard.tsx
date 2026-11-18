import { Area, CartesianGrid, ComposedChart, Line, ReferenceLine, XAxis, YAxis } from 'recharts'
import { ChartContainer, ChartTooltip } from '../../components/ui/chart'
import { CUMULATIVE, cumulativeRows } from '../../lib/industry/derive'
import { fa, fixedTicks } from '../../lib/industry/format'
import { FISCAL_START } from '../../lib/industry/months'
import { HeaderStat } from '../../components/overview/HeaderStat'
import { Card, Tip, stateOf, tipLabel, shortMonth } from './parts'
import type { CardCtx } from './parts'

const H = 300
const CUR = 'var(--raw-blue-600)'
const PREV = 'var(--raw-violet-500)'
const AXIS_Y = fixedTicks(800000, 200000)

type Pt = { x: number; month?: string; c1?: number; p1?: number; c2?: number; p2?: number }

/**
 * «تجمعی سال مالی و همان دوره سال قبل» (page-prompt §11): two stretches split at the new fiscal
 * year. Each stretch runs on to the split at its own last (or first) value, so no gap opens there.
 */
export function CumulativeCard({ ctx }: { ctx: CardCtx }) {
  const rows = ctx.ds ? cumulativeRows(ctx.ds, ctx.range) : []
  const n = rows.length
  const k = rows.findIndex((r) => r.month === FISCAL_START)
  const split = k > 0 ? k : -1
  const pts: Pt[] = []
  rows.forEach((r, i) => {
    const second = split >= 0 && i >= split
    if (second && i === split) pts.push({ x: split, c1: rows[i - 1].cur, p1: rows[i - 1].prev, c2: r.cur, p2: r.prev })
    pts.push(second ? { x: i + 0.5, month: r.month, c2: r.cur, p2: r.prev } : { x: i + 0.5, month: r.month, c1: r.cur, p1: r.prev })
  })
  // A label every month when there is room, else every second or fourth month (always the last)
  const step = n <= 14 ? 1 : n <= 28 ? 2 : 4
  const ticks = rows.map((_, i) => i + 0.5).filter((_, i) => (n - 1 - i) % step === 0)
  const last = pts[pts.length - 1]
  const endDot = (key: keyof Pt, color: string, r: number, w: number) => (p: { cx?: number; cy?: number; payload?: Pt; index?: number }) =>
    p.payload === last && p.cx != null && p.cy != null && p.payload?.[key] != null ? <circle key={`${key}-end`} cx={p.cx} cy={p.cy} r={r} fill="var(--color-card)" stroke={color} strokeWidth={w} /> : <g key={`${key}-${p.index}`} />
  const lastRow = rows[n - 1]

  return (
    <Card
      ctx={ctx}
      state={stateOf(ctx, n > 0)}
      title="تجمعی سال مالی و همان دوره سال قبل"
      subtitle="میلیارد ریال؛ تجمعی به دلار تبدیل نمی‌شود"
      guide={`رشد تجمعی ماه پایان: ${fa(CUMULATIVE.growth, 1)}٪. بخشی از مبالغ تجمعی از جمع ردیف‌های جزئیات محاسبه شده‌اند. این مقادیر نمونه‌اند تا داده‌ی سامانه برسد.`}
      actions={<HeaderStat label="رشد تجمعی" value={`${fa(CUMULATIVE.growth, 1)}٪`} />}
    >
      <ChartContainer
        config={{ c1: { label: 'سال جاری', color: CUR }, c2: { label: 'سال جاری', color: CUR }, p1: { label: 'همان دوره سال قبل', color: PREV }, p2: { label: 'همان دوره سال قبل', color: PREV } }}
        className="ind-chart"
        style={{ height: H }}
        role="img"
        aria-label={`تجمعی سال مالی، میلیارد ریال، ${rows[0]?.month} تا ${lastRow?.month}؛ در ماه پایان ${fa(lastRow?.cur ?? null)} در برابر ${fa(lastRow?.prev ?? null)} سال قبل`}
      >
        <ComposedChart data={pts} margin={{ top: 12, right: 8, bottom: 4, left: 4 }}>
          <CartesianGrid vertical={false} strokeDasharray="2 4" />
          <XAxis dataKey="x" type="number" domain={[0, n]} ticks={ticks} tickFormatter={(x: number) => shortMonth(rows[Math.floor(x)]?.month)} tickLine={false} axisLine={{ stroke: 'var(--color-border)' }} tickMargin={8} />
          <YAxis domain={[0, AXIS_Y.max]} ticks={AXIS_Y.ticks} tickFormatter={(v: number) => fa(v, 0)} tickLine={false} axisLine={{ stroke: 'var(--color-border)' }} width={62} />
          {split >= 0 && <ReferenceLine x={split} stroke="var(--raw-neutral-400)" strokeDasharray="3 4" label={{ value: `سال مالی جدید · ${FISCAL_START}`, position: split > n / 2 ? 'insideTopLeft' : 'insideTopRight', offset: 6, fontSize: 11, fill: 'var(--color-muted-foreground)' }} />}
          <ChartTooltip
            content={({ active, payload }) => {
              const pt = payload?.[0]?.payload as Pt | undefined
              if (!pt?.month) return null
              const cur = pt.c1 ?? pt.c2
              const prev = pt.p1 ?? pt.p2
              return (
                <Tip
                  active={active}
                  label={tipLabel(pt.month)}
                  items={[
                    { key: 'c', name: 'سال جاری', color: CUR, value: `${fa(cur ?? null)} میلیارد ریال` },
                    { key: 'p', name: 'همان دوره سال قبل', color: PREV, value: `${fa(prev ?? null)} میلیارد ریال` },
                  ]}
                />
              )
            }}
          />
          {(['c1', 'c2'] as const).map((key) => (
            <Area key={key} dataKey={key} type="linear" stroke={CUR} strokeWidth={2.6} fill={CUR} fillOpacity={0.1} connectNulls={false} isAnimationActive={false} dot={endDot(key, CUR, 4.5, 2.4)} activeDot={{ r: 4, fill: CUR, stroke: 'var(--color-card)' }} />
          ))}
          {(['p1', 'p2'] as const).map((key) => (
            <Line key={key} dataKey={key} type="linear" stroke={PREV} strokeWidth={2} strokeDasharray="5 4" connectNulls={false} isAnimationActive={false} dot={endDot(key, PREV, 4, 2)} activeDot={{ r: 4, fill: PREV, stroke: 'var(--color-card)' }} />
          ))}
        </ComposedChart>
      </ChartContainer>
      <ul className="ind-legend">
        <li>
          <span className="ind-legend__line" style={{ background: CUR }} aria-hidden="true" />
          سال جاری
        </li>
        <li>
          <span className="ind-legend__line ind-legend__line--dash" style={{ color: PREV }} aria-hidden="true" />
          همان دوره سال قبل
        </li>
      </ul>
    </Card>
  )
}
