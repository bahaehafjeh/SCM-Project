import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts'
import { ChartContainer, ChartTooltip } from '../../components/ui/chart'
import { DEFAULT_TREND_IDS, MAX_TREND, SERIES, TREND_CHIPS, UNIT_LABEL, dataMonthsIn, trendAxis, trendRows } from '../../lib/industry/derive'
import type { TrendMode } from '../../lib/industry/derive'
import { fa } from '../../lib/industry/format'
import { AXIS } from '../../lib/industry/months'
import { MONTH_AXIS, Card, Seg, Tip, stateOf, tipLabel } from './parts'
import type { CardCtx } from './parts'
import { RangeNavigator } from './RangeNavigator'
import { useWheelZoom } from './useWheelZoom'

/** The chip list shows at most this many rows; the rest fold behind a «+N» chip */
const MAX_ROWS = 2
const H = 340
const M = { top: 14, right: 12, bottom: 4, left: 4 }
const MODES: { value: TrendMode; label: string }[] = [
  { value: 'amount', label: 'مبلغ' },
  { value: 'qty', label: 'مقدار' },
  { value: 'rate', label: 'نرخ' },
]

/** «روند خرید مواد اولیه» (page-prompt §8): up to eight items, one mode at a time */
export function TrendCard({ ctx }: { ctx: CardCtx }) {
  const [mode, setMode] = useState<TrendMode>('amount')
  const [picked, setPicked] = useState<string[]>(DEFAULT_TREND_IDS)
  const has = !!ctx.ds && dataMonthsIn(ctx.ds, ctx.range).length > 0
  const chips = TREND_CHIPS[mode].map((i) => SERIES[i])
  const shown = chips.filter((s) => picked.includes(s.id))
  const ids = shown.map((s) => s.id)
  const all = ctx.ds ? trendRows(ctx.ds, ctx.range, mode, ctx.unit, ids) : []
  // The window the chart shows inside the filter range: past a year, a navigator under the chart moves and resizes it
  const showNav = all.length > 12
  const [win, setWin] = useState<[number, number] | null>(null)
  useEffect(() => setWin(null), [ctx.range.from, ctx.range.to])
  const view: [number, number] = showNav && win && win[1] < all.length ? win : showNav && all.length > 36 ? [all.length - 36, all.length - 1] : [0, Math.max(0, all.length - 1)]
  const rows = showNav ? all.slice(view[0], view[1] + 1) : all
  // The mouse wheel over the chart zooms the same window
  const zoomEl = useRef<HTMLDivElement>(null)
  useWheelZoom(zoomEl, showNav ? all.length : 0, view, setWin, { left: M.left + 60, right: M.right })
  // The navigator's silhouette: the shown items together (summed; averaged for rates)
  const navValues = all.map((r) => {
    const v = ids.map((id) => r[id] as number | null).filter((x): x is number => x != null)
    return v.length ? (mode === 'rate' ? v.reduce((t, x) => t + x, 0) / v.length : v.reduce((t, x) => t + x, 0)) : null
  })
  const axis = trendAxis(mode, ctx.unit, rows, ids)
  const unit = mode === 'amount' ? UNIT_LABEL[ctx.unit] : mode === 'qty' ? 'تن' : 'میلیون ریال بر تن'
  const dec = mode === 'rate' ? 1 : mode === 'qty' ? 0 : 1
  const guide =
    (mode === 'amount' ? (ctx.unit === 'usd' ? 'مبلغ ماهانه به هزار دلار؛ مبلغ دلاری از 1404/04 موجود است.' : 'مبلغ ماهانه به میلیون ریال.') : mode === 'qty' ? 'فقط اقلام با واحد تن.' : 'نرخ به میلیون ریال بر تن.') +
    (showNav ? ' با چرخ موس روی نمودار بزرگ‌نمایی کنید، یا زیر نمودار پنجره را بکشید تا در زمان جابه‌جا شوید و لبه‌هایش را بکشید تا بازه کوچک یا بزرگ شود؛ دوبار کلیک کل بازه را نشان می‌دهد.' : '')
  const peak = shown
    .flatMap((s) => rows.map((r) => ({ s, m: r.month, v: r[s.id] as number | null })))
    .filter((x) => x.v != null)
    .sort((a, b) => b.v! - a.v!)[0]
  // Chip folding: measure with every chip laid out, then keep what fits in two rows (one slot left for «+N»)
  const [expanded, setExpanded] = useState(false)
  const [limit, setLimit] = useState<number | null>(null)
  const box = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => setLimit(null), [mode])
  useLayoutEffect(() => {
    if (limit !== null || expanded || !box.current) return
    const kids = [...box.current.children] as HTMLElement[]
    const tops = [...new Set(kids.map((k) => k.offsetTop))].sort((a, b) => a - b)
    if (tops.length <= MAX_ROWS) return setLimit(Infinity)
    const fit = kids.filter((k) => k.offsetTop < tops[MAX_ROWS]).length
    setLimit(Math.max(1, fit - 1))
  }, [limit, expanded, has])
  // A new width re-measures
  useEffect(() => {
    const el = box.current
    if (!el) return
    let w = el.clientWidth
    const ro = new ResizeObserver(() => {
      if (el.clientWidth === w) return
      w = el.clientWidth
      setLimit(null)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [has])
  const visible = expanded || limit === null ? chips : chips.slice(0, limit)
  const hidden = chips.length - visible.length
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length >= MAX_TREND ? p : [...p, id]))

  return (
    <Card ctx={ctx} state={stateOf(ctx, has)} title="روند خرید مواد اولیه" subtitle="برترین مواد بر اساس مبلغ خرید در بازه؛ حداکثر ۸ قلم" guide={guide} actions={<Seg label="شاخص روند" value={mode} options={MODES} onChange={setMode} />}>
      <div ref={box} className="ind-chips" role="group" aria-label="مواد">
        {visible.map((s) => {
          const on = picked.includes(s.id)
          return (
            <button
              key={s.id}
              type="button"
              className={`ind-schip ${on ? 'is-on' : ''}`} // A chosen chip: its series colour at 40%, much softer than the line itself
              style={on ? { borderColor: `color-mix(in srgb, ${s.color} 40%, transparent)` } : undefined}
              aria-pressed={on}
              disabled={!on && picked.length >= MAX_TREND}
              onClick={() => toggle(s.id)}
            >
              <span className="ind-schip__dot" style={{ background: s.color }} aria-hidden="true" />
              {s.label}
            </button>
          )
        })}
        {hidden > 0 && (
          <button type="button" className="ind-schip ind-schip--more" aria-expanded={false} aria-label={`نمایش ${fa(hidden)} مادهٔ دیگر`} onClick={() => setExpanded(true)}>
            <span className="n">+{fa(hidden)}</span>
          </button>
        )}
        {expanded && (
          <button type="button" className="ind-schip ind-schip--more" aria-expanded onClick={() => setExpanded(false)}>
            کمتر
          </button>
        )}
      </div>
      <div ref={zoomEl} onDoubleClick={() => showNav && setWin([0, all.length - 1])}>
        <ChartContainer
          config={Object.fromEntries(shown.map((s) => [s.id, { label: s.label, color: s.color }]))}
          className="ind-chart"
          style={{ height: H }}
          role="img"
          aria-label={`روند خرید مواد اولیه، ${unit}، ${AXIS[ctx.range.from]} تا ${AXIS[ctx.range.to]}${peak ? `؛ بیشترین مقدار ${fa(peak.v, dec)} برای ${peak.s.label} در ${peak.m}` : ''}`}
        >
          <LineChart data={rows} margin={M}>
            <CartesianGrid vertical={false} strokeDasharray="2 4" />
            <XAxis {...MONTH_AXIS} />
            <YAxis domain={[0, axis.max]} ticks={axis.ticks} padding={{ bottom: 12 }} allowDataOverflow tickFormatter={(v: number) => fa(v, 0)} tickLine={false} axisLine={{ stroke: 'var(--color-border)' }} width={60} />
            <ChartTooltip
              content={({ active, label, payload }) => (
                <Tip active={active} label={tipLabel(label)} items={(payload ?? []).filter((p) => p.value != null).map((p) => ({ key: String(p.dataKey), name: SERIES.find((s) => s.id === p.dataKey)?.label, color: SERIES.find((s) => s.id === p.dataKey)!.color, value: `${fa(Number(p.value), dec)} ${unit}` }))} />
              )}
            />
            {shown.map((s) => (
              <Line
                key={s.id}
                dataKey={s.id}
                type="linear"
                stroke={s.color}
                strokeWidth={1.8}
                strokeLinejoin="round"
                isAnimationActive={false}
                activeDot={{ r: 4, fill: s.color, stroke: 'var(--color-card)' }}
                dot={(p: { cx?: number; cy?: number; value?: number | null; index?: number }) => {
                  if (p.value == null || p.cx == null || p.cy == null) return <g key={`${s.id}-${p.index}`} />
                    return <circle key={`${s.id}-${p.index}`} cx={p.cx} cy={p.cy} r={3} fill="var(--color-card)" stroke={s.color} strokeWidth={1.5} />
                }}
              />
            ))}
          </LineChart>
        </ChartContainer>
      </div>
      {showNav && <RangeNavigator months={all.map((r) => r.month)} values={navValues} win={view} onChange={setWin} color="var(--raw-blue-600)" inset={{ left: M.left + 60, right: M.right }} />}
      {/* No legend under the chart: the chips above already name and colour each line */}
    </Card>
  )
}
