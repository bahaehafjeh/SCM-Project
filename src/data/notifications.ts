import type { AlertState } from '../lib/alertStore'

/**
 * TEMPORARY sample notifications that no alert state produces yet (until the unit and colleague
 * services exist). Each one is shown only when the alert state makes it true, so a sample never
 * contradicts what the alert panel says.
 *
 * - «واحد پذیرفت» needs a recorded decision whose sync did not fail.
 * - «همکار تصمیم را تغییر داد» needs a recorded decision that a colleague actually changed; no
 *   history entry says so today, so it is never built from this sample.
 */
export interface NotificationSample {
  kind: 'unit_accepted' | 'decision_changed'
  alertId: string
  /** Minutes before the page load */
  minutesAgo: number
  actor: string
  /** The sample only exists when this is true for the current alert state */
  when: (st: AlertState, alertId: string) => boolean
}

export const notificationSamples: NotificationSample[] = [
  // Only for a decision that existed before this visit (no `at`): one the user records now has not been answered yet
  { kind: 'unit_accepted', alertId: 'a2', minutesAgo: 180, actor: 'واحد حمل‌ونقل', when: (st, id) => !!st.records[id] && !st.records[id].at && st.records[id].sync !== 'failed' },
  { kind: 'decision_changed', alertId: 'a2', minutesAgo: 1500, actor: 'مدیر انبارهای جنوب', when: () => false },
]
