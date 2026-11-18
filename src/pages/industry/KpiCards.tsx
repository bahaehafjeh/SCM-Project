import { Bar, BarChart, Cell, YAxis } from 'recharts'
import { ChartContainer, ChartTooltip } from '../../components/ui/chart'
import { BY_YEAR_AFTER, UNIT_LABEL, dataMonthsIn, kpisOf } from '../../lib/industry/derive'
import type { Kpi, KpiId } from '../../lib/industry/derive'
import { fa } from '../../lib/industry/format'
import { faDigits, monthName } from '../../lib/industry/months'
import type { CardCtx } from './parts'
import { Arrow, Tip } from './parts'

const META: Record<KpiId, { label: string; caption: string; color: string; d: number }> = {
  amount: { label: 'مبلغ کل خرید', caption: 'نسبت به ماه قبل', color: 'var(--raw-blue-600)', d: 1 },
  qty: { label: 'مقدار اقلام با واحد تن', caption: 'فقط اقلام با واحد قابل مقایسه', color: 'var(--raw-emerald-600)', d: 0 },
  importShare: { label: 'سهم مواد وارداتی', caption: 'از مبلغ خرید', color: 'var(--raw-orange-500)', d: 1 },
  rate: { label: 'نرخ دلار بازار', caption: 'آخرین نرخ موجود تا پایان ماه', color: 'var(--raw-violet-500)', d: 0 },
}
const unitOf = (id: KpiId, ctx: CardCtx) => (id === 'amount' ? UNIT_LABEL[ctx.unit] : id === 'qty' ? 'تن' : id === 'importShare' ? '٪ از مبلغ خرید' : 'ریال')

/** The change against the month before, beside the figure: a green chevron up, a red one down, grey when flat */
export function Change({ x, vs = 'ماه قبل' }: { x: number | null; vs?: string }) {
  if (x == null) return null
  if (Math.abs(x) < 0.05) return <span className="ind-chg is-zero n">۰٪</span>
  return (
    <span className={`ind-chg ${x > 0 ? 'is-up' : 'is-down'}`} aria-label={`${x > 0 ? 'افزایش' : 'کاهش'} ${fa(Math.abs(x), 1)} درصد نسبت به ${vs}`}>
      <Arrow up={x > 0} />
      <span className="n">{fa(Math.abs(x), 1)}٪</span>
    </span>
  )
}

/** Four cards for the end month (page-prompt §7) */
export function KpiCards({ ctx }: { ctx: CardCtx }) {
  const kpis = ctx.ds && ctx.status === 'ready' ? kpisOf(ctx.ds, ctx.range, ctx.unit) : null
  const months = ctx.ds ? dataMonthsIn(ctx.ds, ctx.range) : []
  const busy = ctx.status === 'loading'
  return (
    <section className="ind-kpis" aria-label="شاخص‌های ماه پایان" aria-busy={busy || undefined}>
      {(['amount', 'qty', 'importShare', 'rate'] as KpiId[]).map((id) => {
        const k = kpis?.find((x) => x.id === id)
        return (
          <article key={id} className="ind-kpi">
            <p className="ind-kpi__label">{META[id].label}</p>
            {busy ? (
              <>
                <span className="ind-skel ind-skel--30" />
                <span className="ind-skel ind-skel--14" />
              </>
            ) : k ? (
              <KpiBody k={k} id={id} unit={unitOf(id, ctx)} months={months} />
            ) : (
              <p className="ind-kpi__none">{ctx.status === 'error' ? 'دریافت داده ناموفق بود' : ctx.noSymbolData ? 'برای این نماد داده‌ای ثبت نشده است' : 'برای این بازه داده‌ای ثبت نشده است'}</p>
            )}
          </article>
        )
      })}
    </section>
  )
}

function KpiBody({ k, id, unit, months }: { k: Kpi; id: KpiId; unit: string; months: string[] }) {
  const m = META[id]
  // Long ranges: one bar per year (the last ten), a short year (cut by the data or the range) says how many months it holds
  const byYear = months.length > BY_YEAR_AFTER
  const data = byYear ? k.years.map((y) => ({ key: String(y.year), v: y.v, tip: `سال ${faDigits(String(y.year))}${y.months < 12 ? ` (${fa(y.months)} ماه)` : ''}` })) : k.bars.map((v, i) => ({ key: months[i], v, tip: monthName(months[i]) }))
  const tooltip = (
    <ChartTooltip
      cursor={false}
      position={{ y: -84 }}
      allowEscapeViewBox={{ x: true, y: true }}
      wrapperStyle={{ zIndex: 15 }}
      content={({ active, payload }) => <Tip active={active} label={payload?.[0] ? String(payload[0].payload.tip) : null} items={payload?.[0] && payload[0].value != null ? [{ key: 'v', name: m.label, color: m.color, value: `${fa(Number(payload[0].value), m.d)} ${unit}` }] : []} />}
    />
  )
  const last = data.length - 1
  return (
    <>
      <p className="ind-kpi__value">
        <span className="ind-kpi__num n">{fa(k.value, id === 'amount' && unit !== 'هزار دلار' ? 0 : m.d)}</span>
        <span className="ind-kpi__unit">{unit}</span>
        <Change x={k.change} />
      </p>
      <div className="ind-kpi__foot">
        <div>
          <p className="ind-kpi__caption">{m.caption}</p>
        </div>
        {/* One month has nothing to compare, so no chart */}
        {data.length > 1 && (
          <ChartContainer config={{ v: { label: m.label, color: m.color } }} className="ind-mini" aria-hidden="true">
            <BarChart data={data} margin={{ top: 1, right: 1, bottom: 1, left: 1 }} barCategoryGap={1.2}>
              <YAxis hide domain={[0, 'dataMax']} />
              {tooltip}
              <Bar dataKey="v" maxBarSize={10} radius={[2.6, 2.6, 0, 0]} minPointSize={1.5} isAnimationActive={false}>
                {data.map((d, i) => (
                  <Cell key={d.key} fill={m.color} fillOpacity={i === last ? 1 : 0.28} />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        )}
      </div>
    </>
  )
}
