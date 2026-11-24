import { useState } from 'react'
import type { CSSProperties } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { alertByCode, lowStock, lowStockTotal } from '../../data/overview'
import { useAlertState } from '../../lib/alertStore'
import { severityLabel } from './AlertParts'
import { formatNumber, formatPercent } from '../../lib/format'
import { Panel } from './Panel'
import { Select } from '../ui/Select'

// Below half of the safety level is critical; the rest of the list is a warning.
const CRITICAL = 0.5
// The bar runs past the safety level so its marker never sits on the edge.
const SCALE = 1.2
// Rows shown on the overview; the full list opens on its own page
const VISIBLE = 4
const FULL_LIST = '/supply-chain/raw-materials'

const toneLabel = { danger: 'بحرانی', warning: 'زیر حد ایمن' } as const
type Tone = keyof typeof toneLabel
// Status chips, in the alerts card's style: critical is below half the safety level, the rest is below it
const STATUS_CHIPS = [
  { key: 'all', label: 'همه' },
  { key: 'danger', label: 'بحرانی' },
  { key: 'warning', label: 'زیر حد ایمن' },
] as const

const ALL = 'all'
// The trigger already says «انبار», so options drop the repeated word
const warehouseOptions = [
  { value: ALL, label: 'همه' },
  ...[...new Set(lowStock.map((it) => it.warehouse))].map((w) => ({ value: w, label: w.replace(/^انبار\s+/, '') })),
]

/**
 * Table of items below their safety level, lowest ratio first: figures, a meter (fill = current stock,
 * hatched zone = shortfall up to the safety marker) and the shortfall. Four rows; «مشاهده همه» beside the filter opens the full list.
 */
export function LowStockGrid() {
  const [warehouse, setWarehouse] = useState(ALL)
  const [status, setStatus] = useState<typeof ALL | Tone>(ALL)
  const navigate = useNavigate()
  const st = useAlertState()
  // The open alert about a row, if any: one entity, one panel
  const alertOf = (code?: string) => {
    const a = code ? alertByCode(code) : null
    return a && !st.closed[a.id] ? a : null
  }
  const toneOf = (it: { stock: number; safety: number }): Tone => (it.stock / it.safety < CRITICAL ? 'danger' : 'warning')
  const inWarehouse = lowStock.filter((it) => warehouse === ALL || it.warehouse === warehouse)
  const items = inWarehouse.filter((it) => status === ALL || toneOf(it) === status).sort((a, b) => a.stock / a.safety - b.stock / b.safety)
  const shown = items.slice(0, VISIBLE)

  return (
    <Panel
      title="اقلام زیر حد ایمن"
      subtitle={`${formatNumber(lowStockTotal)} قلم (هر کالا در هر انبار) · از کمترین نسبت موجودی به حد ایمن`}
      index={6}
      sample
      className="stock-panel"
      actions={
        <Link to={FULL_LIST} className="ov-link">
          مشاهده همه
        </Link>
      }
      guide={
        <>
          {formatNumber(shown.length)} از {formatNumber(items.length)} قلم{warehouse === ALL ? '' : ` در ${warehouse}`} · زیر ۵۰٪ حد ایمن بحرانی
          است و در اولویت تأمین قرار می‌گیرد
        </>
      }
    >
      {/* Filters on their own row under the title, as in the alerts card: status chips first, warehouse at the far end */}
      <div className="alerts-filters stock-filters">
        <div className="chips" role="group" aria-label="فیلتر وضعیت موجودی">
          {STATUS_CHIPS.map((c) => (
            <button key={c.key} type="button" className={`chip chip--sev chip--stock-${c.key}`} aria-pressed={status === c.key} onClick={() => setStatus(c.key)}>
              {c.key !== ALL && <span className="chip__dot" aria-hidden="true" />}
              {c.label}
              <span className="chip__count">{formatNumber(c.key === ALL ? inWarehouse.length : inWarehouse.filter((it) => toneOf(it) === c.key).length)}</span>
            </button>
          ))}
        </div>
        <Select label="انبار" value={warehouse} options={warehouseOptions} onChange={setWarehouse} searchPlaceholder="جستجوی انبار…" />
      </div>
      <div className="stock-table-wrap">
        <table key={`${warehouse}-${status}`} className="stock-table">
          <thead>
            <tr>
              <th scope="col">کالا / انبار</th>
              <th scope="col">موجودی / حد ایمن (تن)</th>
              <th scope="col">وضعیت موجودی</th>
              <th scope="col">کسری (تن)</th>
              <th scope="col">
                <span className="visually-hidden">اقدام</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {shown.length === 0 && (
              <tr>
                <td colSpan={5} className="stock-empty">
                  در این انبار قلمی با وضعیت «{STATUS_CHIPS.find((c) => c.key === status)?.label}» نیست.
                </td>
              </tr>
            )}
            {shown.map((it, i) => {
              const ratio = it.stock / it.safety
              const shortfall = it.safety - it.stock
              const tone = ratio < CRITICAL ? 'danger' : 'warning'
              const al = alertOf(it.alert)
              return (
                <tr
                  key={it.id}
                  className={`stock-row stock--${tone} ${al ? 'has-alert' : ''}`}
                  onClick={al ? () => navigate(`/?alert=${al.code}`) : undefined}
                  style={{ '--d': `${(i % VISIBLE) * 40}ms`, '--fill': `${(ratio / SCALE) * 100}%`, '--line': `${100 / SCALE}%` } as CSSProperties}
                >
                  <th scope="row" className="stock-row__id">
                    <span className="stock__name">
                      {it.name}
                    </span>
                    <span className="stock__wh">{it.warehouse}</span>
                  </th>
                  <td className="stock-row__figs num">
                    {formatNumber(it.stock)} <span className="stock-row__sep">/</span> {formatNumber(it.safety)}
                  </td>
                  <td className="stock-row__meter">
                    <div
                      className="stock__track"
                      data-tip={`${formatPercent(ratio * 100, 0)} حد ایمن`}
                      role="img"
                      aria-label={`${toneLabel[tone]}: ${formatPercent(ratio * 100, 0)} حد ایمن`}
                    >
                      <span className="stock__gap" />
                      <span className="stock__fill" />
                      <span className="stock__line" />
                    </div>
                  </td>
                  <td className="stock-row__short">
                    <bdi className="num" dir="ltr">
                      −{formatNumber(shortfall)}
                    </bdi>
                  </td>
                  <td className="stock-row__act">
                    {/* Revealed on row hover or keyboard focus */}
                    {al ? (
                      <Link to={`/?alert=${al.code}`} className="stock-row__btn" aria-label={`باز کردن هشدار ${severityLabel[al.severity]}: ${al.title}`} onClick={(e) => e.stopPropagation()}>
                        باز کردن هشدار
                      </Link>
                    ) : (
                      <Link to={FULL_LIST} className="stock-row__btn" aria-label={`مشاهده ${it.name} در ${it.warehouse}`}>
                        مشاهده کالا
                      </Link>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Panel>
  )
}
