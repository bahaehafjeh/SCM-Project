import { Link } from 'react-router-dom'
import { Siren, PackageCheck, PackageMinus, CircleDollarSign, ArrowUpLeft } from 'lucide-react'
import type { CSSProperties } from 'react'
import { kpis } from '../../data/overview'
import type { Kpi } from '../../data/overview'
import { formatFixed, formatNumber } from '../../lib/format'
import { useCountUp } from '../../lib/useCountUp'
import { Panel } from './Panel'

// One icon per counted entity: critical alerts, on-time shipments, items below safety stock, trade value in dollars
const icons = { alerts: Siren, shipments: PackageCheck, 'low-stock': PackageMinus, 'route-value': CircleDollarSign }

/** Reading order: what is counted (icon + title) → the figure → its breakdown. */
function Tile({ k, i }: { k: Kpi; i: number }) {
  const Icon = icons[k.id as keyof typeof icons]
  const shown = useCountUp(k.value, 900, 200 + i * 80)
  const final = k.decimals ? formatFixed(k.value, k.decimals) : formatNumber(k.value)
  // Two balanced sides: what is counted (icon + title) on the start side; the figure with its unit,
  // and the breakdown under it, on the end side
  const body = (
    <>
      <div className="kpi__head">
        <span className={`kpi__icon kpi__icon--${k.tone}`} aria-hidden="true">
          <Icon size={17} strokeWidth={1.75} />
        </span>
        <p className="kpi__title">{k.title}</p>
      </div>
      <div className="kpi__figs">
        <p className="kpi__value" aria-label={`${final}${k.suffix ?? ''} ${k.unit}`}>
          <span className="num" aria-hidden="true">
            {k.decimals ? formatFixed(shown, k.decimals) : formatNumber(Math.round(shown))}
            {k.suffix}
          </span>
          <span className="kpi__unit" aria-hidden="true">
            {k.unit}
          </span>
        </p>
        <ul className="kpi__details">
          {k.details.map((d) => (
            <li key={d.text} className={d.tone ? `kpi__detail kpi__detail--${d.tone}` : 'kpi__detail'}>
              {d.text}
            </li>
          ))}
        </ul>
      </div>
      {/* Linked cards: arrow in the free top-end corner, above the figures */}
      {k.to && <ArrowUpLeft size={16} className="kpi__go" aria-hidden="true" />}
    </>
  )
  const style = { '--d': `${i * 60}ms` } as CSSProperties
  return k.to ? (
    <Link to={k.to} className={`kpi kpi--link ${k.sample ? 'kpi--sample' : ''}`} style={style}>
      {body}
    </Link>
  ) : (
    <div className={`kpi ${k.sample ? 'kpi--sample' : ''}`} style={style}>
      {body}
    </div>
  )
}

export function KpiStrip() {
  return (
    <Panel title="شاخص‌های کلیدی زنجیره تأمین" index={0} className="kpi-panel">
      <div className="kpi-grid">
        {kpis.map((k, i) => (
          <Tile key={k.id} k={k} i={i} />
        ))}
      </div>
    </Panel>
  )
}
