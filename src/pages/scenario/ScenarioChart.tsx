import { Area, CartesianGrid, ComposedChart, Line, ReferenceDot, ReferenceLine, XAxis, YAxis } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '../../components/ui/chart'
import type { ChartConfig } from '../../components/ui/chart'
import type { Scenario } from '../../lib/alertStore'
import type { ModelRun, Params, ScenarioModel } from '../../lib/engine'
import { fa } from '../../components/overview/AlertParts'
import { COLORS } from './helpers'

const HEIGHT = 300
const MARGIN = { top: 28, right: 92, left: 8, bottom: 0 }
/** Plot height in px, for keeping the end-of-line names apart */
const PLOT_H = HEIGHT - MARGIN.top - 30

/** A label in a pill (SVG), for the selected scenario's arrivals */
function Pill({ x = 0, y = 0, text, color }: { x?: number; y?: number; text: string; color: string }) {
  const w = text.length * 6.2 + 14
  return (
    <g transform={`translate(${x - w / 2}, ${y - 30})`}>
      <rect width={w} height={20} rx={10} fill={color} />
      <text x={w / 2} y={14} textAnchor="middle" fontSize={11} fill="var(--color-card)" className="scn-pill-text">
        {text}
      </text>
    </g>
  )
}

/**
 * Outcomes over the page's horizon. Selected scenario bold with its band; «بدون اقدام» grey dashed;
 * the rest faint. Reference lines carry their values, day 0 says where everyone starts, each line ends
 * with its short name, the day «بدون اقدام» runs out is marked, and arrivals are labelled: the selected
 * scenario's own in a pill, the ones every scenario shares as a dotted line. Time runs left → right.
 */
export function ScenarioChart({ m, list, params, runs, selected, horizon, names }: { m: ScenarioModel; list: Scenario[]; params: Params[]; runs: ModelRun[]; selected: number; horizon: number; names: string[] }) {
  const sel = runs[selected]
  const unit = m.chart.unit
  const label = (d: number) => (d === 0 ? 'امروز' : `روز ${fa(d)}`)
  const data = Array.from({ length: horizon + 1 }, (_, d) => {
    const row: Record<string, number | string | [number, number]> = {
      day: label(d),
    }
    runs.forEach((r, i) => (row[`s${i}`] = r.series[d]))
    row.band = [Math.max(0, sel.series[d] - sel.band[d]), sel.series[d] + sel.band[d]]
    return row
  })
  const config: ChartConfig = Object.fromEntries([...list.map((s, i) => [`s${i}`, { label: s.name, color: COLORS[i % COLORS.length] }]), ['band', { label: 'بازه پیش‌بینی', color: COLORS[selected % COLORS.length] }]])
  const order = [`s${selected}`, ...list.map((_, i) => `s${i}`).filter((k) => k !== `s${selected}`)]
  // Round steps (1, 2, 2.5 or 5 × 10ⁿ), at most six
  const raw = Math.max(...runs.flatMap((r) => r.series), ...sel.series.map((v, d) => v + sel.band[d]), ...m.chart.refs.map((r) => r.value), 1) * 1.08
  const mag = 10 ** Math.floor(Math.log10(raw))
  const step = [0.1, 0.2, 0.25, 0.5, 1, 2].map((x) => x * mag).find((x) => Math.ceil(raw / x) <= 6) ?? 2 * mag
  const top = Math.ceil(raw / step) * step
  const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, k) => k * step)

  // End-of-line names, pushed apart when closer than 12 px
  const pxPer = PLOT_H / top
  // Only «بدون اقدام» and the selected line are named at their end; the faint rest show their names on hover
  const named = (i: number) => i === 0 || i === selected
  const ends = runs
    .map((r, i) => ({ i, y: r.series[horizon] * pxPer }))
    .filter((e) => named(e.i))
    .sort((a, b) => b.y - a.y)
  const shift: Record<number, number> = {}
  let last = Infinity
  for (const e of ends) {
    const yPx = -e.y
    const placed = last !== Infinity && yPx - last < 12 ? last + 12 : yPx
    shift[e.i] = placed - yPx
    last = placed
  }

  // Arrivals: shared with «بدون اقدام» (dotted line) or the selected scenario's own (pill on its line)
  const baseEvents = new Set((m.events?.(params[0]) ?? []).map((e) => `${e.label}:${e.day}`))
  const selEvents = (m.events?.(params[selected]) ?? []).filter((e) => e.day <= horizon)
  const shared = (m.events?.(params[0]) ?? []).filter((e) => e.day <= horizon)
  const own = selEvents.filter((e) => !baseEvents.has(`${e.label}:${e.day}`))
  const empty = runs[0].emptyDay != null && runs[0].emptyDay <= horizon ? runs[0].emptyDay : null
  // Each reference label sits where its line is clearest: the day (away from both ends and the
  // selected scenario's pills) whose curves, a day either side, pass furthest from the line
  const busy = new Set([0, 1, horizon - 1, horizon, ...(empty !== null ? [empty - 1, empty, empty + 1] : []), ...own.flatMap((e) => [e.day - 2, e.day - 1, e.day, e.day + 1, e.day + 2])])
  const refDay = (value: number) => {
    let best = Math.round(horizon / 2)
    let gap = -1
    for (let d = 2; d <= horizon - 2; d++) {
      if (busy.has(d)) continue
      const g = Math.min(...runs.flatMap((r) => [d - 1, d, d + 1].map((k) => Math.abs((r.series[k] ?? r.series[d]) - value))))
      if (g > gap) [gap, best] = [g, d]
    }
    return best
  }
  const color = (i: number) => (i === 0 ? 'var(--raw-slate-400)' : `var(--chart-s${i})`)

  return (
    <ChartContainer config={config} className="scn-rchart" dir="ltr" role="img" aria-label={`${m.chart.title} (${unit})، ${fa(horizon)} روز`} style={{ height: HEIGHT }}>
      <ComposedChart data={data} margin={MARGIN}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={8} minTickGap={28} />
        <YAxis tickLine={false} axisLine={false} width={52} tickMargin={6} domain={[0, top]} ticks={ticks} tickFormatter={(v: number) => fa(v)} />
        {m.chart.refs.map((r) => (
          <ReferenceLine key={r.label} y={r.value} stroke={r.tone === 'safe' ? 'var(--raw-emerald-500)' : 'var(--raw-red-400)'} strokeDasharray={r.tone === 'safe' ? '6 4' : '2 4'} />
        ))}
        {shared.map((e) => (
          <ReferenceLine
            key={`sh-${e.label}-${e.day}`}
            x={label(e.day)}
            stroke="var(--color-muted-foreground)"
            strokeDasharray="2 3"
            label={{
              value: `روز ${fa(e.day)} · ${e.label}`,
              position: 'top',
              fill: 'var(--color-muted-foreground)',
              fontSize: 11,
            }}
          />
        ))}
        <Area dataKey="band" type="linear" stroke="none" fill="var(--chart-band)" fillOpacity={0.12} isAnimationActive={false} activeDot={false} />
        {list.map((_, i) =>
          i === selected ? null : (
            <Line
              key={i}
              dataKey={`s${i}`}
              type="linear"
              stroke={color(i)}
              strokeWidth={i === 0 ? 1.5 : 1.25}
              // Only the selected scenario keeps its full colour; «بدون اقدام» stays readable as the baseline
              strokeOpacity={i === 0 ? 0.45 : 0.22}
              strokeDasharray={i === 0 ? '6 4' : undefined}
              dot={false}
              activeDot={{ r: 3 }}
              isAnimationActive={false}
            />
          ),
        )}
        <Line dataKey={`s${selected}`} type="linear" stroke={color(selected)} strokeWidth={2.5} strokeDasharray={selected === 0 ? '6 4' : undefined} dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--color-card)' }} isAnimationActive={false} />
        {/* Reference values, labelled where their line is clear */}
        {m.chart.refs.map((r) => (
          <ReferenceDot
            key={`rl-${r.label}`}
            x={label(refDay(r.value))}
            y={r.value}
            r={0}
            label={{
              value: `${r.label} ${fa(r.value)} ${unit}`,
              position: 'top',
              offset: 6,
              fill: r.tone === 'safe' ? 'var(--ext-status-success-fg)' : 'var(--ext-status-danger-fg)',
              fontSize: 11,
            }}
          />
        ))}
        {/* Where everyone starts */}
        <ReferenceDot
          x={label(0)}
          y={runs[0].series[0]}
          r={4}
          fill="var(--color-foreground)"
          stroke="var(--color-card)"
          strokeWidth={2}
          label={{
            value: `امروز ${fa(Math.round(runs[0].series[0]))} ${unit}`,
            position: 'top',
            fontSize: 11,
            fill: 'var(--color-foreground)',
          }}
        />
        {/* The day «بدون اقدام» runs out */}
        {empty !== null && (
          <ReferenceDot
            x={label(empty)}
            y={0}
            r={5}
            fill="var(--raw-red-500)"
            stroke="var(--color-card)"
            strokeWidth={2}
            label={{
              value: `بدون اقدام: روز ${fa(empty)} تمام می‌شود`,
              position: 'top',
              fontSize: 11,
              fill: 'var(--ext-status-danger-fg)',
            }}
          />
        )}
        {/* The selected scenario's own arrivals, labelled in its colour */}
        {own.map((e) => (
          <ReferenceDot
            key={`own-${e.label}-${e.day}`}
            x={label(e.day)}
            y={sel.series[e.day]}
            r={4}
            fill="var(--color-card)"
            stroke={color(selected)}
            strokeWidth={2}
            label={(props: { viewBox?: { x?: number; y?: number } }) => <Pill x={props.viewBox?.x} y={props.viewBox?.y} text={`روز ${fa(e.day)} · ${e.label}`} color={color(selected)} />}
          />
        ))}
        {/* «بدون اقدام» and the selected line: short name at the end, in its colour */}
        {runs.map((r, i) =>
          !named(i) ? null : (
            <ReferenceDot
              key={`end-${i}`}
              x={label(horizon)}
              y={r.series[horizon]}
              r={0}
              label={{
                value: names[i],
                position: 'right',
                offset: 8,
                dy: shift[i] ?? 0,
                fontSize: 11,
                fontWeight: i === selected ? 600 : 400,
                fill: color(i),
              }}
            />
          ),
        )}
        <ChartTooltip cursor={{ strokeDasharray: '3 3' }} content={<ChartTooltipContent indicator="line" hideKeys={['band']} order={order} valueFormatter={(v) => `${fa(Math.round(v))} ${unit}`} />} />
      </ComposedChart>
    </ChartContainer>
  )
}
