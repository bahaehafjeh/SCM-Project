import type { ModelRun, ScenarioModel } from './types'

/**
 * Net money effect against «بدون اقدام»: the problem's cost change + what the action costs.
 * Negative saves, positive spends more. `base` is «بدون اقدام» run with the same shared assumptions.
 * null when the type has no money metric (the problem is not measured in money).
 */
export function netCost(m: Pick<ScenarioModel, 'metrics'>, r: ModelRun, base: ModelRun): number | null {
  const mm = m.metrics.find((x) => x.money)
  if (!mm) return null
  return Math.round(r.values[mm.key] - base.values[mm.key] + r.cost)
}

/** The money metric of a type, if any */
export const moneyMetric = (m: Pick<ScenarioModel, 'metrics'>) => m.metrics.find((x) => x.money) ?? null
