import { useState } from 'react'
import { ExternalLink } from 'lucide-react'
import { codalEnergyForecast } from '../../lib/industry/energy'
import type { EnergyKey, EnergySet } from '../../lib/industry/energy'
import { fa } from '../../lib/industry/format'
import { faDigits } from '../../lib/industry/months'
import { Card, stateOf } from './parts'
import type { CardCtx } from './parts'

/** «پیش‌بینی مصرف تا پایان سال مالی»: Codal-reported physical consumption + remaining forecast card */
export function EnergyForecastSummaryCard({ ctx, energy }: { ctx: CardCtx; energy: EnergySet | null }) {
  const [hoverKey, setHoverKey] = useState<EnergyKey | null>(null)
  const end = energy && ctx.end && energy.byMonth.has(ctx.end) ? ctx.end : null
  const f = energy && end ? codalEnergyForecast(energy, end) : null

  return (
    <Card
      ctx={ctx}
      state={stateOf(ctx, !!f)}
      title={`پیش‌بینی مصرف تا پایان سال مالی${end ? ` — ${faDigits(end)}` : ''}`}
      subtitle="مصرف از ابتدای سال به‌اضافه مانده پیش‌بینی‌شده در همین گزارش"
      guide="مقادیر واقعی مصرف از ابتدای سال مالی تا ماه پایان به همراه مانده پیش‌بینی‌شده توسط شرکت در گزارش کدال؛ این پیش‌بینی برآورد مدل سامانه نیست."
      actions={
        f && (
          <a className="ind-efsum__src" href="https://codal.ir" target="_blank" rel="noreferrer">
            کدال
            <ExternalLink size={12} aria-hidden="true" />
          </a>
        )
      }
    >
      {f && (
        <div className="ind-efsum">
          <div className="ind-efsum__legend" aria-hidden="true">
            <span>
              <i className="is-ytd" />
              مصرف از ابتدای سال ({fa(f.elapsedMonths)} ماه)
            </span>
            <span>
              <i className="is-rem" />
              مانده پیش‌بینی ({fa(f.remainingMonths)} ماه)
            </span>
          </div>

          <ul className="ind-efsum__list" aria-label="پیش‌بینی مصرف انرژی گزارش‌شده در کدال">
            {f.rows.map((r) => {
              const dim = hoverKey != null && hoverKey !== r.key
              const hot = hoverKey === r.key
              return (
                <li
                  key={r.key}
                  className={`ind-efsum__carrier ${hot ? 'is-hot' : ''} ${dim ? 'is-dim' : ''}`}
                  tabIndex={0}
                  onMouseEnter={() => setHoverKey(r.key)}
                  onMouseLeave={() => setHoverKey(null)}
                  onFocus={() => setHoverKey(r.key)}
                  onBlur={() => setHoverKey(null)}
                >
                  <div className="ind-efsum__carrier-head">
                    <div className="ind-efsum__name">
                      <span className="ind-schip__dot" style={{ background: r.color, opacity: 1 }} aria-hidden="true" />
                      <strong>{r.name}</strong>
                      <small className="ind-muted">· {r.unit}</small>
                    </div>
                    <div className="ind-efsum__full">
                      <span>کل سال:</span>
                      <strong className="n">{fa(r.fullQty, 0)}</strong>
                    </div>
                  </div>

                  <div
                    className="ind-efsum__track"
                    role="img"
                    aria-label={`${r.name}: مصرف از ابتدای سال ${fa(r.ytdQty, 0)} (${fa(r.ytdPct, 0)}٪)، مانده پیش‌بینی ${fa(r.remQty, 0)} (${fa(r.remPct, 0)}٪)، کل سال ${fa(r.fullQty, 0)} ${r.unit}`}
                  >
                    <span
                      className="ind-efsum__seg is-ytd"
                      style={{
                        width: `${Math.max(4, r.ytdPct)}%`,
                        background: r.color,
                      }}
                    />
                    <span
                      className="ind-efsum__seg is-rem"
                      style={{
                        width: `${Math.max(4, r.remPct)}%`,
                        background: `color-mix(in srgb, ${r.color} 26%, var(--color-muted))`,
                      }}
                    />
                  </div>

                  <div className="ind-efsum__metrics">
                    <div className="ind-efsum__metric">
                      <span>از ابتدای سال:</span>
                      <strong className="n">{fa(r.ytdQty, 0)}</strong>
                      <small className="n">({fa(r.ytdPct, 0)}٪)</small>
                    </div>
                    <div className="ind-efsum__metric">
                      <span>مانده پیش‌بینی:</span>
                      <strong className="n">{fa(r.remQty, 0)}</strong>
                      <small className="n">({fa(r.remPct, 0)}٪)</small>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>

          <p className="ind-efsum__note">{f.note}</p>
        </div>
      )}
    </Card>
  )
}
