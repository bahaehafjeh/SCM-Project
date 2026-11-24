/**
 * Raw-material purchases of «غبشهر — صنعتی بهشهر» (page-prompt §5): one row per item, source and
 * month, from the monthly activity reports on Codal. The CSV is the only source; empty = null.
 */
import { sampleHistory } from './sample'

export type Source = 'داخلی' | 'وارداتی'

export interface PurchaseRecord {
  /** «1405/06» */
  month: string
  item: string
  source: Source
  qty: number | null
  unit: string
  qtyChangePct: number | null
  /** Rial per unit */
  rateRial: number | null
  rateChangePct: number | null
  /** Million rial */
  amountMr: number | null
  amountChangePct: number | null
  /** Thousand USD (null before 1404/04) */
  usdThousand: number | null
  usdChangePct: number | null
  usdPerUnit: number | null
  reportVersion: string | null
  trackingNo: string | null
  cellRange: string | null
  /** Generated sample row (see sample.ts), never from Codal */
  sample?: boolean
}

export const CSV_URL = `${typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.BASE_URL : '/'}data/purchases_1404-02_1405-06.csv`

const COLUMNS = ['month', 'item', 'source', 'qty', 'unit', 'qtyChangePct', 'rateRial', 'rateChangePct', 'amountMr', 'amountChangePct', 'usdThousand', 'usdChangePct', 'usdPerUnit', 'reportVersion', 'trackingNo', 'cellRange'] as const
const NUMERIC = new Set(['qty', 'qtyChangePct', 'rateRial', 'rateChangePct', 'amountMr', 'amountChangePct', 'usdThousand', 'usdChangePct', 'usdPerUnit'])

/** Rows keep the file's order (month descending, then USD descending) */
export function parseCsv(text: string): PurchaseRecord[] {
  // A leading byte-order mark (U+FEFF) is not part of the header
  const lines = (text.charCodeAt(0) === 0xfeff ? text.slice(1) : text).split(/\r?\n/).filter((l) => l.trim())
  const head = lines[0].split(',').map((h) => h.trim())
  const missing = COLUMNS.filter((c) => !head.includes(c))
  if (missing.length) throw new Error(`CSV columns missing: ${missing.join(', ')}`)
  return lines.slice(1).map((line) => {
    const cells = line.split(',')
    const row: Record<string, string | number | null> = {}
    head.forEach((h, i) => {
      const raw = (cells[i] ?? '').trim()
      if (raw === '') row[h] = null
      else if (NUMERIC.has(h)) {
        const n = Number(raw)
        row[h] = Number.isFinite(n) ? n : null
      } else row[h] = raw
    })
    return row as unknown as PurchaseRecord
  })
}

/** The real rows, then the sample months before them (newest first, like the file) */
export async function loadPurchases(signal?: AbortSignal): Promise<PurchaseRecord[]> {
  const res = await fetch(CSV_URL, { signal })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const real = parseCsv(await res.text())
  const sample = sampleHistory(real).sort((a, b) => b.month.localeCompare(a.month) || (b.usdThousand ?? 0) - (a.usdThousand ?? 0))
  return [...real, ...sample]
}
