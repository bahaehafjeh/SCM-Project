<<<<<<< HEAD
=======
import { useEffect, useRef, useState } from 'react'
>>>>>>> scm-v1/main
import { Area, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from 'recharts'
import { ChartContainer, ChartTooltip } from '../../components/ui/chart'
import { HeaderStat } from '../../components/overview/HeaderStat'
import { fxGap, fxRows } from '../../lib/industry/fx'
import type { FxRow } from '../../lib/industry/fx'
import { fa, niceTicks, signed } from '../../lib/industry/format'
import { MONTH_AXIS, Card, Tip, stateOf, tipLabel } from './parts'
import type { CardCtx } from './parts'
<<<<<<< HEAD

const H = 300
=======
import { RangeNavigator } from './RangeNavigator'
import { useWheelZoom } from './useWheelZoom'

const H = 300
const M = { top: 12, right: 12, bottom: 4, left: 4 }
>>>>>>> scm-v1/main
const COMPANY = 'var(--raw-blue-600)'
const MARKET = 'var(--raw-violet-500)'
const UNIT = 'ریال بر دلار'

/**
 * «نرخ دلار شرکت در برابر دلار بازار»: the rate the company paid for the dollars of its raw-material
 * purchases (solid, filled) against the market dollar (dashed), in the look of «تجمعی سال مالی».
 */
export function FxRateCard({ ctx, fx }: { ctx: CardCtx; fx: Map<string, FxRow> | null }) {
<<<<<<< HEAD
  const rows = fx && ctx.ds ? fxRows(fx, ctx.ds, ctx.range) : []
  const has = rows.some((r) => r.market != null || r.company != null)
  const gap = fxGap(rows)
  const axis = niceTicks(Math.max(0, ...rows.flatMap((r) => [r.market ?? 0, r.company ?? 0])))
=======
  const all = fx && ctx.ds ? fxRows(fx, ctx.ds, ctx.range) : []
  const has = all.some((r) => r.market != null || r.company != null)

  const showNav = all.length > 12
  const [win, setWin] = useState<[number, number] | null>(null)
  useEffect(() => setWin(null), [ctx.range.from, ctx.range.to])
  const span: [number, number] = showNav && win && win[1] < all.length ? win : showNav ? [all.length - 12, all.length - 1] : [0, Math.max(0, all.length - 1)]
  const rows = showNav ? all.slice(span[0], span[1] + 1) : all
  const zoomEl = useRef<HTMLDivElement>(null)
  useWheelZoom(zoomEl, showNav ? all.length : 0, span, setWin, { left: M.left + 78, right: M.right })

  const navValues = all.map((r) => r.company ?? r.market ?? null)
  const gap = fxGap(all)
  const axis = niceTicks(Math.max(0, ...rows.flatMap((r) => [r.market ?? 0, r.company ?? 0])), 6)

>>>>>>> scm-v1/main
  // The last point of each line gets a hollow ring, as on the cumulative chart
  const lastOf = (key: 'market' | 'company') => {
    for (let i = rows.length - 1; i >= 0; i--) if (rows[i][key] != null) return i
    return -1
  }
  const endDot = (key: 'market' | 'company', color: string, r: number, w: number) => (p: { cx?: number; cy?: number; index?: number }) =>
    p.index === lastOf(key) && p.cx != null && p.cy != null ? <circle key={`${key}-end`} cx={p.cx} cy={p.cy} r={r} fill="var(--color-card)" stroke={color} strokeWidth={w} /> : <g key={`${key}-${p.index}`} />

  return (
    <Card
      ctx={ctx}
      state={stateOf(ctx, has)}
      title="نرخ دلار شرکت در برابر دلار بازار"
      subtitle={`نرخ دلار خرید مواد اولیه‌ی شرکت؛ ${UNIT}`}
<<<<<<< HEAD
      guide="نرخ شرکت: ریالی که شرکت برای هر دلار خرید مواد اولیه پرداخته است. دلار بازار از ردیف‌های خرید همان ماه به دست آمده و برای 1404/02 و 1404/03 داده‌ای ندارد. نرخ شرکت هنوز در فایل نیست و این مقادیر نمونه‌اند."
      actions={gap && <HeaderStat label="فاصله با بازار" value={<span dir="ltr">{signed(gap.pct, 1)}٪</span>} />}
    >
      <ChartContainer
        config={{ company: { label: 'نرخ شرکت', color: COMPANY }, market: { label: 'دلار بازار', color: MARKET } }}
        className="ind-chart"
        style={{ height: H }}
        role="img"
        aria-label={`نرخ دلار شرکت و دلار بازار، ${UNIT}، ${rows[0]?.month} تا ${rows[rows.length - 1]?.month}${gap ? `؛ در ${gap.month} نرخ شرکت ${fa(Math.abs(gap.pct), 1)} درصد ${gap.pct < 0 ? 'کمتر' : 'بیشتر'} از بازار` : ''}`}
      >
        <ComposedChart data={rows} margin={{ top: 12, right: 12, bottom: 4, left: 4 }}>
          <CartesianGrid vertical={false} strokeDasharray="2 4" />
          <XAxis {...MONTH_AXIS} />
          <YAxis domain={[0, axis.max]} ticks={axis.ticks} tickFormatter={(v: number) => fa(v, 0)} tickLine={false} axisLine={{ stroke: 'var(--color-border)' }} width={78} />
          <ChartTooltip
            content={({ active, label, payload }) => {
              const row = payload?.[0]?.payload as FxRow | undefined
              if (!row) return null
              const items = [...(row.company != null ? [{ key: 'c', name: 'نرخ شرکت', color: COMPANY, value: `${fa(row.company)} ${UNIT}` }] : []), ...(row.market != null ? [{ key: 'm', name: 'دلار بازار', color: MARKET, value: `${fa(row.market)} ${UNIT}` }] : [])]
              const pct = row.company != null && row.market ? (row.company / row.market - 1) * 100 : null
              return (
                <Tip
                  active={active}
                  label={tipLabel(label)}
                  items={items}
                  foot={
                    pct == null ? undefined : (
                      <>
                        فاصله با بازار: <span className="n">{signed(pct, 1)}٪</span>
                      </>
                    )
                  }
                />
              )
            }}
          />
          <Area dataKey="company" type="linear" stroke={COMPANY} strokeWidth={2.6} fill={COMPANY} fillOpacity={0.1} connectNulls={false} isAnimationActive={false} dot={endDot('company', COMPANY, 4.5, 2.4)} activeDot={{ r: 4, fill: COMPANY, stroke: 'var(--color-card)' }} />
          <Line dataKey="market" type="linear" stroke={MARKET} strokeWidth={2} strokeDasharray="5 4" connectNulls={false} isAnimationActive={false} dot={endDot('market', MARKET, 4, 2)} activeDot={{ r: 4, fill: MARKET, stroke: 'var(--color-card)' }} />
        </ComposedChart>
      </ChartContainer>
=======
      guide={`نرخ شرکت: ریالی که شرکت برای هر دلار خرید مواد اولیه پرداخته است. دلار بازار از ردیف‌های خرید همان ماه به دست آمده و برای 1404/02 و 1404/03 داده‌ای ندارد. نرخ شرکت هنوز در فایل نیست و این مقادیر نمونه‌اند.${showNav ? ' با چرخ موس یا نوار پایین می‌توانید در بازه جابه‌جا شوید.' : ''}`}
      actions={gap && <HeaderStat label="فاصله با بازار" value={<span dir="ltr">{signed(gap.pct, 1)}٪</span>} />}
    >
      <div ref={zoomEl} onDoubleClick={() => showNav && setWin([0, all.length - 1])}>
        <ChartContainer
          config={{ company: { label: 'نرخ شرکت', color: COMPANY }, market: { label: 'دلار بازار', color: MARKET } }}
          className="ind-chart"
          style={{ height: H }}
          role="img"
          aria-label={`نرخ دلار شرکت و دلار بازار، ${UNIT}، ${rows[0]?.month} تا ${rows[rows.length - 1]?.month}${gap ? `؛ در ${gap.month} نرخ شرکت ${fa(Math.abs(gap.pct), 1)} درصد ${gap.pct < 0 ? 'کمتر' : 'بیشتر'} از بازار` : ''}`}
        >
          <ComposedChart data={rows} margin={M}>
            <CartesianGrid vertical={false} strokeDasharray="2 4" />
            <XAxis {...MONTH_AXIS} />
            <YAxis domain={[0, axis.max]} ticks={axis.ticks} tickFormatter={(v: number) => fa(v, 0)} tickLine={false} axisLine={{ stroke: 'var(--color-border)' }} width={78} />
            <ChartTooltip
              content={({ active, label, payload }) => {
                const row = payload?.[0]?.payload as FxRow | undefined
                if (!row) return null
                const items = [...(row.company != null ? [{ key: 'c', name: 'نرخ شرکت', color: COMPANY, value: `${fa(row.company)} ${UNIT}` }] : []), ...(row.market != null ? [{ key: 'm', name: 'دلار بازار', color: MARKET, value: `${fa(row.market)} ${UNIT}` }] : [])]
                const pct = row.company != null && row.market ? (row.company / row.market - 1) * 100 : null
                return (
                  <Tip
                    active={active}
                    label={tipLabel(label)}
                    items={items}
                    summary={
                      pct == null
                        ? undefined
                        : {
                            label: 'فاصله با بازار',
                            value: <span className="n">{signed(pct, 1)}٪</span>,
                          }
                    }
                  />
                )
              }}
            />
            <Area dataKey="company" type="linear" stroke={COMPANY} strokeWidth={2.6} fill={COMPANY} fillOpacity={0.1} connectNulls={false} isAnimationActive={false} dot={endDot('company', COMPANY, 4.5, 2.4)} activeDot={{ r: 4, fill: COMPANY, stroke: 'var(--color-card)' }} />
            <Line dataKey="market" type="linear" stroke={MARKET} strokeWidth={2} strokeDasharray="5 4" connectNulls={false} isAnimationActive={false} dot={endDot('market', MARKET, 4, 2)} activeDot={{ r: 4, fill: MARKET, stroke: 'var(--color-card)' }} />
          </ComposedChart>
        </ChartContainer>
      </div>
      {showNav && <RangeNavigator months={all.map((r) => r.month)} values={navValues} win={span} onChange={setWin} color="var(--raw-blue-600)" inset={{ left: M.left + 78, right: M.right }} />}
>>>>>>> scm-v1/main
      <ul className="ind-legend">
        <li>
          <span className="ind-legend__line" style={{ background: COMPANY }} aria-hidden="true" />
          نرخ شرکت · خرید مواد اولیه
        </li>
        <li>
          <span className="ind-legend__line ind-legend__line--dash" style={{ color: MARKET }} aria-hidden="true" />
          دلار بازار
        </li>
      </ul>
    </Card>
  )
}
