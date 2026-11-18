import type { OptionDef, Params, ScenarioModel, ScenarioSnapshot, VarDef } from './types'

/** Value of a variable, wherever its role keeps it */
export const val = (p: Params, key: string): number => p.actions[key] ?? p.assumptions[key] ?? 0

/** All values in one map (for diffs and saved templates) */
export const flat = (p: Params): Record<string, number> => ({ ...p.assumptions, ...p.actions })

/** Params from a flat map: each key goes where its variable's role says (unknown keys are assumptions) */
export function build(vars: VarDef[], values: Record<string, number>, horizon: number): Params {
  const p: Params = { actions: {}, assumptions: {}, horizon }
  for (const [k, v] of Object.entries(values)) {
    if (vars.find((x) => x.key === k)?.role === 'action') p.actions[k] = v
    else p.assumptions[k] = v
  }
  return p
}

/** A copy with some values changed; `horizon` in the patch changes the horizon */
export function withValues(m: Pick<ScenarioModel, 'vars'>, p: Params, patch: Record<string, number>): Params {
  const { horizon, ...rest } = patch
  return build(m.vars, { ...flat(p), ...rest }, horizon ?? p.horizon)
}

/** Params with an alert option applied: its patch, then its amount on the variable it drives */
export function paramsForOption(m: ScenarioModel, optionId: string, amount?: number): Params {
  const o: OptionDef | undefined = m.options[optionId]
  const patch = { ...(o?.patch ?? {}) }
  if (o?.key && amount !== undefined) patch[o.key] = amount
  return withValues(m, m.base, patch)
}

/** Changes against the base, by key (horizon excluded) */
export const changes = (m: ScenarioModel, p: Params) => Object.fromEntries(Object.entries(flat(p)).filter(([k, v]) => v !== val(m.base, k)))

/** Actions that differ from «بدون اقدام» */
export const activeActions = (m: ScenarioModel, p: Params) => Object.keys(p.actions).filter((k) => p.actions[k] !== (m.base.actions[k] ?? 0))

/** Global scenario counter: ids are permanent and never reused in this session */
let counter = 0
export const newScenarioId = () => `SCN-${String(++counter).padStart(3, '0')}`

/** Fixed copy of a scenario run, for the applied scenario and the recorded decision */
export function snapshot(m: ScenarioModel, p: Params, id: string, name: string): ScenarioSnapshot {
  const r = m.run(p)
  return {
    id,
    name,
    facts: structuredClone(m.facts),
    assumptions: { ...p.assumptions },
    actions: { ...p.actions },
    horizon: p.horizon,
    outcome: { values: { ...r.values }, cost: r.cost, confidence: r.confidence, min: r.min, emptyDay: r.emptyDay, series: [...r.series], band: [...r.band] },
    at: new Date().toISOString(),
  }
}

/** Metric label for the horizon actually run */
export const metricLabel = (m: { label: string; unit?: string; labelAt?: (h: number) => string }, horizon?: number) => {
  const label = horizon !== undefined && m.labelAt ? m.labelAt(horizon) : m.label
  return m.unit ? `${label} (${m.unit})` : label
}

/**
 * Days until what an option sends arrives (the same arrival days the cards show): arrivals the
 * option adds or moves against «بدون اقدام»; the last one when there are several (e.g. transfer +
 * purchase). null when the option moves nothing (a referral) or the model has no arrivals.
 */
export function arrivalDays(m: ScenarioModel, optionId: string, amount?: number): number | null {
  if (!m.events || !m.options[optionId]) return null
  const p = paramsForOption(m, optionId, amount)
  const base = new Set(m.events(m.base).map((e) => `${e.label}:${e.day}`))
  const days = m.events(p).filter((e) => !base.has(`${e.label}:${e.day}`)).map((e) => e.day)
  return days.length ? Math.max(...days) : null
}
