import { formatNumber } from '../format'

export const fa = (n: number, d = 0) => formatNumber(n, d)
export const days = (v: number) => `${fa(Math.round(v))} روز`
export const tons = (v: number) => `${fa(Math.round(v))} تن`
export const num = (v: number) => fa(Math.round(v))
export const pct = (v: number) => `${fa(Math.round(v))}٪`
/** million toman → «۲۴۰ میلیون» / «۱٫۸ میلیارد» */
export const money = (m: number) => (m === 0 ? '—' : m >= 1000 ? `${fa(m / 1000, 1)} میلیارد` : `${fa(Math.round(m))} میلیون`)
/** Uncertainty half-width per day: wider for lower confidence and further out */
export const bandOf = (series: number[], confidence: number, scale = 1) => series.map((_, d) => (1 + d) * ((100 - confidence) / 10) * scale)
export const range = (h: number) => Array.from({ length: h + 1 }, (_, d) => d)
/** Confidence in words, always shown with the number */
export const confidenceWord = (pct: number) => (pct >= 75 ? 'بالا' : pct >= 50 ? 'متوسط' : 'ضعیف')
/** End-of-horizon forecast as a range, e.g. «۱۲۰ تا ۱۵۲» */
export const rangeAt = (r: { series: number[]; band: number[] }, d: number) => {
  const i = Math.min(d, r.series.length - 1)
  return `${fa(Math.max(0, Math.round(r.series[i] - r.band[i])))} تا ${fa(Math.round(r.series[i] + r.band[i]))}`
}
