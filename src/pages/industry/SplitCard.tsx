import { useEffect, useRef, useState } from 'react'
import { MousePointerClick, X } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, ReferenceArea, ReferenceLine, XAxis, YAxis } from 'recharts'
import { ChartContainer, ChartTooltip } from '../../components/ui/chart'
import { BY_YEAR_AFTER, UNIT_LABEL, dataMonthsIn, splitAxis, splitRows, splitYears } from '../../lib/industry/derive'
import type { SplitMode, SplitRow, SplitYear } from '../../lib/industry/derive'
import { fa } from '../../lib/industry/format'
<<<<<<< HEAD
import { MONTH_NAMES, faDigits, monthOf, yearOf } from '../../lib/industry/months'
=======
import { faDigits, monthOf, yearOf } from '../../lib/industry/months'
>>>>>>> scm-v1/main
import { MONTH_AXIS, Card, Seg, Tip, barPath, stateOf, tipLabel } from './parts'
import type { CardCtx } from './parts'

const H = 300
const IMP = 'var(--raw-orange-500)'
const DOM = 'var(--raw-blue-600)'
<<<<<<< HEAD
const POP_W = 340
=======
const POP_W = 390
>>>>>>> scm-v1/main

/** Rounded only at the outer end: the top above the axis, the bottom below it */
const outerEnd =
  (up: boolean, r = 6) =>
  ({ x = 0, y = 0, width = 0, height = 0 }: { x?: number; y?: number; width?: number; height?: number }) => {
    const y0 = Math.min(y, y + height)
    const y1 = Math.max(y, y + height)
    return <path d={barPath(x, width, y0, y1, up ? r : 0, up ? 0 : r)} fill={up ? IMP : DOM} />
  }

/**
 * «داخلی و وارداتی» (page-prompt §11): imports above the axis, domestic below. Past two years the
 * bars are years; a click on one opens its months in a small card over the chart.
 */
export function SplitCard({ ctx }: { ctx: CardCtx }) {
  const [mode, setMode] = useState<SplitMode>('amount')
  const months = ctx.ds ? dataMonthsIn(ctx.ds, ctx.range) : []
  const byYear = months.length > BY_YEAR_AFTER
  const monthly = ctx.ds ? splitRows(ctx.ds, ctx.range, mode, ctx.unit) : []
  const rows: SplitRow[] = byYear && ctx.ds ? splitYears(ctx.ds, ctx.range, mode, ctx.unit) : monthly
  const axis = splitAxis(mode, ctx.unit, rows, byYear)
  const ticks = [
    ...axis.ticks
      .slice(1)
      .map((t) => -t)
      .reverse(),
    ...axis.ticks,
  ]
  const unit = mode === 'share' ? '٪' : UNIT_LABEL[ctx.unit]
  const fmt = (v: number) => (mode === 'share' ? `${fa(Math.abs(v), 1)}٪` : `${fa(Math.abs(v), 1)} ${unit}`)
  const guide = `${byYear ? 'هر ستون جمع یک سال است؛ با کلیک روی آن، ماه‌های همان سال باز می‌شود. ' : ''}${mode === 'share' ? 'سهم هر بخش از مبلغ دلاری؛ برای 1404/02 و 1404/03 مبلغ دلاری ثبت نشده است.' : ctx.unit === 'usd' ? 'مبلغ به هزار دلار؛ برای 1404/02 و 1404/03 مبلغ دلاری ثبت نشده است.' : 'مبلغ به میلیون ریال.'}`

  // The opened year: its label and where its bar sits, to place the card beside it
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
  const width = wrap.current?.clientWidth ?? 600
<<<<<<< HEAD
  const popLeft = open ? Math.max(0, Math.min(width - POP_W, open.x - POP_W / 2)) : 0
=======
  const popW = Math.min(POP_W, width)
  const popLeft = open ? Math.max(0, Math.min(width - popW, open.x - popW / 2)) : 0
>>>>>>> scm-v1/main
  const yearMonths = open ? monthly.filter((r) => yearOf(r.month) === open.year) : []
  const yMax = Math.max(1e-9, ...yearMonths.flatMap((r) => [Math.abs(r.imp ?? 0), Math.abs(r.dom ?? 0)]))

  const items = (row: SplitRow | undefined) =>
    row && !row.hatched
      ? [{ key: 'imp', name: 'وارداتی', color: IMP, value: fmt(row.imp ?? 0) }, { key: 'dom', name: 'داخلی', color: DOM, value: fmt(row.dom ?? 0) }, ...((row as SplitYear).missing ? [{ key: 'miss', name: `${fa((row as SplitYear).missing)} ماه بدون مبلغ دلاری`, color: 'var(--color-border)', value: '' }] : [])]
      : row
        ? [{ key: 'none', name: 'مبلغ دلاری ثبت نشده است', color: 'var(--color-border)', value: '—' }]
        : []
  const yearTip = (y: SplitYear) => `سال ${faDigits(String(y.year))}${y.months < 12 ? ` (${fa(y.months)} ماه)` : ''}`

  return (
    <Card
      ctx={ctx}
      state={stateOf(ctx, months.length > 0)}
      title="داخلی و وارداتی"
      subtitle={byYear ? 'مبلغ خرید سالانه به تفکیک بخش' : 'مبلغ خرید ماهانه به تفکیک بخش'}
      guide={guide}
      actions={
        <Seg
          label="نمای بخش‌ها"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'amount', label: 'مبلغ' },
            { value: 'share', label: 'سهم درصدی' },
          ]}
        />
      }
    >
      <ul className="ind-legend ind-legend--top">
        <li>
          <span className="ind-legend__sq" style={{ background: IMP }} aria-hidden="true" />
          وارداتی (بالای محور)
        </li>
        <li>
          <span className="ind-legend__sq" style={{ background: DOM }} aria-hidden="true" />
          داخلی (پایین محور)
        </li>
      </ul>
      <div ref={wrap} className={`ind-ywrap ${byYear ? 'is-years' : ''}`}>
        <ChartContainer config={{ imp: { label: 'وارداتی', color: IMP }, dom: { label: 'داخلی', color: DOM } }} className="ind-chart" style={{ height: H }} role="img" aria-label={`داخلی و وارداتی، ${unit}، ${months[0]} تا ${months[months.length - 1]}؛ واردات بالای محور و خرید داخلی پایین آن`}>
          <BarChart
            data={rows}
            margin={{ top: 12, right: 8, bottom: 4, left: 4 }}
            stackOffset="sign"
            barCategoryGap={byYear ? '30%' : '38%'}
            onClick={(s: { activeLabel?: string | number; activeCoordinate?: { x?: number } }) => {
              if (!byYear || s?.activeLabel == null) return
              const year = Number(s.activeLabel)
              setOpen((o) => (o?.year === year ? null : { year, x: s.activeCoordinate?.x ?? 0 }))
            }}
            onMouseMove={(s: { activeLabel?: string | number }) => setHoverYear(byYear && s?.activeLabel != null ? Number(s.activeLabel) : null)}
            onMouseLeave={() => setHoverYear(null)}
          >
            <defs>
              <pattern id="ind-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <rect width="8" height="8" fill="var(--color-unofficial-body-background, var(--color-background))" />
                <line x1="0" y1="0" x2="0" y2="8" stroke="var(--color-border)" strokeWidth="3" />
              </pattern>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="2 4" />
            {byYear ? <XAxis dataKey="month" interval={0} tickFormatter={(y: string) => faDigits(y)} tickLine={false} axisLine={{ stroke: 'var(--color-border)' }} tickMargin={8} /> : <XAxis {...MONTH_AXIS} />}
            <YAxis domain={[-axis.max, axis.max]} ticks={ticks} allowDataOverflow tickFormatter={(v: number) => (mode === 'share' ? `${fa(Math.abs(v), 0)}٪` : fa(Math.abs(v), 0))} tickLine={false} axisLine={{ stroke: 'var(--color-border)' }} width={byYear && mode === 'amount' ? 72 : 54} />
            {rows
              .filter((r) => r.hatched)
              .map((r) => (
                <ReferenceArea key={r.month} x1={r.month} x2={r.month} y1={-axis.max} y2={axis.max} fill="url(#ind-hatch)" fillOpacity={1} radius={6} ifOverflow="hidden" />
              ))}
            {/* The year under the pointer: a light dashed frame says it opens */}
            {byYear && hoverYear != null && hoverYear !== open?.year && <ReferenceArea x1={String(hoverYear)} x2={String(hoverYear)} y1={-axis.max} y2={axis.max} fill="var(--brand-shades-50)" fillOpacity={0.5} stroke="var(--brand-shades-300)" strokeDasharray="4 3" radius={8} ifOverflow="hidden" />}
            {/* The opened year, framed */}
            {open && <ReferenceArea x1={String(open.year)} x2={String(open.year)} y1={-axis.max} y2={axis.max} fill="var(--brand-shades-50)" fillOpacity={0.6} stroke="var(--brand-shades-600)" strokeWidth={1.5} radius={8} ifOverflow="hidden" />}
            <ReferenceLine y={0} stroke="var(--color-border)" />
            <ChartTooltip
              cursor={{ fill: 'var(--color-muted)', opacity: 0.6 }}
              content={({ active, label, payload }) => {
                const row = payload?.[0]?.payload as SplitRow | undefined
                return (
                  <Tip
                    active={active && !open}
                    label={byYear && row ? yearTip(row as SplitYear) : tipLabel(label)}
                    items={items(row)}
<<<<<<< HEAD
=======
                    summary={mode === 'amount' && row && !row.hatched ? { label: 'جمع کل', value: fmt((row.imp ?? 0) + Math.abs(row.dom ?? 0)) } : undefined}
>>>>>>> scm-v1/main
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
            <Bar dataKey="imp" stackId="s" shape={outerEnd(true)} isAnimationActive={false} />
            <Bar dataKey="dom" stackId="s" shape={outerEnd(false)} isAnimationActive={false} />
          </BarChart>
        </ChartContainer>

        {open && (
<<<<<<< HEAD
          <div className="ind-ypop" role="dialog" aria-label={`ماه‌های سال ${faDigits(String(open.year))}`} style={{ left: popLeft, width: POP_W }}>
            <div className="ind-ypop__head">
              <b>ماه‌های سال {faDigits(String(open.year))}</b>
              <button type="button" className="ind-ypop__close" aria-label="بستن" onClick={() => setOpen(null)}>
                <X size={14} aria-hidden="true" />
              </button>
            </div>
            <ChartContainer config={{ imp: { label: 'وارداتی', color: IMP }, dom: { label: 'داخلی', color: DOM } }} className="ind-ypop__chart" style={{ height: 120 }}>
              <BarChart data={yearMonths} margin={{ top: 4, right: 2, bottom: 0, left: 2 }} stackOffset="sign" barCategoryGap="22%">
                <XAxis dataKey="month" interval={0} tickFormatter={(m: string) => MONTH_NAMES[monthOf(m) - 1].slice(0, 3)} tickLine={false} axisLine={false} tickMargin={4} fontSize={10} />
=======
          <div className="ind-ypop" role="dialog" aria-label={`ماه‌های سال ${faDigits(String(open.year))}`} style={{ left: popLeft, width: popW }}>
            <div className="ind-ypop__head">
              <b>ماه‌های سال {faDigits(String(open.year))}</b>
              <button type="button" className="ind-ypop__close" aria-label="بستن" onClick={() => setOpen(null)}>
                <X size={15} aria-hidden="true" />
              </button>
            </div>
            <ChartContainer config={{ imp: { label: 'وارداتی', color: IMP }, dom: { label: 'داخلی', color: DOM } }} className="ind-ypop__chart" style={{ height: 148 }}>
              <BarChart data={yearMonths} margin={{ top: 8, right: 6, bottom: 2, left: 2 }} stackOffset="sign" barCategoryGap="24%">
                <CartesianGrid vertical={false} strokeDasharray="2 4" />
                <XAxis dataKey="month" interval={0} tickFormatter={(m: string) => faDigits(String(monthOf(m)).padStart(2, '0'))} tickLine={false} axisLine={false} tickMargin={6} fontSize={11} />
>>>>>>> scm-v1/main
                <YAxis hide domain={[-yMax, yMax]} />
                <ReferenceLine y={0} stroke="var(--color-border)" />
                <ChartTooltip
                  cursor={{ fill: 'var(--color-muted)', opacity: 0.6 }}
                  position={{ y: 0 }}
                  allowEscapeViewBox={{ x: true, y: true }}
                  wrapperStyle={{ zIndex: 40, pointerEvents: 'none' }}
<<<<<<< HEAD
                  content={({ active, label, payload }) => (
                    <div className="ind-tip-above">
                      <Tip active={active} label={tipLabel(label)} items={items(payload?.[0]?.payload as SplitRow | undefined)} />
                    </div>
                  )}
=======
                  content={({ active, label, payload }) => {
                    const row = payload?.[0]?.payload as SplitRow | undefined
                    return (
                      <div className="ind-tip-above">
                        <Tip
                          active={active}
                          label={tipLabel(label)}
                          items={items(row)}
                          summary={mode === 'amount' && row && !row.hatched ? { label: 'جمع کل', value: fmt((row.imp ?? 0) + Math.abs(row.dom ?? 0)) } : undefined}
                        />
                      </div>
                    )
                  }}
>>>>>>> scm-v1/main
                />
                <Bar dataKey="imp" stackId="s" shape={outerEnd(true, 3)} isAnimationActive={false} />
                <Bar dataKey="dom" stackId="s" shape={outerEnd(false, 3)} isAnimationActive={false} />
              </BarChart>
            </ChartContainer>
          </div>
        )}
      </div>
    </Card>
  )
}
