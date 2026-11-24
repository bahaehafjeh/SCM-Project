import { Area, AreaChart, Bar, BarChart, Cell, ReferenceLine, XAxis, YAxis } from 'recharts'
import { ChartContainer, ChartTooltip } from '../../components/ui/chart'
import { BY_YEAR_AFTER } from '../../lib/industry/derive'
import { SALES_UNIT_LABEL, salesKpis } from '../../lib/industry/sales'
import type { FiscalLines, SalesKpi, SalesKpiId, SalesSet } from '../../lib/industry/sales'
import { fa, signed } from '../../lib/industry/format'
import { faDigits, monthName, monthOnly, shiftMonth } from '../../lib/industry/months'
import { Change } from './KpiCards'
import { Tip } from './parts'
import type { CardCtx } from './parts'

const UP = 'var(--raw-emerald-600)'
const DOWN = 'var(--raw-red-600)'
const META: Record<SalesKpiId, { label: string; color: string; d: number }> = {
  net: { label: 'فروش خالص ماه', color: 'var(--raw-blue-600)', d: 1 },
  yoy: { label: 'رشد نسبت به همان ماه سال قبل', color: UP, d: 1 },
  exportShare: { label: 'سهم صادرات از فروش', color: 'var(--raw-orange-500)', d: 1 },
  fiscal: { label: 'فروش تجمعی سال مالی', color: 'var(--raw-blue-600)', d: 1 },
}
const ORDER: SalesKpiId[] = ['net', 'yoy', 'exportShare', 'fiscal']

/** «تولید و فروش»: four cards for the end month, each with the chart that explains it */
export function SalesKpis({ ctx, sales }: { ctx: CardCtx; sales: SalesSet | null }) {
  const res = ctx.ds && sales && ctx.status === 'ready' ? salesKpis(sales, ctx.ds, ctx.range, ctx.unit) : null
  const busy = ctx.status === 'loading'
  const unit = SALES_UNIT_LABEL[ctx.unit]
  return (
    <section className="ind-kpis" aria-label="شاخص‌های فروش ماه پایان" aria-busy={busy || undefined}>
      {ORDER.map((id) => {
        const k = res?.kpis.find((x) => x.id === id)
        return (
          <article key={id} className="ind-kpi">
            <p className="ind-kpi__label">{META[id].label}</p>
            {busy ? (
              <>
                <span className="ind-skel ind-skel--30" />
                <span className="ind-skel ind-skel--14" />
              </>
            ) : k && res && k.value != null ? (
              <Body k={k} months={res.months} fiscal={res.fiscal} unit={id === 'net' || id === 'fiscal' ? unit : '٪'} />
            ) : (
              <p className="ind-kpi__none">{ctx.status === 'error' ? 'دریافت داده ناموفق بود' : ctx.noSymbolData ? 'برای این نماد داده‌ای ثبت نشده است' : id === 'yoy' ? 'داده همان ماه سال قبل ثبت نشده است' : 'برای این بازه داده‌ای ثبت نشده است'}</p>
            )}
          </article>
        )
      })}
    </section>
  )
}

function Body({ k, months, fiscal, unit }: { k: SalesKpi; months: string[]; fiscal: FiscalLines; unit: string }) {
  const m = META[k.id]
  const end = months[months.length - 1]
  const num = k.id === 'yoy' ? signed(k.value, 1) : fa(k.value, m.d)
  const caption = k.id === 'net' ? 'نسبت به ماه قبل' : k.id === 'yoy' ? `در برابر ${monthName(shiftMonth(end, -12))}` : k.id === 'exportShare' ? 'از فروش خالص ماه' : k.change != null ? 'نسبت به همان دوره سال قبل' : `سال مالی ${faDigits(String(fiscal.fy))}`
  return (
    <>
      <p className="ind-kpi__value">
        <span className="ind-kpi__num n">{num}</span>
        <span className="ind-kpi__unit">{unit}</span>
        {(k.id === 'net' || k.id === 'fiscal') && <Change x={k.change} vs={k.id === 'net' ? 'ماه قبل' : 'همان دوره سال قبل'} />}
      </p>
      <div className="ind-kpi__foot">
        <p className="ind-kpi__caption">{caption}</p>
        {k.id === 'fiscal' ? <FiscalMini f={fiscal} unit={unit} /> : <MiniBars k={k} months={months} unit={unit} />}
      </div>
    </>
  )
}

/** Monthly bars (one per year past two years), the end month in full colour; growth runs up in green and down in red from a zero line */
function MiniBars({ k, months, unit }: { k: SalesKpi; months: string[]; unit: string }) {
  const m = META[k.id]
  const byYear = months.length > BY_YEAR_AFTER
  const data = byYear ? k.years.map((y) => ({ key: String(y.year), v: y.v, tip: `سال ${faDigits(String(y.year))}${y.months < 12 ? ` (${fa(y.months)} ماه)` : ''}` })) : k.bars.map((v, i) => ({ key: months[i], v, tip: monthName(months[i]) }))
  if (data.length < 2) return null
  const last = data.length - 1
  const diverging = k.id === 'yoy'
  // A signed figure keeps its minus right before the digits (left to right, like the tables)
  const fmt = (v: number) => (diverging ? <span className="n">{signed(v, 1)}٪</span> : unit === '٪' ? `${fa(v, 1)}٪` : `${fa(v, 1)} ${unit}`)
  return (
    <ChartContainer config={{ v: { label: m.label, color: m.color } }} className="ind-mini" aria-hidden="true">
      <BarChart data={data} margin={{ top: 1, right: 1, bottom: 1, left: 1 }} barCategoryGap={1.2}>
        <YAxis hide domain={diverging ? ['dataMin', 'dataMax'] : [0, 'dataMax']} />
        {diverging && <ReferenceLine y={0} stroke="var(--color-border)" />}
        <ChartTooltip
          cursor={false}
          position={{ y: -84 }}
          allowEscapeViewBox={{ x: true, y: true }}
<<<<<<< HEAD
          wrapperStyle={{ zIndex: 15 }}
=======
          wrapperStyle={{ zIndex: 35 }}
>>>>>>> scm-v1/main
          content={({ active, payload }) => (
            <Tip active={active} label={payload?.[0] ? String(payload[0].payload.tip) : null} items={payload?.[0] && payload[0].value != null ? [{ key: 'v', name: m.label, color: diverging ? (Number(payload[0].value) < 0 ? DOWN : UP) : m.color, value: fmt(Number(payload[0].value)) }] : []} />
          )}
        />
        <Bar dataKey="v" maxBarSize={10} radius={diverging ? 1.5 : [2.6, 2.6, 0, 0]} minPointSize={1.5} isAnimationActive={false}>
          {data.map((d, i) => (
            <Cell key={d.key} fill={diverging ? ((d.v ?? 0) < 0 ? DOWN : UP) : m.color} fillOpacity={i === last ? 1 : 0.28} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  )
}

/** The fiscal year so far (solid) over the whole year before (dashed) */
function FiscalMini({ f, unit }: { f: FiscalLines; unit: string }) {
  const data = f.labels.map((month, i) => ({ month, cur: f.cur[i] ?? null, prev: f.prev[i] ?? null }))
  const c = META.fiscal.color
  const p = 'var(--raw-neutral-400)'
  const d = 1
  return (
    <ChartContainer config={{ cur: { label: 'سال جاری', color: c }, prev: { label: 'سال قبل', color: p } }} className="ind-mini" aria-hidden="true">
      <AreaChart data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
        <XAxis dataKey="month" hide />
        <YAxis hide domain={[0, 'dataMax']} />
        <ChartTooltip
          cursor={false}
          position={{ y: -96 }}
          allowEscapeViewBox={{ x: true, y: true }}
<<<<<<< HEAD
          wrapperStyle={{ zIndex: 15 }}
=======
          wrapperStyle={{ zIndex: 35 }}
>>>>>>> scm-v1/main
          content={({ active, payload }) => {
            const row = payload?.[0]?.payload as (typeof data)[number] | undefined
            if (!row) return null
            const items = [...(row.cur != null ? [{ key: 'c', name: `سال مالی ${faDigits(String(f.fy))}`, color: c, value: `${fa(row.cur, d)} ${unit}` }] : []), ...(row.prev != null ? [{ key: 'p', name: `سال مالی ${faDigits(String(f.fy - 1))}`, color: p, value: `${fa(row.prev, d)} ${unit}` }] : [])]
            return <Tip active={active} label={`تا پایان ${monthOnly(row.month)}`} items={items} />
          }}
        />
        <Area dataKey="prev" type="linear" stroke={p} strokeWidth={1.3} strokeDasharray="3 3" fill="none" dot={false} activeDot={false} connectNulls={false} isAnimationActive={false} />
        <Area dataKey="cur" type="linear" stroke={c} strokeWidth={1.8} fill={c} fillOpacity={0.12} dot={false} activeDot={{ r: 2.5, fill: c, stroke: 'var(--color-card)' }} connectNulls={false} isAnimationActive={false} />
      </AreaChart>
    </ChartContainer>
  )
}
