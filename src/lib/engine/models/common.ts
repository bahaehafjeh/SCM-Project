import { val } from '../params'
import type { Metric, ModelRun, Params } from '../types'

/** «اگر کاری نکنیم» rows from the type's two metrics */
export const metricCost = (metrics: Metric[], r: ModelRun) =>
  metrics.map((m) => ({ label: m.label, value: m.fmt(r.values[m.key]), tone: m.bad(r.values[m.key]) ? ('danger' as const) : undefined }))

/** A text when a value differs from the base */
export const diff = (p: Params, b: Params, key: string, text: (v: number) => string) => (val(p, key) !== val(b, key) ? [text(val(p, key))] : [])

/** How many of these actions are switched on */
export const activeCount = (p: Params, keys: string[]) => keys.filter((k) => val(p, k) !== 0).length

export const minOf = (series: number[]) => Math.min(...series)
