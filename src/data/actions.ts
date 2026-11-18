import type { ActionItem, ActionStep, AlertRecord } from '../lib/alertStore'
import { STEP_TEMPLATES } from '../lib/actionRules'
import type { StepTemplate } from '../lib/actionRules'
import type { TimelineEvent } from './alerts'
import { agoText } from './alerts'

/**
 * TEMPORARY sample actions until the action service exists (actions-page-prompt §9-2). Times are
 * relative to the page load. Every open action has its alert record, so the alerts page and the
 * actions page always agree; a rejected one has none (its alert is back in «نیازمند بررسی»).
 */
const REQUESTER = 'بهاره افجه'
const M = 60_000
const D = 86_400_000

/** Steps of a template, the first `done` of them done `ago` minutes ago; labels can be named for this action */
function steps(t: StepTemplate, done: number, at: (i: number) => string, opts: { auto?: boolean; by?: string; names?: Record<number, string> } = {}): ActionStep[] {
  return STEP_TEMPLATES[t].map((label, i) => ({
    label: opts.names?.[i] ?? label,
    ...(i < done ? { done: at(i), ...(opts.auto ? { auto: true } : { by: opts.by }) } : {}),
  }))
}

export function sampleActions(loadedAt: number) {
  const ago = (min: number) => new Date(loadedAt - min * M).toISOString()
  const inDays = (d: number) => new Date(loadedAt + d * D).toISOString()
  const actions: ActionItem[] = [
    {
      id: 'ACT-869',
      alertId: 'a11',
      alertCode: 'ALR-1045',
      severity: 'high',
      item: 'آرد نانوایی',
      option: 'order',
      amount: 120,
      title: 'افزایش سفارش ۱۲۰ تن آرد نانوایی',
      kind: 'buy',
      unit: 'واحد تأمین',
      owner: 'رضا کریمی',
      requester: REQUESTER,
      status: 'doing',
      sentAt: ago(1320),
      acceptedAt: ago(1290),
      due: inDays(5),
      // The first step was recorded by hand: the purchase system did not take the request
      steps: steps('buy', 1, () => ago(1250), { by: 'رضا کریمی' }),
      externalRef: 'درخواست خرید ۷۶۹۰',
      sync: 'failed',
    },
    {
      id: 'ACT-881',
      alertId: 'a9',
      alertCode: 'ALR-1044',
      severity: 'high',
      item: 'شکر',
      option: 'altSupplier',
      amount: 100,
      title: 'سفارش ۱۰۰٪ باقی‌مانده از تأمین‌کننده ب',
      kind: 'buy',
      unit: 'واحد تأمین',
      requester: 'مریم صادقی',
      // Sent 6:40 ago with 8 hours to accept: 1:20 left
      status: 'new',
      sentAt: ago(400),
      acceptDueAt: new Date(loadedAt + 80 * M).toISOString(),
      due: inDays(14),
      steps: steps('buy', 0, () => ''),
    },
    {
      id: 'ACT-882',
      alertId: 'a12',
      alertCode: 'ALR-1039',
      severity: 'medium',
      item: 'روغن خام',
      option: 'forward',
      amount: 200,
      title: 'پیش‌خرید ۲۰۰ تن با نرخ امروز',
      kind: 'buy',
      unit: 'واحد تأمین',
      requester: REQUESTER,
      status: 'new',
      sentAt: ago(180),
      acceptDueAt: new Date(loadedAt + 21 * 60 * M).toISOString(),
      due: inDays(30),
      steps: steps('buy', 0, () => ''),
    },
    {
      id: 'ACT-883',
      alertId: 'a6',
      alertCode: 'ALR-1046',
      severity: 'high',
      item: 'گندم',
      option: 'early',
      amount: 100,
      title: 'تحویل زودتر سفارش ۱۰۰ تن گندم',
      kind: 'buy',
      unit: 'واحد تأمین',
      owner: 'رضا کریمی',
      requester: REQUESTER,
      status: 'doing',
      sentAt: ago(240),
      acceptedAt: ago(200),
      due: inDays(11),
      steps: steps('buy', 2, (i) => ago(190 - i * 60), { auto: true }),
      externalRef: 'درخواست خرید ۷۷۰۲',
      sync: 'ok',
    },
    {
      id: 'ACT-884',
      alertId: 'a10',
      alertCode: 'ALR-1040',
      severity: 'medium',
      option: 'diversify',
      amount: 25,
      title: 'انتقال ۲۵٪ خرید به تأمین‌کنندگان دیگر',
      kind: 'buy',
      unit: 'واحد تأمین',
      owner: 'رضا کریمی',
      requester: REQUESTER,
      // The counter paused the 24-hour window 8 hours in: 16 hours left once it resumes
      status: 'counter',
      sentAt: ago(600),
      acceptLeft: 16 * 60 * M,
      due: inDays(30),
      steps: steps('buy', 0, () => ''),
      counter: { amount: 15, split: '۱۵٪ این ماه + ۱۰٪ ماه بعد', reason: 'تأمین‌کنندهٔ جایگزین فقط ۱۵٪ ظرفیت آزاد دارد', by: 'رضا کریمی', at: ago(120) },
    },
    {
      id: 'ACT-886',
      alertId: 'a2',
      alertCode: 'ALR-1038',
      severity: 'critical',
      item: 'جو دامی',
      option: 'refer',
      title: 'ارجاع به واحد حمل‌ونقل · جو دامی',
      kind: 'refer',
      unit: 'واحد حمل‌ونقل',
      owner: 'رضا کاظمی',
      requester: REQUESTER,
      // Accepted at the same time as the sample notice «واحد حمل‌ونقل پذیرفت»
      status: 'doing',
      sentAt: ago(230),
      acceptedAt: ago(180),
      due: inDays(1),
      steps: steps('refer', 1, () => ago(180), { by: 'رضا کاظمی' }),
    },
    {
      id: 'ACT-887',
      alertId: 'a13',
      alertCode: 'ALR-1050',
      severity: 'critical',
      option: 'reroute',
      amount: 4,
      title: 'انتقال محموله‌ها به چابهار',
      kind: 'move',
      unit: 'واحد حمل‌ونقل',
      owner: 'رضا کاظمی',
      requester: REQUESTER,
      status: 'doing',
      sentAt: ago(3600),
      acceptedAt: ago(3540),
      due: inDays(-1),
      steps: steps('reroute', 2, (i) => ago(3400 - i * 1200), { by: 'رضا کاظمی', names: { 2: 'تخلیه در چابهار' } }),
    },
    {
      id: 'ACT-888',
      alertId: 'a3',
      alertCode: 'ALR-1031',
      severity: 'critical',
      item: 'برنج',
      option: 'docs',
      title: 'تکمیل مدارک ترخیص برنج',
      kind: 'doc',
      unit: 'واحد بازرگانی و ترخیص',
      owner: 'علی رستمی',
      requester: REQUESTER,
      status: 'blocked',
      sentAt: ago(3 * 1440),
      acceptedAt: ago(3 * 1440 - 60),
      due: inDays(1),
      steps: steps('doc', 1, () => ago(2 * 1440 + 120), { by: 'علی رستمی', names: { 1: 'گواهی بهداشت' } }),
      blocked: { reason: 'منتظر گواهی بهداشت از وزارت بهداشت', since: ago(2 * 1440) },
    },
    {
      id: 'ACT-889',
      alertId: 'a8',
      alertCode: 'ALR-1047',
      severity: 'critical',
      item: 'گندم',
      option: 'reroute',
      amount: 2,
      title: 'تغییر مسیر محمولهٔ گندم به چابهار',
      kind: 'move',
      unit: 'واحد حمل‌ونقل',
      owner: 'رضا کاظمی',
      requester: REQUESTER,
      status: 'verify',
      sentAt: ago(6 * 1440),
      acceptedAt: ago(6 * 1440 - 90),
      due: ago(3 * 1440),
      doneAt: ago(3 * 1440),
      steps: steps('reroute', 4, (i) => ago((5 - i) * 1440), { by: 'رضا کاظمی' }),
      verify: { day: 3, of: 7, inBand: true },
    },
    {
      id: 'ACT-875',
      alertId: 'a1',
      alertCode: 'ALR-1042',
      severity: 'critical',
      item: 'روغن خام سویا',
      option: 'transfer',
      amount: 100,
      title: 'انتقال ۱۰۰ تن روغن خام سویا از انبار شیراز',
      kind: 'move',
      unit: 'واحد انبارهای جنوب',
      requester: REQUESTER,
      status: 'rejected',
      sentAt: ago(200),
      steps: steps('move', 0, () => ''),
      rejection: { reason: 'ظرفیت یا منبع نداریم', note: 'انبار شیراز این هفته ظرفیت حمل ندارد', by: 'واحد انبارهای جنوب', at: ago(10) },
    },
    {
      id: 'ACT-860',
      alertId: '',
      alertCode: 'ALR-1009',
      item: 'کنجاله سویا',
      option: 'transfer',
      amount: 90,
      title: 'انتقال ۹۰ تن کنجاله سویا به بندرعباس',
      kind: 'move',
      unit: 'واحد انبارهای جنوب',
      owner: 'سارا احمدی',
      requester: REQUESTER,
      status: 'closed',
      sentAt: ago(14 * 1440),
      acceptedAt: ago(14 * 1440 - 120),
      due: ago(12 * 1440),
      doneAt: ago(12 * 1440),
      closedAt: ago(5 * 1440),
      steps: steps('move', 4, (i) => ago((13 - i / 2) * 1440), { by: 'سارا احمدی' }),
      verify: { day: 7, of: 7, inBand: true },
    },
    {
      id: 'ACT-858',
      alertId: '',
      alertCode: 'ALR-1012',
      item: 'نشاسته ذرت',
      option: 'supply',
      amount: 40,
      title: 'خرید ۴۰ تن نشاسته ذرت',
      kind: 'buy',
      unit: 'واحد تأمین',
      owner: 'رضا کریمی',
      requester: 'مریم صادقی',
      status: 'closed',
      sentAt: ago(20 * 1440),
      acceptedAt: ago(20 * 1440 - 200),
      due: ago(16 * 1440),
      doneAt: ago(16 * 1440),
      closedAt: ago(9 * 1440),
      steps: steps('buy', 5, (i) => ago((19 - i) * 1440), { by: 'رضا کریمی' }),
      verify: { day: 7, of: 7, inBand: true },
    },
  ]

  // The alert record of every open action (§9-2): a1 and a7 stay without one
  const records: Record<string, AlertRecord> = {}
  for (const a of actions) {
    if (!a.alertId || a.status === 'rejected' || a.status === 'closed' || a.status === 'cancel') continue
    records[a.alertId] = { option: a.option, amount: a.amount, note: '', rec: a.id, externalRef: a.externalRef ?? '', sync: a.sync, by: a.requester }
  }

  // History: one line per change, tagged with the action, in the alert's history (§3)
  const ev = (min: number, text: string, actor: string, action: string): [number, TimelineEvent] => [min, { text, time: agoText(min), actor, action }]
  const byKey: Record<string, [number, TimelineEvent][]> = {}
  const push = (key: string, e: [number, TimelineEvent]) => (byKey[key] = [...(byKey[key] ?? []), e])
  const min = (iso: string) => Math.round((loadedAt - Date.parse(iso)) / M)
  for (const a of actions) {
    const key = a.alertId || a.alertCode
    push(key, ev(min(a.sentAt), `${a.title} ثبت شد و برای ${a.unit} فرستاده شد · ${a.id}`, a.requester, a.id))
    if (a.acceptedAt) push(key, ev(min(a.acceptedAt), `${a.owner ?? a.unit} اقدام ${a.id} را پذیرفت`, a.owner ?? a.unit, a.id))
    for (const s of a.steps) if (s.done) push(key, ev(min(s.done), `مرحلهٔ «${s.label}» ثبت شد${s.auto ? '' : ' (دستی)'}`, s.auto ? 'سیستم خرید' : (s.by ?? a.unit), a.id))
    if (a.sync === 'failed') push(key, ev(min(a.sentAt) - 1, 'ارسال به سیستم خرید انجام نشد؛ سیستم در دسترس نبود.', 'پایش یکپارچگی', a.id))
    if (a.counter) push(key, ev(min(a.counter.at), `پیشنهاد تغییر: ${a.counter.split ?? ''} · دلیل: ${a.counter.reason}`, a.counter.by, a.id))
    if (a.blocked) push(key, ev(min(a.blocked.since), `مانع اعلام شد: ${a.blocked.reason}`, a.owner ?? a.unit, a.id))
    if (a.status === 'verify' && a.doneAt) push(key, ev(min(a.doneAt), 'انجام شد · سنجش اثر شروع شد', a.owner ?? a.unit, a.id))
    if (a.rejection) push(key, ev(min(a.rejection.at), `${a.unit} اقدام را رد کرد · دلیل: ${a.rejection.note ?? a.rejection.reason}`, a.rejection.by, a.id))
    if (a.closedAt) push(key, ev(min(a.closedAt), 'اثر در بازهٔ پیش‌بینی ماند · اقدام بسته شد', 'موتور سنجش', a.id))
  }
  // Oldest first, as the alert's history reads
  const events: Record<string, TimelineEvent[]> = Object.fromEntries(Object.entries(byKey).map(([k, list]) => [k, [...list].sort((x, y) => y[0] - x[0]).map(([, e]) => e)]))
  return { actions, records, events }
}
