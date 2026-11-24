import { useEffect, useId, useRef, useState } from 'react'
import { MousePointerClick, X } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, ReferenceArea, XAxis, YAxis } from 'recharts'
import { ChartContainer, ChartTooltip } from '../../components/ui/chart'
import { BY_YEAR_AFTER, dataMonthsIn } from '../../lib/industry/derive'
import { fa, niceTicks, signed } from '../../lib/industry/format'
import { fxBalanceRows, fxBalanceYears } from '../../lib/industry/fxflows'
import type { FxBalanceRow, FxBalanceYear, FxRecord } from '../../lib/industry/fxflows'
import { AXIS, faDigits, monthOf, yearOf } from '../../lib/industry/months'
import { MONTH_AXIS, Card, Tip, barPath, stateOf, tipLabel } from './parts'
import type { CardCtx } from './parts'

const H = 310
const POP_W = 440
const COLOR_SRC = 'var(--raw-emerald-600)'
const COLOR_USE = 'var(--raw-orange-500)'
const COLOR_DEF = 'var(--raw-red-600)'
const SEG_GAP = 3

type HoverPart = 'sources' | 'uses' | 'surplus' | 'deficit' | null

const baseSegmentBar =
  (color: string, diffKey: 'surplus' | 'deficit', r = 5, getOpacity: () => number) =>
  ({ x = 0, y = 0, width = 0, height = 0, payload }: { x?: number; y?: number; width?: number; height?: number; payload?: FxBalanceRow }) => {
    if (!(height > 0) || !(width > 0)) return <g />
    const hasDiff = (payload?.[diffKey] ?? 0) > 0
    const y1 = y + height
    const y0 = hasDiff ? Math.min(y1 - 2, y + SEG_GAP / 2) : y
    const radius = hasDiff ? 0 : Math.min(r, width / 2, Math.max(0, y1 - y0))
    return <path d={barPath(x, width, y0, y1, radius, 0)} fill={color} fillOpacity={getOpacity()} />
  }

const hatchGapBar =
  (patId: string, strokeColor: string, baseKey: 'sources' | 'uses', r = 5, getOpacity: () => number) =>
  ({ x = 0, y = 0, width = 0, height = 0, payload }: { x?: number; y?: number; width?: number; height?: number; payload?: FxBalanceRow }) => {
    if (!(height > 0) || !(width > 0)) return <g />
    const hasBase = (payload?.[baseKey] ?? 0) > 0
    const y1 = hasBase ? Math.max(y + 2, y + height - SEG_GAP / 2) : y + height
    const h = Math.max(0, y1 - y)
    const radius = Math.min(r, width / 2, h)
    return (
      <path
        d={barPath(x, width, y, y1, radius, 0)}
        fill={`url(#${patId})`}
        fillOpacity={getOpacity()}
        stroke={strokeColor}
        strokeOpacity={getOpacity() * 0.55}
        strokeWidth={1}
      />
    )
  }

/** «جمع منابع و مصارف ارزی»: paired columns with green hatched surplus (`منابع > مصارف`) and red hatched deficit (`منابع < مصارف`) */
export function FxBalanceCard({ ctx, records }: { ctx: CardCtx; records: FxRecord[] }) {
  const [open, setOpen] = useState<{ year: number; x: number } | null>(null)
  const [hoverYear, setHoverYear] = useState<number | null>(null)
  const [hoverPart, setHoverPart] = useState<HoverPart>(null)
  const wrap = useRef<HTMLDivElement>(null)
  const patId = useId().replace(/:/g, '')

  const months = ctx.ds ? dataMonthsIn(ctx.ds, ctx.range) : []
  const has = months.length > 0 && records.length > 0
  const byYear = months.length > BY_YEAR_AFTER
  const monthly = ctx.ds ? fxBalanceRows(records, ctx.ds, ctx.range, ctx.unit) : []
  const rows: FxBalanceRow[] = byYear ? fxBalanceYears(monthly) : monthly

  const unit = ctx.unit === 'usd' ? 'هزار دلار' : 'میلیارد ریال'
  const maxVal = Math.max(0, ...rows.flatMap((r) => [r.sources ?? 0, r.uses ?? 0]))
  const axis = niceTicks(maxVal, 6)

  useEffect(() => setOpen(null), [byYear, ctx.range.from, ctx.range.to])
  useEffect(() => {
    if (!open) return
    const key = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(null)
    const down = (e: PointerEvent) => !wrap.current?.contains(e.target as Node) && setOpen(null)
    document.addEventListener('keydown', key)
    document.addEventListener('pointerdown', down)
    return () => (document.removeEventListener('keydown', key), document.removeEventListener('pointerdown', down))
  }, [open])

  const width = wrap.current?.clientWidth ?? 800
  const popW = Math.min(POP_W, width)
  const popLeft = open ? Math.max(0, Math.min(width - popW, open.x - popW / 2)) : 0
  const yearMonths = open ? monthly.filter((r) => yearOf(r.month) === open.year) : []
  const yearMax = Math.max(0, ...yearMonths.flatMap((r) => [r.sources ?? 0, r.uses ?? 0]))
  const yearAxis = niceTicks(yearMax, 5)

  const tipItems = (row: FxBalanceRow | undefined) => {
    if (!row) return []
    if (row.hatched) return [{ key: 'none', name: 'نرخ دلار بازار ثبت نشده است', color: 'var(--color-border)', value: '—' }]
    const list = [
      { key: 'src', name: 'منابع ارزی', color: COLOR_SRC, value: `${fa(row.sources ?? 0, 1)} ${unit}` },
      { key: 'use', name: 'مصارف ارزی', color: COLOR_USE, value: `${fa(row.uses ?? 0, 1)} ${unit}` },
    ]
    const missing = (row as FxBalanceYear).missing
    if (missing) {
      list.push({ key: 'miss', name: `${fa(missing)} ماه بدون نرخ دلاری`, color: 'var(--color-border)', value: '' })
    }
    return list
  }

  const tipSummary = (row: FxBalanceRow | undefined) => {
    if (!row || row.hatched || row.net == null) return undefined
    const cls = row.net > 0 ? 'is-up' : row.net < 0 ? 'is-down' : ''
    return {
      label: 'خالص تراز (منابع − مصارف)',
      value: (
        <span className={`n ${cls}`}>
          {signed(row.net, 1)} {unit}
        </span>
      ),
    }
  }

  const yearLabel = (y: FxBalanceYear) => `سال ${faDigits(String(y.year))}${y.months < 12 ? ` (${fa(y.months)} ماه)` : ''}`
  const opacityFor = (part: Exclude<HoverPart, null>) => () => (hoverPart == null || hoverPart === part ? 1 : 0.25)

  return (
    <Card
      ctx={ctx}
      state={stateOf(ctx, has)}
      title="جمع منابع و مصارف ارزی"
      subtitle={
        byYear
          ? `مقایسه سالانه منابع و مصارف ارزی (${unit})؛ اختلاف دو ستون با هاشور سبز (مثبت) یا قرمز (منفی)`
          : `دو ستون برای هر ماه (${unit})؛ اختلاف منابع منهای مصارف با هاشور سبز (مثبت) یا قرمز (منفی)`
      }
      guide={`هر یک از ستون‌های منابع و مصارف به ${unit} با اندازه واقعی خود رسم می‌شوند و اختلاف بین آن‌ها با هاشور بالای ستون کوتاه‌تر نشان داده می‌شود: اگر منابع بیشتر از مصارف باشد (مثبت) هاشور سبز بالای ستون مصارف و اگر منابع کمتر از مصارف باشد (منفی) هاشور قرمز بالای ستون منابع قرار می‌گیرد.${byYear ? ' در بازه‌های بیش از ۲ سال، ستون‌ها سالانه هستند و با کلیک روی هر سال، ماه‌های آن در پنجره باز می‌شوند.' : ''}${ctx.unit === 'usd' ? ' برای ۱۴۰۴/۰۲ و ۱۴۰۴/۰۳ نرخ دلاری ثبت نشده است.' : ''} داده‌ها نمونه‌اند.`}
    >
      <div ref={wrap} className={`ind-ywrap ${byYear ? 'is-years' : ''}`}>
        <ChartContainer
          config={{
            sources: { label: 'منابع', color: COLOR_SRC },
            deficit: { label: 'اختلاف منفی (کسری)', color: COLOR_DEF },
            uses: { label: 'مصارف', color: COLOR_USE },
            surplus: { label: 'اختلاف مثبت (مازاد)', color: COLOR_SRC },
          }}
          className="ind-chart"
          style={{ height: H }}
          role="img"
          aria-label={`جمع منابع و مصارف ارزی، ${unit}، ${AXIS[ctx.range.from]} تا ${AXIS[ctx.range.to]}`}
        >
          <BarChart
            data={rows}
            margin={{ top: 14, right: 12, bottom: 4, left: 4 }}
            barGap={4}
            barCategoryGap={byYear ? '32%' : '26%'}
            onClick={(s: { activeLabel?: string | number; activeCoordinate?: { x?: number } }) => {
              if (!byYear || s?.activeLabel == null) return
              const year = Number(s.activeLabel)
              setOpen((o) => (o?.year === year ? null : { year, x: s.activeCoordinate?.x ?? 0 }))
            }}
            onMouseMove={(s: { activeLabel?: string | number }) => setHoverYear(byYear && s?.activeLabel != null ? Number(s.activeLabel) : null)}
            onMouseLeave={() => setHoverYear(null)}
          >
            <defs>
              <pattern id={`${patId}-sur`} width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <rect width="7" height="7" fill="color-mix(in srgb, var(--raw-emerald-600) 14%, transparent)" />
                <line x1="0" y1="0" x2="0" y2="7" stroke={COLOR_SRC} strokeWidth="2.4" strokeOpacity="0.88" />
              </pattern>
              <pattern id={`${patId}-def`} width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <rect width="7" height="7" fill="color-mix(in srgb, var(--raw-red-600) 14%, transparent)" />
                <line x1="0" y1="0" x2="0" y2="7" stroke={COLOR_DEF} strokeWidth="2.4" strokeOpacity="0.88" />
              </pattern>
              <pattern id={`${patId}-miss`} width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <rect width="8" height="8" fill="var(--color-unofficial-body-background, var(--color-background))" />
                <line x1="0" y1="0" x2="0" y2="8" stroke="var(--color-border)" strokeWidth="3" />
              </pattern>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="2 4" />
            {byYear ? (
              <XAxis dataKey="month" interval={0} tickFormatter={(y: string) => faDigits(y)} tickLine={false} axisLine={{ stroke: 'var(--color-border)' }} tickMargin={8} />
            ) : (
              <XAxis {...MONTH_AXIS} />
            )}
            <YAxis domain={[0, axis.max]} ticks={axis.ticks} allowDataOverflow tickFormatter={(v: number) => fa(v, 0)} tickLine={false} axisLine={{ stroke: 'var(--color-border)' }} width={66} />
            {rows
              .filter((r) => r.hatched)
              .map((r) => (
                <ReferenceArea key={r.month} x1={r.month} x2={r.month} y1={0} y2={axis.max} fill={`url(#${patId}-miss)`} fillOpacity={1} radius={6} ifOverflow="hidden" />
              ))}
            {byYear && hoverYear != null && hoverYear !== open?.year && (
              <ReferenceArea x1={String(hoverYear)} x2={String(hoverYear)} y1={0} y2={axis.max} fill="var(--brand-shades-50)" fillOpacity={0.5} stroke="var(--brand-shades-300)" strokeDasharray="4 3" radius={8} ifOverflow="hidden" />
            )}
            {open && (
              <ReferenceArea x1={String(open.year)} x2={String(open.year)} y1={0} y2={axis.max} fill="var(--brand-shades-50)" fillOpacity={0.6} stroke="var(--brand-shades-600)" strokeWidth={1.5} radius={8} ifOverflow="hidden" />
            )}
            <ChartTooltip
              cursor={{ fill: 'var(--color-muted)', opacity: 0.55 }}
              content={({ active, label, payload }) => {
                const row = payload?.[0]?.payload as FxBalanceRow | undefined
                return (
                  <Tip
                    active={active && !open}
                    label={byYear && row ? yearLabel(row as FxBalanceYear) : tipLabel(label)}
                    items={tipItems(row)}
                    summary={tipSummary(row)}
                    foot={
                      byYear ? (
                        <>
                          <MousePointerClick size={13} aria-hidden="true" /> کلیک برای دیدن ماه‌ها
                        </>
                      ) : undefined
                    }
                  />
                )
              }}
            />
            <Bar dataKey="sources" stackId="src" maxBarSize={26} shape={baseSegmentBar(COLOR_SRC, 'deficit', 5, opacityFor('sources'))} isAnimationActive={false} />
            <Bar dataKey="deficit" stackId="src" maxBarSize={26} shape={hatchGapBar(`${patId}-def`, COLOR_DEF, 'sources', 5, opacityFor('deficit'))} isAnimationActive={false} />
            <Bar dataKey="uses" stackId="uses" maxBarSize={26} shape={baseSegmentBar(COLOR_USE, 'surplus', 5, opacityFor('uses'))} isAnimationActive={false} />
            <Bar dataKey="surplus" stackId="uses" maxBarSize={26} shape={hatchGapBar(`${patId}-sur`, COLOR_SRC, 'uses', 5, opacityFor('surplus'))} isAnimationActive={false} />
          </BarChart>
        </ChartContainer>

        {open && (
          <div className="ind-ypop" role="dialog" aria-label={`ماه‌های سال ${faDigits(String(open.year))}`} style={{ left: popLeft, width: popW }}>
            <div className="ind-ypop__head">
              <b>ماه‌های سال {faDigits(String(open.year))}</b>
              <button type="button" className="ind-ypop__close" aria-label="بستن" onClick={() => setOpen(null)}>
                <X size={15} aria-hidden="true" />
              </button>
            </div>
            <ChartContainer
              config={{
                sources: { label: 'منابع', color: COLOR_SRC },
                deficit: { label: 'اختلاف منفی (کسری)', color: COLOR_DEF },
                uses: { label: 'مصارف', color: COLOR_USE },
                surplus: { label: 'اختلاف مثبت (مازاد)', color: COLOR_SRC },
              }}
              className="ind-ypop__chart"
              style={{ height: 170 }}
            >
              <BarChart data={yearMonths} margin={{ top: 8, right: 6, bottom: 2, left: 2 }} barGap={2} barCategoryGap="22%">
                <defs>
                  <pattern id={`${patId}-pop-sur`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                    <rect width="6" height="6" fill="color-mix(in srgb, var(--raw-emerald-600) 14%, transparent)" />
                    <line x1="0" y1="0" x2="0" y2="6" stroke={COLOR_SRC} strokeWidth="2.2" strokeOpacity="0.88" />
                  </pattern>
                  <pattern id={`${patId}-pop-def`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                    <rect width="6" height="6" fill="color-mix(in srgb, var(--raw-red-600) 14%, transparent)" />
                    <line x1="0" y1="0" x2="0" y2="6" stroke={COLOR_DEF} strokeWidth="2.2" strokeOpacity="0.88" />
                  </pattern>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="2 4" />
                <XAxis dataKey="month" interval={0} tickFormatter={(m: string) => faDigits(String(monthOf(m)).padStart(2, '0'))} tickLine={false} axisLine={{ stroke: 'var(--color-border)' }} tickMargin={6} fontSize={11} />
                <YAxis domain={[0, yearAxis.max]} ticks={yearAxis.ticks} tickFormatter={(v: number) => fa(v, 0)} tickLine={false} axisLine={false} width={52} fontSize={10} />
                <ChartTooltip
                  cursor={{ fill: 'var(--color-muted)', opacity: 0.6 }}
                  position={{ y: 0 }}
                  allowEscapeViewBox={{ x: true, y: true }}
                  wrapperStyle={{ zIndex: 40, pointerEvents: 'none' }}
                  content={({ active, label, payload }) => {
                    const row = payload?.[0]?.payload as FxBalanceRow | undefined
                    return (
                      <div className="ind-tip-above">
                        <Tip active={active} label={tipLabel(label)} items={tipItems(row)} summary={tipSummary(row)} />
                      </div>
                    )
                  }}
                />
                <Bar dataKey="sources" stackId="src" maxBarSize={14} shape={baseSegmentBar(COLOR_SRC, 'deficit', 3, opacityFor('sources'))} isAnimationActive={false} />
                <Bar dataKey="deficit" stackId="src" maxBarSize={14} shape={hatchGapBar(`${patId}-pop-def`, COLOR_DEF, 'sources', 3, opacityFor('deficit'))} isAnimationActive={false} />
                <Bar dataKey="uses" stackId="uses" maxBarSize={14} shape={baseSegmentBar(COLOR_USE, 'surplus', 3, opacityFor('uses'))} isAnimationActive={false} />
                <Bar dataKey="surplus" stackId="uses" maxBarSize={14} shape={hatchGapBar(`${patId}-pop-sur`, COLOR_SRC, 'uses', 3, opacityFor('surplus'))} isAnimationActive={false} />
              </BarChart>
            </ChartContainer>
          </div>
        )}
      </div>

      <div className="ind-legend ind-legend--interactive" role="group" aria-label="راهنمای نمودار منابع و مصارف ارزی">
        <button
          type="button"
          className={`ind-legend-btn ${hoverPart === 'sources' ? 'is-hot' : ''}`}
          onMouseEnter={() => setHoverPart('sources')}
          onMouseLeave={() => setHoverPart(null)}
          onFocus={() => setHoverPart('sources')}
          onBlur={() => setHoverPart(null)}
        >
          <span className="ind-legend__sq" style={{ background: COLOR_SRC }} aria-hidden="true" />
          منابع
        </button>
        <button
          type="button"
          className={`ind-legend-btn ${hoverPart === 'uses' ? 'is-hot' : ''}`}
          onMouseEnter={() => setHoverPart('uses')}
          onMouseLeave={() => setHoverPart(null)}
          onFocus={() => setHoverPart('uses')}
          onBlur={() => setHoverPart(null)}
        >
          <span className="ind-legend__sq" style={{ background: COLOR_USE }} aria-hidden="true" />
          مصارف
        </button>
        <button
          type="button"
          className={`ind-legend-btn ${hoverPart === 'surplus' ? 'is-hot' : ''}`}
          onMouseEnter={() => setHoverPart('surplus')}
          onMouseLeave={() => setHoverPart(null)}
          onFocus={() => setHoverPart('surplus')}
          onBlur={() => setHoverPart(null)}
        >
          <span className="ind-legend__sq ind-legend__sq--hatch-green" aria-hidden="true" />
          اختلاف مثبت (مازاد منابع)
        </button>
        <button
          type="button"
          className={`ind-legend-btn ${hoverPart === 'deficit' ? 'is-hot' : ''}`}
          onMouseEnter={() => setHoverPart('deficit')}
          onMouseLeave={() => setHoverPart(null)}
          onFocus={() => setHoverPart('deficit')}
          onBlur={() => setHoverPart(null)}
        >
          <span className="ind-legend__sq ind-legend__sq--hatch-red" aria-hidden="true" />
          اختلاف منفی (کسری منابع)
        </button>
      </div>
    </Card>
  )
}
