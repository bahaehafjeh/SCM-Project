import { useState } from 'react'
import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { alerts, shipments } from '../../data/overview'
import { useAlertState } from '../../lib/alertStore'
import { severityLabel } from './AlertParts'
import { formatNumber, formatPercent } from '../../lib/format'
import { Panel } from './Panel'

// Half arc (owner reference): thick strokes with round ends that tuck under one another. Segments run from the right end (start, in RTL) over the top to the left end.
const W = 260
const H = 140
const C = W / 2
const CY = 118
const R = 92 // stroke centre line
const STROKE = 24

const toneColor = { success: 'var(--raw-emerald-500)', warning: 'var(--raw-amber-400)', danger: 'var(--raw-red-500)' } as const

// Angle 0 = right end, π = left end; y grows downward.
const pt = (a: number) => `${C + R * Math.cos(a)},${CY - R * Math.sin(a)}`
const arc = (a0: number, a1: number) => `M${pt(a0)} A${R} ${R} 0 ${a1 - a0 > Math.PI ? 1 : 0} 0 ${pt(a1)}`

/** Shipment status: three figures with colour keys, over a stacked half arc. Sample data. */
export function ShipmentStatus() {
  const [active, setActive] = useState<string | null>(null)
  let acc = 0
  const segs = shipments.segments.map((s) => {
    const share = s.count / shipments.total
    const a0 = acc * Math.PI
    acc += share
    return { ...s, share, a0, a1: acc * Math.PI }
  })
  const current = segs.find((s) => s.id === active)
  const st = useAlertState()
  // One entity, one panel: each shipment with an open alert opens that alert
  const withAlert = alerts.filter((a) => a.type === 'shipment' && !st.closed[a.id])

  return (
    <Panel
      title="وضعیت حمل محموله‌ها"
      subtitle={`${formatNumber(shipments.total)} محموله پایش‌شده در حال حمل`}
      index={5}
      sample
      className="ship-panel"
      guide={
        <>
          {shipments.definition}
        </>
      }
    >
      <div className={`ship ${active ? 'is-focus' : ''}`}>
        <ul className="ship__stats">
          {segs.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                className={`ship__stat ${active === s.id ? 'is-active' : ''}`}
                style={{ '--c': toneColor[s.tone] } as CSSProperties}
                onMouseEnter={() => setActive(s.id)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(s.id)}
                onBlur={() => setActive(null)}
                aria-label={`${s.label}: ${formatNumber(s.count)} محموله، ${formatPercent(s.share * 100)} از کل`}
              >
                <span className="ship__label">{s.label}</span>
                <span className="ship__value">
                  <span className="num">{formatNumber(s.count)}</span>
                  <span className="ship__share num">{formatPercent(s.share * 100)}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>

        <div className="ship__chart">
          <svg viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
            {/* Drawn last-to-first so each round end overlaps the next segment, as in the reference */}
            {[...segs].reverse().map((s) => (
              <path
                key={s.id}
                d={arc(s.a0, s.a1)}
                style={{ '--c': toneColor[s.tone] } as CSSProperties}
                strokeWidth={STROKE}
                className={`ship__seg ${active === s.id ? 'is-active' : ''}`}
                onMouseEnter={() => setActive(s.id)}
                onMouseLeave={() => setActive(null)}
              />
            ))}
          </svg>
          <div key={current?.id ?? 'all'} className="ship__center ov-swap" aria-live="polite">
            <span className="ship__center-value num">{formatNumber(current ? current.count : shipments.total)}</span>
            <span className="ship__center-label">{current ? current.label : 'محموله در حال حمل'}</span>
          </div>
        </div>
      </div>
      {withAlert.length > 0 && (
        <div className="ship__alerts">
          <p className="ship__alerts-title">محموله‌های دارای هشدار</p>
          <ul>
            {withAlert.map((a) => (
              <li key={a.id}>
                <Link to={`/?alert=${a.code}`} className="ship__alert" aria-label={`باز کردن هشدار ${severityLabel[a.severity]}: ${a.title}`}>
                  <span className={`stock__alert stock__alert--${a.severity}`}>
                    <span className="stock__alert-dot" aria-hidden="true" />
                    {severityLabel[a.severity]}
                  </span>
                  <span className="ship__alert-title">{a.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Panel>
  )
}
