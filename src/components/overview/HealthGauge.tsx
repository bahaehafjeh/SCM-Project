import { useEffect, useState } from 'react'
import { CircleHelp, X } from 'lucide-react'
import { alertCounts, chain, health, lowStockTotal, shipments } from '../../data/overview'
import { formatNumber } from '../../lib/format'
import { useCountUp } from '../../lib/useCountUp'
import { Panel } from './Panel'

const TICKS = 46
const CX = 120
const CY = 118
const R_OUT = 104
const R_IN = 84

// Red → orange → amber → yellow → lime → green, built from existing raw ramps.
const stops = ['var(--raw-red-500)', 'var(--raw-orange-500)', 'var(--raw-amber-500)', 'var(--raw-yellow-400)', 'var(--raw-lime-500)', 'var(--raw-green-500)']
const colorAt = (f: number) => {
  const pos = f * (stops.length - 1)
  const i = Math.min(Math.floor(pos), stops.length - 2)
  const t = Math.round((pos - i) * 100)
  return `color-mix(in srgb, ${stops[i + 1]} ${t}%, ${stops[i]})`
}

/** Segmented semicircle gauge (reference image 3). The index is undefined, so the value is a labelled sample. */
export function HealthGauge() {
  const [drawn, setDrawn] = useState(false)
  useEffect(() => {
    const t = requestAnimationFrame(() => setDrawn(true))
    return () => cancelAnimationFrame(t)
  }, [])
  const filled = Math.round((health.value / 100) * (TICKS - 1))
  const shown = useCountUp(health.value, TICKS * 14 + 200)
  const [why, setWhy] = useState(false)

  // Pressures already visible elsewhere on this page. No weights: the index method is not defined yet.
  const late = shipments.segments.filter((s) => s.id !== 'on-time').reduce((n, s) => n + s.count, 0)
  const weakest = chain.filter((c) => c.coverage !== null).sort((a, b) => a.coverage! - b.coverage!)[0]
  const drivers = [
    `${formatNumber(alertCounts.severity.critical)} هشدار بحرانی باز`,
    `${formatNumber(late)} محموله با تأخیر یا اختلال`,
    `${formatNumber(lowStockTotal)} قلم کمتر از سطح ایمن`,
    `پوشش داده ${weakest.title}: ${formatNumber(weakest.coverage!)}٪`,
  ]

  return (
    <Panel
      title="سلامت زنجیره تأمین"
      index={1}
      sample
      className="gauge-panel"
    >
      <div className="gauge" role="img" aria-label={`شاخص سلامت زنجیره ${formatNumber(health.value)} از ۱۰۰ (نمونه طراحی)`}>
        <svg viewBox="0 0 240 132" className="gauge__svg" aria-hidden="true">
          {Array.from({ length: TICKS }, (_, i) => {
            // Left end = 0 (red), right end = 100 (green), as in the reference.
            const f = i / (TICKS - 1)
            const a = Math.PI - f * Math.PI
            const cos = Math.cos(a)
            const sin = Math.sin(a)
            const on = i <= filled
            return (
              <line
                key={i}
                x1={CX + R_IN * cos}
                y1={CY - R_IN * sin}
                x2={CX + R_OUT * cos}
                y2={CY - R_OUT * sin}
                className={`gauge__tick ${on ? 'gauge__tick--on' : ''}`}
                style={{
                  stroke: on && drawn ? colorAt(f) : undefined,
                  transitionDelay: drawn ? `${i * 14}ms` : '0ms',
                }}
              />
            )
          })}
        </svg>
        <div className="gauge__center">
          {/* A score, not a share: the value centred, its scale «/۱۰۰» smaller beneath */}
          <span className="gauge__value num">
            {formatNumber(Math.round(shown))}
            <span className="gauge__scale" dir="ltr">
              /۱۰۰
            </span>
          </span>
          <span className="gauge__pill">{health.label}</span>
        </div>
        <span className="gauge__end gauge__end--min num">۰</span>
        <span className="gauge__end gauge__end--max num">۱۰۰</span>
      </div>
      {/* Icon only; the name says what opens */}
      <button
        type="button"
        className="gauge__why"
        aria-expanded={why}
        aria-controls="gauge-why"
        aria-label="عوامل اثرگذار بر شاخص سلامت"
        title="عوامل اثرگذار بر شاخص سلامت"
        onClick={() => setWhy(true)}
      >
        <CircleHelp size={18} aria-hidden="true" />
      </button>
      {why && (
        <div id="gauge-why" className="gauge-why" role="dialog" aria-label="عوامل اثرگذار بر شاخص سلامت">
          <div className="gauge-why__head">
            <span>عوامل کاهنده امتیاز</span>
            <button type="button" className="gauge-why__close" onClick={() => setWhy(false)} aria-label="بستن">
              <X size={14} aria-hidden="true" />
            </button>
          </div>
          <ul>
            {drivers.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
        </div>
      )}
    </Panel>
  )
}
