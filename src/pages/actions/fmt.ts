import type { ActionItem } from '../../lib/alertStore'
import { formatNumber, formatPersianDate } from '../../lib/format'

const fa = (n: number) => formatNumber(n)
/** «۱:۲۰» from milliseconds */
export const hm = (ms: number) => {
  const m = Math.max(0, Math.round(ms / 60_000))
  return `${fa(Math.floor(m / 60))}:${m % 60 < 10 ? '۰' : ''}${fa(m % 60)}`
}
export const dateOf = (iso: string) => formatPersianDate(new Date(iso))
/** The executing system, read from the reference it gave */
export const systemOf = (a: ActionItem) => (!a.externalRef ? 'بدون ثبت در سیستم' : a.externalRef.startsWith('درخواست خرید') ? 'سیستم خرید' : a.externalRef.startsWith('حواله') ? 'سیستم انبار' : 'سامانه ارجاع')
