import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown, Download } from 'lucide-react'
import { SALES_UNIT_LABEL, salesCsv, salesTableRows } from '../../lib/industry/sales'
import type { SalesSet, SalesTableMode, SalesTableRow } from '../../lib/industry/sales'
import { fa } from '../../lib/industry/format'
import { Card, Seg, stateOf } from './parts'
import type { CardCtx } from './parts'
import { Num, TableChange, TablePager } from './TablePager'
import type { PageSize } from './TablePager'

type SortKey = 'product' | 'cur' | 'share'
type Sort = { key: SortKey; dir: 'asc' | 'desc' } | null
const MODES: { value: SalesTableMode; label: string }[] = [
  { value: 'amount', label: 'مبلغ فروش' },
  { value: 'qty', label: 'مقدار فروش' },
]

function download(text: string, name: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}

const sortRows = (rows: SalesTableRow[], sort: Sort) => {
  if (!sort) return rows
  const k = sort.dir === 'asc' ? 1 : -1
  return [...rows].sort((a, b) => (sort.key === 'product' ? a.product.localeCompare(b.product, 'fa') || a.type.localeCompare(b.type, 'fa') : (a[sort.key] ?? -Infinity) - (b[sort.key] ?? -Infinity)) * k)
}

/** «تحلیل فروش {ماه پایان}»: each product's sales in the end month against the month before and the same month a year earlier; the same table as «جدول جزئیات ماهانه» */
export function SalesTable({ ctx, sales }: { ctx: CardCtx; sales: SalesSet | null }) {
  const [mode, setMode] = useState<SalesTableMode>('amount')
  const [size, setSize] = useState<PageSize>(10)
  const [page, setPage] = useState(1)
  const [sort, setSort] = useState<Sort>(null)
  const end = sales && ctx.end && sales.byMonth.has(ctx.end) ? ctx.end : null
  const rows = sortRows(sales && end ? salesTableRows(sales, end, mode, ctx.unit) : [], sort)
  const pages = Math.max(1, Math.ceil(rows.length / size))
  const p = Math.min(page, pages)
  const shown = rows.slice((p - 1) * size, p * size)
  useEffect(() => setPage(1), [ctx.range.from, ctx.range.to])

  const d = mode === 'qty' ? 0 : 1
  const unit = mode === 'qty' ? 'مقدار به واحد هر محصول' : `مبلغ به ${SALES_UNIT_LABEL[ctx.unit]}`
  const toggleSort = (key: SortKey) => {
    const first: 'asc' | 'desc' = key === 'product' ? 'asc' : 'desc'
    setSort((s) => (s?.key !== key ? { key, dir: first } : s.dir === first ? { key, dir: first === 'asc' ? 'desc' : 'asc' } : null))
    setPage(1)
  }
  /** `w`: the column's share of the table */
  const columns: { label: string; sort?: SortKey; num?: boolean; w: string; cell: (r: SalesTableRow) => ReactNode }[] = [
    { label: 'محصول', sort: 'product', w: '24%', cell: (r) => <span className="ind-item__name">{r.product}</span> },
    { label: 'نوع', w: '11%', cell: (r) => <span className="ind-muted">{r.type}</span> },
    { label: 'واحد', w: '6%', cell: (r) => <span className="ind-muted">{r.unit}</span> },
    { label: 'این ماه', sort: 'cur', num: true, w: '10%', cell: (r) => <Num v={r.cur} d={r.cur ? d : 0} /> },
    { label: 'ماه قبل', num: true, w: '10%', cell: (r) => <Num v={r.prev} d={r.prev ? d : 0} /> },
    { label: 'رشد ماهانه', num: true, w: '10%', cell: (r) => <TableChange v={r.mom} /> },
    { label: 'همان ماه سال قبل', num: true, w: '12%', cell: (r) => <Num v={r.yearAgo} d={r.yearAgo ? d : 0} /> },
    { label: 'رشد سالانه', num: true, w: '9%', cell: (r) => <TableChange v={r.yoy} /> },
    { label: 'سهم', sort: 'share', num: true, w: '8%', cell: (r) => (r.share == null ? <span className="ind-muted">—</span> : <span className="n">{fa(r.share, 1)}٪</span>) },
  ]

  return (
    <Card
      ctx={ctx}
      state={stateOf(ctx, !!end)}
      title={`تحلیل فروش ${end ?? ''}`}
      subtitle={`سهم از فروش ناخالص ماه؛ رشد سالانه در برابر همان ماه سال قبل؛ ${unit}`}
      actions={
        <div className="ind-tactions">
          <button type="button" className="ind-btn ind-btn--sm ind-btn--soft" onClick={() => end && download(salesCsv(rows, end, mode, ctx.unit), `sales-${end.replace('/', '-')}.csv`)} disabled={!rows.length}>
            <Download size={14} aria-hidden="true" />
            دریافت CSV
          </button>
          <Seg label="نوع ارقام جدول" value={mode} options={MODES} onChange={setMode} />
        </div>
      }
    >
      {rows.length === 0 ? (
        <p className="ind-empty">برای این ماه فروشی ثبت نشده است.</p>
      ) : (
        <div className="ind-table">
          <table>
            <thead>
              <tr>
                {columns.map((c, i) => {
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
                <tr key={r.key}>
                  {columns.map((c, i) => (
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
      {rows.length > 0 && <p className="ind-tfoot">{fa(rows.length)} محصول</p>}
    </Card>
  )
}
