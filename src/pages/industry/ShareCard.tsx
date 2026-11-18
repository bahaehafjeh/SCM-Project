import type { CSSProperties } from 'react'
import { UNIT_LABEL, shareGroups } from '../../lib/industry/derive'
import type { ShareAmounts, ShareGroup } from '../../lib/industry/derive'
import { fa } from '../../lib/industry/format'
import { AXIS } from '../../lib/industry/months'
import { HeaderStat } from '../../components/overview/HeaderStat'
import { Card, stateOf } from './parts'
import type { CardCtx } from './parts'

/** Source colours: the same as the two crude-oil series (a light tint for the boxes, the full colour for the group rule) */
const TONE: Record<ShareGroup['source'], string> = { وارداتی: 'var(--raw-orange-500)', داخلی: 'var(--raw-blue-600)' }
const pc = (v: number | null) => (v == null ? '—' : `${fa(v, 1)}٪`)

/** «سهم مواد در {ماه پایان}»: the import/domestic split on top, then each source's items with their share beside the bar; amounts in the page's unit */
export function ShareCard({ ctx }: { ctx: CardCtx }) {
  const month = ctx.end
  const s = ctx.ds && month ? shareGroups(ctx.ds, month, ctx.unit) : null
  const unit = UNIT_LABEL[ctx.unit]
  const amount = (a: ShareAmounts) => {
    const v = ctx.unit === 'usd' ? a.usd : a.mr
    return v == null ? '—' : fa(v, ctx.unit === 'usd' ? 1 : 0)
  }
  return (
    <Card
      ctx={ctx}
      state={stateOf(ctx, !!s)}
      title={`سهم مواد در ${month ?? AXIS[ctx.range.to]}`}
      subtitle="سهم از مبلغ کل خرید ماه پایان"
      guide={`سهم هر قلم از مبلغ کل خرید ${month ?? ''} به ${unit}؛ طول هر نوار همان سهم از کل ماه است تا اقلام دو گروه با هم مقایسه شوند.`}
      actions={s && <HeaderStat label="جمع خرید ماه" value={amount(s.total)} unit={unit} />}
    >
      {s && (
        <>
          <div className="ind-sgroups">
            {s.groups
              .map((grp) => ({
                ...grp,
                items: grp.items.filter((r) => {
                  const v = ctx.unit === 'usd' ? r.usd : r.mr
                  return v != null && v > 0
                }),
              }))
              .map((g) => (
                <section key={g.source} className="ind-sgroup" style={{ '--tone': TONE[g.source] } as CSSProperties} aria-label={`${g.source}، ${pc(g.share)}`}>
                  {/* The source's share: a tab on the top-left corner, half above the box */}
                  <span className="ind-sgroup__badge">
                    <span className="n">{pc(g.share)}</span>
                  </span>
                  {/* The source's share and amount head its own list, on a tint of its colour */}
                  <header className="ind-sgroup__head" style={{ '--tone': TONE[g.source] } as CSSProperties}>
                    <span className="ind-sgroup__title">
                      {g.source}
                      <span className="ind-sgroup__count">
                        (<span className="n">{fa(g.items.length)}</span> قلم)
                      </span>
                    </span>
                    <span className="ind-sgroup__sum">
                      <span className="ind-sgroup__amt">
                        <span className="n">{amount(g)}</span> {unit}
                      </span>
                    </span>
                  </header>
                  {g.items.length === 0 ? (
                    <p className="ind-sgroup__empty">در این ماه خریدی ثبت نشده است</p>
                  ) : (
                    <div role="table" aria-label={`اقلام ${g.source}`}>
                      <div className="ind-srow ind-srow--head" role="row">
                        <span role="columnheader">ماده</span>
                        <span role="columnheader" className="ind-srow__bar">
                          {/* Same layout as the rows (an invisible bar first), so «سهم» stands over the percents */}
                          <span className="ind-share__track is-ghost" aria-hidden="true" />
                          <span className="ind-srow__pct">سهم</span>
                        </span>
                        <span role="columnheader">{unit}</span>
                      </div>
                      <div className="ind-srows" role="rowgroup">
                        {g.items.map((r) => (
                          <div key={r.key} className="ind-srow" role="row">
                            <span role="cell" className="ind-srow__name" title={`${r.item} · ${r.unit}`}>
                              <span className="ind-srow__label">
                                {r.item} <span className="ind-srow__unit">{r.unit}</span>
                              </span>
                            </span>
                            <span role="cell" className="ind-srow__bar">
                              <span className="ind-share__track" aria-hidden="true">
                                {r.share ? <span style={{ '--k': Math.min(20, Math.max(1, Math.round(r.share / 5))), backgroundColor: r.color } as CSSProperties} /> : null}
                              </span>
                              <b className="ind-srow__pct">
                                <span className="n">{pc(r.share)}</span>
                              </b>
                            </span>
                            <span role="cell">
                              <span className="n">{amount(r)}</span>
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </section>
              ))}
          </div>
        </>
      )}
    </Card>
  )
}
