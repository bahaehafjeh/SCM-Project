import { useEffect, useRef, useState } from 'react'
import { MousePointerClick, X } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, ReferenceArea, XAxis, YAxis } from 'recharts'
import { ChartContainer, ChartTooltip } from '../../components/ui/chart'
import { BY_YEAR_AFTER, COMPOSITION_GROUPS, OTHER_MEMBERS, UNIT_LABEL, compositionAxis, compositionRows, compositionYears, dataMonthsIn } from '../../lib/industry/derive'
import type { ChartRow, CompositionMode } from '../../lib/industry/derive'
import { fa } from '../../lib/industry/format'
import { AXIS, faDigits, monthOf, yearOf } from '../../lib/industry/months'
import { MONTH_AXIS, Card, Seg, Tip, barPath, stateOf, tipLabel } from './parts'
import type { CardCtx } from './parts'

const POP_W = 430
const H = 340
const M = { top: 14, right: 12, bottom: 4, left: 4 }

/** 4px vertical gap between adjacent color segments in each stacked column */
const SEG_GAP = 4

/**
 * Draws each stacked bar segment as a cleanly rounded pill separated by a 4px vertical gap from
 * neighbouring non-zero segments above and below it.
 */
const segment =
  (id: string, color: string, radius = 5, gap = SEG_GAP) =>
  ({ x = 0, y = 0, width = 0, height = 0, payload }: { x?: number; y?: number; width?: number; height?: number; payload?: ChartRow }) => {
    const i = COMPOSITION_GROUPS.findIndex((g) => g.id === id)
    const v = (k: number) => Math.max(0, Number(payload?.[COMPOSITION_GROUPS[k].id] ?? 0))
    const own = v(i)
    if (!(height > 0) || !(own > 0) || !(width > 0)) return <g />

    const hasBelow = COMPOSITION_GROUPS.slice(0, i).some((_, k) => v(k) > 0)
    const hasAbove = COMPOSITION_GROUPS.slice(i + 1).some((_, k) => v(i + 1 + k) > 0)

    const half = gap / 2
    let insetTop = hasAbove ? half : 0
    let insetBottom = hasBelow ? half : 0
    const minH = Math.min(height, 2)
    const totalInset = insetTop + insetBottom
    if (totalInset > 0 && height - totalInset < minH) {
      const scale = Math.max(0, (height - minH) / totalInset)
      insetTop *= scale
      insetBottom *= scale
    }

    const y0 = y + insetTop
    const y1 = Math.max(y0 + minH, y + height - insetBottom)
    const h = y1 - y0
    const r = Math.max(0, Math.min(radius, width / 2, h / 2))
    return <path d={barPath(x, width, y0, y1, r, r)} fill={color} />
  }

/**
 * «ترکیب خرید مواد اولیه» (page-prompt §9): stacked columns, the seven leading items and the rest.
 * Past two years each column is a year (the last ten); a click opens its months in a popover card.
 */
export function CompositionCard({ ctx }: { ctx: CardCtx }) {
  const [mode, setMode] = useState<CompositionMode>('share')
  const months = ctx.ds ? dataMonthsIn(ctx.ds, ctx.range) : []
  const has = months.length > 0
  const byYear = months.length > BY_YEAR_AFTER
  const monthly = ctx.ds ? compositionRows(ctx.ds, ctx.range, mode, ctx.unit) : []
  const rows = byYear && ctx.ds ? compositionYears(ctx.ds, ctx.range, mode, ctx.unit) : monthly
  const axis = compositionAxis(mode, ctx.unit, rows, byYear)
  const unit = mode === 'share' ? '٪' : UNIT_LABEL[ctx.unit]
  const fmt = (v: number) => (mode === 'share' ? `${fa(v, 1)}٪` : `${fa(v, 1)} ${unit}`)
  const guide = `${byYear ? 'هر ستون یک سال است (مبلغ‌ها جمع ماه‌ها و سهم‌ها از کل مبلغ سال)؛ با کلیک روی آن، ماه‌های همان سال باز می‌شود. ' : ''}سایر مواد خارج از ۷ ماده اول: ${OTHER_MEMBERS.join('، ')}. این گروه با ردیف «سایر» خود کدال تفاوت دارد.${mode === 'share' ? ' سهم‌ها بر پایه‌ی مبلغ ریالی است.' : ctx.unit === 'usd' ? ' مبلغ به هزار دلار؛ برای 1404/02 و 1404/03 مبلغ دلاری ثبت نشده است.' : ' مبلغ به میلیون ریال.'}`
  // The group with the largest total over the range, for the chart's spoken summary
  const lead = COMPOSITION_GROUPS.map((g) => ({ g, sum: rows.reduce((s, r) => s + Number(r[g.id] ?? 0), 0) })).sort((a, b) => b.sum - a.sum)[0]

  // The opened year and where its column sits, to place the popover card beside it
  const [open, setOpen] = useState<{ year: number; x: number } | null>(null)
  const [hoverYear, setHoverYear] = useState<number | null>(null)
  const wrap = useRef<HTMLDivElement>(null)
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
  const yearMonths = open ? monthly.filter((r) => yearOf(r.month) === open.year && COMPOSITION_GROUPS.some((g) => r[g.id] != null)) : []
  const yearAxis = compositionAxis(mode, ctx.unit, yearMonths, false)

  const tipItems = (row: ChartRow | undefined) => (row ? COMPOSITION_GROUPS.filter((g) => row[g.id] != null && Number(row[g.id]) > 0).map((g) => ({ key: g.id, name: g.label, color: g.color, value: fmt(Number(row[g.id])) })) : [])
  const tipTotal = (row: ChartRow | undefined) => (row ? COMPOSITION_GROUPS.reduce((s, g) => s + Math.max(0, Number(row[g.id] ?? 0)), 0) : 0)
  const yearTip = (row: ChartRow) => {
    const n = Number(row.months ?? 12)
    return `سال ${faDigits(String(row.month))}${n < 12 ? ` (${fa(n)} ماه)` : ''}`
  }

  return (
    <Card
      ctx={ctx}
      state={stateOf(ctx, has)}
      title="ترکیب خرید مواد اولیه"
      subtitle={byYear ? 'هفت ماده اول و جمع سایر مواد، سالانه' : 'هفت ماده اول بازه و جمع سایر مواد'}
      guide={guide}
      actions={
        <Seg
          label="نمای ترکیب"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'amount', label: 'مبلغ' },
            { value: 'share', label: 'سهم درصدی' },
          ]}
        />
      }
    >
      <div ref={wrap} className={`ind-ywrap ${byYear ? 'is-years' : ''}`}>
        <ChartContainer
          config={Object.fromEntries(COMPOSITION_GROUPS.map((g) => [g.id, { label: g.label, color: g.color }]))}
          className="ind-chart"
          style={{ height: H }}
          role="img"
          aria-label={`ترکیب خرید مواد اولیه، ${mode === 'share' ? 'سهم درصدی از مبلغ ریالی' : unit}، ${AXIS[ctx.range.from]} تا ${AXIS[ctx.range.to]}${lead && lead.sum > 0 ? `؛ بیشترین سهم با ${lead.g.label}` : ''}`}
        >
          <BarChart
            data={rows}
            margin={M}
            barCategoryGap={byYear ? '30%' : '28%'}
            onClick={(s: { activeLabel?: string | number; activeCoordinate?: { x?: number } }) => {
              if (!byYear || s?.activeLabel == null) return
              const year = Number(s.activeLabel)
              setOpen((o) => (o?.year === year ? null : { year, x: s.activeCoordinate?.x ?? 0 }))
            }}
            onMouseMove={(s: { activeLabel?: string | number }) => setHoverYear(byYear && s?.activeLabel != null ? Number(s.activeLabel) : null)}
            onMouseLeave={() => setHoverYear(null)}
          >
            <CartesianGrid vertical={false} strokeDasharray="2 4" />
            {/* The year under the pointer: a light dashed frame says it opens */}
            {byYear && hoverYear != null && hoverYear !== open?.year && <ReferenceArea x1={String(hoverYear)} x2={String(hoverYear)} y1={0} y2={axis.max} fill="var(--brand-shades-50)" fillOpacity={0.5} stroke="var(--brand-shades-300)" strokeDasharray="4 3" radius={8} ifOverflow="hidden" />}
            {/* The opened year, framed */}
            {open && <ReferenceArea x1={String(open.year)} x2={String(open.year)} y1={0} y2={axis.max} fill="var(--brand-shades-50)" fillOpacity={0.6} stroke="var(--brand-shades-600)" strokeWidth={1.5} radius={8} ifOverflow="hidden" />}
            {byYear ? <XAxis dataKey="month" interval={0} tickFormatter={(y: string) => faDigits(y)} tickLine={false} axisLine={{ stroke: 'var(--color-border)' }} tickMargin={8} /> : <XAxis {...MONTH_AXIS} />}
            <YAxis domain={[0, axis.max]} ticks={axis.ticks} allowDataOverflow tickFormatter={(v: number) => (mode === 'share' ? `${fa(v, 0)}٪` : fa(v, 0))} tickLine={false} axisLine={{ stroke: 'var(--color-border)' }} width={byYear && mode === 'amount' ? 72 : 60} />
            <ChartTooltip
              cursor={{ fill: 'var(--color-muted)', opacity: 0.6 }}
              content={({ active, label, payload }) => {
                const row = payload?.[0]?.payload as ChartRow | undefined
                const total = tipTotal(row)
                return (
                  <Tip
                    active={active && !open}
                    label={byYear && row ? yearTip(row) : tipLabel(label)}
                    items={tipItems(row)}
                    summary={mode === 'amount' && total > 0 ? { label: 'جمع', value: fmt(total) } : undefined}
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
            {COMPOSITION_GROUPS.map((g) => (
              <Bar key={g.id} dataKey={g.id} stackId="c" fill={g.color} shape={segment(g.id, g.color, 5, SEG_GAP)} isAnimationActive={false} />
            ))}
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
            <ChartContainer config={Object.fromEntries(COMPOSITION_GROUPS.map((g) => [g.id, { label: g.label, color: g.color }]))} className="ind-ypop__chart" style={{ height: 165 }}>
              <BarChart data={yearMonths} margin={{ top: 8, right: 6, bottom: 2, left: 2 }} barCategoryGap="24%">
                <CartesianGrid vertical={false} strokeDasharray="2 4" />
                <XAxis dataKey="month" interval={0} tickFormatter={(m: string) => faDigits(String(monthOf(m)).padStart(2, '0'))} tickLine={false} axisLine={{ stroke: 'var(--color-border)' }} tickMargin={6} fontSize={11} />
                <YAxis domain={[0, yearAxis.max]} ticks={yearAxis.ticks} tickFormatter={(v: number) => (mode === 'share' ? `${fa(v, 0)}٪` : fa(v, 0))} tickLine={false} axisLine={false} width={mode === 'share' ? 38 : 54} fontSize={10} />
                <ChartTooltip
                  cursor={{ fill: 'var(--color-muted)', opacity: 0.6 }}
                  position={{ y: 0 }}
                  allowEscapeViewBox={{ x: true, y: true }}
                  wrapperStyle={{ zIndex: 40, pointerEvents: 'none' }}
                  content={({ active, label, payload }) => {
                    const row = payload?.[0]?.payload as ChartRow | undefined
                    const total = tipTotal(row)
                    return (
                      <div className="ind-tip-above">
                        <Tip active={active} label={tipLabel(label)} items={tipItems(row)} summary={mode === 'amount' && total > 0 ? { label: 'جمع', value: fmt(total) } : undefined} />
                      </div>
                    )
                  }}
                />
                {COMPOSITION_GROUPS.map((g) => (
                  <Bar key={g.id} dataKey={g.id} stackId="c" fill={g.color} shape={segment(g.id, g.color, 4, SEG_GAP)} isAnimationActive={false} />
                ))}
              </BarChart>
            </ChartContainer>
          </div>
        )}
      </div>
      <ul className="ind-legend">
        {COMPOSITION_GROUPS.map((g) => (
          <li key={g.id}>
            <span className="ind-legend__sq" style={{ background: g.color }} aria-hidden="true" />
            {g.label}
          </li>
        ))}
      </ul>
    </Card>
  )
}
