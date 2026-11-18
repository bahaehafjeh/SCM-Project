import { extraAlerts, extraDetails } from './alertsExtra'
import type { ModelFacts, StockFacts } from '../lib/engine/facts'
import { withFigures } from '../lib/engine'

// ── Alerts (design sample; docs: alerts-spec, alerts-scenario-design-prompt) ─────────────────────
// Snapshot 5 Aban 1405, 15:16. Figures agree with the low-stock table (stock / safety in tonnes).
// Causes, shipments, options, IDs and history are written for the design until the alert service,
// the rules engine and the source systems are connected.

export type Severity = 'critical' | 'high' | 'medium'
export type AlertType = 'inventory' | 'shipment' | 'supplier' | 'demand' | 'price' | 'incident' | 'data'
/** Lifecycle flags shown on the row and in the header (prompt §4) */
export type AlertFlag = 'sla' | 'higher' | 'locked' | 'child' | 'stale' | 'sync' | 'reopened'

export interface AlertItem {
  id: string
  /** Public alert ID shown to users and used in links */
  code: string
  title: string
  severity: Severity
  type: AlertType
  place: string
  ago: string
  /** ISO time the alert was raised; `ago` is written from it, so the two never disagree */
  createdAt?: string
  /** ISO time the handling deadline runs out (counts down while the page is open) */
  slaDueAt?: string
  /** Time left on the SLA, as the header shows it */
  slaLeft: string
  /** The type among the 14 (prompt §7), e.g. «پیش‌بینی اتمام موجودی» */
  kind?: string
  flags?: AlertFlag[]
  /** Soft lock: someone else is reviewing it */
  lockedBy?: { name: string; since: string }
  /** Age of the data the alert stands on, when it is older than allowed */
  staleSince?: string
}

export const alertCounts = {
  total: 5,
  severity: { critical: 3, high: 1, medium: 1 } as Record<Severity, number>,
  type: { inventory: 3, shipment: 2, data: 0, price: 0 } as Record<AlertType, number>,
}

export const alerts: AlertItem[] = [
  { id: 'a1', code: 'ALR-1042', title: 'موجودی کمتر از حد ایمن · روغن خام سویا', severity: 'critical', type: 'inventory', place: 'انبار بندرعباس', ago: '۴ ساعت پیش', slaLeft: '۳:۱۲ مانده', kind: 'موجودی کمتر از حد ایمن' },
  { id: 'a2', code: 'ALR-1038', title: 'تأخیر محموله · جو دامی', severity: 'critical', type: 'shipment', place: 'بندر امام خمینی', ago: '۱۰ ساعت پیش', slaLeft: '۱:۴۰ مانده', kind: 'تأخیر محموله' },
  { id: 'a3', code: 'ALR-1031', title: 'گیر در ترخیص · محموله برنج', severity: 'critical', type: 'shipment', place: 'چابهار', ago: '۱ روز پیش', slaLeft: '۰:۵۵ مانده', kind: 'گیر در ترخیص' },
  { id: 'a5', code: 'ALR-1019', title: 'موجودی کمتر از حد ایمن · کنجاله سویا', severity: 'high', type: 'inventory', place: 'انبار بندرعباس', ago: '۳ روز پیش', slaLeft: '۹ ساعت مانده', kind: 'موجودی کمتر از حد ایمن' },
  { id: 'a4', code: 'ALR-1024', title: 'پیش‌بینی اتمام موجودی · شکر سفید', severity: 'medium', type: 'inventory', place: 'انبار اصفهان', ago: '۲ روز پیش', slaLeft: '۲ روز مانده', kind: 'پیش‌بینی اتمام موجودی' },
]
/** Dashboard alerts plus one sample per remaining type, which the alerts page lists */
export const allAlerts: AlertItem[] = [...alerts, ...extraAlerts]

// Sample ages in minutes (design data): each alert gets a real time, and its «… پیش» text comes from it.
// a3, a13 and a8 are old enough for the actions made on them (actions-page samples, owner decision)
const AGE_MIN: Record<string, number> = { a1: 240, a2: 600, a3: 5760, a5: 4320, a4: 2880, a13: 4320, a8: 10080, a6: 300, a11: 1440, a9: 480, a15: 40, a16: 120, a10: 2880, a12: 1440, a7: 2880, a14: 180 }
const faNum = (n: number) => String(n).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[+d])
export const agoText = (min: number) => (min < 1 ? 'همین الان' : min < 60 ? `${faNum(min)} دقیقه پیش` : min < 1440 ? `${faNum(Math.floor(min / 60))} ساعت پیش` : `${faNum(Math.floor(min / 1440))} روز پیش`)
const loadedAt = Date.now()
// Handling deadline, minutes left at page load (same sample as `slaLeft`); null = already passed
const SLA_MIN: Record<string, number | null> = { a1: 192, a2: 100, a3: 55, a5: 540, a4: 2880, a13: 140, a8: null, a6: 1140, a11: 360, a9: 45, a15: 180, a16: null, a10: 2880, a12: 2880, a7: 4320, a14: 1440 }
for (const a of allAlerts) {
  const m = AGE_MIN[a.id]
  if (m !== undefined) {
    a.createdAt = new Date(loadedAt - m * 60_000).toISOString()
    a.ago = agoText(m)
  }
  const s = SLA_MIN[a.id]
  if (s !== undefined) a.slaDueAt = s === null ? undefined : new Date(loadedAt + s * 60_000).toISOString()
}

/** The handling deadline has passed now: flagged in the data, or run out while the page is open */
export const slaPassed = (a: AlertItem, now = Date.now()) => !!a.flags?.includes('sla') || (!!a.slaDueAt && Date.parse(a.slaDueAt) <= now)
/** Minutes left on the handling deadline, or null when there is none or it has passed */
export const slaMinutesLeft = (a: AlertItem, now = Date.now()) => (a.slaDueAt && !slaPassed(a, now) ? Math.ceil((Date.parse(a.slaDueAt) - now) / 60_000) : null)
export const alertByCode = (code: string) => allAlerts.find((a) => a.code === code) ?? null

export interface AlertStat {
  label: string
  value: string
  tone?: 'danger' | 'warning' | 'success'
  /** The names behind a count (provinces, shipments, items), shown on hover */
  items?: string[]
}

/** Inventory facts for the shared engine (lib/engine), including shipments already on their way */
export type { StockFacts, ModelFacts, Inbound } from '../lib/engine/facts'

export interface AlertOption {
  /** Why the recommendation service suggests this option; shown only when present */
  reason?: string
  id: string
  /** transfer and supply create stock movements; the rest are referrals or updates */
  kind: string
  /** «{n}» is replaced by the amount */
  title: string
  amount?: number
  recommended?: boolean
  /** Time to effect, e.g. «۲ روز دیگر می‌رسد» */
  effect: string
  /** % — below 50 the option is a weak estimate and never recommended */
  confidence: number
  /** The type's two outcome metrics; inventory options are simulated instead. null = depends on the unit */
  values?: [string, string] | null
  cta: string
  done: string
  toast: string
  owner: string
}

export type AlertEvidence =
  | { kind: 'stock'; series: number[]; safety: number }
  | { kind: 'timeline'; steps: { label: string; planned: string; actual: string; late?: string; done: boolean }[] }
  | { kind: 'series'; unit: string; series: number[]; compare?: number[]; compareLabel?: string; refs: { value: number; label: string; tone: 'safe' | 'crit' }[]; axis: [string, string] }
  | { kind: 'route'; stops: { name: string; state: 'done' | 'here' | 'next' }[]; last: string }
  | { kind: 'rows'; rows: AlertStat[] }
  | { kind: 'sla'; totalHours: number; overHours: number }

export interface TimelineEvent {
  text: string
  time: string
  /** Person or source system */
  actor: string
  /** The action (ACT-…) the event is about: the action panel shows only its own */
  action?: string
  /** A message written in the action's conversation, not a change of state */
  message?: boolean
}

export interface AlertDetail {
  /** Header title: entity · location */
  entity: string
  /** What happened; **…** marks the key numbers */
  happened: string
  /** Source and freshness of the key numbers */
  source: string
  summary: string
  rule: { id: string; version: number; text: string }
  /** Drivers with their share of the problem; null = cause unknown */
  why: { text: string; share?: string }[] | null
  /** When no cause is found: what this alert's own data does show (e.g. consumption normal, nothing late) */
  whyNote?: string
  evidence: AlertEvidence
  impact: AlertStat[]
  waiting?: { name: string; place: string; ratio: number }[]
  /** The two outcome metrics every option card shows for this type */
  metrics: [string, string] | null
  /** «بدون اقدام» reference: the same two metrics, plus a short lead */
  noAction: { lead: string; values: [string, string] | null }
  /** Cost of doing nothing, shown before a rejection */
  noActionCost: AlertStat[]
  /** Inventory alerts: facts for the simulation and the scenario page */
  stock?: StockFacts
  /** Other modelled types: the facts their model is built from */
  facts?: ModelFacts
  options: AlertOption[]
  owner: string
  /** Close condition, one line */
  autoClose: string
  /** Where the follow-up checks and when */
  checks: { source: string; last: string; next: string }
  timeline: TimelineEvent[]
  /** Child alerts of an incident, or the incident an alert belongs to */
  related?: { code: string; title: string; note?: string }[]
  /** Label of the scenario button when it differs (incidents: «سنجش اثر رویداد») */
  scenarioLabel?: string
}

export const alertDetails: Record<string, AlertDetail> = {
  a1: {
    entity: 'روغن خام سویا · انبار بندرعباس',
    happened: 'موجودی روغن خام سویا به **{stock} تن** رسیده؛ **{pct}** حد ایمن ({safety} تن). محموله {inboundQty} تنی {inboundDay} روز دیگر می‌رسد.',
    source: 'از سیستم انبار · ۱۰ دقیقه پیش',
    summary: '{pct} حد ایمن · کسری {deficit} تن · {emptyDay} روز دیگر تمام می‌شود',
    rule: { id: 'INV-SAFE-01', version: 3, text: 'موجودی کمتر از حد ایمن (۲۲۰ تن)؛ زیر ۵۰٪ حد ایمن بحرانی است.' },
    why: [
      { text: 'مصرف دو هفته اخیر ۳۸٪ بالاتر از میانگین بوده است', share: '۶۰٪ کسری' },
      { text: 'محموله ورودی روغن سویا ۵ روز تأخیر دارد', share: '۴۰٪ کسری' },
    ],
    evidence: { kind: 'stock', series: [160, 152, 144, 136, 128, 120, 112, 104, 96, 88, 80, 72, 64, 56, 48], safety: 220 },
    impact: [
      { label: 'تا اتمام موجودی', value: '{empty}', tone: 'danger' },
      { label: 'مناطق متأثر', value: '۳ استان جنوبی', items: ['هرمزگان', 'بوشهر', 'فارس'] },
      { label: 'محموله در راه', value: '۱ محموله · ۵ روز تأخیر', items: ['روغن خام سویا · {inboundQty} تن · {inboundDay} روز دیگر می‌رسد'], tone: 'warning' },
    ],
    metrics: ['موجودی پس از اقدام', 'روزهای کمبود'],
    noAction: { lead: '', values: null },
    noActionCost: [{ label: 'تحت تأثیر', value: '۳ استان جنوبی' }],
    stock: {
      item: 'روغن خام سویا',
      warehouse: 'انبار بندرعباس',
      stock: 48,
      safety: 220,
      // sample value until the rule's real figure arrives
      critical: 110,
      consumption: 8,
      inbound: [{ qty: 200, day: 6, label: 'محموله روغن خام سویا' }],
      transfer: { source: 'انبار شیراز', surplus: 140, days: 2, costPerTon: 1.8 },
      purchase: { days: 14, costPerTon: 24.4 },
    },
    options: [
      {
        id: 'transfer',
        kind: 'transfer',
        title: 'انتقال {n} تن از انبار شیراز',
        amount: 100,
        recommended: true,
        effect: '۲ روز دیگر می‌رسد',
        confidence: 82,
        cta: 'ثبت انتقال {n} تن',
        done: 'انتقال {n} تن از انبار شیراز به انبار بندرعباس ثبت شد.',
        toast: 'انتقال ثبت شد و به واحد انبارهای جنوب ارجاع شد',
        owner: 'واحد انبارهای جنوب',
      },
      { id: 'supply', kind: 'supply', title: 'ثبت درخواست تأمین {n} تن', amount: 172, effect: 'حدود ۱۴ روز دیگر می‌رسد', confidence: 64, cta: 'ثبت درخواست تأمین {n} تن', done: 'درخواست تأمین {n} تن روغن خام سویا برای انبار بندرعباس ثبت شد.', toast: 'درخواست تأمین ثبت شد و به واحد تأمین ارجاع شد', owner: 'واحد تأمین' },
      {
        id: 'combo',
        kind: 'combo',
        title: 'انتقال ۱۴۰ تن از انبار شیراز + درخواست تأمین ۱۷۲ تن',
        effect: 'انتقال ۲ روز دیگر · تأمین حدود ۱۴ روز دیگر',
        confidence: 64,
        cta: 'ثبت انتقال و درخواست تأمین',
        done: 'انتقال ۱۴۰ تن از انبار شیراز و درخواست تأمین ۱۷۲ تن روغن خام سویا ثبت شد.',
        toast: 'انتقال و درخواست تأمین ثبت شد',
        owner: 'واحد انبارهای جنوب',
      },
      { id: 'refer', kind: 'refer', title: 'ارجاع به واحد انبارهای جنوب', effect: 'تصمیم با واحد · مهلت ۴ ساعت', confidence: 0, values: null, cta: 'ارجاع به واحد', done: 'هشدار به واحد انبارهای جنوب ارجاع شد.', toast: 'به واحد انبارهای جنوب ارجاع شد', owner: 'واحد انبارهای جنوب' },
    ],
    owner: 'واحد انبارهای جنوب',
    autoClose: 'با رسیدن موجودی به حد ایمن (۲۲۰ تن)، هشدار خودکار بسته می‌شود.',
    checks: { source: 'سیستم انبار', last: '۱۵:۰۶', next: '۱۶:۰۰' },
    timeline: [
      { text: 'هشدار ایجاد شد · قاعده INV-SAFE-01 نسخه ۳', time: '۵ آبان · ۱۰:۲۸', actor: 'موتور قواعد' },
      { text: 'شدت به «بحرانی» رسید (زیر ۵۰٪ حد ایمن)', time: '۵ آبان · ۱۲:۰۶', actor: 'موتور قواعد' },
      { text: 'موجودی ۴۸ تن ثبت شد', time: '۵ آبان · ۱۵:۰۶', actor: 'سیستم انبار' },
    ],
  },
  a2: {
    entity: 'محموله جو دامی · بندر امام خمینی',
    happened: 'محموله **{shipment} تنی** جو دامی **{delay} روز** از برنامه عقب است؛ رسیدن به بندر از ۲ آبان به حدود ۹ آبان رفته.',
    source: 'از سیستم حمل · ۲۵ دقیقه پیش',
    summary: '{delay} روز تأخیر · جو دامی {ratio} حد ایمن · رسیدن حدود ۹ آبان',
    rule: { id: 'SHP-ETA-02', version: 1, text: 'زمان رسیدن پیش‌بینی‌شده بیش از ۲ روز از برنامه عقب است.' },
    why: [
      { text: 'ازدحام کشتی‌ها در لنگرگاه بندر امام خمینی (انتظار ۵ روزه)', share: '۵ روز' },
      { text: 'توقف پیش از عبور از تنگه هرمز به دلیل شرایط جوی', share: '۲ روز' },
    ],
    evidence: {
      kind: 'timeline',
      steps: [
        { label: 'بارگیری', planned: '۲۰ مهر', actual: '۲۰ مهر', done: true },
        { label: 'عبور از تنگه هرمز', planned: '۲۸ مهر', actual: '۳۰ مهر', late: '۲ روز', done: true },
        { label: 'رسیدن به بندر', planned: '۲ آبان', actual: 'حدود ۹ آبان', late: '۷ روز', done: false },
        { label: 'تحویل به انبار', planned: '۴ آبان', actual: 'حدود ۱۱ آبان', late: '۷ روز', done: false },
      ],
    },
    impact: [
      { label: 'تأخیر رسیدن', value: '{delay} روز', tone: 'danger' },
      { label: 'اقلام منتظر محموله', value: '۱ قلم', items: ['جو دامی · {shipment} تن · انبار بندر امام خمینی'] },
      { label: 'موجودی انبار مقصد', value: '{ratio} حد ایمن', tone: 'danger' },
    ],
    waiting: [{ name: 'جو دامی', place: 'انبار بندر امام خمینی', ratio: 45 }],
    metrics: ['تأخیر نهایی', 'اقلام متأثر'],
    noAction: { lead: '', values: null },
    noActionCost: [{ label: 'تحت تأثیر', value: '۱ انبار' }],
    facts: {
      kind: 'delay',
      f: { item: 'جو دامی', port: 'بندر امام خمینی', warehouse: 'انبار بندر امام خمینی', shipment: 600, share: 200, stock: 90, use: 12, safety: 200, anchorage: 5, weather: 2, elapsed: 3, bridge: { source: 'انبار مرکزی تهران', surplus: 80, days: 3 } },
    },
    options: [
      { id: 'refer', kind: 'refer', title: 'ارجاع به واحد حمل‌ونقل', recommended: true, effect: 'پاسخ تا ۴ ساعت', confidence: 85, values: ['حدود ۵ روز', '۱ قلم'], cta: 'ارجاع به واحد حمل‌ونقل', done: 'پیگیری محموله جو دامی به واحد حمل‌ونقل ارجاع شد.', toast: 'به واحد حمل‌ونقل ارجاع شد', owner: 'واحد حمل‌ونقل' },
      {
        id: 'transfer',
        kind: 'transfer',
        title: 'انتقال موقت {n} تن جو از انبار مرکزی تهران',
        amount: 60,
        effect: '۳ روز دیگر می‌رسد',
        confidence: 76,
        values: ['حدود ۷ روز', '۰ قلم'],
        cta: 'ثبت انتقال {n} تن',
        done: 'انتقال موقت {n} تن جو دامی از انبار مرکزی تهران به انبار بندر امام خمینی ثبت شد.',
        toast: 'انتقال ثبت شد و به واحد انبارهای جنوب ارجاع شد',
        owner: 'واحد انبارهای جنوب',
      },
      { id: 'eta', kind: 'eta', title: 'به‌روزرسانی زمان رسیدن', effect: 'فوری', confidence: 64, values: ['۸ تا ۱۰ روز', '۱ قلم'], cta: 'ثبت زمان رسیدن جدید', done: 'زمان رسیدن محموله جو دامی به ۸ تا ۱۰ آبان به‌روز شد.', toast: 'زمان رسیدن به‌روز شد', owner: 'واحد حمل‌ونقل' },
    ],
    owner: 'واحد حمل‌ونقل',
    autoClose: 'با تحویل محموله به انبار، هشدار خودکار بسته می‌شود.',
    checks: { source: 'سیستم حمل', last: '۱۴:۵۰', next: '۱۶:۵۰' },
    timeline: [
      { text: 'هشدار ایجاد شد · قاعده SHP-ETA-02 نسخه ۱', time: '۵ آبان · ۰۵:۱۶', actor: 'موتور قواعد' },
      { text: 'زمان رسیدن به حدود ۹ آبان تغییر کرد', time: '۵ آبان · ۱۴:۵۰', actor: 'سیستم حمل' },
    ],
  },
  a3: {
    entity: 'محموله برنج · گمرک چابهار',
    happened: 'محموله **{qty} تنی** برنج **{dwell} روز** است در گمرک چابهار مانده و ارسال به انبار مرکزی تهران متوقف شده.',
    source: 'از سامانه گمرک · ۱ ساعت پیش',
    summary: '{dwell} روز ماندن در گمرک · برنج ۷۰٪ حد ایمن · رسیدن حدود ۱۲ آبان',
    rule: { id: 'CUS-DWELL-01', version: 2, text: 'ماندن محموله در گمرک بیش از ۳ روز.' },
    why: [
      { text: 'نقص در مدارک ترخیص (گواهی بهداشت)', share: '۳ روز' },
      { text: 'قطعی سامانه گمرک', share: '۱ روز' },
    ],
    evidence: {
      kind: 'timeline',
      steps: [
        { label: 'رسیدن به چابهار', planned: '۲۶ مهر', actual: '۲۶ مهر', done: true },
        { label: 'ترخیص از گمرک', planned: '۱ آبان', actual: 'هنوز انجام نشده', late: '۴ روز', done: false },
        { label: 'ارسال به تهران', planned: '۳ آبان', actual: 'حدود ۹ آبان', late: '۶ روز', done: false },
        { label: 'تحویل به انبار', planned: '۶ آبان', actual: 'حدود ۱۲ آبان', late: '۶ روز', done: false },
      ],
    },
    impact: [
      { label: 'ماندن در گمرک', value: '۴ روز', tone: 'danger' },
      { label: 'اقلام منتظر محموله', value: '۱ قلم', items: ['برنج · ۴۵۰ تن · انبار مرکزی تهران'] },
      { label: 'موجودی انبار مقصد', value: '۷۰٪ حد ایمن', tone: 'warning' },
    ],
    waiting: [{ name: 'برنج', place: 'انبار مرکزی تهران', ratio: 70 }],
    metrics: ['روز تا ترخیص', 'هزینه دموراژ'],
    noAction: { lead: 'مدارک ناقص می‌ماند', values: null },
    noActionCost: [{ label: 'تحت تأثیر', value: 'انبار مرکزی تهران' }],
    facts: { kind: 'customs', f: { item: 'برنج', port: 'گمرک چابهار', qty: 400, dwell: 4, docs: 3, clear: 2, rate: 120, budget: 360 } },
    options: [
      {
        id: 'docs',
        kind: 'docs',
        title: 'تکمیل مدارک با واحد بازرگانی و ترخیص',
        recommended: true,
        effect: 'ترخیص حدود ۲ روز پس از مدارک',
        confidence: 80,
        values: ['حدود ۲ روز', 'حدود ۲۴۰ میلیون تومان'],
        cta: 'ارجاع به واحد ترخیص',
        done: 'تکمیل مدارک ترخیص محموله برنج به واحد بازرگانی و ترخیص ارجاع شد.',
        toast: 'به واحد بازرگانی و ترخیص ارجاع شد',
        owner: 'واحد بازرگانی و ترخیص',
      },
      { id: 'eta', kind: 'eta', title: 'به‌روزرسانی زمان رسیدن', effect: 'فوری', confidence: 60, values: ['۴ تا ۷ روز', 'حدود ۶۰۰ میلیون تومان'], cta: 'ثبت زمان رسیدن جدید', done: 'زمان رسیدن محموله برنج به ۱۱ تا ۱۴ آبان به‌روز شد.', toast: 'زمان رسیدن به‌روز شد', owner: 'واحد حمل‌ونقل' },
    ],
    owner: 'واحد بازرگانی و ترخیص',
    autoClose: 'با ترخیص محموله از گمرک، هشدار خودکار بسته می‌شود.',
    checks: { source: 'سامانه گمرک', last: '۱۴:۱۶', next: '۱۸:۱۶' },
    timeline: [
      { text: 'هشدار ایجاد شد · قاعده CUS-DWELL-01 نسخه ۲', time: '۴ آبان · ۱۵:۱۶', actor: 'موتور قواعد' },
      { text: 'نقص گواهی بهداشت اعلام شد', time: '۵ آبان · ۰۹:۴۰', actor: 'سامانه گمرک' },
    ],
  },
  a4: {
    entity: 'شکر سفید · انبار اصفهان',
    happened: 'با مصرف روزانه **{consumption} تن**، موجودی شکر سفید **{emptyDay} روز دیگر** تمام می‌شود؛ سفارش {inboundQty} تنی **{inboundDay} روز دیگر** می‌رسد.',
    source: 'از سیستم انبار و سیستم خرید · ۲۰ دقیقه پیش',
    summary: '{pct} حد ایمن · اتمام {emptyDay} روز دیگر · {late} روز کمبود',
    rule: { id: 'INV-FCST-02', version: 2, text: 'زمان تا اتمام موجودی کمتر از زمان رسیدن تأمین بعدی است؛ فاصله تا ۷ روز «متوسط» است.' },
    why: [{ text: 'افزایش فصلی مصرف، ۱۲٪ بالاتر از ماه قبل', share: 'علت اصلی' }],
    evidence: { kind: 'stock', series: [272, 264, 256, 248, 240, 232, 224, 216, 208, 200, 192, 184, 176, 168, 160], safety: 180 },
    impact: [
      { label: 'تا اتمام موجودی', value: '{empty}', tone: 'warning' },
      { label: 'کمبود تا رسیدن تأمین', value: '{late} روز', tone: 'warning' },
      { label: 'مناطق متأثر', value: '۲ استان مرکزی', items: ['اصفهان', 'یزد'] },
    ],
    metrics: ['زمان تا اتمام', 'فاصله تا رسیدن تأمین'],
    noAction: { lead: '', values: null },
    noActionCost: [{ label: 'تحت تأثیر', value: '۲ استان مرکزی' }],
    stock: {
      item: 'شکر سفید',
      warehouse: 'انبار اصفهان',
      stock: 160,
      safety: 180,
      max: 300,
      consumption: 8,
      inbound: [{ qty: 150, day: 24, label: 'سفارش شکر سفید' }],
      transfer: { source: 'انبار مرکزی تهران', surplus: 40, days: 1, costPerTon: 1.2 },
      purchase: { days: 24, costPerTon: 21 },
    },
    options: [
      {
        id: 'early',
        kind: 'supply',
        title: 'تحویل زودتر سفارش {n} تن',
        amount: 150,
        recommended: true,
        effect: '۲۰ روز دیگر می‌رسد · ۴ روز زودتر',
        confidence: 72,
        cta: 'ثبت درخواست تحویل زودتر',
        done: 'درخواست تحویل زودتر {n} تن شکر سفید برای انبار اصفهان ثبت شد.',
        toast: 'درخواست تحویل زودتر ثبت شد و به واحد تأمین ارجاع شد',
        owner: 'واحد تأمین',
      },
      {
        id: 'transfer',
        kind: 'transfer',
        title: 'انتقال {n} تن از انبار مرکزی تهران',
        amount: 40,
        effect: '۱ روز دیگر می‌رسد',
        confidence: 74,
        cta: 'ثبت انتقال {n} تن',
        done: 'انتقال {n} تن شکر سفید از انبار مرکزی تهران به انبار اصفهان ثبت شد.',
        toast: 'انتقال ثبت شد و به واحد انبارهای مرکزی ارجاع شد',
        owner: 'واحد انبارهای مرکزی',
      },
      { id: 'refer', kind: 'refer', title: 'ارجاع به واحد انبارهای مرکزی', effect: 'تصمیم با واحد · مهلت ۲ روز', confidence: 0, values: null, cta: 'ارجاع به واحد', done: 'هشدار به واحد انبارهای مرکزی ارجاع شد.', toast: 'به واحد انبارهای مرکزی ارجاع شد', owner: 'واحد انبارهای مرکزی' },
    ],
    owner: 'واحد تأمین',
    autoClose: 'وقتی تأمین پیش از اتمام موجودی برسد، هشدار خودکار بسته می‌شود.',
    checks: { source: 'سیستم انبار و سیستم خرید', last: '۱۴:۵۶', next: 'فردا ۰۸:۰۰' },
    timeline: [
      { text: 'هشدار ایجاد شد · قاعده INV-FCST-02 نسخه ۲', time: '۳ آبان · ۰۹:۱۰', actor: 'موتور قواعد' },
      { text: 'موجودی ۱۶۰ تن ثبت شد', time: '۵ آبان · ۱۴:۵۶', actor: 'سیستم انبار' },
    ],
  },
  a5: {
    entity: 'کنجاله سویا · انبار بندرعباس',
    source: 'از سیستم انبار · ۱۰ دقیقه پیش',
    happened: 'موجودی کنجاله سویا به **{stock} تن** رسیده؛ **{pct}** حد ایمن ({safety} تن).',
    summary: '{pct} حد ایمن · کسری {deficit} تن · {empty} تا اتمام',
    rule: { id: 'INV-SAFE-01', version: 3, text: 'موجودی کمتر از حد ایمن (۳۵۰ تن)؛ بالای ۵۰٪ حد ایمن «زیاد» است.' },
    // Consumption looks normal and nothing is late, so no cause is claimed
    why: null,
    whyNote: 'مصرف عادی است و محموله‌ای تأخیر ندارد.',
    evidence: { kind: 'stock', series: [332, 329, 326, 323, 320, 317, 314, 311, 308, 305, 302, 299, 296, 293, 290], safety: 350 },
    impact: [
      { label: 'تا اتمام موجودی', value: '{empty}' },
      { label: 'مناطق متأثر', value: '۳ استان جنوبی', items: ['هرمزگان', 'بوشهر', 'فارس'] },
      { label: 'محموله در راه', value: '۱ محموله', items: ['کنجاله سویا · {inboundQty} تن · {inboundDay} روز دیگر می‌رسد'] },
    ],
    metrics: ['موجودی پس از اقدام', 'روزهای کمبود'],
    noAction: { lead: '', values: null },
    noActionCost: [
      { label: 'علت کاهش', value: 'نامعلوم می‌ماند', tone: 'warning' },
      { label: 'تحت تأثیر', value: '۳ استان جنوبی' },
    ],
    stock: {
      item: 'کنجاله سویا',
      warehouse: 'انبار بندرعباس',
      stock: 290,
      safety: 350,
      consumption: 3,
      inbound: [{ qty: 80, day: 7, label: 'محموله کنجاله سویا' }],
      transfer: { source: 'انبار شیراز', surplus: 50, days: 2, costPerTon: 1.6 },
      purchase: { days: 12, costPerTon: 14 },
    },
    options: [
      {
        id: 'refer',
        kind: 'refer',
        title: 'ارجاع به واحد انبارهای جنوب برای بررسی',
        recommended: true,
        effect: 'بررسی میدانی · مهلت ۲۴ ساعت',
        confidence: 60,
        values: null,
        cta: 'ارجاع برای بررسی',
        done: 'بررسی کاهش موجودی کنجاله سویا به واحد انبارهای جنوب ارجاع شد.',
        toast: 'به واحد انبارهای جنوب ارجاع شد',
        owner: 'واحد انبارهای جنوب',
      },
      { id: 'supply', kind: 'supply', title: 'ثبت درخواست تأمین {n} تن', amount: 80, effect: 'حدود ۱۲ روز دیگر می‌رسد', confidence: 70, cta: 'ثبت درخواست تأمین {n} تن', done: 'درخواست تأمین {n} تن کنجاله سویا برای انبار بندرعباس ثبت شد.', toast: 'درخواست تأمین ثبت شد و به واحد تأمین ارجاع شد', owner: 'واحد تأمین' },
    ],
    owner: 'واحد انبارهای جنوب',
    autoClose: 'با رسیدن موجودی به حد ایمن (۳۵۰ تن)، هشدار خودکار بسته می‌شود.',
    checks: { source: 'سیستم انبار', last: '۱۵:۰۶', next: '۱۶:۰۰' },
    timeline: [
      { text: 'هشدار ایجاد شد · قاعده INV-SAFE-01 نسخه ۳', time: '۲ آبان · ۱۱:۴۰', actor: 'موتور قواعد' },
      { text: 'موجودی ۲۹۰ تن ثبت شد', time: '۵ آبان · ۱۵:۰۶', actor: 'سیستم انبار' },
    ],
  },
}
Object.assign(alertDetails, extraDetails)
// Every number in the texts comes from the shared engine («بدون اقدام» run on the facts above)
for (const a of allAlerts) if (alertDetails[a.id]) alertDetails[a.id] = withFigures(a, alertDetails[a.id])
