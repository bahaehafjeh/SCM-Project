import { stages } from '../../domain/supplyChain'
import { chainImpact } from '../../data/chainImpact'
import type { ChainLevel } from '../../data/chainImpact'
import type { AlertStat } from '../../data/alerts'
import { ImpactTiles } from './AlertParts'

const LEVEL: Record<ChainLevel, string> = { high: 'اثر زیاد', medium: 'اثر متوسط', low: 'اثر کم', none: 'بدون اثر' }

/**
 * «اثر روی زنجیره» on every stage, raw materials to the consumer, in the chain's own order. A stage
 * the alert's data covers shows that figure (filled dot); the rest are samples (hollow dot) until
 * those domains' data is connected. Alerts with no chain sample keep their impact tiles.
 */
export function ChainImpact({ alertId, impact }: { alertId: string; impact: AlertStat[] }) {
  const chain = chainImpact[alertId]
  if (!chain) return <ImpactTiles items={impact} />
  const hasSample = stages.some((s) => chain[s.id] && chain[s.id]!.impact === undefined)
  return (
    <>
      <ol className="achain">
        {stages.map((s) => {
          const e = chain[s.id]
          if (!e) return null
          const own = e.impact !== undefined ? impact[e.impact] : undefined
          return (
            <li key={s.id} className={`achain__row is-${e.level} ${own ? '' : 'is-sample'}`}>
              <span className="achain__dot" aria-hidden="true" />
              <span className="achain__stage">{s.title}</span>
              <span className="achain__text">
                {own ? (
                  <>
                    {own.label}:{' '}
                    {own.items?.length ? (
                      <span className="achain__more" tabIndex={0} title={own.items.join('، ')}>
                        {own.value}
                      </span>
                    ) : (
                      <strong>{own.value}</strong>
                    )}
                  </>
                ) : (
                  e.text
                )}
              </span>
              <span className="visually-hidden">
                {' · '}
                {LEVEL[e.level]}
                {own ? '' : ' · دادهٔ نمونه'}
              </span>
            </li>
          )
        })}
      </ol>
      <p className="achain__legend" aria-hidden="true">
        <span className="achain__key" /> از دادهٔ هشدار
        {hasSample && (
          <>
            <span className="achain__key is-sample" /> دادهٔ نمونه، تا اتصال دادهٔ صنایع، بسته‌بندی، توزیع و خرده‌فروشی
          </>
        )}
      </p>
    </>
  )
}
