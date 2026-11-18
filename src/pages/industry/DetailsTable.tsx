import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronDown, Download } from 'lucide-react'
import { tableRowsOf, toCsv, yearCounts } from '../../lib/industry/derive'
import type { PurchaseRecord } from '../../lib/industry/data'
import { fa } from '../../lib/industry/format'
import { faDigits } from '../../lib/industry/months'
import { CODAL_URL } from './FilterBar'
import { Card, stateOf } from './parts'
import { Num, TableChange as Change, TablePager } from './TablePager'
import type { PageSize } from './TablePager'
import type { CardCtx } from './parts'

type SortKey = 'item' | 'amountMr' | 'usdThousand'
type Sort = { key: SortKey; dir: 'asc' | 'desc' } | null

function download(rows: PurchaseRecord[]) {
  const url = URL.createObjectURL(new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = 'purchases.csv'
  a.click()
  URL.revokeObjectURL(url)
}

/** Columns: the item cell carries section and references; each figure is followed by its change. */
/** `w`: the column's share of the table, measured on the longest figure of each column (header and sort arrow included) */
const COLUMNS: { label: string; sort?: SortKey; num?: boolean; w: string; cell: (r: PurchaseRecord) => ReactNode }[] = [
  {
    label: 'ماده · بخش · ارجاع',
    w: '17%',
    sort: 'item',
    cell: (r) => (
      <div className="ind-item">
        <p className="ind-item__name">
          {r.item}
          <span className={`ind-src ${r.source === 'وارداتی' ? 'is-import' : 'is-domestic'}`}>{r.source}</span>
        </p>
        <p className="ind-item__meta" title={[r.month, r.reportVersion, r.trackingNo && `پیگیری ${r.trackingNo}`, r.cellRange && `خانه‌ها ${r.cellRange}`].filter(Boolean).join(' · ')}>
          <span className="n">{r.month}</span>
          {r.reportVersion && <> · {r.reportVersion}</>}
          {r.trackingNo && (
            <>
              {' '}
              · پیگیری <span className="n">{faDigits(r.trackingNo)}</span>
            </>
          )}
          {/* The cell range of the report (خانه‌ها) is in the hover title and the CSV, to keep the line short */}
        </p>
      </div>
    ),
  },
  {
    label: 'مقدار',
    w: '10%',
    num: true,
    cell: (r) =>
      r.qty == null ? (
        <span className="ind-muted">—</span>
      ) : (
        <span className="ind-qty">
          <span className="n">{fa(r.qty, 0)}</span>
          <span className="ind-muted">{r.unit}</span>
        </span>
      ),
  },
  { label: 'تغییر مقدار', num: true, w: '8.5%', cell: (r) => <Change v={r.qtyChangePct} /> },
  { label: 'نرخ ریالی', num: true, w: '10%', cell: (r) => <Num v={r.rateRial} /> },
  { label: 'تغییر نرخ', num: true, w: '8%', cell: (r) => <Change v={r.rateChangePct} /> },
  { label: 'میلیون ریال', sort: 'amountMr', num: true, w: '9%', cell: (r) => <Num v={r.amountMr} /> },
  { label: 'تغییر مبلغ', num: true, w: '9%', cell: (r) => <Change v={r.amountChangePct} /> },
  { label: 'هزار دلار', sort: 'usdThousand', num: true, w: '7.5%', cell: (r) => <Num v={r.usdThousand} d={r.usdThousand ? 1 : 0} /> },
  { label: 'تغییر دلاری', num: true, w: '9%', cell: (r) => <Change v={r.usdChangePct} /> },
  { label: 'دلار / واحد', num: true, w: '7%', cell: (r) => <Num v={r.usdPerUnit} d={1} /> },
  {
    label: 'منبع',
    w: '5%',
    // Sample rows have no Codal report behind them
    cell: (r) =>
      r.sample ? (
        <span className="ind-muted" title="ردیف نمونه؛ گزارش کدال ندارد">
          —
        </span>
      ) : (
        <a className="ind-link" href={CODAL_URL} target="_blank" rel="noreferrer" aria-label={`گزارش کدال ${r.item} ${r.source} ${r.month}`}>
          کدال ↗
        </a>
      ),
  },
]
const sortRows = (rows: PurchaseRecord[], sort: Sort) => {
  if (!sort) return rows
  const k = sort.dir === 'asc' ? 1 : -1
  return [...rows].sort((a, b) => (sort.key === 'item' ? a.item.localeCompare(b.item, 'fa') || a.source.localeCompare(b.source, 'fa') : (a[sort.key] ?? -Infinity) - (b[sort.key] ?? -Infinity)) * k)
}

/** «جدول جزئیات ماهانه» (page-prompt §13, §17) */
export function DetailsTable({ ctx }: { ctx: CardCtx }) {
  const [year, setYear] = useState<number | null>(null)
  const [size, setSize] = useState<PageSize>(10)
  const [page, setPage] = useState(1)
  const [sort, setSort] = useState<Sort>(null)
  const years = ctx.ds ? yearCounts(ctx.ds, ctx.range) : []
  const yearOk = year != null && years.some((y) => y.year === year && y.n > 0) ? year : null
  const rows = sortRows(ctx.ds ? tableRowsOf(ctx.ds, ctx.range, yearOk) : [], sort)
  const pages = Math.max(1, Math.ceil(rows.length / size))
  const p = Math.min(page, pages)
  const shown = rows.slice((p - 1) * size, p * size)
  const inRange = ctx.ds ? tableRowsOf(ctx.ds, ctx.range, null).length > 0 : false

  useEffect(() => setPage(1), [ctx.range.from, ctx.range.to])
  // First click: item A→Z, figures largest first; second click reverses; third returns to the report order
  const toggleSort = (key: SortKey) => {
    const first: 'asc' | 'desc' = key === 'item' ? 'asc' : 'desc'
    setSort((s) => (s?.key !== key ? { key, dir: first } : s.dir === first ? { key, dir: first === 'asc' ? 'desc' : 'asc' } : null))
    setPage(1)
  }

  return (
    <Card
      ctx={ctx}
      state={stateOf(ctx, inRange)}
      emptyText="برای این بازه و سال داده‌ای ثبت نشده است."
      title="جدول جزئیات ماهانه"
      subtitle="نرخ و مقدار گزارش‌شده؛ تغییرها بر اساس هویت تجمیع‌شده همان قلم در ماه قبل"
      actions={
        <div className="ind-tactions">
          <button type="button" className="ind-btn ind-btn--sm ind-btn--soft" onClick={() => download(rows)} disabled={!rows.length}>
            <Download size={14} aria-hidden="true" />
            دریافت CSV
          </button>
          <YearMenu
            years={years}
            value={yearOk}
            onPick={(y) => {
              setYear(y)
              setPage(1)
            }}
          />
        </div>
      }
    >
      {rows.length === 0 ? (
        <p className="ind-empty">برای این بازه و سال داده‌ای ثبت نشده است.</p>
      ) : (
        <div className="ind-table">
          <table>
            <thead>
              <tr>
                {COLUMNS.map((c, i) => {
                  const on = c.sort && sort?.key === c.sort ? sort.dir : null
                  return (
                    <th key={i} scope="col" style={{ width: c.w }} className={c.num ? 'ind-num' : undefined} aria-sort={on ? (on === 'asc' ? 'ascending' : 'descending') : undefined}>
                      {c.sort ? (
                        <button type="button" className="ind-sort" onClick={() => toggleSort(c.sort!)}>
                          {c.label}
                          {on === 'asc' ? <ArrowUp size={13} aria-hidden="true" /> : on === 'desc' ? <ArrowDown size={13} aria-hidden="true" /> : <ArrowUpDown size={13} className="ind-sort__idle" aria-hidden="true" />}
                        </button>
                      ) : (
                        c.label
                      )}
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={`${r.month}-${r.item}-${r.source}`}>
                  {COLUMNS.map((c, i) => (
                    <td key={i} className={c.num ? 'ind-num' : undefined}>
                      {c.cell(r)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <TablePager
        page={p}
        pages={pages}
        size={size}
        disabled={!rows.length}
        onPage={setPage}
        onSize={(n) => {
          setSize(n)
          setPage(1)
        }}
      />
      {rows.length > 0 && (
        <p className="ind-tfoot">
          {fa(rows.length)} ردیف · <span className="n">{rows[rows.length - 1].month}</span> تا <span className="n">{rows[0].month}</span>
        </p>
      )}
    </Card>
  )
}

/** The year filter: a small dropdown beside «دریافت CSV»; years without rows stay listed but disabled */
export function YearMenu({ years, value, onPick }: { years: { year: number; n: number }[]; value: number | null; onPick: (y: number | null) => void }) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const btn = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!open) return
    const key = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setOpen(false)
      btn.current?.focus()
    }
    const down = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('keydown', key)
    document.addEventListener('pointerdown', down)
    return () => (document.removeEventListener('keydown', key), document.removeEventListener('pointerdown', down))
  }, [open])
  const total = years.reduce((s, y) => s + y.n, 0)
  const items = [{ key: 'all', label: 'همه سال‌ها', n: total, y: null as number | null }, ...[...years].reverse().map((y) => ({ key: String(y.year), label: faDigits(String(y.year)), n: y.n, y: y.year as number | null }))]
  const pick = (y: number | null) => {
    onPick(y)
    setOpen(false)
    btn.current?.focus()
  }
  return (
    <div ref={root} className="ind-pos">
      <button ref={btn} type="button" className={`ind-btn ind-btn--sm ${open ? 'is-open' : ''}`} aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span className="ind-muted">سال</span>
        {value == null ? 'همه' : <span className="n">{faDigits(String(value))}</span>}
        <ChevronDown size={14} aria-hidden="true" />
      </button>
      {open && (
        <ul className="ind-menu ind-menu--end ind-menu--years" role="listbox" aria-label="سال">
          {items.map((it) => {
            const on = it.y === value
            return (
              <li key={it.key} role="option" aria-selected={on} aria-disabled={it.n === 0}>
                <button type="button" className={on ? 'is-on' : ''} disabled={it.n === 0} onClick={() => pick(it.y)}>
                  <span className="ind-menu__name">{it.label}</span>
                  <span className="ind-menu__meta">
                    <span className="n">{fa(it.n)}</span> ردیف
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
