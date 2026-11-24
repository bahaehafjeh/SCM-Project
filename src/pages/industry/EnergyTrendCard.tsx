import { useEffect, useState, useRef } from 'react'
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts'
import { ChartLine, Table2 } from 'lucide-react'
import { ChartContainer, ChartTooltip } from '../../components/ui/chart'
import {
  DEFAULT_ENERGY_KEYS,
  ENERGY_CARRIERS,
  ENERGY_UNIT_LABEL,
  carrierOf,
  energyMonthsIn,
  energyTrendSeries,
  energyTrendSummary,
} from '../../lib/industry/energy'
import type { EnergyKey, EnergySet, EnergyTrendMode } from '../../lib/industry/energy'
import { fa, niceTicks } from '../../lib/industry/format'
import { AXIS, monthName } from '../../lib/industry/months'
import { MONTH_AXIS, Card, Seg, Tip, stateOf, tipLabel } from './parts'
import type { CardCtx } from './parts'
import { Num, TableChange } from './TablePager'
import { RangeNavigator } from './RangeNavigator'
import { useWheelZoom } from './useWheelZoom'

const H = 340
const M = { top: 14, right: 12, bottom: 4, left: 4 }
const MODES: { value: EnergyTrendMode; label: string }[] = [
  { value: 'cost', label: 'هزینه' },
  { value: 'qty', label: 'مصرف مقدار' },
  { value: 'rate', label: 'نرخ' },
]
const VIEWS = [
  { value: 'chart', label: 'نمودار', icon: ChartLine },
  { value: 'table', label: 'جدول', icon: Table2 },
] as const
type View = (typeof VIEWS)[number]['value']

const fmtRate = (v: number) => (v < 1 ? fa(v, 2) : v < 100 ? fa(v, 1) : fa(v, 0))

/** «روند مصرف انرژی»: cost, physical quantity or rate over time, with Chart/Table toggle and interactive chips */
export function EnergyTrendCard({ ctx, energy }: { ctx: CardCtx; energy: EnergySet | null }) {
  const [mode, setMode] = useState<EnergyTrendMode>('cost')
  const [view, setView] = useState<View>('chart')
  const [picked, setPicked] = useState<EnergyKey[]>(DEFAULT_ENERGY_KEYS)
  const [hoverKey, setHoverKey] = useState<EnergyKey | null>(null)

  const months = energy && ctx.ds ? energyMonthsIn(energy, ctx.ds, ctx.range) : []
  const has = months.length > 0
  const activeKeys = ENERGY_CARRIERS.map((c) => c.key).filter((k) => picked.includes(k))

  // Window navigation for ranges longer than 12 months
  const showNav = months.length > 12
  const [win, setWin] = useState<[number, number] | null>(null)
  useEffect(() => setWin(null), [ctx.range.from, ctx.range.to])
  const span: [number, number] = showNav && win && win[1] < months.length ? win : showNav ? [months.length - 12, months.length - 1] : [0, Math.max(0, months.length - 1)]
  const visibleMonths = showNav ? months.slice(span[0], span[1] + 1) : months

  const fullSeries = energy ? energyTrendSeries(energy, months, mode, ctx.unit, activeKeys) : null
  const winSeries = energy ? energyTrendSeries(energy, visibleMonths, mode, ctx.unit, activeKeys) : null
  const chartRows = winSeries?.chartRows ?? []
  const rawRows = winSeries?.rawRows ?? []
  const rawByMonth = new Map(rawRows.map((r) => [r.month, r]))

  const zoomEl = useRef<HTMLDivElement>(null)
  useWheelZoom(zoomEl, view === 'chart' && showNav ? months.length : 0, span, setWin, { left: M.left + 60, right: M.right })

  const navValues = (fullSeries?.chartRows ?? []).map((r) => {
    const vals = activeKeys.map((k) => r[k] as number | null).filter((x): x is number => x != null)
    if (!vals.length) return null
    return fullSeries?.normalized || mode === 'rate' ? vals.reduce((a, b) => a + b, 0) / vals.length : vals.reduce((a, b) => a + b, 0)
  })

  const maxVal = Math.max(0, ...chartRows.flatMap((r) => activeKeys.map((k) => Number(r[k] ?? 0))))
  const axis = niceTicks(maxVal, 7)
  const end = months[months.length - 1]
  const summary = energy && end ? energyTrendSummary(energy, end, activeKeys, ctx.unit) : []

  const toggle = (k: EnergyKey) => {
    setHoverKey(null)
    setPicked((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]))
  }

  const rateUnitHeader = ctx.unit === 'usd' ? 'نرخ (دلار / واحد)' : 'نرخ (هزار ریال / واحد)'
  const formatTipValue = (k: EnergyKey, rowMonth: string, plotted: number) => {
    const def = carrierOf(k)
    const raw = rawByMonth.get(rowMonth)?.[k]
    const v = typeof raw === 'number' ? raw : plotted
    if (mode === 'cost') return `${fa(v, 1)} ${ENERGY_UNIT_LABEL[ctx.unit]}`
    if (mode === 'qty') return `${fa(v, 0)} ${def.unit}`
    return ctx.unit === 'usd' ? `${fmtRate(v)} دلار / ${def.unit}` : `${fmtRate(v)} هزار ریال / ${def.unit}`
  }

  return (
    <Card
      ctx={ctx}
      state={stateOf(ctx, has)}
      title="روند مصرف انرژی"
      subtitle="هزینه چند نوع قابل مقایسه است؛ مقدار و نرخ هر نوع با واحد جدا نمایش داده می‌شوند."
      guide={`در حالت «هزینه»، تمام حامل‌های انرژی در واحد یکسان (${ENERGY_UNIT_LABEL[ctx.unit]}) مقایسه می‌شوند. در حالت «مصرف مقدار» و «نرخ»، اگر حامل‌هایی با واحدهای متفاوت هم‌زمان انتخاب شوند، نمودار به‌صورت شاخص نسبی (پایه ۱۰۰ در ابتدای بازه) ترسیم می‌شود و مقدار دقیق هر واحد در راهنمای نقطه و جدول قابل مشاهده است.`}
      actions={<Seg label="شاخص روند انرژی" value={mode} options={MODES} onChange={setMode} />}
    >
      <div className="ind-chips" role="group" aria-label="حامل‌های انرژی">
        {ENERGY_CARRIERS.map((c) => {
          const on = activeKeys.includes(c.key)
          return (
            <button
              key={c.key}
              type="button"
              className={`ind-schip ${on ? 'is-on' : ''} ${hoverKey === c.key ? 'is-hot' : ''}`}
              style={
                on
                  ? {
                      borderColor: `color-mix(in srgb, ${c.color} 40%, transparent)`,
                    }
                  : undefined
              }
              aria-pressed={on}
              onClick={() => toggle(c.key)}
              onMouseEnter={() => on && setHoverKey(c.key)}
              onMouseLeave={() => setHoverKey(null)}
              onFocus={() => on && setHoverKey(c.key)}
              onBlur={() => setHoverKey(null)}
            >
              <span className="ind-schip__dot" style={{ background: c.color }} aria-hidden="true" />
              {c.label}
            </button>
          )
        })}
      </div>

      <div className="ind-viewbar">
        <span className="ind-viewbar__unit">{view === 'chart' ? winSeries?.unitLabel : end ? `${monthName(end)}؛ تغییر نسبت به ماه قبل` : null}</span>
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

      {activeKeys.length === 0 ? (
        <p className="ind-empty">حامل انرژی انتخاب نشده است.</p>
      ) : view === 'chart' ? (
        <>
          <div ref={zoomEl} onDoubleClick={() => showNav && setWin([0, months.length - 1])}>
            <ChartContainer
              config={Object.fromEntries(activeKeys.map((k) => [k, { label: carrierOf(k).label, color: carrierOf(k).color }]))}
              className="ind-chart"
              style={{ height: H }}
              role="img"
              aria-label={`روند مصرف انرژی، ${winSeries?.unitLabel ?? ''}، ${AXIS[ctx.range.from]} تا ${AXIS[ctx.range.to]}`}
            >
              <LineChart data={chartRows} margin={M}>
                <CartesianGrid vertical={false} strokeDasharray="2 4" />
                <XAxis {...MONTH_AXIS} />
                <YAxis
                  domain={[0, axis.max]}
                  ticks={axis.ticks}
                  padding={{ bottom: 12 }}
                  tickFormatter={(v: number) => (winSeries?.normalized ? fa(v, 0) : fa(v, maxVal < 10 ? 1 : 0))}
                  tickLine={false}
                  axisLine={{ stroke: 'var(--color-border)' }}
                  width={60}
                />
                <ChartTooltip
                  cursor={{ stroke: 'var(--brand-shades-300)', strokeWidth: 1, strokeDasharray: '3 3' }}
                  content={({ active, label, payload }) => {
                    const m = typeof label === 'string' ? label : ''
                    return (
                      <Tip
                        active={active}
                        label={tipLabel(label)}
                        items={(payload ?? [])
                          .filter((p) => p.value != null)
                          .map((p) => {
                            const k = String(p.dataKey) as EnergyKey
                            const def = carrierOf(k)
                            return {
                              key: k,
                              name: def.name,
                              color: def.color,
                              value: formatTipValue(k, m, Number(p.value)),
                            }
                          })}
                      />
                    )
                  }}
                />
                {activeKeys.map((k) => {
                  const def = carrierOf(k)
                  const dim = hoverKey != null && hoverKey !== k
                  const hot = hoverKey === k
                  return (
                    <Line
                      key={k}
                      dataKey={k}
                      type="linear"
                      stroke={def.color}
                      strokeWidth={hot ? 2.8 : 1.8}
                      strokeOpacity={dim ? 0.18 : 1}
                      strokeLinejoin="round"
                      connectNulls={false}
                      isAnimationActive={false}
                      activeDot={{ r: hot ? 5 : 4, fill: def.color, stroke: 'var(--color-card)' }}
                      dot={
                        chartRows.length > 18
                          ? false
                          : (p: { cx?: number; cy?: number; value?: number | null; index?: number }) =>
                              p.value == null || p.cx == null || p.cy == null ? (
                                <g key={`${k}-${p.index}`} />
                              ) : (
                                <circle key={`${k}-${p.index}`} cx={p.cx} cy={p.cy} r={3} fill="var(--color-card)" stroke={def.color} strokeOpacity={dim ? 0.2 : 1} strokeWidth={1.5} />
                              )
                      }
                    />
                  )
                })}
              </LineChart>
            </ChartContainer>
          </div>
          {showNav && <RangeNavigator months={months} values={navValues} win={span} onChange={setWin} color="var(--raw-blue-600)" inset={{ left: M.left + 60, right: M.right }} />}
        </>
      ) : (
        <div className="ind-table">
          <table>
            <thead>
              <tr>
                <th scope="col" style={{ width: '22%' }}>
                  حامل انرژی
                </th>
                <th scope="col" style={{ width: '13%' }}>
                  بخش مصرف
                </th>
                <th scope="col" style={{ width: '10%' }}>
                  واحد
                </th>
                <th scope="col" style={{ width: '12%' }} className="ind-num">
                  مقدار مصرف
                </th>
                <th scope="col" style={{ width: '9%' }} className="ind-num">
                  تغییر مقدار
                </th>
                <th scope="col" style={{ width: '14%' }} className="ind-num">
                  {rateUnitHeader}
                </th>
                <th scope="col" style={{ width: '11%' }} className="ind-num">
                  هزینه ({ENERGY_UNIT_LABEL[ctx.unit]})
                </th>
                <th scope="col" style={{ width: '9%' }} className="ind-num">
                  سهم
                </th>
              </tr>
            </thead>
            <tbody>
              {summary.map((r) => (
                <tr key={r.key}>
                  <td>
                    <span className="ind-item__name">
                      <span className="ind-schip__dot" style={{ background: r.color, opacity: 1 }} aria-hidden="true" />
                      {r.name}
                    </span>
                  </td>
                  <td>
                    <span className="ind-muted">{r.category}</span>
                  </td>
                  <td>
                    <span className="ind-muted">{r.unit}</span>
                  </td>
                  <td className="ind-num">
                    <Num v={r.qty} d={0} />
                  </td>
                  <td className="ind-num">
                    <TableChange v={r.qtyChange} />
                  </td>
                  <td className="ind-num">
                    <Num v={r.rate} d={r.rate != null && r.rate < 1 ? 2 : r.rate != null && r.rate < 100 ? 1 : 0} />
                  </td>
                  <td className="ind-num">
                    <Num v={r.cost} d={1} />
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
