import { faDigits } from './months'

/**
 * Numbers of «داشبورد تحلیلی صنعت» (page-prompt §4): Persian digits, «٬» thousands, «٫» decimals,
 * «−» (U+2212) for minus. Rounding half away from zero, and only when shown.
 */
export const MINUS = '−'
export const DASH = '—'

const round = (x: number, d: number) => {
  const f = 10 ** d
  // The small nudge keeps 0.05 → 0.1 although 0.05 × 10 is 0.49999… in binary
  return (Math.sign(x) * Math.round(Math.abs(x) * f + 1e-9)) / f
}

/** «۱۶۷٬۲۰۴٫۰»; null → «—» */
export function fa(x: number | null | undefined, d = 0): string {
  if (x == null || !Number.isFinite(x)) return DASH
  const r = round(x, d)
  const [int, frac] = Math.abs(r).toFixed(d).split('.')
  const body = faDigits(int.replace(/\B(?=(\d{3})+(?!\d))/g, '٬') + (frac ? `٫${frac}` : ''))
  return r < 0 ? `${MINUS}${body}` : body
}

/** «+۳۸۲٫۸» / «−۴۱٫۱»; no sign when it rounds to zero */
export function signed(x: number | null | undefined, d = 0): string {
  if (x == null || !Number.isFinite(x)) return DASH
  const r = round(x, d)
  if (r === 0) return fa(0, d)
  return r > 0 ? `+${fa(r, d)}` : fa(r, d)
}

/** «−۴۱٫۱٪» */
export const pct = (x: number | null | undefined, d = 1) => (x == null || !Number.isFinite(x) ? DASH : `${fa(x, d)}٪`)
/** «+۴۱٫۱٪» */
export const signedPct = (x: number | null | undefined, d = 1) => (x == null || !Number.isFinite(x) ? DASH : `${signed(x, d)}٪`)

/** Axis of four steps: step is the smallest of {1, 2, 2.5, 5, 10} × 10ⁿ that reaches max / 4 */
export function niceTicks(max: number): { step: number; max: number; ticks: number[] } {
  if (!(max > 0)) return { step: 1, max: 1, ticks: [0, 1] }
  const raw = max / 4
  const mag = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map((k) => k * mag).find((s) => s >= raw - 1e-9) ?? 10 * mag
  const ticks = [0]
  while (ticks[ticks.length - 1] < max - 1e-9) ticks.push(ticks.length * step)
  return { step, max: ticks[ticks.length - 1], ticks }
}

/** A fixed axis: 0 to max every step */
export const fixedTicks = (max: number, step: number) => ({ step, max, ticks: Array.from({ length: Math.round(max / step) + 1 }, (_, k) => k * step) })
