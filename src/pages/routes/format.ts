import { formatNumber } from '../../lib/format'

/**
 * Numbers of «نقشه مسیرها» (routes-map-prompt §3, §13): Persian digits, «٬» thousands and «٫» decimals;
 * value with one decimal, share with one decimal, distances to the nearest 100 with «حدود».
 */
export const fa = (n: number) => formatNumber(n, 0)
export const fa1 = (n: number) => formatNumber(n, 1)
/** Two decimals, for one route's value and volume (۶٫۴۲ م‌د · ۳٫۱۸ میلیون تن) */
export const fa2 = (n: number) => formatNumber(n, 2)
/** Billion USD, one decimal: «۲۶۲٫۳ میلیارد دلار» (or the number alone) */
export const money = (bn: number, unit = true) => `${formatNumber(Math.round(bn * 10) / 10, 1)}${unit ? ' میلیارد دلار' : ''}`
export const km = (n: number) => `حدود ${fa(Math.round(n / 100) * 100)} کیلومتر`
/** «اردیبهشت ۱۴۰۴» for a Gregorian month (its 15th day falls in that Persian month) */
export const persianMonth = (m: string) => {
  const [y, mo] = m.split('-').map(Number)
  const parts = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { month: 'long', year: 'numeric' }).formatToParts(new Date(y, mo - 1, 15))
  // Month first, as the design writes it («اردیبهشت ۱۴۰۴»), whatever order the locale gives
  return `${parts.find((x) => x.type === 'month')?.value} ${parts.find((x) => x.type === 'year')?.value}`
}
/** «۲۰۲۵/۰۵» */
export const gregorianMonth = (m: string) => m.replace('-', '/').replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[+d])
/** «۰۵» */
export const monthNumber = (m: string) => gregorianMonth(m.slice(5))
export const yearOf = (m: string) => gregorianMonth(m.slice(0, 4))
