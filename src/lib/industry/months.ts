/**
 * Months of «داشبورد تحلیلی صنعت» (page-prompt §4, §5): Persian calendar codes «YYYY/MM». The filter
 * runs on the product's whole data period, 1395/01 to 1405/06 (126 months), so every chart and control
 * is built for the longest range; this symbol's file starts at 1404/02.
 */
export const AXIS_START = '1395/01'
export const AXIS_END = '1405/06'
export const DATA_START = '1404/02'
/** The new fiscal year starts at this month (the cumulative series drop back there) */
export const FISCAL_START = '1404/10'
export const FISCAL_YEAR_END = '1405/09/30'

export const MONTH_NAMES = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'] as const

const code = (y: number, m: number) => `${y}/${String(m).padStart(2, '0')}`
export const yearOf = (m: string) => Number(m.slice(0, 4))
export const monthOf = (m: string) => Number(m.slice(5, 7))

/** The month after (k > 0) or before (k < 0) */
export function shiftMonth(m: string, k: number): string {
  const t = yearOf(m) * 12 + monthOf(m) - 1 + k
  return code(Math.floor(t / 12), (t % 12) + 1)
}

export const AXIS: readonly string[] = (() => {
  const out: string[] = []
  for (let m = AXIS_START; m <= AXIS_END; m = shiftMonth(m, 1)) out.push(m)
  return out
})()

const DIGITS = '۰۱۲۳۴۵۶۷۸۹'
export const faDigits = (s: string) => s.replace(/\d/g, (d) => DIGITS[Number(d)])

/** «شهریور ۱۴۰۵» */
export const monthName = (m: string) => `${MONTH_NAMES[monthOf(m) - 1]} ${faDigits(String(yearOf(m)))}`
/** «شهریور» */
export const monthOnly = (m: string) => MONTH_NAMES[monthOf(m) - 1]
