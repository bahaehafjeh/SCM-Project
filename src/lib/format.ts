const cache = new Map<string, Intl.NumberFormat>()
const nf = (min: number, max: number) => {
  const key = `${min}-${max}`
  if (!cache.has(key)) cache.set(key, new Intl.NumberFormat('fa-IR', { minimumFractionDigits: min, maximumFractionDigits: max }))
  return cache.get(key)!
}

/** Persian digits with Persian separators (٬ and ٫). */
export const formatNumber = (n: number, maxFractionDigits = 1) => nf(0, maxFractionDigits).format(n)

/** Fixed decimals, e.g. 2199.32 → «۲٬۱۹۹٫۳۲». */
export const formatFixed = (n: number, digits: number) => nf(digits, digits).format(n)

/** 40 → «۴۰٪» */
export const formatPercent = (n: number, maxFractionDigits = 1) => `${formatNumber(n, maxFractionDigits)}٪`

/** Signed percent with a Persian minus sign placed before the number: «−۹۱٫۵٪». */
export const formatSignedPercent = (n: number) => `${n < 0 ? '−' : n > 0 ? '+' : ''}${formatNumber(Math.abs(n))}٪`

/** «۲۱ آبان»: a date in the Persian calendar with Persian digits */
export const formatPersianDate = (d: Date) => new Intl.DateTimeFormat('fa-IR-u-ca-persian', { day: 'numeric', month: 'long' }).format(d)
