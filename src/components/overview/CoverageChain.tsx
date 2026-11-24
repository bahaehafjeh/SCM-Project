import { Link } from 'react-router-dom'
import type { CSSProperties } from 'react'
import { Layers, Factory, Package, Truck, Store, User, ArrowLeft } from 'lucide-react'
import { chain } from '../../data/overview'
import type { ChainStep } from '../../data/overview'
import { formatPercent } from '../../lib/format'
import { Panel } from './Panel'

const icons = {
  'raw-materials-warehousing': Layers,
  industries: Factory,
  packaging: Package,
  distribution: Truck,
  retail: Store,
  consumer: User,
} as const

const RING_R = 30
const RING_C = 2 * Math.PI * RING_R

function Node({ step, i }: { step: ChainStep; i: number }) {
  const Icon = icons[step.domain]
  const missing = step.coverage === null
  const featured = !!step.to
  const content = (
    <>
      <span className={`chain__disc ${featured ? 'chain__disc--featured' : ''} ${missing ? 'chain__disc--missing' : ''}`}>
        <svg viewBox="0 0 72 72" className="chain__ring" aria-hidden="true">
          <circle cx="36" cy="36" r={RING_R} className="chain__ring-track" />
          {!missing && (
            <circle
              cx="36"
              cy="36"
              r={RING_R}
              className="chain__ring-value"
              style={{ '--len': `${(step.coverage! / 100) * RING_C}`, '--c': `${RING_C}` } as CSSProperties}
            />
          )}
        </svg>
        <span className="chain__icon">
          <Icon size={22} strokeWidth={1.75} aria-hidden="true" />
        </span>
      </span>
      <span className="chain__title">
        {step.title}
        {featured && <ArrowLeft size={14} aria-hidden="true" />}
      </span>
      <span className={`chain__pill ${featured ? 'chain__pill--featured' : ''} ${missing ? 'chain__pill--missing' : ''}`}>
        {missing ? 'بدون داده' : `${formatPercent(step.coverage!)} پوشش`}
      </span>
      <span className="chain__note">{step.note}</span>
    </>
  )
  const style = { '--d': `${i * 70}ms` } as CSSProperties
  return (
    <li className="chain__step" style={style}>
      {featured ? (
        <Link to={step.to!} className="chain__node chain__node--link" aria-label={`${step.title}، ${formatPercent(step.coverage!)} پوشش نیازمندی‌ها؛ ورود به حوزه`}>
          {content}
        </Link>
      ) : (
        <div className="chain__node" tabIndex={0} aria-label={`${step.title}، ${missing ? 'داده گردآوری نشده' : `${formatPercent(step.coverage!)} پوشش نیازمندی‌ها`}`}>
          {content}
        </div>
      )}
    </li>
  )
}

export function CoverageChain() {
  return (
    <Panel
      title="پوشش داده در حلقه‌های زنجیره"
      subtitle="درصد نیازمندی‌های داده‌ای هر حلقه که داده دارد؛ کیفیت داده را نشان نمی‌دهد"
      index={2}
    >
      <ol className="chain">
        {chain.map((s, i) => (
          <Node key={s.domain} step={s} i={i} />
        ))}
      </ol>
    </Panel>
  )
}
