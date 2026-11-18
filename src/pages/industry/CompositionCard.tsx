import { useEffect, useRef, useState } from 'react'
import { MousePointerClick, X } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, ReferenceArea, XAxis, YAxis } from 'recharts'
import { ChartContainer, ChartTooltip } from '../../components/ui/chart'
import { BY_YEAR_AFTER, COMPOSITION_GROUPS, OTHER_MEMBERS, UNIT_LABEL, compositionAxis, compositionRows, compositionYears, dataMonthsIn } from '../../lib/industry/derive'
import type { ChartRow, CompositionMode } from '../../lib/industry/derive'
import { fa } from '../../lib/industry/format'
import { AXIS, MONTH_NAMES, faDigits, monthOf, yearOf } from '../../lib/industry/months'
import { MONTH_AXIS, Card, Seg, Tip, barPath, stateOf, tipLabel } from './parts'
import type { CardCtx } from './parts'

const POP_W = 360
const H = 340
const M = { top: 14, right: 12, bottom: 4, left: 4 }

/** One corner radius for every segment's top and bottom and for the column's top, so all bars read alike */
const R = 3
const SEG_R = R

/**
 * Segments stack flush with no edge between them. Each segment is clipped to its whole column's
 * outline, whose top corners are rounded, so the column reads as one bar with a rounded top even
 * when its top segment is only a sliver.
 */
const segment =
  (id: string, color: string, scope = 'm') =>
  ({ x = 0, y = 0, width = 0, height = 0, payload, index }: { x?: number; y?: number; width?: number; height?: number; payload?: ChartRow; index?: number }) => {
    const i = COMPOSITION_GROUPS.findIndex((g) => g.id === id)
    const v = (k: number) => Math.max(0, Number(payload?.[COMPOSITION_GROUPS[k].id] ?? 0))
    const own = v(i)
    if (!(height > 0) || !(own > 0)) return <g />
    const px = height / own
    const below = COMPOSITION_GROUPS.slice(0, i).reduce((s, _, k) => s + v(k), 0)
    const above = COMPOSITION_GROUPS.slice(i + 1).reduce((s, _, k) => s + v(i + 1 + k), 0)
    const top = y - above * px
    const bottom = y + height + below * px
    const clip = `ind-comp-${scope}-${index ?? 0}-${id}`
    return (
      <g>
        <clipPath id={clip}>
          <path d={barPath(x, width, top, bottom, R, SEG_R)} />
        </clipPath>
        <path d={barPath(x, width, y, y + height, SEG_R, SEG_R)} fill={color} clipPath={`url(#${clip})`} />
      </g>
    )
  }

/**
 * «ترکیب خرید مواد اولیه» (page-prompt §9): stacked columns, the seven leading items and the rest.
 * Past two years each column is a year (the last ten); a click opens its months in a small card.
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

  // The opened year and where its column sits, to place the card beside it
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
  const popLeft = open ? Math.max(0, Math.min(width - POP_W, open.x - POP_W / 2)) : 0
  const yearMonths = open ? monthly.filter((r) => yearOf(r.month) === open.year && COMPOSITION_GROUPS.some((g) => r[g.id] != null)) : []
  const yearMax = mode === 'share' ? 100 : Math.max(1e-9, ...yearMonths.map((r) => COMPOSITION_GROUPS.reduce((s, g) => s + Number(r[g.id] ?? 0), 0)))

  const tipItems = (row: ChartRow | undefined) => (row ? COMPOSITION_GROUPS.filter((g) => row[g.id] != null && Number(row[g.id]) > 0).map((g) => ({ key: g.id, name: g.label, color: g.color, value: fmt(Number(row[g.id])) })) : [])
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
                return (
                  <Tip
                    active={active && !open}
                    label={byYear && row ? yearTip(row) : tipLabel(label)}
                    items={tipItems(row)}
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
              <Bar key={g.id} dataKey={g.id} stackId="c" fill={g.color} shape={segment(g.id, g.color)} isAnimationActive={false} />
            ))}
          </BarChart>
        </ChartContainer>

        {open && (
          <div className="ind-ypop" role="dialog" aria-label={`ماه‌های سال ${faDigits(String(open.year))}`} style={{ left: popLeft, width: POP_W }}>
            <div className="ind-ypop__head">
              <b>ماه‌های سال {faDigits(String(open.year))}</b>
              <button type="button" className="ind-ypop__close" aria-label="بستن" onClick={() => setOpen(null)}>
                <X size={14} aria-hidden="true" />
              </button>
            </div>
            <ChartContainer config={Object.fromEntries(COMPOSITION_GROUPS.map((g) => [g.id, { label: g.label, color: g.color }]))} className="ind-ypop__chart" style={{ height: 130 }}>
              <BarChart data={yearMonths} margin={{ top: 4, right: 2, bottom: 0, left: 2 }} barCategoryGap="22%">
                <XAxis dataKey="month" interval={0} tickFormatter={(m: string) => MONTH_NAMES[monthOf(m) - 1].slice(0, 3)} tickLine={false} axisLine={false} tickMargin={4} fontSize={10} />
                <YAxis hide domain={[0, yearMax]} />
                <ChartTooltip
                  cursor={{ fill: 'var(--color-muted)', opacity: 0.6 }}
                  position={{ y: 0 }}
                  allowEscapeViewBox={{ x: true, y: true }}
                  wrapperStyle={{ zIndex: 40, pointerEvents: 'none' }}
                  content={({ active, label, payload }) => (
                    <div className="ind-tip-above">
                      <Tip active={active} label={tipLabel(label)} items={tipItems(payload?.[0]?.payload as ChartRow | undefined)} />
                    </div>
                  )}
                />
                {COMPOSITION_GROUPS.map((g) => (
                  <Bar key={g.id} dataKey={g.id} stackId="c" fill={g.color} shape={segment(g.id, g.color, 'pop')} isAnimationActive={false} />
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
