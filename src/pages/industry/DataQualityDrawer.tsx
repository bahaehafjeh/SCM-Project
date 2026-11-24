import { useEffect, useRef } from 'react'
import { AlertTriangle, CheckCircle2, Clock, Database, FileCheck2, X } from 'lucide-react'
import { dataMonthsIn, reportVersionOf, totalsOf } from '../../lib/industry/derive'
import type { Dataset, Range } from '../../lib/industry/derive'
import { fa } from '../../lib/industry/format'
import { AXIS, DATA_START, faDigits, monthName } from '../../lib/industry/months'
import type { EnergySet } from '../../lib/industry/energy'
import type { SalesSet } from '../../lib/industry/sales'
import { DATA_SYMBOL, withSep } from './FilterBar'
import type { Symbol } from './FilterBar'

interface Props {
  open: boolean
  onClose: () => void
  ds: Dataset | null
  sales: SalesSet | null
  energy: EnergySet | null
  symbol: Symbol
  range: Range
  end: string | null
  triggerRef: React.RefObject<HTMLButtonElement | null>
}

export function DataQualityDrawer({ open, onClose, ds, sales, energy, symbol, range, end, triggerRef }: Props) {
  const closeBtn = useRef<HTMLButtonElement>(null)
  const hasSymbol = symbol === DATA_SYMBOL

  useEffect(() => {
    if (!open) return
    closeBtn.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
        triggerRef.current?.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose, triggerRef])

  if (!open) return null

  const months = ds && hasSymbol ? dataMonthsIn(ds, range) : []
  const realMonths = months.filter((m) => m >= DATA_START)
  const sampleMonths = months.filter((m) => m < DATA_START)
  const missingUsdMonths = realMonths.filter((m) => {
    const t = ds ? totalsOf(ds, m) : null
    return !t || t.marketRate == null
  })
  const revisedMonths = realMonths.filter((m) => {
    const v = ds ? reportVersionOf(ds, m) : null
    return v && v !== 'اصلی'
  })
  const realCoveragePct = months.length > 0 ? (realMonths.length / months.length) * 100 : 0
  const fxCoveragePct = realMonths.length > 0 ? ((realMonths.length - missingUsdMonths.length) / realMonths.length) * 100 : 0

  const handleClose = () => {
    onClose()
    triggerRef.current?.focus()
  }

  return (
    <div className="ind-dq-overlay" role="presentation" onClick={(e) => e.target === e.currentTarget && handleClose()}>
      <aside className="ind-dq-drawer" role="dialog" aria-modal="true" aria-labelledby="ind-dq-title">
        <header className="ind-dq-drawer__head">
          <div>
            <h2 id="ind-dq-title" className="ind-dq-drawer__title">
              <FileCheck2 size={18} aria-hidden="true" />
              پوشش داده و کنترل کیفیت
            </h2>
            <p className="ind-dq-drawer__sub">
              {withSep(symbol)} · بازه <span className="n">{AXIS[range.from]}</span> تا <span className="n">{AXIS[range.to]}</span>
            </p>
          </div>
          <button ref={closeBtn} type="button" className="ind-dq-close" aria-label="بستن پنل پوشش داده" onClick={handleClose}>
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        <div className="ind-dq-drawer__body">
          {!hasSymbol ? (
            <div className="ind-dq-empty">
              <Database size={24} aria-hidden="true" />
              <p>برای نماد «{symbol}» هنوز گزارش کدال بارگذاری نشده است.</p>
              <span>نماد «غبشهر — صنعتی بهشهر» را برای مشاهده سنجه‌های پوشش و کیفیت انتخاب کنید.</span>
            </div>
          ) : (
            <>
              <div className="ind-dq-kpis">
                <div className="ind-dq-kpi">
                  <span className="ind-dq-kpi__label">ماه‌های کدال در بازه</span>
                  <strong className="ind-dq-kpi__val n">
                    {fa(realMonths.length)} <small>از {fa(months.length)} ماه</small>
                  </strong>
                  <span className="ind-dq-kpi__meta">پوشش رسمی: {fa(realCoveragePct, 0)}٪</span>
                </div>
                <div className="ind-dq-kpi">
                  <span className="ind-dq-kpi__label">پوشش نرخ ارز بازار</span>
                  <strong className="ind-dq-kpi__val n">{fa(fxCoveragePct, 0)}٪</strong>
                  <span className="ind-dq-kpi__meta">{missingUsdMonths.length ? `${fa(missingUsdMonths.length)} ماه بدون نرخ دلاری` : 'کامل در ماه‌های رسمی'}</span>
                </div>
                <div className="ind-dq-kpi">
                  <span className="ind-dq-kpi__label">آخرین گزارش ماهانه</span>
                  <strong className="ind-dq-kpi__val">{end ? monthName(end) : '—'}</strong>
                  <span className="ind-dq-kpi__meta">نسخه: {ds && end ? reportVersionOf(ds, end) ?? '—' : '—'}</span>
                </div>
              </div>

              <section className="ind-dq-section" aria-labelledby="ind-dq-sources">
                <h3 id="ind-dq-sources">وضعیت منابع داده بخش‌ها</h3>
                <ul className="ind-dq-list">
                  <li>
                    <div className="ind-dq-row__top">
                      <strong>خرید مواد اولیه</strong>
                      <span className="ind-dq-badge is-ok">
                        <CheckCircle2 size={13} aria-hidden="true" />
                        متصل به کدال
                      </span>
                    </div>
                    <p>
                      داده‌های رسمی از <span className="n">{DATA_START}</span> تا پایان <span className="n">{end ?? '—'}</span> ({fa(ds?.records.filter((r) => !r.sample).length ?? 0)} ردیف ثبت‌شده)
                      {sampleMonths.length > 0 ? ` · ${fa(sampleMonths.length)} ماه پیش از آن با داده نمونه تاریخچه تکمیل شده است.` : '.'}
                    </p>
                  </li>
                  <li>
                    <div className="ind-dq-row__top">
                      <strong>تولید و فروش</strong>
                      <span className="ind-dq-badge is-warn">
                        <Clock size={13} aria-hidden="true" />
                        داده نمونه
                      </span>
                    </div>
                    <p>
                      فایل گزارش تولید و فروش کدال هنوز بارگذاری نشده است؛ {fa(sales?.months.length ?? 0)} ماه نمایش‌داده‌شده به‌صورت قطعی از روی خرید ماهانه مدل‌سازی شده و با برچسب «نمونه» مشخص است.
                    </p>
                  </li>
                  <li>
                    <div className="ind-dq-row__top">
                      <strong>منابع و مصارف ارزی</strong>
                      <span className="ind-dq-badge is-info">
                        <Database size={13} aria-hidden="true" />
                        ترکیبی
                      </span>
                    </div>
                    <p>نرخ دلار بازار از گزارش خرید کدال استخراج شده و نرخ ارز تخصیصی شرکت تا اتصال فایل ارزی به‌صورت نمونه محاسبه می‌شود.</p>
                  </li>
                  <li>
                    <div className="ind-dq-row__top">
                      <strong>انرژی</strong>
                      <span className="ind-dq-badge is-warn">
                        <Clock size={13} aria-hidden="true" />
                        داده نمونه
                      </span>
                    </div>
                    <p>
                      جدول مصرف آب، برق، گاز و سوخت کدال هنوز بارگذاری نشده است؛ {fa(energy?.months.length ?? 0)} ماه نمایش‌داده‌شده به‌صورت قطعی با الگوی فصلی و نرخ ارز بازار مدل‌سازی شده است.
                    </p>
                  </li>
                </ul>
              </section>

              <section className="ind-dq-section" aria-labelledby="ind-dq-checks">
                <h3 id="ind-dq-checks">نتایج کنترل کیفیت خودکار</h3>
                <ul className="ind-dq-checks">
                  <li className={missingUsdMonths.length ? 'is-warn' : 'is-ok'}>
                    {missingUsdMonths.length ? <AlertTriangle size={16} aria-hidden="true" /> : <CheckCircle2 size={16} aria-hidden="true" />}
                    <div>
                      <strong>سنجش کامل‌بودن نرخ تبدیل دلار بازار</strong>
                      <p>
                        {missingUsdMonths.length
                          ? `در ماه‌های ${missingUsdMonths.map((m) => faDigits(m)).join('، ')} مبلغ دلاری در گزارش خرید ثبت نشده و مقدار ارزی خالی (—) نگه داشته شده است (عدم جایگزینی با صفر).`
                          : 'تمام ماه‌های رسمی در بازه انتخابی دارای نرخ تبدیل معتبر هستند.'}
                      </p>
                    </div>
                  </li>
                  <li className="is-ok">
                    <CheckCircle2 size={16} aria-hidden="true" />
                    <div>
                      <strong>پایش گزارش‌های اصلاحیه کدال</strong>
                      <p>
                        {revisedMonths.length
                          ? `${fa(revisedMonths.length)} ماه دارای نسخه اصلاحیه شناسایی شد: ${revisedMonths.map((m) => `${faDigits(m)} (${reportVersionOf(ds!, m)})`).join('، ')}.`
                          : 'در ماه‌های رسمی بازه انتخابی، تمام گزارش‌ها در نسخه اولیه (اصلی) معتبر هستند.'}
                      </p>
                    </div>
                  </li>
                  <li className="is-ok">
                    <CheckCircle2 size={16} aria-hidden="true" />
                    <div>
                      <strong>تفکیک شفاف داده واقعی و نمونه</strong>
                      <p>ماه‌های ساختگی پیش از ۱۴۰۴/۰۲ و بخش فروش در نوار اطلاعات نماد و ستون منبع با نشان «نمونه» از گزارش‌های رسمی تفکیک شده‌اند.</p>
                    </div>
                  </li>
                </ul>
              </section>
            </>
          )}
        </div>
      </aside>
    </div>
  )
}
