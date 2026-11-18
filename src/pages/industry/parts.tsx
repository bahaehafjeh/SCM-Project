import type { ReactNode } from 'react'
import { ArrowDown, ArrowUp } from 'lucide-react'
import { Panel } from '../../components/overview/Panel'
import type { PanelState } from '../../components/overview/Panel'
import type { Dataset, Range, Unit } from '../../lib/industry/derive'
import { monthName, faDigits } from '../../lib/industry/months'

/**
 * Shared pieces of «داشبورد تحلیلی صنعت»: what every card knows about the page, the card frame (the
 * system's Panel), chart margins, the overflow marker and the tooltip in the system's chart style.
 */
export interface CardCtx {
  ds: Dataset | null
  status: 'loading' | 'ready' | 'error'
  range: Range
  unit: Unit
  /** The month the KPIs, «سهم مواد» and the breakdown read (null: no data in the range) */
  end: string | null
  onRetry: () => void
  onChangeRange: () => void
  /** The chosen symbol has no data loaded: every card is empty with this note */
  noSymbolData: boolean
}

export const stateOf = (ctx: CardCtx, hasData: boolean): PanelState => (ctx.status === 'loading' ? 'loading' : ctx.status === 'error' ? 'error' : hasData ? 'ready' : 'empty')

/** A card: the system panel with the empty state's «تغییر بازه» */
export function Card({
  ctx,
  state,
  title,
  subtitle,
  guide,
  actions,
  emptyText: rangeEmpty = 'برای این بازه داده‌ای ثبت نشده است',
  className,
  children,
}: {
  ctx: CardCtx
  state: PanelState
  title: string
  subtitle?: ReactNode
  guide?: ReactNode
  actions?: ReactNode
  emptyText?: string
  className?: string
  children: ReactNode
}) {
  return (
    <Panel
      title={title}
      subtitle={subtitle}
      guide={guide}
      actions={actions}
      state={state}
      emptyText={ctx.noSymbolData ? 'برای این نماد داده‌ای ثبت نشده است' : rangeEmpty}
      onRetry={ctx.onRetry}
      className={`ind-card ${className ?? ''}`}
      emptyAction={
        ctx.noSymbolData ? undefined : (
          <button type="button" className="ind-btn ind-btn--sm" onClick={ctx.onChangeRange}>
            تغییر بازه
          </button>
        )
      }
    >
      {children}
    </Panel>
  )
}

/** The direction of a change: a plain arrow, up or down */
export const Arrow = ({ up, size = 14 }: { up: boolean; size?: number }) => (up ? <ArrowUp size={size} strokeWidth={2.2} aria-hidden="true" /> : <ArrowDown size={size} strokeWidth={2.2} aria-hidden="true" />)

/** A segmented control in the system's style */
export function Seg<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="seg seg--compact" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={value === o.value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

/**
 * A point above the axis (fixed design axes): a filled triangle at the top of the plot with its value
 * under it, in the series colour. `top` is the plot's top edge in px.
 */
export function OverflowMark({ cx, top, color, text }: { cx: number; top: number; color: string; text: string }) {
  return (
    <g>
      <path d={`M${cx - 5} ${top + 8} L${cx + 5} ${top + 8} L${cx} ${top - 1} Z`} fill={color} />
      <text x={cx} y={top + 22} textAnchor="middle" fontSize={11} fontWeight={600} fill={color}>
        {text}
      </text>
    </g>
  )
}

/** Tooltip in the system's look (chart-tip): month, then one line per series */
export function Tip({ active, label, items, foot }: { active?: boolean; label?: ReactNode; items: { key: string; name: ReactNode; color: string; value: ReactNode }[]; foot?: ReactNode }) {
  if (!active || !items.length) return null
  return (
    <div className="chart-tip" dir="rtl">
      {label != null && <p className="chart-tip__label">{label}</p>}
      <ul className="chart-tip__list">
        {items.map((x) => (
          <li key={x.key}>
            <span className="chart-tip__ind chart-tip__ind--dot" style={{ background: x.color }} aria-hidden="true" />
            <span className="chart-tip__name">{x.name}</span>
            <span className="chart-tip__value">{x.value}</span>
          </li>
        ))}
      </ul>
      {foot && <p className="chart-tip__foot">{foot}</p>}
    </div>
  )
}
/** «1404/08» → «۰۴/۰۸»: the axis drops the century, the tooltip keeps the full name */
export const shortMonth = (m: unknown) => (typeof m === 'string' && /^\d{4}\/\d{2}$/.test(m) ? faDigits(m.slice(2)) : String(m ?? ''))
/** Every monthly x-axis on the page: short labels at even steps */
export const MONTH_AXIS = { dataKey: 'month', interval: 'equidistantPreserveStart' as const, minTickGap: 6, tickFormatter: shortMonth, tickLine: false, axisLine: { stroke: 'var(--color-border)' }, tickMargin: 8 }
export const tipLabel = (m: unknown) => (typeof m === 'string' && /^\d{4}\/\d{2}$/.test(m) ? monthName(m) : null)

/** A bar path with its own rounding at the top and the bottom (y0 above y1) */
export function barPath(x: number, w: number, y0: number, y1: number, rTop: number, rBottom: number) {
  const h = Math.max(0, y1 - y0)
  const t = Math.max(0, Math.min(rTop, w / 2, h))
  const b = Math.max(0, Math.min(rBottom, w / 2, h - t))
  return [`M${x} ${y0 + t}`, `Q${x} ${y0} ${x + t} ${y0}`, `L${x + w - t} ${y0}`, `Q${x + w} ${y0} ${x + w} ${y0 + t}`, `L${x + w} ${y1 - b}`, `Q${x + w} ${y1} ${x + w - b} ${y1}`, `L${x + b} ${y1}`, `Q${x} ${y1} ${x} ${y1 - b}`, 'Z'].join(' ')
}
