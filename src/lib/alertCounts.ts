import { allAlerts } from '../data/overview'
import { bucketCounts, useAlertState } from './alertStore'

/**
 * Alerts per tab over every alert (the alerts page's list). The menu badge, the bell and the
 * «نیازمند بررسی» tab all read this, so their numbers never differ.
 */
export function useAlertBuckets() {
  return bucketCounts(useAlertState(), allAlerts)
}
