import { useEffect, useRef, useState } from 'react'
import { MousePointerClick, X } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, ReferenceArea, XAxis, YAxis } from 'recharts'
import { ChartContainer, ChartTooltip } from '../../components/ui/chart'
import { BY_YEAR_AFTER } from '../../lib/industry/derive'
import { ENERGY_CARRIERS, ENERGY_UNIT_LABEL, carrierOf, energyBreakdownRows, energyBreakdownYears, energyMonthsIn } from '../../lib/industry/energy'
import type { EnergyBreakdownRow, EnergyBreakdownYearRow, EnergyKey, EnergySet } from '../../lib/industry/energy'
import { fa, niceTicks } from '../../lib/industry/format'
import { faDigits, monthName, yearOf } from '../../lib/industry/months'
import { Card, Tip, barPath, shortMonth, stateOf } from './parts'
import type { CardCtx } from './parts'

/** Stack order left-to-right matching the design screenshot: electricity (orange), diesel (emerald), gas (blue), then water */
const STACK_ORDER: EnergyKey[] = ['electricity', 'diesel', 'gas', 'wellWater', 'pipedWater']
const LEGEND_ORDER: EnergyKey[] = ['gas', 'electricity', 'diesel', 'wellWater', 'pipedWater']
const POP_W = 430
const SEG_GAP = 4

/** Draws each horizontal stacked bar segment as a rounded pill with a 4px gap between neighboring non-zero segments */
const hSegment =
  (key: EnergyKey, color: string, radius = 5, gap = SEG_GAP) =>
  ({ x = 0, y = 0, width = 0, height = 0, payload }: { x?: number; y?: number; width?: number; height?: number; payload?: EnergyBreakdownRow }) => {
    const idx = STACK_ORDER.indexOf(key)
    const v = (k: EnergyKey) => Math.max(0, Number(payload?.[k] ?? 0))
    const own = v(key)
    if (!(width > 0) || !(own > 0) || !(height > 0)) return <g />

    const hasBefore = idx > 0 && STACK_ORDER.slice(0, idx).some((k) => v(k) > 0)
    const hasAfter = idx >= 0 && STACK_ORDER.slice(idx + 1).some((k) => v(k) > 0)

    const half = gap / 2
    let insetLeft = hasBefore ? half : 0
    let insetRight = hasAfter ? half : 0
    const minW = Math.min(width, 2)
    const totalInset = insetLeft + insetRight
    if (totalInset > 0 && width - totalInset < minW) {
      const scale = Math.max(0, (width - minW) / totalInset)
      insetLeft *= scale
      insetRight *= scale
    }

    const x0 = x + insetLeft
    const w = Math.max(minW, width - insetLeft - insetRight)
    const r = Math.max(0, Math.min(radius, height / 2, w / 2))
    return <path d={barPath(x0, w, y, y + height, r, r)} fill={color} />
  }

/** «هزینه انرژی به تفکیک نوع»: horizontal stacked bars — monthly for 3m/6m/1y, yearly with click-to-open monthly modal for 3y/10y */
export function EnergyBreakdownCard({ ctx, energy }: { ctx: CardCtx; energy: EnergySet | null }) {
  const [hoverYear, setHoverYear] = useState<number | null>(null)
  const [open, setOpen] = useState<{ year: number; y: number } | null>(null)
  const wrap = useRef<HTMLDivElement>(null)

  const months = energy && ctx.ds ? energyMonthsIn(energy, ctx.ds, ctx.range) : []
  const byYear = months.length > BY_YEAR_AFTER
  const monthlyAll = energy && ctx.ds ? energyBreakdownRows(energy, ctx.ds, ctx.range, ctx.unit) : []
  const rawRows = byYear && energy && ctx.ds ? energyBreakdownYears(energy, ctx.ds, ctx.range, ctx.unit) : monthlyAll
  // Newest at top
  const rows = [...rawRows].reverse()
  const has = rows.length > 0

  useEffect(() => setOpen(null), [byYear, ctx.range.from, ctx.range.to])
  useEffect(() => {
    if (!open) return
    const key = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(null)
    const down = (e: PointerEvent) => !wrap.current?.contains(e.target as Node) && setOpen(null)
    document.addEventListener('keydown', key)
    document.addEventListener('pointerdown', down)
    return () => (document.removeEventListener('keydown', key), document.removeEventListener('pointerdown', down))
  }, [open])

  const unit = ENERGY_UNIT_LABEL[ctx.unit]
  const rowMax = Math.max(
    0,
    ...rows.map((r) => STACK_ORDER.reduce((sum, k) => sum + (Number(r[k] ?? 0) || 0), 0)),
  )
  const axis = niceTicks(rowMax, 6)
  const chartHeight = Math.max(byYear ? 210 : 185, rows.length * (byYear ? 34 : 28) + 42)

  // Popover data for clicked year
  const width = wrap.current?.clientWidth ?? 800
  const popW = Math.min(POP_W, width)
  const popLeft = Math.max(0, (width - popW) / 2)
  const yearMonths = open ? monthlyAll.filter((r) => yearOf(r.month) === open.year).reverse() : []
  const yearRowMax = Math.max(
    0,
    ...yearMonths.map((r) => STACK_ORDER.reduce((sum, k) => sum + (Number(r[k] ?? 0) || 0), 0)),
  )
  const yearAxis = niceTicks(yearRowMax, 5)
  const popChartH = Math.max(210, yearMonths.length * 22 + 34)
  const popTop = open ? Math.max(4, Math.min(Math.max(4, chartHeight - popChartH - 20), open.y - popChartH / 2)) : 4

  const rowTitle = (row: EnergyBreakdownRow) => {
    if (!byYear) return monthName(row.month)
    const yr = row as EnergyBreakdownYearRow
    return `سال ${faDigits(row.month)}${yr.months < 12 ? ` (${fa(yr.months)} ماه)` : ''}`
  }

  return (
    <Card
      ctx={ctx}
      state={stateOf(ctx, has)}
      title="هزینه انرژی به تفکیک نوع"
      subtitle={
        byYear
          ? `هزینه سالانه هر نوع انرژی (${fa(rows.length)} سال؛ ${unit})`
          : `هزینه هر نوع انرژی در ${fa(rows.length)} ماه بازه انتخاب‌شده (${unit})`
      }
      guide={`میله‌های افقی سهم هر حامل انرژی را در هزینه کل به ${unit} نشان می‌دهند.${byYear ? ' در بازه‌های بیش از ۲ سال، هر ردیف یک سال است و با کلیک روی آن، ماه‌های همان سال نمایش داده می‌شود.' : ''}`}
    >
      <div ref={wrap} className={`ind-ywrap ${byYear ? 'is-years' : ''}`}>
        <ChartContainer
          config={Object.fromEntries(ENERGY_CARRIERS.map((c) => [c.key, { label: c.label, color: c.color }]))}
          className="ind-chart"
          style={{ height: chartHeight }}
          role="img"
          aria-label={`هزینه انرژی به تفکیک نوع در ${rows.length} ${byYear ? 'سال' : 'ماه'} به ${unit}`}
        >
          <BarChart
            data={rows}
            layout="vertical"
            margin={{ top: 6, right: 16, bottom: 8, left: 6 }}
            barCategoryGap="28%"
            onClick={(s: { activeLabel?: string | number; activeCoordinate?: { y?: number } }) => {
              if (!byYear || s?.activeLabel == null) return
              const year = Number(s.activeLabel)
              setOpen((o) => (o?.year === year ? null : { year, y: s.activeCoordinate?.y ?? chartHeight / 2 }))
            }}
            onMouseMove={(s: { activeLabel?: string | number }) => setHoverYear(byYear && s?.activeLabel != null ? Number(s.activeLabel) : null)}
            onMouseLeave={() => setHoverYear(null)}
          >
            <CartesianGrid horizontal={false} strokeDasharray="2 4" />
            <XAxis type="number" domain={[0, axis.max]} ticks={axis.ticks} tickFormatter={(v: number) => fa(v, 0)} tickLine={false} axisLine={{ stroke: 'var(--color-border)' }} fontSize={11} />
            <YAxis type="category" dataKey="month" interval={0} tickFormatter={(v: string) => (byYear ? faDigits(v) : shortMonth(v))} tickLine={false} axisLine={false} width={52} fontSize={11.5} />
            {byYear && hoverYear != null && hoverYear !== open?.year && (
              <ReferenceArea y1={String(hoverYear)} y2={String(hoverYear)} x1={0} x2={axis.max} fill="var(--brand-shades-50)" fillOpacity={0.5} stroke="var(--brand-shades-300)" strokeDasharray="4 3" radius={6} ifOverflow="hidden" />
            )}
            {open && (
              <ReferenceArea y1={String(open.year)} y2={String(open.year)} x1={0} x2={axis.max} fill="var(--brand-shades-50)" fillOpacity={0.65} stroke="var(--brand-shades-600)" strokeWidth={1.5} radius={6} ifOverflow="hidden" />
            )}
            <ChartTooltip
              cursor={{ fill: 'color-mix(in srgb, var(--brand-shades-500) 6%, transparent)', radius: 6 }}
              content={({ active, payload }) => {
                const row = payload?.[0]?.payload as EnergyBreakdownRow | undefined
                if (!row || open) return null
                if (row.missingRate) {
                  return <Tip active={active} label={rowTitle(row)} items={[{ key: 'miss', name: 'وضعیت داده', color: 'var(--raw-neutral-400)', value: 'نرخ تبدیل دلاری ثبت نشده است' }]} />
                }
                const items = STACK_ORDER
                  .filter((k) => row[k] != null)
                  .map((k) => {
                    const def = carrierOf(k)
                    return { key: k, name: def.name, color: def.color, value: `${fa(Number(row[k]), 1)} ${unit}` }
                  })
                const activeTotal = STACK_ORDER.reduce((a, k) => a + (Number(row[k] ?? 0) || 0), 0)
                return (
                  <Tip
                    active={active}
                    label={rowTitle(row)}
                    items={items}
                    summary={{ label: 'جمع', value: `${fa(activeTotal, 1)} ${unit}` }}
                    foot={
                      byYear ? (
                        <>
                          <MousePointerClick size={13} aria-hidden="true" /> کلیک برای ماه‌ها
                        </>
                      ) : undefined
                    }
                  />
                )
              }}
            />
            {STACK_ORDER.map((k) => {
              const def = carrierOf(k)
              return (
                <Bar
                  key={k}
                  dataKey={k}
                  stackId="energy"
                  fill={def.color}
                  barSize={byYear ? 18 : 14}
                  shape={hSegment(k, def.color, 5, SEG_GAP)}
                  isAnimationActive={false}
                />
              )
            })}
          </BarChart>
        </ChartContainer>

        {open && (
          <div className="ind-ypop" role="dialog" aria-label={`ماه‌های سال ${faDigits(String(open.year))}`} style={{ left: popLeft, width: popW, top: popTop }}>
            <div className="ind-ypop__head">
              <b>ماه‌های سال {faDigits(String(open.year))}</b>
              <button type="button" className="ind-ypop__close" aria-label="بستن" onClick={() => setOpen(null)}>
                <X size={15} aria-hidden="true" />
              </button>
            </div>
            <ChartContainer config={Object.fromEntries(ENERGY_CARRIERS.map((c) => [c.key, { label: c.label, color: c.color }]))} className="ind-ypop__chart" style={{ height: popChartH }}>
              <BarChart data={yearMonths} layout="vertical" margin={{ top: 4, right: 12, bottom: 4, left: 4 }} barCategoryGap="24%">
                <CartesianGrid horizontal={false} strokeDasharray="2 4" />
                <XAxis type="number" domain={[0, yearAxis.max]} ticks={yearAxis.ticks} tickFormatter={(v: number) => fa(v, 0)} tickLine={false} axisLine={{ stroke: 'var(--color-border)' }} fontSize={10} />
                <YAxis type="category" dataKey="month" interval={0} tickFormatter={(m: string) => shortMonth(m)} tickLine={false} axisLine={false} width={46} fontSize={10.5} />
                <ChartTooltip
                  cursor={{ fill: 'color-mix(in srgb, var(--brand-shades-500) 6%, transparent)', radius: 4 }}
                  wrapperStyle={{ zIndex: 40, pointerEvents: 'none' }}
                  content={({ active, payload }) => {
                    const row = payload?.[0]?.payload as EnergyBreakdownRow | undefined
                    if (!row) return null
                    if (row.missingRate) {
                      return <Tip active={active} label={monthName(row.month)} items={[{ key: 'miss', name: 'وضعیت داده', color: 'var(--raw-neutral-400)', value: 'نرخ تبدیل دلاری ثبت نشده است' }]} />
                    }
                    const items = STACK_ORDER
                      .filter((k) => row[k] != null)
                      .map((k) => ({ key: k, name: carrierOf(k).name, color: carrierOf(k).color, value: `${fa(Number(row[k]), 1)} ${unit}` }))
                    const total = STACK_ORDER.reduce((a, k) => a + (Number(row[k] ?? 0) || 0), 0)
                    return <Tip active={active} label={monthName(row.month)} items={items} summary={{ label: 'جمع', value: `${fa(total, 1)} ${unit}` }} />
                  }}
                />
                {STACK_ORDER.map((k) => {
                  const def = carrierOf(k)
                  return <Bar key={k} dataKey={k} stackId="energy" fill={def.color} barSize={11} shape={hSegment(k, def.color, 4, SEG_GAP)} isAnimationActive={false} />
                })}
              </BarChart>
            </ChartContainer>
          </div>
        )}
      </div>

      <ul className="ind-legend">
        {LEGEND_ORDER.map((k) => {
          const def = carrierOf(k)
          return (
            <li key={k}>
              <span className="ind-legend__sq" style={{ background: def.color }} aria-hidden="true" />
              {def.label}
            </li>
          )
        })}
      </ul>
    </Card>
  )
}
