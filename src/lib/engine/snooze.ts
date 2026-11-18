import { paramsForOption, val, withValues } from './params'
import type { ScenarioModel } from './types'

/**
 * Numbers for «یادآوری بعداً» on inventory alerts: how many days the recommended action can wait and
 * still give the same result, and the stock on a given day if nothing is done.
 */
export function snoozeWindow(m: ScenarioModel, option: { id: string; amount?: number }) {
  const p = paramsForOption(m, option.id, option.amount)
  const base = m.run(m.base)
  // The arrival days this option sets (only for the moves it actually makes)
  const keys = [val(p, 'transfer') > 0 ? 'transferDays' : '', val(p, 'purchase') > 0 ? 'purchaseDays' : ''].filter(Boolean)
  let latest = 0
  if (keys.length) {
    const now = m.run(p)
    // Push the arrival back a day at a time while the result stays as good: no extra shortage,
    // and the stock does not touch zero if acting now keeps it above zero
    for (let k = 1; k <= p.horizon; k++) {
      const r = m.run(withValues(m, p, Object.fromEntries(keys.map((x) => [x, val(p, x) + k]))))
      const worse = (r.values.short ?? 0) > (now.values.short ?? 0) || (now.min > 0 && r.min <= 0)
      if (worse) break
      latest = k
    }
  } else {
    // A change to a shipment already on its way: it has to be asked for before the stock runs out
    latest = Math.max(0, (base.emptyDay ?? p.horizon) - 1)
  }
  return {
    /** Whole days the action can wait */
    latest,
    /** First day stock reaches zero with no action */
    emptyDay: base.emptyDay ?? null,
    /** Stock at the end of day d with no action, tonnes */
    stockAt: (d: number) => Math.round(base.series[Math.min(base.series.length - 1, Math.max(0, Math.ceil(d)))]),
    /** No-action stock for the next n days */
    next: (n: number) => base.series.slice(0, n + 1),
  }
}
