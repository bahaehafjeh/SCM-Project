/**
 * Overview fixtures, transcribed from the live build (`/ui`, `/ui/analysis/routes`,
 * `/ui/data/trade-data`, captured 1405/08/05) until a data contract exists.
 *
 * `sample: true` marks figures the live build itself labels «نمونه طراحی · به‌زودی»:
 * they have no data source and are rendered with a visible sample tag (docs/04 §1, §9).
 */
import type { DataDomainId } from '../domain/supplyChain'

export const CAPTURED_ON = '۱۴۰۵/۰۸/۰۵'
export const LAST_COMPUTED = '۵ آبان ۱۴۰۵، ۱۵:۱۶'
export const TRADE_PERIOD = '2025/05 – 2026/04'

// ── KPI strip ──────────────────────────────────────────────────────────────
export type KpiTone = 'red' | 'blue' | 'amber' | 'green'
/** One breakdown figure under a KPI; tone colours its dot */
export interface KpiDetail {
  text: string
  tone?: 'danger' | 'warning'
}
export interface Kpi {
  id: string
  value: number
  decimals?: number
  unit: string
  /** Appended to the figure, e.g. «٪» */
  suffix?: string
  /** What is counted, readable at a glance */
  title: string
  details: KpiDetail[]
  tone: KpiTone
  sample: boolean
  /** Route to open for detail */
  to?: string
}

export const kpis: Kpi[] = [
  {
    id: 'alerts',
    value: 3,
    unit: 'هشدار باز',
    title: 'هشدارهای بحرانی',
    details: [{ text: '۱ موجودی' }, { text: '۲ محموله' }],
    tone: 'red',
    sample: true,
  },
  {
    // On-time rate of the 50 shipments in transit (same sample as the shipments panel: 35 / 11 / 4)
    id: 'shipments',
    value: 70,
    suffix: '٪',
    unit: '۳۵ از ۵۰ محموله',
    title: 'نرخ تحویل به‌موقع',
    details: [
      { text: '۱۱ با تأخیر', tone: 'warning' },
      { text: '۴ دچار اختلال', tone: 'danger' },
    ],
    tone: 'blue',
    sample: true,
  },
  {
    // Same sample as the low-stock table: 12 items; the lowest ratio is soy oil, 48 of 220 t (22%)
    id: 'low-stock',
    value: 12,
    unit: 'قلم کالا',
    title: 'اقلام زیر حد ایمن',
    details: [{ text: 'کمترین: روغن خام سویا، ۲۲٪ حد ایمن' }],
    // Amber: a stock warning, kept apart from the red of critical alerts
    tone: 'amber',
    sample: true,
  },
  {
    id: 'route-value',
    value: 2199.32,
    decimals: 2,
    unit: 'میلیارد دلار',
    title: 'ارزش تجارت پایش‌شده',
    details: [{ text: '۳٬۸۲۷ مسیر اصلی · ۱۲ ماه اخیر' }],
    tone: 'green',
    sample: false,
    to: '/trade/routes',
  },
]

// ── Supply-chain health (index not defined; live build shows «به زودی») ───────
export const health = { value: 78, label: 'وضعیت مطلوب', sample: true as const }

// ── Coverage chain (live `/ui/data`; definition shown in the live build) ─────
export interface ChainStep {
  domain: DataDomainId
  title: string
  note: string
  coverage: number | null
  /** Domain has its own page */
  to?: string
}

export const chain: ChainStep[] = [
  { domain: 'raw-materials-warehousing', title: 'مواد اولیه و انبار آنها', note: 'مواد خام و موجودی انبارها', coverage: 40, to: '/supply-chain/raw-materials' },
  { domain: 'industries', title: 'صنایع', note: 'کارخانه‌های تولیدکننده', coverage: 5 },
  { domain: 'packaging', title: 'بسته‌بندی', note: 'مواد بسته‌بندی و نوع آن‌ها', coverage: 15 },
  { domain: 'distribution', title: 'توزیع', note: 'حمل‌ونقل و مسیرهای توزیع', coverage: 15 },
  { domain: 'retail', title: 'خرده‌فروشی', note: 'فروشگاه‌های زنجیره‌ای', coverage: 20 },
  { domain: 'consumer', title: 'مصرف‌کننده', note: 'گردآوری نشده', coverage: null },
]

// ── Chokepoints: top four by transit value from the raw-materials analysis A-05 ──
export interface Chokepoint {
  id: string
  name: string
  /** Million USD */
  value: number
  color: string
  /** The grouped remainder («سایر»): always last, neutral, lists what it contains */
  other?: { members: string }
}

export const chokepoints: Chokepoint[] = [
  { id: 'panama', name: 'کانال پاناما', value: 378423.9, color: 'var(--raw-indigo-500)' },
  { id: 'hormuz', name: 'تنگه هرمز', value: 262267.9, color: 'var(--raw-sky-400)' },
  // Brand orange: sky-500 sat too close to Hormuz's sky-400
  { id: 'gibraltar', name: 'تنگه جبل‌الطارق', value: 254743.1, color: 'var(--raw-orange-500)' },
  // A-05 publishes Suez at one decimal of a billion (143.2)
  { id: 'suez', name: 'کانال سوئز', value: 143200, color: 'var(--raw-emerald-500)' },
  // The other 7 of A-05's 11 chokepoints, grouped. Design sample: Bosphorus and Dardanelles are real
  // (89,390 each, discovery D6); the remaining five are an assumed ~30,000 each, every one below Suez.
  {
    id: 'others',
    name: 'سایر گلوگاه‌ها (۷)',
    value: 328780,
    color: 'var(--brand-neutrals-300)',
    other: { members: 'تنگه مالاکا، کانال مانش، تنگه بسفر، تنگه داردانل و ۳ گلوگاه دیگر' },
  },
]

// ── Shipments (sample) ───────────────────────────────────────────────────────
export const shipments = {
  total: 50,
  sample: true as const,
  alertsCount: 2,
  segments: [
    { id: 'on-time', label: 'طبق برنامه', count: 35, tone: 'success' },
    { id: 'delayed', label: 'با تأخیر', count: 11, tone: 'warning' },
    { id: 'disrupted', label: 'دچار اختلال', count: 4, tone: 'danger' },
  ] as const,
  definition: 'با تأخیر: بیش از ۲۴ ساعت دیرتر از برنامه به اسکله مقصد · دچار اختلال: بیش از ۲۴ ساعت بی‌خبری از موقعیت یا توقف حرکت',
}

// ── Alerts: see ./alerts (re-exported so existing imports keep working) ──────
export * from './alerts'

// ── Items below safety stock (sample): all 12, the overview shows 6 then «مشاهده بیشتر» ─────
export interface LowStockItem {
  id: string
  name: string
  group: 'مواد اولیه' | 'محصول نهایی'
  warehouse: string
  /** tonnes */
  stock: number
  safety: number
  /** Code of the open dashboard alert about this item, if any: the row opens that alert */
  alert?: string
}
export const lowStockTotal = 12
export const lowStock: LowStockItem[] = [
  // Design sample, spread so the meters differ and agree with the alerts: soy oil is critical,
  // soybean meal is below safety (high alert a5); white sugar runs out before its next supply (medium alert a4).
  { id: 's1', name: 'روغن خام سویا', group: 'مواد اولیه', warehouse: 'انبار بندرعباس', stock: 48, safety: 220, alert: 'ALR-1042' },
  { id: 's2', name: 'کنجاله سویا', group: 'مواد اولیه', warehouse: 'انبار بندرعباس', stock: 290, safety: 350, alert: 'ALR-1019' },
  { id: 's3', name: 'آرد نانوایی', group: 'محصول نهایی', warehouse: 'انبار مشهد', stock: 120, safety: 260 },
  { id: 's4', name: 'چای بسته‌بندی', group: 'محصول نهایی', warehouse: 'انبار اصفهان', stock: 30, safety: 40 },
  { id: 's5', name: 'گندم', group: 'مواد اولیه', warehouse: 'انبار مرکزی تهران', stock: 68, safety: 100 },
  { id: 's6', name: 'شکر سفید', group: 'محصول نهایی', warehouse: 'انبار اصفهان', stock: 160, safety: 180, alert: 'ALR-1024' },
  // The other six of the 12; barley and rice agree with the disrupted shipments (alerts a2, a3)
  { id: 's7', name: 'جو دامی', group: 'مواد اولیه', warehouse: 'انبار بندر امام خمینی', stock: 90, safety: 200, alert: 'ALR-1038' },
  { id: 's8', name: 'برنج', group: 'مواد اولیه', warehouse: 'انبار مرکزی تهران', stock: 210, safety: 300, alert: 'ALR-1031' },
  { id: 's9', name: 'روغن مایع', group: 'محصول نهایی', warehouse: 'انبار مشهد', stock: 75, safety: 110 },
  { id: 's10', name: 'ذرت دامی', group: 'مواد اولیه', warehouse: 'انبار بندر امام خمینی', stock: 400, safety: 520 },
  { id: 's11', name: 'ماکارونی', group: 'محصول نهایی', warehouse: 'انبار اصفهان', stock: 52, safety: 60 },
  { id: 's12', name: 'حبوبات', group: 'محصول نهایی', warehouse: 'انبار مشهد', stock: 85, safety: 95 },
]

// ── Commodity trade-value trend (live `/ui`; 12 months, million USD) ──────────
export interface CommodityTrend {
  id: string
  name: string
  category: string
  /** Sum over the selected months, million USD */
  value: number
  /** First vs last month of the window, % (last month's completeness not confirmed) */
  change: number
  /**
   * Illustrative curve until the monthly series is connected — not data. Shapes differ per commodity;
   * each keeps last ÷ first equal to the published 12-month change. The trailing shortfall (likely
   * incomplete months, discovery D1) differs per commodity, so the detection rule flags 1–3 months.
   */
  sampleCurve: number[]
}
export const commodityTrends: CommodityTrend[] = [
  { id: 'crude', name: 'نفت خام', category: 'انرژی و هیدروکربوری', value: 2035811, change: -91.5, sampleCurve: [60, 63, 66, 64, 61, 58, 57, 55, 52, 44, 24, 5.1] },
  { id: 'lpg', name: 'گاز نفتی', category: 'انرژی و پتروشیمی', value: 1082575.9, change: -93.7, sampleCurve: [50, 46, 53, 49, 56, 51, 58, 54, 49, 22, 12, 3.15] },
  { id: 'coal', name: 'زغال‌سنگ', category: 'سوخت فسیلی و معادن', value: 292166, change: -97.5, sampleCurve: [40, 44, 50, 57, 62, 66, 63, 58, 50, 36, 16, 1] },
  { id: 'iron', name: 'سنگ آهن', category: 'فلزات و صنایع فولاد', value: 289311.5, change: -91.4, sampleCurve: [55, 49, 58, 52, 47, 56, 61, 50, 45, 40, 42, 4.73] },
]
