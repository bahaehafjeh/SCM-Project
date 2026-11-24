import type { ReactNode } from 'react'
import './overview.css'

/**
 * A labelled figure in a panel header on one line — label, value, unit — on the same light surface
 * as the overview's «مجموع ارزش تجارت عبوری». Use it wherever a card shows a total or a headline
 * figure beside its title, so they all read the same.
 */
export function HeaderStat({ label, value, unit }: { label: string; value: ReactNode; unit?: string }) {
  return (
    <div className="ov-stat">
      <span className="ov-stat__label">{label}</span>
      <span className="ov-stat__value">
        <span className="num">{value}</span>
        {unit && <span className="ov-stat__unit">{unit}</span>}
      </span>
    </div>
  )
}
