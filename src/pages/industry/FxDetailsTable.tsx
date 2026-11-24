import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown, Download } from 'lucide-react'
import { fxCsv, fxTableRows, fxYearCounts } from '../../lib/industry/fxflows'
import type { FxRecord } from '../../lib/industry/fxflows'
import { fa } from '../../lib/industry/format'
import { Card, stateOf } from './parts'
import type { CardCtx } from './parts'
import { YearMenu } from './DetailsTable'
import { Num, TableChange as Change, TablePager } from './TablePager'
import type { PageSize } from './TablePager'

type SortKey = 'item' | 'amountMr' | 'usdMarket'
type Sort = { key: SortKey; dir: 'asc' | 'desc' } | null
const TAG: Record<FxRecord['section'], string> = { مصارف: 'is-import', منابع: 'is-source' }

function download(rows: FxRecord[]) {
  const url = URL.createObjectURL(new Blob([fxCsv(rows)], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = 'fx.csv'
  a.click()
  URL.revokeObjectURL(url)
}

/** In the look of «جدول جزئیات ماهانه»: each figure followed by its change against the same row (section, item, currency) the month before */
const COLUMNS: { label: string; sort?: SortKey; num?: boolean; w: string; cell: (r: FxRecord) => ReactNode }[] = [
  {
    label: 'شرح · بخش · ماه',
    w: '17%',
    sort: 'item',
    cell: (r) => (
      <div className="ind-item">
        <p className="ind-item__name">
          {r.item}
          <span className={`ind-src ${TAG[r.section]}`}>{r.section}</span>
        </p>
        <p className="ind-item__meta">
          <span className="n">{r.month}</span> · نمونه
        </p>
      </div>
    ),
  },
  { label: 'ارز', w: '6%', cell: (r) => <span className="n">{r.currency}</span> },
  { label: 'مبلغ ارزی', num: true, w: '10%', cell: (r) => <Num v={r.amountFx} /> },
  { label: 'تغییر مبلغ ارزی', num: true, w: '8%', cell: (r) => <Change v={r.amountFxChangePct} /> },
  { label: 'نرخ گزارش‌شده', num: true, w: '9%', cell: (r) => <Num v={r.rate} /> },
  { label: 'تغییر نرخ', num: true, w: '7.5%', cell: (r) => <Change v={r.rateChangePct} /> },
  { label: 'میلیون ریال', sort: 'amountMr', num: true, w: '10%', cell: (r) => <Num v={r.amountMr} /> },
  { label: 'تغییر مبلغ ریالی', num: true, w: '8%', cell: (r) => <Change v={r.amountMrChangePct} /> },
  { label: 'هزار دلار بازار', sort: 'usdMarket', num: true, w: '8.5%', cell: (r) => <Num v={r.usdMarket} d={1} /> },
  { label: 'مانده پیش‌بینی ارزی', num: true, w: '10%', cell: (r) => <Num v={r.forecastLeft} /> },
  {
    label: 'منبع',
    w: '6%',
    // Sample rows have no Codal report behind them
    cell: () => (
      <span className="ind-muted" title="ردیف نمونه؛ گزارش کدال ندارد">
        —
      </span>
    ),
  },
]
const sortRows = (rows: FxRecord[], sort: Sort) => {
  if (!sort) return rows
  const k = sort.dir === 'asc' ? 1 : -1
  return [...rows].sort((a, b) => (sort.key === 'item' ? a.item.localeCompare(b.item, 'fa') || a.section.localeCompare(b.section, 'fa') || a.currency.localeCompare(b.currency) : (a[sort.key] ?? -Infinity) - (b[sort.key] ?? -Infinity)) * k)
}

/** «جدول جزئیات منابع و مصارف ارزی»: every currency row in the filter range */
export function FxDetailsTable({ ctx, records }: { ctx: CardCtx; records: FxRecord[] }) {
  const [year, setYear] = useState<number | null>(null)
  const [size, setSize] = useState<PageSize>(10)
  const [page, setPage] = useState(1)
  const [sort, setSort] = useState<Sort>(null)
  const years = useMemo(() => (ctx.ds ? fxYearCounts(records, ctx.ds, ctx.range) : []), [records, ctx.ds, ctx.range])
  const yearOk = year != null && years.some((y) => y.year === year && y.n > 0) ? year : null
  const base = useMemo(() => (ctx.ds ? fxTableRows(records, ctx.ds, ctx.range, yearOk) : []), [records, ctx.ds, ctx.range, yearOk])
  const rows = sortRows(base, sort)
  const pages = Math.max(1, Math.ceil(rows.length / size))
  const p = Math.min(page, pages)
  const shown = rows.slice((p - 1) * size, p * size)
  const inRange = years.some((y) => y.n > 0)
  useEffect(() => setPage(1), [ctx.range.from, ctx.range.to])
  // First click: item A→Z, figures largest first; second click reverses; third returns to the default order
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
      title="جدول جزئیات منابع و مصارف ارزی"
      subtitle="ردیف‌های هر بخش، شرح و ارز؛ تغییرها نسبت به همان ردیف در ماه قبل"
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
                <tr key={`${r.month}-${r.section}-${r.item}-${r.currency}`}>
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
