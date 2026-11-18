import { useState } from 'react'
import type { ReactNode } from 'react'
import { fa as faN } from '../../components/overview/AlertParts'
import { alertDetails } from '../../data/alerts'
import type { CurrentUser } from '../../lib/access'
import { actionActions, useAlertState } from '../../lib/alertStore'
import type { ActionItem } from '../../lib/alertStore'
import { DAY, isOpen, membersOf } from '../../lib/actionRules'

const fa = (n: number) => faN(n)
const REJECT_REASONS = ['ظرفیت یا منبع نداریم', 'موعد ممکن نیست', 'در حیطهٔ ما نیست', 'دلیل دیگر']
export type Form = 'reject' | 'counter' | 'block' | 'due' | 'refer' | 'edit' | 'cancel' | null
export type Btn = { label: string; run: () => void; disabled?: boolean; title?: string; danger?: boolean }

/** «۱۰۰ تن» / «۲۵٪»: the unit is read from the option's own title */
export function amountText(a: ActionItem, n = a.amount) {
  if (n === undefined) return '—'
  const o = alertDetails[a.alertId]?.options.find((x) => x.id === a.option)
  const t = o?.title ?? a.title
  return /٪/.test(t) ? `${fa(n)}٪` : /تن/.test(t) ? `${fa(n)} تن` : /روز/.test(t) ? `${fa(n)} روز` : fa(n)
}
export const minutesSince = (iso: string, now: number) => Math.max(0, Math.round((now - Date.parse(iso)) / 60_000))

export const inUnitOf = (a: ActionItem, me: CurrentUser) => !!me.unit && me.unit === a.unit

/** The inline forms: a reason is required for rejecting, counter-proposing and reporting a blocker */
export function ActionForm({ form, a, me, amountText, onClose }: { form: Exclude<Form, null>; a: ActionItem; me: CurrentUser; amountText: (a: ActionItem, n?: number) => string; onClose: () => void }) {
  const [reason, setReason] = useState('')
  const [note, setNote] = useState(form === 'edit' ? (a.note ?? '') : '')
  const [amount, setAmount] = useState<string>(a.amount !== undefined ? String(a.amount) : '')
  const [split, setSplit] = useState('')
  const [days, setDays] = useState('')
  const [to, setTo] = useState('')
  const num = amount.trim() === '' ? undefined : Number(amount)
  const dueIso = days ? new Date(Date.now() + Number(days) * DAY).toISOString() : undefined
  const done = (f: () => void) => () => {
    f()
    onClose()
  }
  const acts = useAlertState().actions
  const people = membersOf(a.unit).filter((n) => n !== a.owner)
  const active = (n: string) => Object.values(acts).filter((x) => x.owner === n && isOpen(x)).length

  let title = ''
  let body: ReactNode = null
  let submit: { label: string; ok: boolean; run: () => void; danger?: boolean } | null = null
  switch (form) {
    case 'reject':
      title = 'رد اقدام'
      body = (
        <>
          <fieldset className="actform__reasons">
            <legend>دلیل (الزامی)</legend>
            {REJECT_REASONS.map((r) => (
              <label key={r}>
                <input type="radio" name="reject" checked={reason === r} onChange={() => setReason(r)} /> {r}
              </label>
            ))}
          </fieldset>
          <textarea rows={2} placeholder={reason === 'دلیل دیگر' ? 'دلیل را بنویسید (الزامی)' : 'توضیح (اختیاری)'} value={note} onChange={(e) => setNote(e.target.value)} />
          <p className="amuted">با رد، هشدار به «نیازمند بررسی» برمی‌گردد و این گزینه در سناریوسازی «رد شد توسط {a.unit}» می‌گیرد.</p>
        </>
      )
      submit = { label: 'رد اقدام', ok: !!reason && (reason !== 'دلیل دیگر' || !!note.trim()), run: () => actionActions.reject(a.id, reason, note), danger: true }
      break
    case 'counter':
      title = 'پیشنهاد تغییر'
      body = (
        <>
          <label className="actform__field">
            <span>مقدار پیشنهادی (اکنون {amountText(a)})</span>
            <input type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} />
          </label>
          <label className="actform__field">
            <span>تقسیم یا شرح (اختیاری)</span>
            <input type="text" placeholder="مثلاً ۱۵٪ این ماه + ۱۰٪ ماه بعد" value={split} onChange={(e) => setSplit(e.target.value)} />
          </label>
          <label className="actform__field">
            <span>موعد تازه، چند روز دیگر (اختیاری)</span>
            <input type="number" min={1} value={days} onChange={(e) => setDays(e.target.value)} />
          </label>
          <textarea rows={2} placeholder="دلیل (الزامی)" value={reason} onChange={(e) => setReason(e.target.value)} />
          <p className="amuted">تا پاسخ درخواست‌دهنده، مهلت پذیرش متوقف می‌ماند. اثر پیشنهاد کنار درخواست نشان داده می‌شود.</p>
        </>
      )
      submit = { label: 'فرستادن پیشنهاد', ok: !!reason.trim() && (num !== a.amount || !!split.trim() || !!days), run: () => actionActions.counter(a.id, { amount: num !== a.amount ? num : undefined, split: split.trim() || undefined, due: dueIso, reason: reason.trim() }) }
      break
    case 'block':
      title = 'اعلام مانع'
      body = <textarea rows={2} placeholder="چه چیزی کار را متوقف کرده؟ (الزامی)" value={reason} onChange={(e) => setReason(e.target.value)} />
      submit = { label: 'اعلام مانع', ok: !!reason.trim(), run: () => actionActions.block(a.id, reason.trim()) }
      break
    case 'due':
      title = 'پیشنهاد موعد تازه'
      body = (
        <>
          <label className="actform__field">
            <span>موعد تازه، چند روز دیگر</span>
            <input type="number" min={1} value={days} onChange={(e) => setDays(e.target.value)} />
          </label>
          <textarea rows={2} placeholder="دلیل (الزامی)" value={reason} onChange={(e) => setReason(e.target.value)} />
        </>
      )
      submit = { label: 'فرستادن', ok: !!days && !!reason.trim(), run: () => dueIso && actionActions.proposeDue(a.id, dueIso, reason.trim()) }
      break
    case 'refer':
      title = 'ارجاع به…'
      body = (
        <fieldset className="actform__reasons">
          <legend>اعضای {a.unit} · کارهای فعال هر کدام</legend>
          {people.map((n) => (
            <label key={n}>
              <input type="radio" name="refer" checked={to === n} onChange={() => setTo(n)} /> {n === me.name ? `${n} (شما)` : n} <span className="amuted">· {faN(active(n))} کار فعال</span>
            </label>
          ))}
        </fieldset>
      )
      submit = { label: 'ارجاع', ok: !!to, run: () => actionActions.refer(a.id, to) }
      break
    case 'edit':
      title = 'ویرایش درخواست'
      body = (
        <>
          {a.amount !== undefined && (
            <label className="actform__field">
              <span>مقدار</span>
              <input type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} />
            </label>
          )}
          <textarea rows={2} placeholder="توضیح برای واحد" value={note} onChange={(e) => setNote(e.target.value)} />
        </>
      )
      submit = { label: 'ذخیره', ok: true, run: () => actionActions.edit(a.id, num, note) }
      break
    case 'cancel':
      title = 'لغو اقدام'
      body = <p className="amuted">اقدام لغو می‌شود، واحد خبردار می‌شود و هشدار به «نیازمند بررسی» برمی‌گردد.{a.groupId ? ' بخش دیگر همین تصمیم ترکیبی هم لغو می‌شود.' : ''}</p>
      submit = { label: 'لغو اقدام', ok: true, run: () => actionActions.cancel(a.id), danger: true }
      break
  }
  return (
    <section className="actform" aria-label={title}>
      <h4 className="actform__title">{title}</h4>
      {body}
      <div className="actform__foot">
        {submit && (
          <button type="button" className={`abtn abtn--sm ${submit.danger ? 'abtn--danger' : 'abtn--primary'}`} disabled={!submit.ok} onClick={done(submit.run)}>
            {submit.label}
          </button>
        )}
        <button type="button" className="abtn abtn--ghost abtn--sm" onClick={onClose}>
          انصراف
        </button>
      </div>
    </section>
  )
}
