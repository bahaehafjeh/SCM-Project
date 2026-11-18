import { createContext, useContext, useId } from 'react'
import type { CSSProperties, HTMLAttributes, ReactNode } from 'react'
import * as Recharts from 'recharts'
import { cn } from '../../lib/utils'
import './chart.css'

/**
 * Port of shadcn/ui's chart component (ChartContainer, ChartTooltipContent, ChartLegendContent) on
 * Recharts, styled with this project's tokens in chart.css instead of Tailwind. Each config key gets a
 * CSS variable `--chart-<key>` that series use as their colour.
 */
export type ChartConfig = Record<string, { label?: ReactNode; color?: string }>

const ChartContext = createContext<{ config: ChartConfig } | null>(null)
function useChart() {
  const ctx = useContext(ChartContext)
  if (!ctx) throw new Error('useChart must be used inside <ChartContainer />')
  return ctx
}

export function ChartContainer({
  config,
  className,
  children,
  style,
  ...props
}: HTMLAttributes<HTMLDivElement> & { config: ChartConfig; children: React.ComponentProps<typeof Recharts.ResponsiveContainer>['children'] }) {
  const id = useId().replace(/:/g, '')
  const vars = Object.fromEntries(Object.entries(config).filter(([, c]) => c.color).map(([k, c]) => [`--chart-${k}`, c.color])) as CSSProperties
  return (
    <ChartContext.Provider value={{ config }}>
      <div data-chart={id} className={cn('chart', className)} style={{ ...vars, ...style }} {...props}>
        <Recharts.ResponsiveContainer>{children}</Recharts.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  )
}

export const ChartTooltip = Recharts.Tooltip
export const ChartLegend = Recharts.Legend

interface PayloadItem {
  dataKey?: string | number
  name?: string | number
  value?: unknown
  color?: string
}

export function ChartTooltipContent({
  active,
  payload,
  label,
  indicator = 'dot',
  hideKeys = [],
  order,
  valueFormatter = (v) => String(v),
}: {
  active?: boolean
  payload?: PayloadItem[]
  label?: ReactNode
  indicator?: 'dot' | 'line'
  /** Series that stay out of the tooltip (e.g. a band) */
  hideKeys?: string[]
  /** Keys listed first, in this order */
  order?: string[]
  valueFormatter?: (v: number) => ReactNode
}) {
  const { config } = useChart()
  if (!active || !payload?.length) return null
  const items = payload
    .filter((p) => !hideKeys.includes(String(p.dataKey)) && typeof p.value === 'number')
    .sort((a, b) => {
      const ia = order?.indexOf(String(a.dataKey)) ?? -1
      const ib = order?.indexOf(String(b.dataKey)) ?? -1
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib)
    })
  return (
    <div className="chart-tip" dir="rtl">
      {label != null && <p className="chart-tip__label">{label}</p>}
      <ul className="chart-tip__list">
        {items.map((p) => {
          const key = String(p.dataKey)
          return (
            <li key={key}>
              <span className={`chart-tip__ind chart-tip__ind--${indicator}`} style={{ background: config[key]?.color ?? p.color }} aria-hidden="true" />
              <span className="chart-tip__name">{config[key]?.label ?? p.name}</span>
              <span className="chart-tip__value">{valueFormatter(p.value as number)}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export function ChartLegendContent({ payload, hideKeys = [] }: { payload?: PayloadItem[]; hideKeys?: string[] }) {
  const { config } = useChart()
  if (!payload?.length) return null
  return (
    <ul className="chart-legend" dir="rtl">
      {payload
        .filter((p) => !hideKeys.includes(String(p.dataKey)))
        .map((p) => {
          const key = String(p.dataKey)
          return (
            <li key={key}>
              <span className="chart-legend__swatch" style={{ background: config[key]?.color ?? p.color }} aria-hidden="true" />
              {config[key]?.label ?? p.name}
            </li>
          )
        })}
    </ul>
  )
}
