import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { CSSProperties } from 'react'
import { chokepoints } from '../../data/overview'
import { formatNumber, formatPercent } from '../../lib/format'
import { Panel } from './Panel'

const C = 130 // centre
const R_OUT = 112
const R_IN = 74
const GAP = 0.05 // radians between segments
// Corner radius ≈ 16% of the ring thickness: the shape is inset by K and stroked 2K wide with round joins
const K = Math.round((R_OUT - R_IN) * 0.16)
const POP = 7 // hover offset
// Faint ring behind the segments, visible only through the gaps
const TRACK_OUT = R_OUT - 12
const TRACK_IN = R_IN + 12

const polar = (r: number, a: number) => [C + r * Math.sin(a), C - r * Math.cos(a)] as const

// Annular sector, angles clockwise from 12 o'clock, inset by K on every side (see the stroke below).
function arc(a0: number, a1: number) {
  const rOut = R_OUT - K
  const rIn = R_IN + K
  const [x0, y0] = polar(rOut, a0 + K / rOut)
  const [x1, y1] = polar(rOut, a1 - K / rOut)
  const [x2, y2] = polar(rIn, a1 - K / rIn)
  const [x3, y3] = polar(rIn, a0 + K / rIn)
  const large = a1 - a0 > Math.PI ? 1 : 0
  return `M${x0} ${y0} A${rOut} ${rOut} 0 ${large} 1 ${x1} ${y1} L${x2} ${y2} A${rIn} ${rIn} 0 ${large} 0 ${x3} ${y3}Z`
}

const ring = (rOut: number, rIn: number) => `M${C} ${C - rOut} a${rOut} ${rOut} 0 1 1 0 ${2 * rOut} a${rOut} ${rOut} 0 1 1 0 ${-2 * rOut}Z M${C} ${C - rIn} a${rIn} ${rIn} 0 1 0 0 ${2 * rIn} a${rIn} ${rIn} 0 1 0 0 ${-2 * rIn}Z`

/** Reference image 4 (left): transit value of the four main chokepoints, with linked legend. */
export function ChokepointDonut() {
  const navigate = useNavigate()
  const [active, setActive] = useState<string | null>(null)
  const total = chokepoints.reduce((s, c) => s + c.value, 0)
  let acc = 0
  const segs = chokepoints.map((c) => {
    const share = c.value / total
    const a0 = acc * 2 * Math.PI + GAP / 2
    acc += share
    const a1 = acc * 2 * Math.PI - GAP / 2
    const mid = (a0 + a1) / 2
    return { ...c, share, a0, a1, mid }
  })
  const current = segs.find((s) => s.id === active)

  return (
    <Panel
      title="سهم گلوگاه‌ها از تجارت عبوری"
      subtitle="از مجموع ارزش عبوری ۱۱ گلوگاه اصلی · میلیون دلار"
      index={3}
      className="donut-panel"
      // Total sits in the header, beside the title, so the chart has the body to itself
      actions={
        <div className="donut__total">
          <span className="donut__total-label">مجموع ارزش تجارت عبوری</span>
          <span className="donut__total-value">
            <span className="num">{formatNumber(total)}</span>
            <span className="donut__unit">میلیون دلار</span>
          </span>
        </div>
      }
      guide={<>تجارتی که از چند گلوگاه می‌گذرد، در هر کدام یک بار شمرده می‌شود؛ پس جمع سهم‌ها با کل تجارت برابر نیست. «سایر» ۷ گلوگاه دیگر است.</>}
    >
      <div className="donut-body">
        <div className="donut-col">
          <div className="donut">
            <svg viewBox="0 0 260 260" className="donut__svg" role="img" aria-label="سهم چهار گلوگاه اصلی از ارزش تجارت عبوری">
              <path d={ring(TRACK_OUT, TRACK_IN)} className="donut__track" fillRule="evenodd" />
              {segs.map((s, i) => {
                const [dx, dy] = [POP * Math.sin(s.mid), -POP * Math.cos(s.mid)]
                const on = active === s.id
                return (
                  <g key={s.id} className={`donut__seg ${on ? 'is-active' : ''}`} style={{ '--tx': `${dx}px`, '--ty': `${dy}px`, '--d': `${i * 90}ms` } as CSSProperties} onMouseEnter={() => setActive(s.id)} onMouseLeave={() => setActive(null)}>
                    <path d={arc(s.a0, s.a1)} fill={s.color} stroke={s.color} strokeWidth={K * 2} strokeLinejoin="round" />
                  </g>
                )
              })}
              <circle cx={C} cy={C} r={R_IN - 6} className="donut__hub" />
            </svg>
            <div key={current?.id ?? 'idle'} className="donut__center ov-swap" aria-live="polite">
              {/* Empty until a segment or legend row is hovered */}
              {current && (
                <>
                  <span className="donut__center-title">{current.name}</span>
                  <span className="donut__center-value num">{formatNumber(current.value)}</span>
                  <span className="donut__center-sub">میلیون دلار</span>
                </>
              )}
            </div>
          </div>
        </div>

        <ul className={`donut__legend ${active ? 'is-focus' : ''}`}>
          {segs.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                className={`donut__item ${active === s.id ? 'is-active' : ''}`}
                // Only «سایر» gets a tooltip: the chokepoints it groups
                data-tip={s.other?.members}
                onMouseEnter={() => setActive(s.id)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(s.id)}
                onBlur={() => setActive(null)}
                // A chokepoint opens on «نقشه مسیرها»; «سایر» groups seven, so it has nowhere single to go
                onClick={() => !s.other && navigate(`/trade/routes?cp=${s.id}`)}
                aria-label={`${s.name}: ${formatNumber(s.value)} میلیون دلار، ${formatPercent(s.share * 100)}${s.other ? `؛ ${s.other.members}` : '، باز کردن در نقشه مسیرها'}`}
              >
                <span className="donut__swatch" style={{ background: s.color }} aria-hidden="true" />
                <span className="donut__name">{s.name}</span>
                <span className="donut__share" style={{ '--c': s.color } as CSSProperties}>
                  {formatPercent(s.share * 100)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </Panel>
  )
}
