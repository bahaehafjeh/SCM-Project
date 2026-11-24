import { useEffect, useId, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { CircleAlert, Info, Sparkles, X } from 'lucide-react'
import type { AlertDetail, AlertItem, AlertOption } from '../../data/alerts'
import { modelFor, snoozeWindow } from '../../lib/engine'
import { IconButton } from '../ui/IconButton'
import { ForecastChart, fa, slaHours } from './AlertParts'

// Snapshot: Tuesday 5 Aban 1405, 15:16
const WEEK = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه']
export const dayLabel = (days: number) => `${WEEK[(3 + Math.floor(days)) % 7]} ${fa(5 + Math.floor(days))} آبان`
export { slaHours } from './AlertParts'

export function Modal({ title, subtitle, onClose, children, footer }: { title: string; subtitle: string; onClose: () => void; children: ReactNode; footer: ReactNode }) {
  const id = useId()
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    ref.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.stopImmediatePropagation()
      onClose()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [onClose])
  return createPortal(
    <div className="amodal-layer">
      <div className="amodal-scrim" onClick={onClose} aria-hidden="true" />
      <div ref={ref} className="amodal" role="dialog" aria-modal="true" aria-labelledby={id} tabIndex={-1}>
        <header className="amodal__head">
          <div>
            <h2 id={id} className="amodal__title">
              {title}
            </h2>
            <p className="amodal__sub">{subtitle}</p>
          </div>
          <IconButton size="sm" label="بستن" className="tb-icon--plain" onClick={onClose}>
            <X size={17} aria-hidden="true" />
          </IconButton>
        </header>
        <div className="amodal__body">{children}</div>
        <footer className="amodal__foot">{footer}</footer>
      </div>
    </div>,
    document.body,
  )
}

function CostBox({ title, tone, children }: { title: string; tone: 'danger' | 'warning' | 'neutral'; children: ReactNode }) {
  return (
    <section className={`acost acost--${tone}`}>
      <h3 className="acost__title">
        <CircleAlert size={18} aria-hidden="true" />
        {title}
      </h3>
      {children}
    </section>
  )
}

function Figures({ items }: { items: { label: string; value: string; danger?: boolean; warning?: boolean }[] }) {
  return (
    <dl className="acost__figs">
      {items.map((i) => (
        <div key={i.label}>
          <dt>{i.label}</dt>
          <dd className={i.danger ? 'is-danger' : i.warning ? 'is-warning' : undefined}>{i.value}</dd>
        </div>
      ))}
    </dl>
  )
}

type Choice = { key: string; tab: string; days: number; button: string; until: string; label: string }

const CRITICAL_SLA = 'هشدار بحرانی را فقط تا پایان مهلت رسیدگی می‌توان عقب انداخت.'

/**
 * «یادآوری بعداً» (prompt §8.1): what waiting costs, before it is confirmed. The box is red only when the
 * chosen time is after «دیرترین زمان امن»; a critical alert cannot be put off past its handling deadline.
 */
export function SnoozeModal({ alert, detail, onClose, onConfirm }: { alert: AlertItem; detail: AlertDetail; onClose: () => void; onConfirm: (label: string, until: string, dueAt: string) => void }) {
  const fixed: Choice[] = [
    { key: '1h', tab: '۱ ساعت', days: 1 / 24, button: 'یادآوری ۱ ساعت دیگر', until: 'امروز · ۱۶:۱۶', label: '۱ ساعت دیگر' },
    { key: '4h', tab: '۴ ساعت', days: 4 / 24, button: 'یادآوری ۴ ساعت دیگر', until: 'امروز · ۱۹:۱۶', label: '۴ ساعت دیگر' },
    { key: '1d', tab: 'فردا', days: 18.7 / 24, button: 'یادآوری فردا', until: `${dayLabel(1)} · ۱۰:۰۰`, label: 'فردا' },
    { key: '3d', tab: '۳ روز', days: 3, button: 'یادآوری ۳ روز دیگر', until: `${dayLabel(3)} · ۱۵:۱۶`, label: '۳ روز دیگر' },
  ]
  const customOf = (d: number): Choice => ({ key: `c${d}`, tab: dayLabel(d), days: d, button: `یادآوری ${dayLabel(d)}`, until: `${dayLabel(d)} · ۱۵:۱۶`, label: dayLabel(d) })
  const customs = [1, 2, 3, 4, 5, 6, 7].map(customOf)
  const all = [...fixed, ...customs]

  const sla = slaHours(alert)
  const critical = alert.severity === 'critical'
  // Critical: nothing past the handling deadline
  const allowed = (c: Choice) => !critical || c.days * 24 <= sla

  // Latest safe time: the recommended action must still land before the stock runs out
  const f = detail.stock
  const rec = detail.options.find((o) => o.recommended) ?? detail.options[0]
  const lead = f ? (rec.id === 'early' ? Math.max(3, f.purchase.days - 4) : rec.kind === 'supply' ? f.purchase.days : f.transfer.days) : 0
  // Every number below comes from the shared engine
  const model = f ? modelFor(alert, detail) : null
  const win = model && model.options[rec.id] ? snoozeWindow(model, rec) : null
  const empty = win?.emptyDay ?? Infinity
  const latest = win ? win.latest : Infinity
  const safe = (c: Choice) => c.days <= latest

  const firstOk = all.find((c) => allowed(c) && safe(c)) ?? all.find(allowed) ?? null
  const [key, setKey] = useState<string | null>(firstOk?.key === '1h' && !critical ? '3d' : (firstOk?.key ?? null))
  const [customOpen, setCustomOpen] = useState(false)
  const choice = all.find((c) => c.key === key) ?? null
  // The suggestion points at the latest option that is in the list, allowed and still safe
  const suggestion = [...all].filter((c) => allowed(c) && safe(c)).sort((x, y) => y.days - x.days)[0] ?? null

  const tooLate = !!choice && !safe(choice)
  const slaPasses = !!choice && choice.days * 24 > sla
  const sim = win ? { series: win.next(7) } : null
  const at = win && choice ? win.stockAt(choice.days) : 0
  const latestText = !win ? '' : latest <= 0 ? 'همین حالا' : latest <= 7 ? dayLabel(latest) : `حدود ${fa(latest)} روز دیگر`

  return (
    <Modal
      title="یادآوری بعداً"
      subtitle="هشدار تا آن زمان در تب «معوق» می‌ماند و بعد به «نیازمند بررسی» برمی‌گردد."
      onClose={onClose}
      footer={
        <>
          <button type="button" className="abtn abtn--primary" disabled={!choice} onClick={() => choice && onConfirm(choice.label, choice.until, new Date(Date.now() + choice.days * 864e5).toISOString())}>
            {choice ? choice.button : 'یادآوری'}
          </button>
          <button type="button" className="abtn abtn--ghost" onClick={onClose}>
            انصراف
          </button>
        </>
      }
    >
      <p className="amodal__q">کی دوباره یادآوری شود؟</p>
      <div className="seg seg--fill" role="radiogroup" aria-label="زمان یادآوری">
        {fixed.map((c) => (
          <button key={c.key} type="button" role="radio" aria-checked={key === c.key} aria-pressed={key === c.key} disabled={!allowed(c)} onClick={() => (setKey(c.key), setCustomOpen(false))}>
            {c.tab}
          </button>
        ))}
        <button type="button" role="radio" aria-checked={customOpen} aria-pressed={customOpen} onClick={() => setCustomOpen(true)}>
          تاریخ دلخواه
        </button>
      </div>
      {customOpen && (
        <div className="aclose__reasons" role="radiogroup" aria-label="روز یادآوری">
          {customs.map((c) => (
            <button key={c.key} type="button" role="radio" aria-checked={key === c.key} className="chip" disabled={!allowed(c)} onClick={() => setKey(c.key)}>
              {c.tab}
            </button>
          ))}
        </div>
      )}
      {critical && all.some((c) => !allowed(c)) && (
        <p className="amodal__note" role="note">
          <Info size={15} aria-hidden="true" />
          {CRITICAL_SLA}
        </p>
      )}

      {choice && (
        <CostBox title={`اگر تا ${choice.key === '1h' || choice.key === '4h' ? choice.until.replace(' · ', ' ') : dayLabel(choice.days)} صبر کنید`} tone={tooLate ? 'danger' : slaPasses ? 'warning' : 'neutral'}>
          {f && sim && <ForecastChart safety={f.safety} main={sim.series} height={130} fit markers={[{ index: Math.min(7, choice.days), label: 'یادآوری', tone: tooLate ? 'warn' : 'dark' }]} label={`موجودی ۷ روز آینده بدون اقدام؛ در روز یادآوری ${fa(Math.round(at))} تن`} axis={['امروز', '۷ روز بعد']} />}
          <Figures
            items={[
              ...(f
                ? [
                    { label: 'موجودی در آن روز', value: `${fa(Math.round(at))} تن · ${fa(Math.round((at / f.safety) * 100))}٪ حد ایمن`, danger: tooLate },
                    { label: 'تا اتمام موجودی', value: empty === Infinity ? 'بیش از یک سال' : empty - choice.days > 0 ? `حدود ${fa(Math.round(empty - choice.days))} روز` : 'تا آن روز تمام شده', danger: tooLate },
                  ]
                : [{ label: 'بدون اقدام', value: detail.noAction.lead }]),
              { label: 'مهلت رسیدگی', value: slaPasses ? 'می‌گذرد' : 'نمی‌گذرد', warning: slaPasses },
            ]}
          />
        </CostBox>
      )}

      {f && win && (
        <div className={`asafe ${tooLate ? 'is-late' : ''}`}>
          <Sparkles size={18} aria-hidden="true" />
          <div className="asafe__text">
            <p className="asafe__title">دیرترین زمان امن: {latestText}</p>
            <p>{rec.id === 'early' ? `تحویل زودتر سفارش حدود ${fa(lead)} روز` : rec.kind === 'supply' ? `تأمین جدید حدود ${fa(lead)} روز` : `انتقال از ${f.transfer.source} ${fa(lead)} روز`} طول می‌کشد؛ ثبت دیرتر یعنی کمبود بیشتر.</p>
          </div>
          {suggestion && suggestion.key !== key && (
            <button
              type="button"
              className="abtn abtn--ghost abtn--sm"
              onClick={() => {
                setKey(suggestion.key)
                setCustomOpen(suggestion.key.startsWith('c'))
              }}
            >
              انتخاب {suggestion.tab}
            </button>
          )}
        </div>
      )}
      <p className="amodal__hint">اگر هشدار در این مدت شدیدتر شود، زودتر یادآوری می‌شود.</p>
    </Modal>
  )
}

/**
 * Reasons for rejecting the system's suggestion (one option, never the alert). Shared by the inline
 * reject form on the suggested option card.
 */
export function rejectReasons(alert: AlertItem, detail: AlertDetail, option: AlertOption): string[] {
  return alert.type === 'inventory'
    ? [option.kind === 'transfer' ? `${detail.stock?.transfer.source ?? 'انبار مبدأ'} مازاد واقعی ندارد` : 'تأمین‌کننده توان تحویل ندارد', 'تأمین از مسیر دیگری در جریان است', 'داده موجودی درست نیست', 'دلیل دیگر']
    : ['واحد مسئول از قبل پیگیر است', 'داده محموله درست نیست', 'این اقدام اثری ندارد', 'دلیل دیگر']
}

const CLOSE_REASONS = ['رفع شد', 'هشدار اشتباه', 'تکراری'] as const

/** «بستن هشدار»: a required reason and an optional note, in its own modal (the panel underneath is untouched) */
export function CloseModal({ onClose, onConfirm }: { onClose: () => void; onConfirm: (reason: string, note: string) => void }) {
  const [reason, setReason] = useState<string | null>(null)
  const [note, setNote] = useState('')
  return (
    <Modal
      title="بستن هشدار"
      subtitle="هشدار به تب «بسته‌شده» می‌رود. اگر همین وضعیت تا ۷۲ ساعت دیگر تکرار شود، دوباره باز می‌شود."
      onClose={onClose}
      footer={
        <>
          <button type="button" className="abtn abtn--danger" disabled={!reason} onClick={() => reason && onConfirm(reason, note.trim())}>
            بستن هشدار
          </button>
          <button type="button" className="abtn abtn--ghost" onClick={onClose}>
            انصراف
          </button>
        </>
      }
    >
      <p className="amodal__q">
        دلیل بستن <span className="afield__req">*</span>
      </p>
      <div className="aclose__reasons" role="radiogroup" aria-label="دلیل بستن">
        {CLOSE_REASONS.map((r) => (
          <button key={r} type="button" role="radio" aria-checked={reason === r} className="chip" onClick={() => setReason(r)}>
            {r}
          </button>
        ))}
      </div>
      <label className="afield">
        <span className="afield__label">
          توضیح تکمیلی <span className="afield__opt">(اختیاری)</span>
        </span>
        <textarea className="afield__input" rows={4} maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} placeholder="مثلاً: موجودی با محموله ورودی دیروز تکمیل شد." />
        <span className="afield__count">{fa(note.length)} / ۳۰۰</span>
      </label>
    </Modal>
  )
}
