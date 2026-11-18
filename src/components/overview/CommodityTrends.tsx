import { useId, useState } from 'react'
import type React from 'react'
import type { CSSProperties } from 'react'
import { TrendingDown, TrendingUp } from 'lucide-react'
import { commodityTrends } from '../../data/overview'
import type { CommodityTrend } from '../../data/overview'
import { formatNumber, formatSignedPercent } from '../../lib/format'
import { Panel } from './Panel'

// Trailing months still being reported come in far below normal (discovery D1). Until the data
// carries a per-month completeness flag, a month counts as likely incomplete when it falls below
// half the median of the six months before it; walking back from the latest month, every month
// that meets this is flagged, so each commodity gets its own count.
const RULE_WINDOW = 6
const RULE_RATIO = 0.5
const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b)
  const m = s.length >> 1
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}
function incompleteTail(series: number[]) {
  let n = 0
  for (let i = series.length - 1; i >= RULE_WINDOW; i--) {
    if (series[i] >= RULE_RATIO * median(series.slice(i - RULE_WINDOW, i))) break
    n++
  }
  return n
}

const W = 600
const H = 240
const TICKS = 4

type Window = 6 | 12
const faDigits = (s: string) => s.replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[+d])
const MONTHS = ['ژانویه', 'فوریه', 'مارس', 'آوریل', 'مه', 'ژوئن', 'ژوئیه', 'اوت', 'سپتامبر', 'اکتبر', 'نوامبر', 'دسامبر']
// Axis uses year/month numbers; the tooltip spells the month out.
// The 12-month window ends in April 2026 (dataset period 2025/05 – 2026/04).
const monthsOf = (n: Window) =>
  Array.from({ length: n }, (_, i) => {
    const d = new Date(Date.UTC(2026, 3 - (n - 1 - i), 1))
    const year = faDigits(String(d.getUTCFullYear()))
    return { num: `${year}/${faDigits(String(d.getUTCMonth() + 1).padStart(2, '0'))}`, name: `${MONTHS[d.getUTCMonth()]} ${year} میلادی` }
  })

type Pt = readonly [number, number]
// Cubic Bézier from point i−1 to point i of a Catmull–Rom curve through all points.
const bezier = (p: Pt[], i: number) => {
  const [x, y] = p[i]
  const [x0, y0] = p[i - 2] ?? p[i - 1]
  const [x1, y1] = p[i - 1]
  const [x3, y3] = p[i + 1] ?? [x, y]
  return `C${x1 + (x - x0) / 6},${y1 + (y - y0) / 6} ${x - (x3 - x1) / 6},${y - (y3 - y1) / 6} ${x},${y}`
}
const smooth = (p: Pt[]) => p.slice(1).reduce((d, _, i) => `${d} ${bezier(p, i + 1)}`, `M${p[0][0]},${p[0][1]}`)

// Round tick step (1, 2 or 5 × 10ⁿ) so the value axis reads cleanly
const niceStep = (x: number) => {
  const p = 10 ** Math.floor(Math.log10(x))
  const f = x / p
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p
}

// Monthly amounts spread the published 12-month total along the illustrative curve (see
// data/overview.ts), so every commodity sits on one shared million-dollar scale.
const monthly = (t: CommodityTrend) => {
  const sum = t.sampleCurve.reduce((s, v) => s + v, 0)
  return t.sampleCurve.map((v) => (t.value * v) / sum)
}

/** All four commodities on one chart; the selected one is drawn on top with its area and halo. */
function TrendChart({ months, selected, onSelect }: { months: Window; selected: string; onSelect: (id: string) => void }) {
  const gid = useId()
  const [hover, setHover] = useState<number | null>(null)
  const labels = monthsOf(months)
  const series = commodityTrends.map((t) => {
    const values = monthly(t).slice(-months)
    const incomplete = Math.min(incompleteTail(t.sampleCurve), values.length - 2)
    return { t, values, k: values.length - 1 - incomplete }
  })
  // Value axis: 0 up to a round top, in TICKS equal steps. Scaled on the full 12 months, so the
  // 6- and 12-month views share one axis and the same month sits at the same height in both.
  const step = niceStep(Math.max(...commodityTrends.flatMap(monthly)) / TICKS)
  const top = step * TICKS
  const ticks = Array.from({ length: TICKS + 1 }, (_, i) => i * step)
  const y = (v: number) => (1 - v / top) * H
  // Time runs left → right (chart convention, also in RTL UIs)
  const x = (i: number) => (i / (months - 1)) * W
  const drawn = series.map((s) => {
    const pts = s.values.map((v, i) => [x(i), y(v)] as const)
    const tail = pts.slice(s.k + 1).reduce((d, _, i) => `${d} ${bezier(pts, s.k + 1 + i)}`, `M${pts[s.k][0]},${pts[s.k][1]}`)
    return { ...s, pts, solid: smooth(pts.slice(0, s.k + 1)), tail, area: `${smooth(pts)} L${W},${H} L0,${H} Z` }
  })
  // Selected last, so it paints over the others
  const ordered = [...drawn.filter((d) => d.t.id !== selected), ...drawn.filter((d) => d.t.id === selected)]
  const cur = drawn.find((d) => d.t.id === selected)!
  const h = hover === null ? null : cur.pts[hover]
  const hoverIncomplete = hover !== null && hover > cur.k
  const amount = hover === null || hoverIncomplete ? null : cur.values[hover]
  const change = hover && !hoverIncomplete ? ((cur.values[hover] - cur.values[hover - 1]) / cur.values[hover - 1]) * 100 : null
  const tipX = h ? (h[0] / W) * 100 : 0
  const tipShift = tipX < 20 ? '-12%' : tipX > 80 ? '-88%' : '-50%'
  // Tip above the dot, or below it when the dot is near the top
  const below = h ? h[1] / H < 0.35 : false
  // Month labels: every month for 6, every other month for 12
  const every = months === 12 ? 2 : 1

  const indexAt = (e: React.PointerEvent<HTMLDivElement> | React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    return Math.max(0, Math.min(months - 1, Math.round(((e.clientX - r.left) / r.width) * (months - 1))))
  }
  // A click on the chart picks the line nearest to the pointer at that month
  const onClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const i = indexAt(e)
    const py = ((e.clientY - r.top) / r.height) * H
    const near = drawn.reduce((a, d) => (Math.abs(d.pts[i][1] - py) < Math.abs(a.pts[i][1] - py) ? d : a))
    onSelect(near.t.id)
  }

  return (
    <div className="tchart" dir="ltr">
      {/* Axis shows each month's value; the list shows the window total, which these months add up to */}
      <span className="tchart__ytitle">میلیون دلار</span>
      <div className="tchart__plot" onPointerMove={(e) => setHover(indexAt(e))} onPointerLeave={() => setHover(null)} onClick={onClick}>
        {/* Value axis labels, and faint solid guides to read them against */}
        {ticks.map((v) => (
          <span key={v} className="tchart__ytick" style={{ top: `${(y(v) / H) * 100}%` }} aria-hidden="true">
            {formatNumber(v)}
          </span>
        ))}
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
          {ticks.map((v) => (
            <line key={v} x1="0" x2={W} y1={y(v)} y2={y(v)} className={v === 0 ? 'tchart__axis-line' : 'tchart__grid'} />
          ))}
          {ordered.map((d) => {
            const on = d.t.id === selected
            return (
              <g key={d.t.id} className={`tchart__series tc--${d.t.id} ${on ? 'is-on' : ''}`}>
                {on && (
                  <>
                    {/* Gradient lives inside the series so its stops take this line's colour */}
                    <defs>
                      <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" className="tchart__stop-top" />
                        <stop offset="100%" className="tchart__stop-bottom" />
                      </linearGradient>
                    </defs>
                    <path key={selected} d={d.area} fill={`url(#${CSS.escape(gid)})`} className="tchart__area" />
                  </>
                )}
                <path d={d.solid} className="tchart__line" />
                <path d={d.tail} className="tchart__line tchart__line--incomplete" />
              </g>
            )
          })}
          {h && <line x1={h[0]} x2={h[0]} y1="0" y2={H} className="trend__guide" />}
        </svg>
        {/* Markers in HTML so they stay round despite the stretched SVG */}
        {h && (
          <>
            <span className={`tchart__dot tc--${selected}`} style={{ left: `${(h[0] / W) * 100}%`, top: `${(h[1] / H) * 100}%` }} />
            <span
              className={`tchart__tip tc--${selected}`}
              dir="rtl"
              style={{
                left: `${tipX}%`,
                top: `${(h[1] / H) * 100}%`,
                transform: `translate(${tipShift}, ${below ? '18px' : 'calc(-100% - 18px)'})`,
              }}
            >
              {/* Header: month and change; a divider; then the value row with its colour key */}
              <span className="trend__tip-head">
                <span className="trend__tip-month">{labels[hover!].name}</span>
                {hoverIncomplete ? null : change === null ? (
                  <span className="trend__tip-note">آغاز بازه</span>
                ) : (
                  <span className={`trend__tip-change trend__tip-change--${change < 0 ? 'down' : 'up'}`}>
                    {change < 0 ? <TrendingDown size={12} aria-hidden="true" /> : <TrendingUp size={12} aria-hidden="true" />}
                    <span className="num">{formatSignedPercent(change)}</span>
                  </span>
                )}
              </span>
              {hoverIncomplete && <span className="trend__tip-flag">داده این ماه احتمالاً ناقص است و مقدار آن نمایش داده نمی‌شود</span>}
              {amount !== null && (
                <span className="trend__tip-row">
                  <span className="trend__tip-amount">
                    <span className="num">{formatNumber(amount, 0)}</span>
                    <span>میلیون دلار</span>
                  </span>
                </span>
              )}
            </span>
          </>
        )}
        {/* Time axis: year/month */}
        {/* A tick mark under every month; labels on every `every`-th, ending on the latest month */}
        {labels.map((m, i) => (
          <span key={i} className="tchart__xtick" style={{ left: `${(x(i) / W) * 100}%` }} aria-hidden="true">
            {i % every === (months - 1) % every && <span className="tchart__xlabel">{m.num}</span>}
          </span>
        ))}
      </div>
    </div>
  )
}

// Window figures. Total: the published 12-month total, or for 6 months its share along the sample
// curve (the split the hover uses). Change: last complete month against the first month of the
// window, read from the sample curve, so the incomplete trailing months never distort it.
function windowFigures(t: CommodityTrend, months: Window) {
  const c = t.sampleCurve
  const win = c.slice(-months)
  const lastComplete = win[win.length - 1 - Math.min(incompleteTail(c), win.length - 2)]
  const change = ((lastComplete - win[0]) / win[0]) * 100
  if (months === 12) return { value: t.value, change }
  const sum = c.reduce((s, v) => s + v, 0)
  return { value: (t.value * win.reduce((s, v) => s + v, 0)) / sum, change }
}

export function CommodityTrends() {
  const [months, setMonths] = useState<Window>(12)
  const [selected, setSelected] = useState(commodityTrends[0].id)
  const has = months === 12
  return (
    <Panel
      title="روند ارزش تجارت کالاها"
      // The overview shows the leading four, as the live build does
      subtitle={`۴ کالا با بیشترین ارزش تجارت در ${formatNumber(months)} ماه اخیر (میلادی) · ارقام به میلیون دلار`}
      index={7}
      sample={!has}
      actions={
        <div className="seg seg--compact" role="group" aria-label="بازه زمانی">
          {([6, 12] as const).map((m) => (
            <button key={m} type="button" aria-pressed={months === m} onClick={() => setMonths(m)}>
              {formatNumber(m)} ماه
            </button>
          ))}
        </div>
      }
      guide={
        <>
          {has
              ? 'درصد تغییر: آخرین ماه کامل در برابر ماه اول بازه. ماه نقطه‌چین احتمالاً ناقص است و در تغییر حساب نمی‌شود. مقادیر ماهانه نمونه طراحی‌اند.'
              : 'جمع ۶ ماه از مقادیر ماهانه نمونه است. درصد تغییر: آخرین ماه کامل در برابر ماه اول بازه. ماه نقطه‌چین احتمالاً ناقص است و در تغییر حساب نمی‌شود.'}
        </>
      }
    >
      <div className="trend-body">
        {/* Commodity list on the start side; picking one highlights its line in the chart */}
        <ul className="trend-list" aria-label="کالاها">
          {commodityTrends.map((t, i) => {
            const fig = windowFigures(t, months)
            const down = fig.change < 0
            const on = t.id === selected
            return (
              <li key={t.id} style={{ '--d': `${i * 70}ms` } as CSSProperties}>
                <button type="button" className={`trend tc--${t.id} ${on ? 'is-on' : ''}`} aria-pressed={on} onClick={() => setSelected(t.id)}>
                  <span className="trend__swatch" aria-hidden="true" />
                  <span className="trend__info">
                    <span className="trend__head">
                      <span className="trend__name">{t.name}</span>
                      <span className={`trend__delta ${down ? 'trend__delta--down' : 'trend__delta--up'}`}>
                        {down ? <TrendingDown size={13} aria-hidden="true" /> : <TrendingUp size={13} aria-hidden="true" />}
                        {formatSignedPercent(fig.change)}
                      </span>
                    </span>
                    <span className="trend__cat">{t.category}</span>
                  </span>
                  <span className="trend__value">
                    <span key={months} className="num ov-swap">{formatNumber(fig.value, has ? 1 : 0)}</span>
                    <span className="trend__unit">میلیون دلار</span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
        <TrendChart key={months} months={months} selected={selected} onSelect={setSelected} />
      </div>
    </Panel>
  )
}
