import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown, Download } from 'lucide-react'
import { salesRecords, salesRecordsCsv, salesYearCounts } from '../../lib/industry/sales'
import type { SalesRecord, SalesSet } from '../../lib/industry/sales'
import { fa } from '../../lib/industry/format'
import { Card, stateOf } from './parts'
import type { CardCtx } from './parts'
import { YearMenu } from './DetailsTable'
import { Num, TableChange as Change, TablePager } from './TablePager'
import type { PageSize } from './TablePager'

type SortKey = 'product' | 'amountBr' | 'usdThousand'
type Sort = { key: SortKey; dir: 'asc' | 'desc' } | null
const TAG: Record<SalesRecord['type'], string> = { 'فروش داخلی': 'is-domestic', صادراتی: 'is-import', خدمات: 'is-service' }

function download(rows: SalesRecord[]) {
  const url = URL.createObjectURL(new Blob([salesRecordsCsv(rows)], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = 'sales.csv'
  a.click()
  URL.revokeObjectURL(url)
}

/** The same columns and widths as «جدول جزئیات ماهانه»: each figure followed by its change against the month before */
const COLUMNS: { label: string; sort?: SortKey; num?: boolean; w: string; cell: (r: SalesRecord) => ReactNode }[] = [
  {
    label: 'محصول · نوع · ماه',
    w: '24%',
    sort: 'product',
    cell: (r) => (
      <div className="ind-item">
        <p className="ind-item__name">
          {r.product}
          <span className={`ind-src ${TAG[r.type]}`}>{r.type}</span>
        </p>
        <p className="ind-item__meta">
          <span className="n">{r.month}</span> · نمونه
        </p>
      </div>
    ),
  },
  {
    label: 'مقدار',
    w: '9%',
    num: true,
    cell: (r) => (
      <span className="ind-qty">
        <span className="n">{fa(r.qty, 0)}</span>
        <span className="ind-muted">{r.unit}</span>
      </span>
    ),
  },
  { label: 'تغییر مقدار', num: true, w: '7.5%', cell: (r) => <Change v={r.qtyChangePct} /> },
  { label: 'میلیون ریال / تن', num: true, w: '9.5%', cell: (r) => <Num v={r.rateMr} d={1} /> },
  { label: 'تغییر نرخ', num: true, w: '7%', cell: (r) => <Change v={r.rateChangePct} /> },
  { label: 'میلیارد ریال', sort: 'amountBr', num: true, w: '8.5%', cell: (r) => <Num v={r.amountBr} d={1} /> },
  { label: 'تغییر مبلغ', num: true, w: '7.5%', cell: (r) => <Change v={r.amountChangePct} /> },
  { label: 'هزار دلار', sort: 'usdThousand', num: true, w: '7.5%', cell: (r) => <Num v={r.usdThousand} d={1} /> },
  { label: 'تغییر دلاری', num: true, w: '7.5%', cell: (r) => <Change v={r.usdChangePct} /> },
  { label: 'دلار / واحد', num: true, w: '7%', cell: (r) => <Num v={r.usdPerUnit} d={1} /> },
  {
    label: 'منبع',
    w: '5%',
    // Sample rows have no Codal report behind them
    cell: () => (
      <span className="ind-muted" title="ردیف نمونه؛ گزارش کدال ندارد">
        —
      </span>
    ),
  },
]
const sortRows = (rows: SalesRecord[], sort: Sort) => {
  if (!sort) return rows
  const k = sort.dir === 'asc' ? 1 : -1
  return [...rows].sort((a, b) => (sort.key === 'product' ? a.product.localeCompare(b.product, 'fa') || a.type.localeCompare(b.type, 'fa') : (a[sort.key] ?? -Infinity) - (b[sort.key] ?? -Infinity)) * k)
}

/** «جزئیات فروش در بازه»: every product and month in the filter range, in the look of «جدول جزئیات ماهانه» */
export function SalesDetailsTable({ ctx, sales }: { ctx: CardCtx; sales: SalesSet | null }) {
  const [year, setYear] = useState<number | null>(null)
  const [size, setSize] = useState<PageSize>(10)
  const [page, setPage] = useState(1)
  const [sort, setSort] = useState<Sort>(null)
  const years = useMemo(() => (sales && ctx.ds ? salesYearCounts(sales, ctx.ds, ctx.range) : []), [sales, ctx.ds, ctx.range])
  const yearOk = year != null && years.some((y) => y.year === year && y.n > 0) ? year : null
  const base = useMemo(() => (sales && ctx.ds ? salesRecords(sales, ctx.ds, ctx.range, yearOk) : []), [sales, ctx.ds, ctx.range, yearOk])
  const rows = sortRows(base, sort)
  const pages = Math.max(1, Math.ceil(rows.length / size))
  const p = Math.min(page, pages)
  const shown = rows.slice((p - 1) * size, p * size)
  const inRange = years.some((y) => y.n > 0)
  useEffect(() => setPage(1), [ctx.range.from, ctx.range.to])
  // First click: product A→Z, figures largest first; second click reverses; third returns to the default order
  const toggleSort = (key: SortKey) => {
    const first: 'asc' | 'desc' = key === 'product' ? 'asc' : 'desc'
    setSort((s) => (s?.key !== key ? { key, dir: first } : s.dir === first ? { key, dir: first === 'asc' ? 'desc' : 'asc' } : null))
    setPage(1)
  }

  return (
    <Card
      ctx={ctx}
      state={stateOf(ctx, inRange)}
      emptyText="برای این بازه و سال داده‌ای ثبت نشده است."
      title="جزئیات فروش در بازه"
      subtitle="ردیف‌های هر محصول و نوع فروش؛ تغییرها نسبت به همان ردیف در ماه قبل"
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
        <div className="ind-table ind-table--sales">
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
                <tr key={`${r.month}-${r.key}`}>
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
