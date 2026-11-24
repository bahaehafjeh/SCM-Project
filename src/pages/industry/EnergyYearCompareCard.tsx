import { useState } from 'react'
import type { CSSProperties } from 'react'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { ChartContainer, ChartTooltip } from '../../components/ui/chart'
import { ENERGY_UNIT_LABEL, energyCompareYears, energyYearCompareRows } from '../../lib/industry/energy'
import type { EnergySet } from '../../lib/industry/energy'
import { monthOfYear } from '../../lib/industry/sales'
import type { YearRow } from '../../lib/industry/sales'
import { fa, niceTicks } from '../../lib/industry/format'
import { faDigits, monthName } from '../../lib/industry/months'
import { Card, Tip, stateOf } from './parts'
import type { CardCtx } from './parts'

const H = 292
const SHADES = ['var(--raw-blue-800)', 'var(--raw-blue-600)', 'var(--raw-blue-400)', 'var(--raw-blue-300)', 'var(--raw-blue-200)']

/** «مقایسه هزینه انرژی در سال‌های مالی»: five fiscal years month by month (دی → آذر) */
export function EnergyYearCompareCard({ ctx, energy }: { ctx: CardCtx; energy: EnergySet | null }) {
  const [on, setOn] = useState<number[]>([0, 1])
  const [hoverYear, setHoverYear] = useState<number | null>(null)
  const end = energy && ctx.end && energy.byMonth.has(ctx.end) ? ctx.end : null
  const years = end ? energyCompareYears(end, 'fiscal') : []
  const shown = years.filter((_, i) => on.includes(i))
  const rows = energy && end ? energyYearCompareRows(energy, end, ctx.unit, shown, 'fiscal') : []
  const unit = ENERGY_UNIT_LABEL[ctx.unit]
  const axis = niceTicks(Math.max(0, ...rows.flatMap((r) => shown.map((y) => Number(r[`y${y}`] ?? 0)))), 6)

  const toggle = (i: number) => {
    setHoverYear(null)
    setOn((xs) => (xs.includes(i) ? (xs.length > 1 ? xs.filter((x) => x !== i) : xs) : [...xs, i]))
  }
  const yearName = (y: number) => faDigits(String(y))

  return (
    <Card
      ctx={ctx}
      state={stateOf(ctx, !!end)}
      title="مقایسه هزینه انرژی در سال‌های مالی"
      subtitle={end ? `پنج سال مالی منتهی به ${monthName(end)}؛ ${unit}` : undefined}
      guide={`هزینه کل انرژی در هر ماه سال مالی (دی تا آذر) در سال‌های انتخاب‌شده کنار هم قرار گرفته‌اند. ماه‌های پس از ${end ? monthName(end) : 'ماه پایان'} یا فاقد نرخ ارزی خالی نمایش داده می‌شوند.`}
    >
      <div className="ind-ycmp">
        <ul className="ind-years" aria-label="سال‌های مالی">
          {years.map((y, i) => {
            const pressed = on.includes(i)
            return (
              <li key={y}>
                <button
                  type="button"
                  className={`ind-year ${hoverYear === y ? 'is-hot' : ''}`}
                  aria-pressed={pressed}
                  style={{ '--c': SHADES[i] } as CSSProperties}
                  onClick={() => toggle(i)}
                  onMouseEnter={() => pressed && setHoverYear(y)}
                  onMouseLeave={() => setHoverYear(null)}
                  onFocus={() => pressed && setHoverYear(y)}
                  onBlur={() => setHoverYear(null)}
                  title={pressed && on.length === 1 ? 'دست‌کم یک سال نمایش داده می‌شود' : undefined}
                >
                  <span className="ind-year__sw" aria-hidden="true" />
                  <span className="n">{yearName(y)}</span>
                </button>
              </li>
            )
          })}
        </ul>
        <ChartContainer
          config={Object.fromEntries(years.map((y, i) => [`y${y}`, { label: yearName(y), color: SHADES[i] }]))}
          className="ind-chart"
          style={{ height: H }}
          role="img"
          aria-label={`مقایسه هزینه انرژی سال‌های مالی ${shown.map(yearName).join('، ')} به ${unit}`}
        >
          <BarChart data={rows} margin={{ top: 10, right: 8, bottom: 4, left: 4 }} barGap={2} barCategoryGap="22%">
            <CartesianGrid vertical={false} strokeDasharray="2 4" />
            <XAxis dataKey="name" interval={0} tickLine={false} axisLine={{ stroke: 'var(--color-border)' }} tickMargin={8} fontSize={11} />
            <YAxis domain={[0, axis.max]} ticks={axis.ticks} tickFormatter={(v: number) => fa(v, 0)} tickLine={false} axisLine={{ stroke: 'var(--color-border)' }} width={58} />
            <ChartTooltip
              cursor={{ fill: 'color-mix(in srgb, var(--brand-shades-500) 7%, transparent)', radius: 6 }}
              content={({ active, payload }) => {
                const row = payload?.[0]?.payload as YearRow | undefined
                if (!row) return null
                const items = shown
                  .filter((y) => row[`y${y}`] != null)
                  .map((y) => ({
                    key: String(y),
                    name: monthName(monthOfYear(y, row.k, 'fiscal')),
                    color: SHADES[years.indexOf(y)],
                    value: `${fa(Number(row[`y${y}`]), 1)} ${unit}`,
                  }))
                return <Tip active={active} label={row.name} items={items} />
              }}
            />
            {[...shown].reverse().map((y) => (
              <Bar key={y} dataKey={`y${y}`} fill={SHADES[years.indexOf(y)]} fillOpacity={hoverYear == null || hoverYear === y ? 1 : 0.24} maxBarSize={18} radius={[3, 3, 0, 0]} isAnimationActive={false} />
            ))}
          </BarChart>
        </ChartContainer>
      </div>
    </Card>
  )
}
