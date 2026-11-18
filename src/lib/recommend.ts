import type { AlertDetail, AlertOption } from '../data/alerts'
import { paramsForOption } from './engine'
import type { ScenarioModel } from './engine'
import type { AlertState } from './alertStore'

/**
 * The one rule for «پیشنهاد سیستم», shared by the alert panel and the scenario table: the option is
 * the data's recommendation, its confidence is at least 50 %, the user has not rejected it, and no
 * unit turned it down.
 */

/** A unit turned down an action: that option, and a combined one leaning on the same transfer */
export function unitBlockedFor(detail: AlertDetail, st: AlertState, alertId: string) {
  const rej = !st.records[alertId] ? st.unitRejections[alertId] : undefined
  return (o: AlertOption) => !!rej && (o.id === rej.option || (o.kind === 'combo' && detail.options.find((x) => x.id === rej.option)?.kind === 'transfer'))
}

/** Confidence of an option: the engine's when the type has a model for it, else the data's */
export function optionConfidence(m: ScenarioModel | null, o: AlertOption, amount = o.amount) {
  return m && m.options[o.id] ? m.run(paramsForOption(m, o.id, amount)).confidence : o.confidence
}

export function isSystemPick(o: AlertOption, confidence: number, rejectedOption: string | undefined, blockedByUnit: boolean) {
  // A referral has no forecast of its own, and 0 means «not computed»: neither counts as weak
  const weak = o.kind !== 'refer' && confidence > 0 && confidence < 50
  return !!o.recommended && !weak && rejectedOption !== o.id && !blockedByUnit
}

/** The option the system recommends now, if any */
export function systemPickOf(detail: AlertDetail, m: ScenarioModel | null, st: AlertState, alertId: string): AlertOption | undefined {
  const blocked = unitBlockedFor(detail, st, alertId)
  return detail.options.find((o) => isSystemPick(o, optionConfidence(m, o), st.rejected[alertId]?.option, blocked(o)))
}
