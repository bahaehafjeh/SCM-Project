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

/** Axis of ~`steps` intervals: step is the smallest of {1, 2, 2.5, 5, 10} × 10ⁿ that reaches max / steps */
export function niceTicks(max: number, steps = 4): { step: number; max: number; ticks: number[] } {
  if (!(max > 0)) return { step: 1, max: 1, ticks: [0, 1] }
  const raw = max / Math.max(1, steps)
  const mag = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map((k) => k * mag).find((s) => s >= raw - 1e-9) ?? 10 * mag
  const ticks = [0]
  while (ticks[ticks.length - 1] < max - 1e-9) ticks.push(ticks.length * step)
  return { step, max: ticks[ticks.length - 1], ticks }
}

/** Snap a positive number to a clean 1 / 2 / 2.5 / 5 × 10ⁿ step */
function snapNice(v: number): number {
  if (!(v > 0)) return 0
  const mag = 10 ** Math.floor(Math.log10(v))
  const norm = v / mag
  const k = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].reduce((best, c) => (Math.abs(c - norm) < Math.abs(best - norm) ? c : best), 1)
  return Math.round(k * mag * 1e6) / 1e6
}

/**
 * Balanced sqrt axis for charts where one large line dwarfs smaller lines near zero:
 * spreads smaller values upward while keeping real-unit tick numbers at readable vertical spacing.
 */
export function balancedAxis(max: number, steps = 6) {
  const lin = niceTicks(max, steps)
  const plotMax = Math.sqrt(lin.max)
  const toPlot = (v: number) => (v <= 0 ? 0 : Math.sqrt(v))
  const ticks: number[] = [0]
  const minGap = plotMax / (steps + 1.2)
  for (let i = 1; i < steps; i++) {
    const targetVal = (i / steps) ** 2 * lin.max
    const snapped = snapNice(targetVal)
    if (snapped <= 0 || snapped >= lin.max) continue
    const prevPlot = toPlot(ticks[ticks.length - 1])
    const curPlot = toPlot(snapped)
    if (curPlot - prevPlot >= minGap * 0.72 && plotMax - curPlot >= minGap * 0.72) {
      ticks.push(snapped)
    }
  }
  ticks.push(lin.max)
  return {
    max: lin.max,
    plotMax,
    ticks,
    plotTicks: ticks.map(toPlot),
    toPlot,
  }
}

/** A fixed axis: 0 to max every step */
export const fixedTicks = (max: number, step: number) => ({ step, max, ticks: Array.from({ length: Math.round(max / step) + 1 }, (_, k) => k * step) })
