import { Area, AreaChart, Bar, BarChart, Cell, YAxis } from 'recharts'
import { ChartContainer, ChartTooltip } from '../../components/ui/chart'
import { BY_YEAR_AFTER } from '../../lib/industry/derive'
import { fxKpis } from '../../lib/industry/fxflows'
import type { FxKpi, FxKpiId, FxRecord } from '../../lib/industry/fxflows'
import type { FxRow } from '../../lib/industry/fx'
import { fa } from '../../lib/industry/format'
import { faDigits, monthName } from '../../lib/industry/months'
import { Change } from './KpiCards'
import { Tip } from './parts'
import type { CardCtx } from './parts'

const META: Record<FxKpiId, { label: string; color: string; unit: string; d: number; caption: string }> = {
  uses: { label: 'مصارف ارزی ماه', color: 'var(--raw-orange-500)', unit: 'میلیارد ریال', d: 1, caption: 'نسبت به ماه قبل' },
  sources: { label: 'منابع ارزی ماه', color: 'var(--raw-emerald-600)', unit: 'میلیارد ریال', d: 1, caption: 'نسبت به ماه قبل' },
  usdRate: { label: 'نرخ دلار گزارش‌شده شرکت', color: 'var(--raw-blue-600)', unit: 'ریال', d: 0, caption: 'نسبت به ماه قبل' },
  ratio: { label: 'نرخ شرکت نسبت به دلار بازار', color: 'var(--raw-violet-500)', unit: '٪', d: 1, caption: '۱۰۰٪ یعنی برابر نرخ دلار بازار' },
}
const ORDER: FxKpiId[] = ['uses', 'sources', 'usdRate', 'ratio']
const NONE: Record<FxKpiId, string> = {
  uses: 'در این ماه مصرف ارزی ثبت نشده است',
  sources: 'در این ماه منبع ارزی ثبت نشده است',
  usdRate: 'در این ماه قلم دلاری غیرصفری گزارش نشده است',
  ratio: 'نرخ شرکت یا دلار بازار این ماه ثبت نشده است',
}

/** «منابع و مصارف ارزی»: four cards for the end month; amounts as bars, rates as a line */
export function FxKpis({ ctx, rows, fx }: { ctx: CardCtx; rows: FxRecord[]; fx: Map<string, FxRow> | null }) {
  const res = ctx.ds && fx && ctx.status === 'ready' ? fxKpis(rows, fx, ctx.ds, ctx.range) : null
  const busy = ctx.status === 'loading'
  return (
    <section className="ind-kpis" aria-label="شاخص‌های ارزی ماه پایان" aria-busy={busy || undefined}>
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
              <Body k={k} months={res.months} />
            ) : (
              <p className="ind-kpi__none">{ctx.status === 'error' ? 'دریافت داده ناموفق بود' : ctx.noSymbolData ? 'برای این نماد داده‌ای ثبت نشده است' : res ? NONE[id] : 'برای این بازه داده‌ای ثبت نشده است'}</p>
            )}
          </article>
        )
      })}
    </section>
  )
}

function Body({ k, months }: { k: FxKpi; months: string[] }) {
  const m = META[k.id]
  return (
    <>
      <p className="ind-kpi__value">
        <span className="ind-kpi__num n">{fa(k.value, m.d)}</span>
        <span className="ind-kpi__unit">{m.unit}</span>
        {k.id !== 'ratio' && <Change x={k.change} />}
      </p>
      <div className="ind-kpi__foot">
        <p className="ind-kpi__caption">{m.caption}</p>
        {k.id === 'usdRate' || k.id === 'ratio' ? <MiniLine k={k} months={months} /> : <MiniBars k={k} months={months} />}
      </div>
    </>
  )
}

const tipFor = (label: string, color: string, value: string | null, tip: string) => <Tip active label={tip} items={value == null ? [] : [{ key: 'v', name: label, color, value }]} />
const fmt = (k: FxKpi, v: number) => (k.id === 'ratio' ? `${fa(v, 1)}٪` : `${fa(v, META[k.id].d)} ${META[k.id].unit}`)

/** Amounts: one bar a month (a year past two years), the end month in full colour */
function MiniBars({ k, months }: { k: FxKpi; months: string[] }) {
  const m = META[k.id]
  const byYear = months.length > BY_YEAR_AFTER
  const data = byYear ? k.years.map((y) => ({ key: String(y.year), v: y.v, tip: `سال ${faDigits(String(y.year))}${y.months < 12 ? ` (${fa(y.months)} ماه)` : ''}` })) : k.bars.map((v, i) => ({ key: months[i], v, tip: monthName(months[i]) }))
  if (data.length < 2) return null
  const last = data.length - 1
  return (
    <ChartContainer config={{ v: { label: m.label, color: m.color } }} className="ind-mini" aria-hidden="true">
      <BarChart data={data} margin={{ top: 1, right: 1, bottom: 1, left: 1 }} barCategoryGap={1.2}>
        <YAxis hide domain={[0, 'dataMax']} />
        <ChartTooltip
          cursor={false}
          position={{ y: -84 }}
          allowEscapeViewBox={{ x: true, y: true }}
          wrapperStyle={{ zIndex: 15 }}
          content={({ active, payload }) => (active && payload?.[0] ? tipFor(m.label, m.color, payload[0].value == null ? null : fmt(k, Number(payload[0].value)), String(payload[0].payload.tip)) : null)}
        />
        <Bar dataKey="v" maxBarSize={10} radius={[2.6, 2.6, 0, 0]} minPointSize={1.5} isAnimationActive={false}>
          {data.map((d, i) => (
            <Cell key={d.key} fill={m.color} fillOpacity={i === last ? 1 : 0.28} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  )
}

/** Rates: a thin line over the months of the range (a month without a figure stays a gap) */
function MiniLine({ k, months }: { k: FxKpi; months: string[] }) {
  const m = META[k.id]
  const data = k.bars.map((v, i) => ({ key: months[i], v, tip: monthName(months[i]) }))
  if (data.filter((d) => d.v != null).length < 2) return null
  return (
    <ChartContainer config={{ v: { label: m.label, color: m.color } }} className="ind-mini" aria-hidden="true">
      <AreaChart data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
        <YAxis hide domain={['dataMin', 'dataMax']} />
        <ChartTooltip
          cursor={false}
          position={{ y: -84 }}
          allowEscapeViewBox={{ x: true, y: true }}
          wrapperStyle={{ zIndex: 15 }}
          content={({ active, payload }) => (active && payload?.[0] ? tipFor(m.label, m.color, payload[0].value == null ? null : fmt(k, Number(payload[0].value)), String(payload[0].payload.tip)) : null)}
        />
        <Area dataKey="v" type="linear" stroke={m.color} strokeWidth={1.8} fill={m.color} fillOpacity={0.1} dot={false} activeDot={{ r: 2.5, fill: m.color, stroke: 'var(--color-card)' }} connectNulls={false} isAnimationActive={false} />
      </AreaChart>
    </ChartContainer>
  )
}
