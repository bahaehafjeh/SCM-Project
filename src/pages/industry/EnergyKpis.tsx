import { Area, AreaChart, Bar, BarChart, Cell, ReferenceLine, XAxis, YAxis } from 'recharts'
import { ChartContainer, ChartTooltip } from '../../components/ui/chart'
import { BY_YEAR_AFTER } from '../../lib/industry/derive'
import { ENERGY_UNIT_LABEL, energyKpis } from '../../lib/industry/energy'
import type { EnergyKpi, EnergyKpiId, EnergySet, WaterFiscalLines } from '../../lib/industry/energy'
import { fa, signed } from '../../lib/industry/format'
import { faDigits, monthName, monthOnly, shiftMonth } from '../../lib/industry/months'
import { Change } from './KpiCards'
import { Tip } from './parts'
import type { CardCtx } from './parts'

const UP = 'var(--raw-emerald-600)'
const DOWN = 'var(--raw-red-600)'
const META: Record<EnergyKpiId, { label: string; color: string; unit?: string }> = {
  totalCost: { label: 'هزینه کل انرژی', color: 'var(--raw-blue-600)' },
  gas: { label: 'مصرف گاز طبیعی', color: UP, unit: 'مترمکعب' },
  electricity: { label: 'مصرف برق', color: 'var(--raw-orange-500)', unit: 'مگاوات ساعت' },
  wellWater: { label: 'مصرف آب چاه', color: 'var(--raw-blue-600)', unit: 'مترمکعب' },
}
const ORDER: EnergyKpiId[] = ['totalCost', 'gas', 'electricity', 'wellWater']

/** «انرژی»: four KPI cards for the end month with contextual mini-charts */
export function EnergyKpis({ ctx, energy }: { ctx: CardCtx; energy: EnergySet | null }) {
  const res = ctx.ds && energy && ctx.status === 'ready' ? energyKpis(energy, ctx.ds, ctx.range, ctx.unit) : null
  const busy = ctx.status === 'loading'
  const currencyUnit = ENERGY_UNIT_LABEL[ctx.unit]

  return (
    <section className="ind-kpis" aria-label="شاخص‌های انرژی ماه پایان" aria-busy={busy || undefined}>
      {ORDER.map((id) => {
        const k = res?.kpis.find((x) => x.id === id)
        const u = META[id].unit ?? currencyUnit
        return (
          <article key={id} className="ind-kpi">
            <p className="ind-kpi__label">{META[id].label}</p>
            {busy ? (
              <>
                <span className="ind-skel ind-skel--30" />
                <span className="ind-skel ind-skel--14" />
              </>
            ) : k && res && k.value != null ? (
              <Body k={k} months={res.months} waterFiscal={res.waterFiscal} unit={u} />
            ) : (
              <p className="ind-kpi__none">
                {ctx.status === 'error'
                  ? 'دریافت داده ناموفق بود'
                  : ctx.noSymbolData
                    ? 'برای این نماد داده‌ای ثبت نشده است'
                    : id === 'totalCost' && ctx.unit === 'usd'
                      ? 'نرخ تبدیل دلاری برای این ماه ثبت نشده است'
                      : 'برای این بازه داده‌ای ثبت نشده است'}
              </p>
            )}
          </article>
        )
      })}
    </section>
  )
}

function Body({ k, months, waterFiscal, unit }: { k: EnergyKpi; months: string[]; waterFiscal: WaterFiscalLines; unit: string }) {
  const end = months[months.length - 1]
  const dec = k.id === 'totalCost' ? 1 : 0
  const caption =
    k.id === 'totalCost'
      ? 'نسبت به ماه قبل'
      : k.id === 'gas'
        ? `در برابر ${monthName(shiftMonth(end, -12))}`
        : k.id === 'electricity'
          ? 'نسبت به ماه قبل'
          : `سال مالی ${faDigits(String(waterFiscal.fy))}`
  const vs = k.id === 'gas' ? 'همان ماه سال قبل' : k.id === 'wellWater' ? 'همان دوره سال مالی قبل' : 'ماه قبل'

  return (
    <>
      <p className="ind-kpi__value">
        <span className="ind-kpi__num n">{fa(k.value, dec)}</span>
        <span className="ind-kpi__unit">{unit}</span>
        <Change x={k.change} vs={vs} />
      </p>
      <div className="ind-kpi__foot">
        <p className="ind-kpi__caption">{caption}</p>
        {k.id === 'wellWater' ? <WaterFiscalMini f={waterFiscal} unit={unit} /> : <MiniBars k={k} months={months} unit={unit} />}
      </div>
    </>
  )
}

function MiniBars({ k, months, unit }: { k: EnergyKpi; months: string[]; unit: string }) {
  const m = META[k.id]
  const byYear = months.length > BY_YEAR_AFTER
  const diverging = k.id === 'gas'
  const data = byYear
    ? k.years.map((y) => ({
        key: String(y.year),
        v: y.v,
        tip: `سال ${faDigits(String(y.year))}${y.months < 12 ? ` (${fa(y.months)} ماه)` : ''}`,
      }))
    : k.bars.map((v, i) => ({ key: months[i], v, tip: monthName(months[i]) }))
  if (data.length < 2) return null
  const last = data.length - 1
  const fmt = (v: number) => (diverging ? <span className="n">{signed(v, 1)}٪</span> : `${fa(v, k.id === 'totalCost' ? 1 : 0)} ${unit}`)
  const tipName = diverging ? 'تغییر سالانه مصرف گاز' : m.label

  return (
    <ChartContainer config={{ v: { label: tipName, color: m.color } }} className="ind-mini" aria-hidden="true">
      <BarChart data={data} margin={{ top: 1, right: 1, bottom: 1, left: 1 }} barCategoryGap={1.2}>
        <YAxis hide domain={diverging ? ['dataMin', 'dataMax'] : [0, 'dataMax']} />
        {diverging && <ReferenceLine y={0} stroke="var(--color-border)" />}
        <ChartTooltip
          cursor={false}
          position={{ y: -84 }}
          allowEscapeViewBox={{ x: true, y: true }}
          wrapperStyle={{ zIndex: 35 }}
          content={({ active, payload }) => (
            <Tip
              active={active}
              label={payload?.[0] ? String(payload[0].payload.tip) : null}
              items={
                payload?.[0] && payload[0].value != null
                  ? [{ key: 'v', name: tipName, color: diverging ? (Number(payload[0].value) < 0 ? DOWN : UP) : m.color, value: fmt(Number(payload[0].value)) }]
                  : []
              }
            />
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

function WaterFiscalMini({ f, unit }: { f: WaterFiscalLines; unit: string }) {
  const data = f.labels.map((month, i) => ({ month, cur: f.cur[i] ?? null, prev: f.prev[i] ?? null }))
  const c = META.wellWater.color
  const p = 'var(--raw-neutral-400)'

  return (
    <ChartContainer config={{ cur: { label: 'سال مالی جاری', color: c }, prev: { label: 'سال مالی قبل', color: p } }} className="ind-mini" aria-hidden="true">
      <AreaChart data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
        <XAxis dataKey="month" hide />
        <YAxis hide domain={[0, 'dataMax']} />
        <ChartTooltip
          cursor={false}
          position={{ y: -96 }}
          allowEscapeViewBox={{ x: true, y: true }}
          wrapperStyle={{ zIndex: 35 }}
          content={({ active, payload }) => {
            const row = payload?.[0]?.payload as (typeof data)[number] | undefined
            if (!row) return null
            const items = [
              ...(row.cur != null ? [{ key: 'c', name: `تجمعی ${faDigits(String(f.fy))}`, color: c, value: `${fa(row.cur, 0)} ${unit}` }] : []),
              ...(row.prev != null ? [{ key: 'p', name: `تجمعی ${faDigits(String(f.fy - 1))}`, color: p, value: `${fa(row.prev, 0)} ${unit}` }] : []),
            ]
            return <Tip active={active} label={`تا پایان ${monthOnly(row.month)}`} items={items} />
          }}
        />
        <Area dataKey="prev" type="linear" stroke={p} strokeWidth={1.3} strokeDasharray="3 3" fill="none" dot={false} activeDot={false} connectNulls={false} isAnimationActive={false} />
        <Area dataKey="cur" type="linear" stroke={c} strokeWidth={1.8} fill={c} fillOpacity={0.12} dot={false} activeDot={{ r: 2.5, fill: c, stroke: 'var(--color-card)' }} connectNulls={false} isAnimationActive={false} />
      </AreaChart>
    </ChartContainer>
  )
}
