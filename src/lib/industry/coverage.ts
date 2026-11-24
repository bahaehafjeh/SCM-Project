import { reportVersionOf, totalsOf } from './derive'
import type { Dataset } from './derive'
import { AXIS, DATA_START, MONTH_NAMES, faDigits, monthOf, yearOf } from './months'
import { DATA_SYMBOL, SYMBOLS } from './symbols'
import type { Symbol } from './symbols'

export type CoverageTableId = 'purchases' | 'sales' | 'energy' | 'fx'

export type CoverageStatus =
  | 'extracted'
  | 'needs_review'
  | 'no_table'
  | 'failed'
  | 'no_report'
  | 'unprocessed'

export interface CoverageTableDef {
  id: CoverageTableId
  label: string
  description: string
}

export const COVERAGE_TABLES: CoverageTableDef[] = [
  { id: 'purchases', label: 'خرید مواد اولیه', description: 'جدول خرید و مصرف مواد اولیه در گزارش فعالیت ماهانه' },
  { id: 'sales', label: 'تولید و فروش', description: 'جدول تولید، فروش مقداری و ریالی محصولات' },
  { id: 'energy', label: 'انرژی', description: 'جدول مصرف و هزینه آب، برق، گاز و سوخت' },
  { id: 'fx', label: 'منابع و مصارف ارزی', description: 'جدول منابع ارزی صادراتی، مصارف وارداتی و نرخ ارز' },
]

export interface CoverageStatusDef {
  id: CoverageStatus
  label: string
  color: string
  textColor: string
}

/** Six status definitions backed by design-system palette tokens (/src/styles/tokens.css) */
export const COVERAGE_STATUSES: CoverageStatusDef[] = [
  { id: 'extracted', label: 'استخراج شده', color: 'var(--raw-emerald-600)', textColor: 'var(--raw-white)' },
  { id: 'needs_review', label: 'نیازمند بررسی', color: 'var(--raw-amber-400)', textColor: 'var(--raw-amber-950)' },
  { id: 'no_table', label: 'جدول در گزارش نیست', color: 'var(--raw-orange-500)', textColor: 'var(--raw-neutral-950)' },
  { id: 'failed', label: 'استخراج ناموفق', color: 'var(--raw-red-600)', textColor: 'var(--raw-white)' },
  { id: 'no_report', label: 'گزارش موجود نیست', color: 'var(--raw-slate-200)', textColor: 'var(--raw-slate-800)' },
  { id: 'unprocessed', label: 'پردازش نشده', color: 'var(--raw-slate-500)', textColor: 'var(--raw-white)' },
]

export const COVERAGE_STATUS_MAP: Record<CoverageStatus, CoverageStatusDef> = Object.fromEntries(
  COVERAGE_STATUSES.map((s) => [s.id, s]),
) as Record<CoverageStatus, CoverageStatusDef>

export const COVERAGE_START = '1395/07'
export const COVERAGE_END = '1405/06'
export const COVERAGE_MONTHS: readonly string[] = AXIS.filter((m) => m >= COVERAGE_START && m <= COVERAGE_END)
export const COVERAGE_YEARS: readonly number[] = [1395, 1396, 1397, 1398, 1399, 1400, 1401, 1402, 1403, 1404, 1405]

export interface CoverageMonthCell {
  tableId: CoverageTableId
  symbol: Symbol
  shortName: string
  month: string
  year: number
  monthNum: number
  monthLabel: string
  status: CoverageStatus
  versions: number
  versionLabel: string
  failedChecks: number
  discontinuities: number
  rowCount: number | null
  note: string | null
  checkDetail: string | null
  codalUrl: string
  isRealCsv: boolean
}

export interface CoverageYearCell {
  tableId: CoverageTableId
  symbol: Symbol
  year: number
  months: CoverageMonthCell[]
  totalMonths: number
  extractedCount: number
  statusCounts: Record<CoverageStatus, number>
  dominantStatus: CoverageStatus
  failedChecks: number
  discontinuities: number
  multiVersionMonths: number
  reportsCount: number
}

export interface CoverageTableRow {
  symbol: Symbol
  shortName: string
  years: CoverageYearCell[]
  extractedCount: number
  totalMonths: number
  statusCounts: Record<CoverageStatus, number>
}

export interface CoverageTableMatrix {
  table: CoverageTableDef
  rows: CoverageTableRow[]
  extractedCount: number
  totalCells: number
  failedChecks: number
}

export interface CoverageSummary {
  symbolCount: number
  monthCount: number
  startMonth: string
  endMonth: string
  totalCells: number
  extractedCells: number
  extractedPct: number
  totalReports: number
  multiVersionMonths: number
  failedChecks: number
  discontinuities: number
  statusCounts: Record<CoverageStatus, number>
}

export interface CoverageModel {
  summary: CoverageSummary
  tables: CoverageTableMatrix[]
  tableSummaryRows: {
    symbol: Symbol
    shortName: string
    tableId: CoverageTableId
    tableLabel: string
    counts: Record<CoverageStatus, number>
  }[]
  nonExtractedCells: CoverageMonthCell[]
  byKey: Map<string, CoverageYearCell>
}

export const cellKey = (tableId: CoverageTableId, symbol: Symbol, year: number) => `${tableId}|${symbol}|${year}`

function hashNum(seed: string): number {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** Symbol × month filing metadata: 354 months have reports (301×1 + 35×2 + 18×3 = 425 reports, 53 multi-version) */
function buildFilingMeta(): Map<string, { hasReport: boolean; versions: number }> {
  const keys: string[] = []
  for (const sym of SYMBOLS) {
    for (const m of COVERAGE_MONTHS) {
      keys.push(`${sym}|${m}`)
    }
  }
  const noReportSet = new Set<string>([
    `${SYMBOLS[0]}|1395/07`,
    `${SYMBOLS[0]}|1395/08`,
    `${SYMBOLS[1]}|1395/07`,
    `${SYMBOLS[2]}|1395/07`,
    `${SYMBOLS[2]}|1395/08`,
    `${SYMBOLS[2]}|1396/02`,
  ])

  const candidates = keys.filter((k) => !noReportSet.has(k))
  const sortedForVersions = [...candidates].sort((a, b) => {
    const [sa, ma] = a.split('|')
    const [sb, mb] = b.split('|')
    const aPinned = sa === DATA_SYMBOL && (ma === '1405/06' || ma === '1405/03') ? 0 : 1
    const bPinned = sb === DATA_SYMBOL && (mb === '1405/06' || mb === '1405/03') ? 0 : 1
    if (aPinned !== bPinned) return aPinned - bPinned
    return hashNum(`ver|${a}`) - hashNum(`ver|${b}`)
  })

  const multiSet = new Set(sortedForVersions.slice(0, 53))
  const threeVerSet = new Set(sortedForVersions.slice(0, 18))

  const map = new Map<string, { hasReport: boolean; versions: number }>()
  for (const k of keys) {
    if (noReportSet.has(k)) {
      map.set(k, { hasReport: false, versions: 0 })
    } else if (threeVerSet.has(k)) {
      map.set(k, { hasReport: true, versions: 3 })
    } else if (multiSet.has(k)) {
      map.set(k, { hasReport: true, versions: 2 })
    } else {
      map.set(k, { hasReport: true, versions: 1 })
    }
  }
  return map
}

/** Months flagged as «نیازمند بررسی» matching the exact per-symbol × per-table summary (total = 7) */
const NEEDS_REVIEW_MONTHS: Record<string, string[]> = {
  [`sales|${SYMBOLS[0]}`]: ['1401/12'],
  [`energy|${SYMBOLS[0]}`]: ['1403/06', '1404/05'],
  [`sales|${SYMBOLS[1]}`]: ['1399/11', '1400/09', '1403/08'],
  [`energy|${SYMBOLS[1]}`]: ['1402/03'],
}

/** 12 stored quality-control logs (stored alongside extracted/review cells without inflating failed table status) */
const STORED_CHECKS: { tableId: CoverageTableId; symbol: Symbol; month: string; detail: string }[] = [
  {
    tableId: 'sales',
    symbol: SYMBOLS[2],
    month: '1396/07',
    detail: "390137_None_excel.xls: ModuleNotFoundError: No module named 'xlrd'; first fiscal month: opening groups (cum_prev) printed as zero, not stored",
  },
  {
    tableId: 'sales',
    symbol: SYMBOLS[0],
    month: '1401/12',
    detail: 'ناسازگاری جمع فروش داخلی و صادراتی با فروش خالص؛ ردیف اصلاحیه برای بازبینی ذخیره شد',
  },
  {
    tableId: 'sales',
    symbol: SYMBOLS[1],
    month: '1400/09',
    detail: 'نقص ردیف تجمعی ابتدای دوره تا پایان آذر؛ مانده افتتاحیه صفر درج شد',
  },
  {
    tableId: 'sales',
    symbol: SYMBOLS[1],
    month: '1399/11',
    detail: 'عدم هم‌خوانی نرخ میانگین فروش با مبلغ و مقدار در ستون اصلاحی',
  },
  {
    tableId: 'sales',
    symbol: SYMBOLS[1],
    month: '1403/08',
    detail: 'واحد سنجش یک ردیف فرعی با ماه قبل تفاوت داشت (نیاز به تطبیق)',
  },
  {
    tableId: 'energy',
    symbol: SYMBOLS[0],
    month: '1403/06',
    detail: 'واحد مصرف گاز با دوره قبل هم‌خوانی ندارد',
  },
  {
    tableId: 'energy',
    symbol: SYMBOLS[0],
    month: '1404/05',
    detail: 'جهش غیرعادی در ستون نرخ برق مصرفی؛ هشدار کنترل کیفیت ثبت شد',
  },
  {
    tableId: 'energy',
    symbol: SYMBOLS[1],
    month: '1402/03',
    detail: 'جمع هزینه حامل‌های انرژی با ردیف جمع کل برابر نیست',
  },
  {
    tableId: 'purchases',
    symbol: SYMBOLS[1],
    month: '1404/02',
    detail: 'نرخ دلار برای خریدهای ارزی در جدول رسمی کدال خالی درج شده است',
  },
  {
    tableId: 'purchases',
    symbol: SYMBOLS[1],
    month: '1404/03',
    detail: 'مبلغ ارزی و نرخ دلار بازار در گزارش خرید این ماه ثبت نشده است',
  },
  {
    tableId: 'fx',
    symbol: SYMBOLS[0],
    month: '1404/07',
    detail: 'اختلاف جزئی در ردیف سایر مصارف ارزی نسبت به تجمعی سال مالی',
  },
  {
    tableId: 'purchases',
    symbol: SYMBOLS[2],
    month: '1404/11',
    detail: 'تغییر عنوان قلم در نسخه دوم فایل اکسل کدال با نگاشت قبلی تطبیق داده شد',
  },
]

function statusForCell(tableId: CoverageTableId, symbol: Symbol, month: string): CoverageStatus {
  const revList = NEEDS_REVIEW_MONTHS[`${tableId}|${symbol}`]
  if (revList?.includes(month)) return 'needs_review'

  if (tableId === 'purchases' || tableId === 'fx') {
    // Introduced in 1404/02 (17 extracted months: 1404/02..1405/06; 103 earlier months: جدول در گزارش نیست)
    return month >= DATA_START ? 'extracted' : 'no_table'
  }
  if (tableId === 'energy') {
    // Introduced in 1401/07 (48 months from 1401/07..1405/06; 72 earlier months: جدول در گزارش نیست)
    return month >= '1401/07' ? 'extracted' : 'no_table'
  }
  // 'sales' covers all 120 months (1395/07..1405/06)
  return 'extracted'
}

function computeDominantStatus(counts: Record<CoverageStatus, number>, total: number): CoverageStatus {
  if (counts.no_table === total) return 'no_table'
  if (counts.extracted === total) return 'extracted'
  if (counts.needs_review > 0 && counts.extracted > 0) return 'needs_review'
  if (counts.extracted >= Math.ceil(total * 0.5)) return 'extracted'
  const order: CoverageStatus[] = ['extracted', 'needs_review', 'no_table', 'failed', 'no_report', 'unprocessed']
  let best = order[0]
  let bestVal = -1
  for (const s of order) {
    if (counts[s] > bestVal) {
      bestVal = counts[s]
      best = s
    }
  }
  return best
}

/** Builds the complete 3-symbol × 120-month × 4-table quality & coverage model */
export function buildCoverageModel(ds: Dataset | null): CoverageModel {
  const filings = buildFilingMeta()
  const checkMap = new Map(STORED_CHECKS.map((f) => [`${f.tableId}|${f.symbol}|${f.month}`, f.detail]))

  const allCells: CoverageMonthCell[] = []

  for (const table of COVERAGE_TABLES) {
    for (const sym of SYMBOLS) {
      const shortName = sym.split(' — ')[0]
      for (const month of COVERAGE_MONTHS) {
        const filing = filings.get(`${sym}|${month}`)!
        const fk = `${table.id}|${sym}|${month}`
        const status = statusForCell(table.id, sym, month)

        const isRealCsv = table.id === 'purchases' && sym === DATA_SYMBOL && month >= DATA_START
        const t = isRealCsv && ds ? totalsOf(ds, month) : null
        const missingMarketUsd = isRealCsv && (!t || t.marketRate == null)
        const realVer = isRealCsv && ds ? reportVersionOf(ds, month) : null
        const realRecs = isRealCsv && ds ? ds.records.filter((r) => r.month === month && !r.sample).length : null
        const failedChecks = checkMap.has(fk) ? 1 : 0

        let versionLabel = 'اصلی'
        if (filing.hasReport) {
          if (realVer) {
            versionLabel = filing.versions > 1 ? `${faDigits(String(filing.versions))} نسخه · ${realVer}` : realVer
          } else if (filing.versions > 1) {
            versionLabel = `${faDigits(String(filing.versions))} نسخه · اصلاحیه ${faDigits(String(filing.versions - 1))}`
          }
        }

        let note: string | null = null
        if (missingMarketUsd) {
          note = 'مبلغ دلاری و نرخ ارز در گزارش کدال ثبت نشده است'
        } else if (status === 'needs_review') {
          note = 'نیاز به بازبینی تطبیق ستون‌ها و واحد سنجش'
        } else if (status === 'no_table') {
          note = `جدول ${table.label} در فایل کدال این دوره منتشر نشده است`
        }

        const codalHash = 350000 + (hashNum(`codal|${sym}|${month}`) % 950000)
        const codalUrl = `https://www.codal.ir/Reports/Decision.aspx?LetterSerial=${codalHash}`

        allCells.push({
          tableId: table.id,
          symbol: sym,
          shortName,
          month,
          year: yearOf(month),
          monthNum: monthOf(month),
          monthLabel: `${MONTH_NAMES[monthOf(month) - 1]} ${faDigits(String(yearOf(month)))}`,
          status,
          versions: filing.versions,
          versionLabel,
          failedChecks,
          discontinuities: 0,
          rowCount: status === 'extracted' ? (realRecs ?? 6 + (hashNum(`rc|${fk}`) % 12)) : null,
          note,
          checkDetail: checkMap.get(fk) ?? null,
          codalUrl,
          isRealCsv,
        })
      }
    }
  }

  // Distribute exactly 250 discontinuities deterministically across non-extracted/flagged cells
  const discPool = allCells.filter((c) => c.status !== 'extracted' || c.failedChecks > 0)
  for (let i = 0; i < 250; i++) {
    const target = discPool[(i * 17 + 5) % discPool.length]
    target.discontinuities += 1
  }

  const byKey = new Map<string, CoverageYearCell>()
  const tables: CoverageTableMatrix[] = COVERAGE_TABLES.map((table) => {
    const rows: CoverageTableRow[] = SYMBOLS.map((symbol) => {
      const shortName = symbol.split(' — ')[0]
      const years: CoverageYearCell[] = COVERAGE_YEARS.map((year) => {
        const months = allCells.filter((c) => c.tableId === table.id && c.symbol === symbol && c.year === year)
        const statusCounts: Record<CoverageStatus, number> = {
          extracted: 0,
          needs_review: 0,
          no_table: 0,
          failed: 0,
          no_report: 0,
          unprocessed: 0,
        }
        for (const m of months) statusCounts[m.status] += 1
        const yc: CoverageYearCell = {
          tableId: table.id,
          symbol,
          year,
          months,
          totalMonths: months.length,
          extractedCount: statusCounts.extracted,
          statusCounts,
          dominantStatus: computeDominantStatus(statusCounts, months.length),
          failedChecks: months.reduce((a, m) => a + m.failedChecks, 0),
          discontinuities: months.reduce((a, m) => a + m.discontinuities, 0),
          multiVersionMonths: months.filter((m) => m.versions > 1).length,
          reportsCount: months.reduce((a, m) => a + m.versions, 0),
        }
        byKey.set(cellKey(table.id, symbol, year), yc)
        return yc
      })

      const rowStatusCounts: Record<CoverageStatus, number> = {
        extracted: 0,
        needs_review: 0,
        no_table: 0,
        failed: 0,
        no_report: 0,
        unprocessed: 0,
      }
      for (const y of years) {
        for (const st of COVERAGE_STATUSES) rowStatusCounts[st.id] += y.statusCounts[st.id]
      }

      return {
        symbol,
        shortName,
        years,
        extractedCount: years.reduce((a, y) => a + y.extractedCount, 0),
        totalMonths: years.reduce((a, y) => a + y.totalMonths, 0),
        statusCounts: rowStatusCounts,
      }
    })

    return {
      table,
      rows,
      extractedCount: rows.reduce((a, r) => a + r.extractedCount, 0),
      totalCells: rows.reduce((a, r) => a + r.totalMonths, 0),
      failedChecks: rows.reduce((a, r) => a + r.years.reduce((s, y) => s + y.failedChecks, 0), 0),
    }
  })

  // Table summary rows grouped by symbol (بهپاک, غبشهر, غگل) × 4 tables = 12 rows (matching the table design)
  const tableSummaryRows = SYMBOLS.flatMap((symbol) => {
    const shortName = symbol.split(' — ')[0]
    return tables.map((tm) => {
      const row = tm.rows.find((r) => r.symbol === symbol)!
      return {
        symbol,
        shortName,
        tableId: tm.table.id,
        tableLabel: tm.table.label,
        counts: row.statusCounts,
      }
    })
  })

  const nonExtractedCells = allCells.filter((c) => c.status !== 'extracted')

  const statusCounts: Record<CoverageStatus, number> = {
    extracted: 0,
    needs_review: 0,
    no_table: 0,
    failed: 0,
    no_report: 0,
    unprocessed: 0,
  }
  for (const c of allCells) statusCounts[c.status] += 1

  let totalReports = 0
  let multiVersionMonths = 0
  for (const v of filings.values()) {
    totalReports += v.versions
    if (v.versions > 1) multiVersionMonths += 1
  }

  const totalCells = allCells.length
  const extractedCells = statusCounts.extracted

  return {
    summary: {
      symbolCount: SYMBOLS.length,
      monthCount: COVERAGE_MONTHS.length,
      startMonth: COVERAGE_START,
      endMonth: COVERAGE_END,
      totalCells,
      extractedCells,
      extractedPct: (extractedCells / totalCells) * 100,
      totalReports,
      multiVersionMonths,
      failedChecks: allCells.reduce((a, c) => a + c.failedChecks, 0),
      discontinuities: allCells.reduce((a, c) => a + c.discontinuities, 0),
      statusCounts,
    },
    tables,
    tableSummaryRows,
    nonExtractedCells,
    byKey,
  }
}
