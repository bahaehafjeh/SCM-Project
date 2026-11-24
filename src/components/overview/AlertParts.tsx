import { useId, useState } from 'react'
import type { ComponentType, CSSProperties, PointerEvent as ReactPointerEvent, ReactNode } from 'react'
import { ChevronDown, Clock, Coins, Hourglass, MapPin, Package, TrendingUp, TriangleAlert, Truck, UserRound, Warehouse } from 'lucide-react'
import type { AlertEvidence, AlertItem, AlertStat, Severity } from '../../data/alerts'
import { formatNumber } from '../../lib/format'
import { Area, AreaChart, CartesianGrid, ReferenceDot, ReferenceLine, XAxis, YAxis } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '../ui/chart'
import type { ChartConfig } from '../ui/chart'
import { isSnoozed } from '../../lib/alertStore'
import type { useAlertState } from '../../lib/alertStore'

export const severityLabel: Record<Severity, string> = { critical: 'بحرانی', high: 'زیاد', medium: 'متوسط' }
export const typeLabel = { inventory: 'موجودی', shipment: 'محموله', supplier: 'تأمین‌کننده', demand: 'تقاضا', price: 'قیمت و ارز', incident: 'رویداد', data: 'داده و سیستم' } as const
export type Icon = ComponentType<{ size?: number; 'aria-hidden'?: boolean | 'true' }>

export const fa = (n: number, d = 0) => formatNumber(n, d)
/** Confidence as «اطمینان: ۸۲٪» (owner, 2026-11-08: the number alone, no word) */
export const confidenceLabel = (pct: number) => `اطمینان: ${fa(pct)}٪`

export function SeverityChip({ severity }: { severity: Severity }) {
  return <span className={`sev-chip sev-chip--${severity}`}>{severityLabel[severity]}</span>
}

const toLatin = (t: string) => t.replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
export const slaHours = (a: AlertItem) => {
  if (a.flags?.includes('sla') || a.slaLeft.includes('گذشته')) return 0
  const t = toLatin(a.slaLeft)
  const hm = t.match(/(\d+):(\d+)/)
  if (hm) return +hm[1] + +hm[2] / 60
  const n = t.match(/(\d+)/)
  if (!n) return 0
  return t.includes('روز') ? +n[1] * 24 : +n[1]
}
/** Under an hour left, or already past: shown in red */
export const slaUrgent = (a: AlertItem) => slaHours(a) < 1

type St = ReturnType<typeof useAlertState>
/** Lifecycle (spec §4): جدید → دیده‌شده → معوق → در حال رسیدگی → بسته */
export function lifecycle(st: St, a: AlertItem): { label: string; tone: 'info' | 'muted' | 'done' } {
  const closed = st.closed[a.id]
  if (closed) return { label: `بسته · ${closed.reason}`, tone: 'muted' }
  if (st.records[a.id]) return { label: 'در حال رسیدگی', tone: 'info' }
  if (isSnoozed(st, a.id)) return { label: `معوق · ${st.snoozed[a.id].label}`, tone: 'muted' }
  // The reminder fell due: stays until a decision, closing or a new reminder (not cleared by viewing)
  if (st.reminded[a.id]) return { label: 'یادآوری رسید', tone: 'info' }
  if (st.seen[a.id]) return { label: 'دیده‌شده', tone: 'muted' }
  return { label: 'جدید', tone: 'info' }
}
export function StateChip({ st, alert }: { st: St; alert: AlertItem }) {
  const s = lifecycle(st, alert)
  return <span className={`status-chip ${s.tone === 'muted' ? 'status-chip--muted' : ''}`}>{s.label}</span>
}

/** Renders «**…**» as bold, for the key numbers of a sentence */
export function Bold({ text }: { text: string }) {
  return (
    <>
      {text.split('**').map((part, i) => (i % 2 ? <strong key={i}>{part}</strong> : <span key={i}>{part}</span>))}
    </>
  )
}

export function Block({
  title,
  icon: I,
  aside,
  count,
  countUnit,
  collapsible = false,
  children,
}: {
  title: string
  icon?: Icon
  aside?: ReactNode
  /** Items inside; shown on the toggle of a collapsible block */
  count?: number
  /** Word after the count on the toggle, e.g. «علت» → «۲ علت» */
  countUnit?: string
  /** Starts closed; the title becomes the toggle */
  collapsible?: boolean
  children: ReactNode
}) {
  const [open, setOpen] = useState(!collapsible)
  const id = useId()
  if (!collapsible)
    return (
      <section className="ablock">
        <h4 className="ablock__title">
          {I && <I size={16} aria-hidden="true" />}
          {title}
          {aside && <span className="ablock__aside">{aside}</span>}
        </h4>
        {children}
      </section>
    )
  return (
    <section className={`ablock ablock--fold ${open ? 'is-open' : ''}`}>
      <h4 className="ablock__title">
        <button type="button" className="ablock__toggle" aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}>
          {I && <I size={16} aria-hidden="true" />}
          {title}
          {count !== undefined && <span className="ablock__count">{fa(count)}{countUnit ? ` ${countUnit}` : ''}</span>}
          <ChevronDown size={15} className="ablock__chev" aria-hidden="true" />
        </button>
      </h4>
      <div id={id} hidden={!open}>
        {children}
      </div>
    </section>
  )
}

/** Label / value rows */
/** Label / value rows; a value may carry parts (a code, a coloured state) */
export function Rows({ items }: { items: { label: string; value: ReactNode; tone?: AlertStat['tone'] }[] }) {
  return (
    <dl className="arows">
      {items.map((s) => (
        <div key={s.label}>
          <dt>{s.label}</dt>
          <dd className={s.tone ? `astats__v--${s.tone}` : undefined}>{s.value}</dd>
        </div>
      ))}
    </dl>
  )
}

// One neutral icon per kind of effect: time, place, goods, money, demand, people, data
const IMPACT_ICONS: [RegExp, Icon][] = [
  [/اتمام|پوشش موجودی/, Hourglass],
  [/مناطق/, MapPin],
  [/انبار/, Warehouse],
  [/محموله|ورودی|بی‌خبری/, Truck],
  [/تأخیر|ماندن|رسیدن|مهلت|ازدحام|همگام/, Clock],
  [/هزینه|خرید|ارزی|سهم/, Coins],
  [/تقاضا/, TrendingUp],
  [/ارجاع/, UserRound],
  [/هشدار|شاخص|اقدام|جایگزین/, TriangleAlert],
]
const impactIcon = (label: string): Icon => IMPACT_ICONS.find(([re]) => re.test(label))?.[1] ?? Package

/** Effect on the chain: one strip of three cells, icon → what is affected → how much */
export function ImpactTiles({ items }: { items: AlertStat[] }) {
  return (
    <dl className="aimpact">
      {items.map((s) => {
        const I = impactIcon(s.label)
        return (
          <div key={s.label} className={`aimpact__tile ${s.tone ? `is-${s.tone}` : ''}`}>
            <span className="aimpact__icon" aria-hidden="true">
              <I size={16} aria-hidden="true" />
            </span>
            <dt className="aimpact__label">{s.label}</dt>
            <dd className="aimpact__value">
              {s.items?.length ? (
                <span className="aimpact__more" tabIndex={0}>
                  {s.value}
                  <span className="aimpact__tip" role="tooltip">
                    <span className="aimpact__tip-title">{s.label}</span>
                    <span className="aimpact__tip-list">
                      {s.items.map((x) => (
                        <span key={x}>{x}</span>
                      ))}
                    </span>
                  </span>
                </span>
              ) : (
                s.value
              )}
            </dd>
          </div>
        )
      })}
    </dl>
  )
}

/** Nearest point under the pointer, in viewBox units */
function usePointHover(count: number, W: number, left: number, right: number) {
  const [i, setI] = useState<number | null>(null)
  const onMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const vx = ((e.clientX - r.left) / r.width) * W
    const k = Math.round(((vx - left) / (W - left - right)) * (count - 1))
    setI(Math.max(0, Math.min(count - 1, k)))
  }
  return { i, handlers: { onPointerMove: onMove, onPointerLeave: () => setI(null) } }
}

function ChartTip({ x, y, W, H, title, lines }: { x: number; y: number; W: number; H: number; title: string; lines: ReactNode[] }) {
  const side = x / W > 0.6 ? 'is-left' : ''
  return (
    <span className={`achart__tip ${side}`} style={{ '--tx': x / W, '--ty': y / H } as CSSProperties} role="status">
      <span className="achart__tip-title">{title}</span>
      {lines.map((l, k) => (
        <span key={k} className="achart__tip-line">
          {l}
        </span>
      ))}
    </span>
  )
}

const toNum = (t: string) => +t.replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
const parseAxis = (t: string): { v: number; u: string } | null => {
  if (t === 'امروز') return { v: 0, u: 'روز' }
  if (t === 'این ماه') return { v: 0, u: 'ماه' }
  const m = t.match(/^([۰-۹\d]+) (روز|ماه) (پیش|بعد)$/)
  return m ? { v: toNum(m[1]) * (m[3] === 'پیش' ? -1 : 1), u: m[2] } : null
}
/** Label of point i on an axis whose ends read like «۸ روز پیش» → «امروز» */
export const pointLabel = (axis: [string, string], count: number) => (i: number) => {
  const a = parseAxis(axis[0])
  const b = parseAxis(axis[1])
  if (!a || !b || a.u !== b.u || count < 2) return ''
  const v = Math.round(a.v + (i * (b.v - a.v)) / (count - 1))
  return v === 0 ? (a.u === 'روز' ? 'امروز' : 'این ماه') : `${fa(Math.abs(v))} ${a.u} ${v < 0 ? 'پیش' : 'بعد'}`
}

const SEV_COLOR: Record<Severity, string> = { critical: 'var(--ext-sev-critical)', high: 'var(--ext-sev-high)', medium: 'var(--raw-amber-500)' }

/**
 * Stock over the last days against the safety level and the critical line (50 % of it), on the shadcn
 * chart (Recharts): fixed 11px type at any panel width, a round value axis, three time ticks, the two
 * levels labelled at the right end where the line is lowest, today's point marked, values on hover.
 */
export function StockChart({ series, safety, severity }: { series: number[]; safety: number; severity: Severity }) {
  const gradId = useId().replace(/:/g, '')
  const lastIdx = series.length - 1
  const last = series[lastIdx]
  const dayLabel = (i: number) => (i === lastIdx ? 'امروز' : `${fa(lastIdx - i)} روز پیش`)
  const data = series.map((v, i) => ({ day: dayLabel(i), stock: v }))
  // Round value axis: 0 and up to four equal steps that clear the safety level
  const raw = Math.max(safety * 1.15, ...series)
  const mag = 10 ** Math.floor(Math.log10(raw))
  const step = [0.1, 0.2, 0.25, 0.5, 1, 2].map((m) => m * mag).find((s) => Math.ceil(raw / s) <= 4) ?? mag
  const top = Math.ceil(raw / step) * step
  const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, k) => k * step)
  const half = Math.floor(lastIdx / 2)
  const config: ChartConfig = { stock: { label: 'موجودی', color: SEV_COLOR[severity] } }
  return (
    <figure className="astock" aria-label={`موجودی ${fa(lastIdx)} روز اخیر؛ امروز ${fa(last)} تن، ${fa(Math.round((last / safety) * 100))}٪ حد ایمن (${fa(safety)} تن)`}>
      <ChartContainer config={config} className="astock__chart" dir="ltr">
        <AreaChart data={data} margin={{ top: 18, right: 12, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-stock)" stopOpacity={0.18} />
              <stop offset="100%" stopColor="var(--chart-stock)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={8} ticks={[data[0].day, data[half].day, data[lastIdx].day]} interval={0} />
          <YAxis tickLine={false} axisLine={false} width={40} tickMargin={6} domain={[0, top]} ticks={ticks} tickFormatter={(v: number) => fa(v)} />
          <ReferenceLine
            y={safety}
            stroke="var(--raw-emerald-500)"
            strokeDasharray="6 4"
            label={{ value: `حد ایمن · ${fa(safety)}`, position: 'insideTopRight', fill: 'var(--ext-status-success-fg)', fontSize: 11 }}
          />
          <ReferenceLine
            y={safety / 2}
            stroke="var(--raw-red-400)"
            strokeDasharray="2 4"
            label={{ value: `مرز بحرانی · ${fa(safety / 2)}`, position: 'insideTopRight', fill: 'var(--ext-status-danger-fg)', fontSize: 11 }}
          />
          <Area dataKey="stock" type="monotone" stroke="var(--chart-stock)" strokeWidth={2} fill={`url(#${gradId})`} isAnimationActive={false} activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--color-card)' }} />
          <ReferenceDot
            x={data[lastIdx].day}
            y={last}
            r={4}
            fill="var(--chart-stock)"
            stroke="var(--color-card)"
            strokeWidth={2}
            label={{ value: `${fa(last)} تن`, position: 'bottom', offset: 10, fill: 'var(--color-foreground)', fontSize: 12, fontWeight: 600 }}
          />
          <ChartTooltip
            cursor={{ strokeDasharray: '3 3' }}
            content={<ChartTooltipContent indicator="line" valueFormatter={(v) => `${fa(v)} تن · ${fa(Math.round((v / safety) * 100))}٪ حد ایمن`} />}
          />
        </AreaChart>
      </ChartContainer>
    </figure>
  )
}

/**
 * Shipment milestones: the actual (or expected) date on the start side, a node on a dashed rail, then
 * the milestone with its delay pill and «انجام شد» / the target date under it.
 */
export function Timeline({ steps }: { steps: Extract<AlertEvidence, { kind: 'timeline' }>['steps'] }) {
  return (
    <ol className="atime">
      {steps.map((s) => (
        <li key={s.label} className={`atime__step ${s.done ? 'is-done' : ''} ${s.late ? 'is-late' : ''}`}>
          <span className="atime__when">{s.actual}</span>
          <span className="atime__node" aria-hidden="true" />
          <span className="atime__body">
            <span className="atime__title">
              {s.label}
              {s.late && <span className="atime__late">{s.late} تأخیر</span>}
            </span>
            <span className="atime__meta">
              {s.done ? 'انجام شد' : ''}
              {s.planned && s.planned !== s.actual ? `${s.done ? ' · ' : ''}هدف: ${s.planned}` : ''}
            </span>
          </span>
        </li>
      ))}
    </ol>
  )
}

/**
 * Forecast chart: one bold series with its band, an optional dashed «بدون اقدام» reference, muted
 * others, safe and critical lines, and an optional actual line up to «امروز». Time runs left → right.
 */
export interface ChartRef {
  value: number
  label: string
  tone: 'safe' | 'crit'
}
export const stockRefs = (safety: number): ChartRef[] => [
  { value: safety, label: 'حد ایمن', tone: 'safe' },
  { value: safety / 2, label: 'مرز بحرانی', tone: 'crit' },
]

export function ForecastChart({
  safety,
  refs: refsIn,
  main,
  band,
  reference,
  others = [],
  actual,
  todayIndex,
  markers = [],
  height = 180,
  label,
  axis,
  hover: tip,
  fit = false,
}: {
  /** Shorthand for the stock reference lines (safe and critical) */
  safety?: number
  /** Labelled reference lines; any type of figure */
  refs?: ChartRef[]
  main: number[]
  band?: number[]
  reference?: number[]
  others?: number[][]
  /** Actual values, aligned to the start of the axis */
  actual?: number[]
  todayIndex?: number
  markers?: { index: number; label: string; tone?: 'dark' | 'warn' }[]
  height?: number
  label: string
  /** Axis ends, left → right */
  axis?: [string, string]
  /** Scale from the data only (small charts): reference lines above it are left out */
  fit?: boolean
  /** Hover tip: the label of each point and how values read */
  hover?: { at: (i: number) => string; fmt: (v: number) => string; main: string; other?: string }
}) {
  const W = 560
  const H = height
  const PAD = { t: 22, r: 64, b: 22, l: 8 }
  const all = [main, reference ?? [], actual ?? [], ...others].flat()
  const dataTop = Math.max(...all.map((v, i) => v + (band?.[i] ?? 0)), 1)
  const refsAll = refsIn ?? (safety !== undefined ? stockRefs(safety) : [])
  const refs = fit ? refsAll.filter((r) => r.value <= dataTop * 1.3) : refsAll
  const top = fit ? Math.max(dataTop * 1.25, ...refs.map((r) => r.value * 1.1)) : Math.max(...refs.map((r) => r.value * 1.15), dataTop)
  const mainFrom = actual ? (todayIndex ?? 0) : 0
  const n = Math.max(main.length - 1 + mainFrom, (actual?.length ?? 1) - 1, (reference?.length ?? 1) - 1)
  const x = (i: number) => PAD.l + (i / n) * (W - PAD.l - PAD.r)
  const y = (v: number) => PAD.t + (1 - Math.max(0, v) / top) * (H - PAD.t - PAD.b)
  const path = (s: number[], from = 0) => s.map((v, i) => `${i ? 'L' : 'M'}${x(i + from)},${y(v)}`).join(' ')
  const bandPath = band
    ? `${main.map((v, i) => `${i ? 'L' : 'M'}${x(i + mainFrom)},${y(v + band[i])}`).join(' ')} ${[...main]
        .map((v, i) => [v, i] as const)
        .reverse()
        .map(([v, i]) => `L${x(i + mainFrom)},${y(v - band[i])}`)
        .join(' ')} Z`
    : null
  const hover = usePointHover(n + 1, W, PAD.l, PAD.r)
  const h = tip ? hover.i : null
  const mainAt = h !== null ? main[h - mainFrom] : undefined
  const otherAt = h !== null ? others[0]?.[h] : undefined
  return (
    <figure className="afc">
      {h !== null && tip && (mainAt !== undefined || otherAt !== undefined) && (
        <ChartTip
          x={x(h)}
          y={y(mainAt ?? otherAt ?? 0)}
          W={W}
          H={H}
          title={tip.at(h)}
          lines={[
            ...(mainAt !== undefined ? [<>{tip.main}: <strong>{tip.fmt(mainAt)}</strong></>] : []),
            ...(otherAt !== undefined && tip.other ? [<>{tip.other}: <strong>{tip.fmt(otherAt)}</strong></>] : []),
          ]}
        />
      )}
      <svg viewBox={`0 0 ${W} ${H}`} {...(tip ? hover.handlers : {})} role="img" aria-label={label}>
        <line x1={PAD.l} x2={W - PAD.r} y1={H - PAD.b} y2={H - PAD.b} className="achart__base" />
        {refs.map((r) => (
          <g key={r.label}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(r.value)} y2={y(r.value)} className={r.tone === 'safe' ? 'achart__safe' : 'achart__crit'} />
            <text x={W - PAD.r + 6} y={y(r.value) + 4} className={`achart__ref achart__ref--${r.tone}`}>
              {r.label}
            </text>
          </g>
        ))}
        {others.map((s, i) => (
          <path key={i} d={path(s)} className="afc__other" />
        ))}
        {reference && <path d={path(reference)} className="afc__ref" />}
        {bandPath && <path d={bandPath} className="afc__band" />}
        <path d={path(main, mainFrom)} className={`afc__main ${actual ? 'afc__main--forecast' : ''}`} />
        {actual && <path d={path(actual)} className="afc__actual" />}
        {h !== null && (
          <>
            <line x1={x(h)} x2={x(h)} y1={PAD.t} y2={H - PAD.b} className="achart__guide" />
            {mainAt !== undefined && <circle cx={x(h)} cy={y(mainAt)} r="4" className="afc__dot" />}
            {otherAt !== undefined && <circle cx={x(h)} cy={y(otherAt)} r="3.5" className="afc__dot afc__dot--other" />}
          </>
        )}
        {tip && <rect x={PAD.l} y={PAD.t} width={W - PAD.l - PAD.r} height={H - PAD.t - PAD.b} className="achart__hit" />}
        {markers.map((m) => (
          <g key={m.label} className={`afc__marker ${m.tone === 'warn' ? 'is-warn' : ''}`}>
            <line x1={x(m.index)} x2={x(m.index)} y1={PAD.t - 4} y2={H - PAD.b} />
            <rect x={Math.min(Math.max(x(m.index) - 26, 0), W - PAD.r - 52)} y={2} width={52} height={16} rx={4} />
            <text x={Math.min(Math.max(x(m.index), 26), W - PAD.r - 26)} y={14} textAnchor="middle">
              {m.label}
            </text>
          </g>
        ))}
        <text x={PAD.l} y={H - 6} className="achart__axis">
          {axis?.[0] ?? 'امروز'}
        </text>
        <text x={W - PAD.r} y={H - 6} textAnchor="end" className="achart__axis">
          {axis?.[1] ?? `${fa(n)} روز بعد`}
        </text>
      </svg>
    </figure>
  )
}

/** Success mark: the disc pops in, a ring ripples out, then the tick draws itself. */
export function DoneMark({ small = false }: { small?: boolean }) {
  return (
    <span className={`adone__icon ${small ? 'adone__icon--sm' : ''}`} aria-hidden="true">
      <svg viewBox="0 0 24 24">
        <path d="M6 12.5l4 4L18.5 8" pathLength={1} className="adone__tick" />
      </svg>
    </span>
  )
}

/** Evidence block for any alert type (prompt §7, «Evidence chart»). */
export function Evidence({ evidence: e, severity }: { evidence: AlertEvidence; severity: Severity }) {
  if (e.kind === 'stock') return <StockChart series={e.series} safety={e.safety} severity={severity} />
  if (e.kind === 'timeline') return <Timeline steps={e.steps} />
  // The bold series is the forecast when the compared one is the actual, and the actual otherwise
  const mainLabel = e.kind === 'series' && e.compareLabel === 'واقعی' ? 'پیش‌بینی' : 'واقعی'
  if (e.kind === 'series')
    return (
      <div className="aevi">
        <ForecastChart
          refs={e.refs}
          main={e.series}
          others={e.compare ? [e.compare] : []}
          height={150}
          axis={e.axis}
          label={`${e.unit}؛ آخرین مقدار ${fa(e.series.at(-1) ?? 0)}`}
          hover={{
            at: pointLabel(e.axis, e.series.length),
            fmt: (v) => `${fa(v, v % 1 ? 1 : 0)} ${e.unit}`,
            main: mainLabel,
            other: e.compareLabel,
          }}
        />
        {e.compare && (
          <p className="alegend">
            <span className="alegend__key alegend__key--main" /> {mainLabel}
            <span className="alegend__key alegend__key--other" /> {e.compareLabel}
          </p>
        )}
      </div>
    )
  if (e.kind === 'route')
    return (
      <div className="aroute">
        <ol className="aroute__line">
          {e.stops.map((s) => (
            <li key={s.name} className={`aroute__stop is-${s.state}`}>
              <span className="aroute__dot" aria-hidden="true" />
              <span>{s.name}</span>
              {s.state === 'here' && <span className="aroute__here">آخرین موقعیت</span>}
            </li>
          ))}
        </ol>
        <p className="asource">{e.last}</p>
      </div>
    )
  if (e.kind === 'rows') return <Rows items={e.rows} />
  // SLA timer: the full window and how far past it the alert is
  const pct = Math.min(100, (e.totalHours / (e.totalHours + e.overHours)) * 100)
  return (
    <div className="asla">
      <span className="aprogress aprogress--over" style={{ '--p': `${pct}%` } as CSSProperties} />
      <p className="asla__text">
        مهلت {fa(e.totalHours)} ساعت · <strong>{fa(e.overHours)} ساعت گذشته</strong>
      </p>
    </div>
  )
}
