import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { X } from 'lucide-react'
// The AI mark from iconsax (owner request): «magic-star»
import { MagicStar } from 'iconsax-react'
import { LAST_COMPUTED, alerts, lowStock, lowStockTotal, shipments } from '../../data/overview'
import { formatNumber as fa } from '../../lib/format'
import { IconButton } from '../ui/IconButton'
import { alertBucket, useAlertState } from '../../lib/alertStore'

/**
 * «خلاصه هوشمند روزانه»: a button beside «آخرین محاسبه» that opens today's summary. Every line is
 * computed from the same sample data the dashboard shows, so the summary never says more than the
 * cards do.
 */
export function DailySummary() {
  const [open, setOpen] = useState(false)
  const wrap = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const off = (e: MouseEvent) => !wrap.current?.contains(e.target as Node) && setOpen(false)
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', off)
    window.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', off)
      window.removeEventListener('keydown', esc)
    }
  }, [open])

  const st = useAlertState()
  const critical = alerts.filter((a) => a.severity === 'critical')
  // The most urgent alert is the first critical one still waiting for review (no decision, no reminder)
  const urgent = critical.find((a) => alertBucket(st, a) === 'review')
  const worst = [...lowStock].sort((a, b) => a.stock / a.safety - b.stock / b.safety)[0]
  const seg = (id: string) => shipments.segments.find((s) => s.id === id)?.count ?? 0
  const onTime = Math.round((seg('on-time') / shipments.total) * 100)

  return (
    <div className="dsum" ref={wrap}>
      <button type="button" className="dsum__btn" aria-expanded={open} aria-haspopup="dialog" onClick={() => setOpen(!open)}>
        <MagicStar size={18} variant="Bulk" color="currentColor" aria-hidden="true" />
        خلاصه هوشمند روزانه
      </button>
      {open && (
        <div className="dsum__pop" role="dialog" aria-label="خلاصه هوشمند روزانه">
          <header className="dsum__head">
            <span className="dsum__icon dsum__icon--lg" aria-hidden="true">
              <MagicStar size={18} variant="Bulk" color="currentColor" />
            </span>
            <span className="dsum__title">
              <strong>خلاصه امروز</strong>
              <span>تا {LAST_COMPUTED}</span>
            </span>
            <IconButton size="sm" label="بستن خلاصه" onClick={() => setOpen(false)}>
              <X size={15} aria-hidden="true" />
            </IconButton>
          </header>
          <ul className="dsum__list">
            <li>
              <strong>{fa(critical.length)} هشدار بحرانی</strong> باز است؛ فوری‌ترین: {(urgent ?? critical[0])?.title}.
            </li>
            <li>
              <strong>{fa(lowStockTotal)} قلم</strong> زیر حد ایمن است؛ کمترین: {worst.name} در {worst.warehouse} با{' '}
              {fa(Math.round((worst.stock / worst.safety) * 100))}٪ حد ایمن.
            </li>
            <li>
              تحویل به‌موقع <strong>{fa(onTime)}٪</strong>؛ {fa(seg('delayed'))} محموله با تأخیر و {fa(seg('disrupted'))} محموله دچار اختلال.
            </li>
          </ul>
          {urgent ? (
            // Not seen yet: open on «وضعیت» so the evidence comes first; seen: straight to the decision
            <Link to={`/?alert=${urgent.code}${st.seen[urgent.id] ? '&step=decision' : ''}`} className="dsum__cta" onClick={() => setOpen(false)}>
              بررسی فوری‌ترین هشدار
            </Link>
          ) : (
            <p className="dsum__note">هشدار بحرانی منتظر بررسی نیست.</p>
          )}
          <p className="dsum__note">از داده‌های همین داشبورد ساخته شده است · داده نمونه</p>
        </div>
      )}
    </div>
  )
}
