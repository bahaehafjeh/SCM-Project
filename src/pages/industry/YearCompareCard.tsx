import { useState } from 'react'
import type { CSSProperties } from 'react'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { ChartContainer, ChartTooltip } from '../../components/ui/chart'
import { SALES_UNIT_LABEL, compareYears, monthOfYear, yearCompareRows } from '../../lib/industry/sales'
import type { SalesSet, YearMode, YearRow } from '../../lib/industry/sales'
import { fa, niceTicks } from '../../lib/industry/format'
import { faDigits, monthName } from '../../lib/industry/months'
import { Card, Seg, Tip, stateOf } from './parts'
import type { CardCtx } from './parts'

const H = 300
/** Newest year darkest */
const SHADES = ['var(--raw-blue-800)', 'var(--raw-blue-600)', 'var(--raw-blue-400)', 'var(--raw-blue-300)', 'var(--raw-blue-200)']
const MODES: { value: YearMode; label: string }[] = [
  { value: 'fiscal', label: 'سال مالی' },
  { value: 'calendar', label: 'سال شمسی' },
]

/** «مقایسه سال‌ها»: net sales of the five years up to the end month, month by month; each year is switched on or off from the list */
export function YearCompareCard({ ctx, sales }: { ctx: CardCtx; sales: SalesSet | null }) {
  const [mode, setMode] = useState<YearMode>('fiscal')
  // Positions in the list (0 = newest), so the choice survives a change of year type
  const [on, setOn] = useState<number[]>([0, 1])
<<<<<<< HEAD
=======
  const [hoverYear, setHoverYear] = useState<number | null>(null)
>>>>>>> scm-v1/main
  const end = sales && ctx.end && sales.byMonth.has(ctx.end) ? ctx.end : null
  const years = end ? compareYears(end, mode) : []
  const shown = years.filter((_, i) => on.includes(i))
  const rows = sales && end ? yearCompareRows(sales, end, mode, ctx.unit, shown) : []
  const unit = SALES_UNIT_LABEL[ctx.unit]
  const d = 1
<<<<<<< HEAD
  const axis = niceTicks(Math.max(0, ...rows.flatMap((r) => shown.map((y) => Number(r[`y${y}`] ?? 0)))))
  const toggle = (i: number) => setOn((xs) => (xs.includes(i) ? (xs.length > 1 ? xs.filter((x) => x !== i) : xs) : [...xs, i]))
=======
  const axis = niceTicks(Math.max(0, ...rows.flatMap((r) => shown.map((y) => Number(r[`y${y}`] ?? 0)))), 6)
  const toggle = (i: number) => {
    setHoverYear(null)
    setOn((xs) => (xs.includes(i) ? (xs.length > 1 ? xs.filter((x) => x !== i) : xs) : [...xs, i]))
  }
>>>>>>> scm-v1/main
  const yearName = (y: number) => faDigits(String(y))

  return (
    <Card
      ctx={ctx}
      state={stateOf(ctx, !!end)}
      title="مقایسه سال‌ها"
      subtitle={end ? `پنج سال منتهی به ${monthName(end)}؛ فروش خالص به ${unit}` : undefined}
      guide={`فروش خالص هر ماه در سال‌های انتخاب‌شده کنار هم؛ سال مالی از دی آغاز می‌شود و به نام سالی است که در آن تمام می‌شود. ماه‌های پس از ${end ? monthName(end) : 'ماه پایان'} خالی‌اند. داده‌ها نمونه‌اند.`}
      actions={<Seg label="نوع سال" value={mode} options={MODES} onChange={setMode} />}
    >
      <div className="ind-ycmp">
        <ul className="ind-years" aria-label="سال‌ها">
          {years.map((y, i) => {
            const pressed = on.includes(i)
            return (
              <li key={y}>
<<<<<<< HEAD
                <button type="button" className="ind-year" aria-pressed={pressed} style={{ '--c': SHADES[i] } as CSSProperties} onClick={() => toggle(i)} title={pressed && on.length === 1 ? 'دست‌کم یک سال نمایش داده می‌شود' : undefined}>
=======
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
>>>>>>> scm-v1/main
                  <span className="ind-year__sw" aria-hidden="true" />
                  <span className="n">{yearName(y)}</span>
                </button>
              </li>
            )
          })}
        </ul>
        <ChartContainer config={Object.fromEntries(years.map((y, i) => [`y${y}`, { label: yearName(y), color: SHADES[i] }]))} className="ind-chart" style={{ height: H }} role="img" aria-label={`مقایسه فروش خالص ماهانه، ${unit}، سال‌های ${shown.map(yearName).join('، ')}`}>
          <BarChart data={rows} margin={{ top: 12, right: 8, bottom: 4, left: 4 }} barGap={2} barCategoryGap="22%">
            <CartesianGrid vertical={false} strokeDasharray="2 4" />
            <XAxis dataKey="name" interval={0} tickLine={false} axisLine={{ stroke: 'var(--color-border)' }} tickMargin={8} fontSize={11} />
            <YAxis domain={[0, axis.max]} ticks={axis.ticks} tickFormatter={(v: number) => fa(v, 0)} tickLine={false} axisLine={{ stroke: 'var(--color-border)' }} width={70} />
            <ChartTooltip
<<<<<<< HEAD
              cursor={{ fill: 'var(--color-muted)', opacity: 0.6 }}
=======
              cursor={{ fill: 'color-mix(in srgb, var(--brand-shades-500) 7%, transparent)', radius: 6 }}
>>>>>>> scm-v1/main
              content={({ active, payload }) => {
                const row = payload?.[0]?.payload as YearRow | undefined
                if (!row) return null
                const items = shown.filter((y) => row[`y${y}`] != null).map((y) => ({ key: String(y), name: monthName(monthOfYear(y, row.k, mode)), color: SHADES[years.indexOf(y)], value: `${fa(Number(row[`y${y}`]), d)} ${unit}` }))
                return <Tip active={active} label={row.name} items={items} />
              }}
            />
            {/* Oldest first, so in each month the newest year stands at the right */}
            {[...shown].reverse().map((y) => (
<<<<<<< HEAD
              <Bar key={y} dataKey={`y${y}`} fill={SHADES[years.indexOf(y)]} maxBarSize={18} radius={[3, 3, 0, 0]} isAnimationActive={false} />
=======
              <Bar key={y} dataKey={`y${y}`} fill={SHADES[years.indexOf(y)]} fillOpacity={hoverYear == null || hoverYear === y ? 1 : 0.24} maxBarSize={18} radius={[3, 3, 0, 0]} isAnimationActive={false} />
>>>>>>> scm-v1/main
            ))}
          </BarChart>
        </ChartContainer>
      </div>
    </Card>
  )
}
