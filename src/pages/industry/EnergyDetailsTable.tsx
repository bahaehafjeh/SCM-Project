import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown, Download } from 'lucide-react'
import { energyRecords, energyRecordsCsv, energyYearCounts } from '../../lib/industry/energy'
import type { EnergyCategory, EnergyRecord, EnergySet } from '../../lib/industry/energy'
import { fa } from '../../lib/industry/format'
import { Card, stateOf } from './parts'
import type { CardCtx } from './parts'
import { YearMenu } from './DetailsTable'
import { Num, TableChange as Change, TablePager } from './TablePager'
import type { PageSize } from './TablePager'

type SortKey = 'name' | 'amountBr' | 'usdThousand'
type Sort = { key: SortKey; dir: 'asc' | 'desc' } | null

const CAT_TAG: Record<EnergyCategory, string> = {
  'گرمایش و بخار': 'is-domestic',
  'نیروی محرکه': 'is-import',
  'سوخت پشتیبان': 'is-source',
  آبرسانی: 'is-service',
}

function download(rows: EnergyRecord[]) {
  const url = URL.createObjectURL(new Blob([energyRecordsCsv(rows)], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = 'energy.csv'
  a.click()
  URL.revokeObjectURL(url)
}

const COLUMNS: { label: string; sort?: SortKey; num?: boolean; w: string; cell: (r: EnergyRecord) => ReactNode }[] = [
  {
    label: 'انرژی · بخش مصرف · ماه',
    w: '24%',
    sort: 'name',
    cell: (r) => (
      <div className="ind-item">
        <p className="ind-item__name">
          {r.name}
          <span className={`ind-src ${CAT_TAG[r.category]}`}>{r.category}</span>
        </p>
        <p className="ind-item__meta">
          <span className="n">{r.month}</span> · نمونه
        </p>
      </div>
    ),
  },
  {
    label: 'مقدار',
    w: '11%',
    num: true,
    cell: (r) => (
      <span className="ind-qty">
        <span className="n">{fa(r.qty, 0)}</span>
        <span className="ind-muted">{r.unit}</span>
      </span>
    ),
  },
  { label: 'تغییر مقدار', num: true, w: '7.5%', cell: (r) => <Change v={r.qtyChangePct} /> },
  {
    label: 'هزار ریال / واحد',
    num: true,
    w: '9%',
    cell: (r) => <Num v={r.rateThousRial} d={r.rateThousRial != null && r.rateThousRial < 1 ? 2 : r.rateThousRial != null && r.rateThousRial < 100 ? 1 : 0} />,
  },
  { label: 'تغییر نرخ', num: true, w: '7%', cell: (r) => <Change v={r.rateChangePct} /> },
  { label: 'میلیارد ریال', sort: 'amountBr', num: true, w: '8.5%', cell: (r) => <Num v={r.amountBr} d={1} /> },
  { label: 'تغییر مبلغ', num: true, w: '7.5%', cell: (r) => <Change v={r.amountChangePct} /> },
  { label: 'هزار دلار', sort: 'usdThousand', num: true, w: '7.5%', cell: (r) => <Num v={r.usdThousand} d={1} /> },
  { label: 'تغییر دلاری', num: true, w: '7.5%', cell: (r) => <Change v={r.usdChangePct} /> },
  {
    label: 'دلار / واحد',
    num: true,
    w: '6.5%',
    cell: (r) => <Num v={r.usdPerUnit} d={r.usdPerUnit != null && r.usdPerUnit < 1 ? 2 : 1} />,
  },
  {
    label: 'منبع',
    w: '4%',
    cell: () => (
      <span className="ind-muted" title="ردیف نمونه؛ جدول انرژی کدال هنوز بارگذاری نشده است">
        —
      </span>
    ),
  },
]

const sortRows = (rows: EnergyRecord[], sort: Sort) => {
  if (!sort) return rows
  const k = sort.dir === 'asc' ? 1 : -1
  return [...rows].sort(
    (a, b) =>
      (sort.key === 'name'
        ? a.name.localeCompare(b.name, 'fa') || b.month.localeCompare(a.month)
        : (a[sort.key] ?? -Infinity) - (b[sort.key] ?? -Infinity)) * k,
  )
}

/** «جدول جزئیات انرژی»: every carrier and month in the filter range */
export function EnergyDetailsTable({ ctx, energy }: { ctx: CardCtx; energy: EnergySet | null }) {
  const [year, setYear] = useState<number | null>(null)
  const [size, setSize] = useState<PageSize>(10)
  const [page, setPage] = useState(1)
  const [sort, setSort] = useState<Sort>(null)

  const years = useMemo(() => (energy && ctx.ds ? energyYearCounts(energy, ctx.ds, ctx.range) : []), [energy, ctx.ds, ctx.range])
  const yearOk = year != null && years.some((y) => y.year === year && y.n > 0) ? year : null
  const base = useMemo(() => (energy && ctx.ds ? energyRecords(energy, ctx.ds, ctx.range, yearOk) : []), [energy, ctx.ds, ctx.range, yearOk])
  const rows = sortRows(base, sort)
  const pages = Math.max(1, Math.ceil(rows.length / size))
  const p = Math.min(page, pages)
  const shown = rows.slice((p - 1) * size, p * size)
  const inRange = years.some((y) => y.n > 0)

  useEffect(() => setPage(1), [ctx.range.from, ctx.range.to])

  const toggleSort = (key: SortKey) => {
    const first: 'asc' | 'desc' = key === 'name' ? 'asc' : 'desc'
    setSort((s) => (s?.key !== key ? { key, dir: first } : s.dir === first ? { key, dir: first === 'asc' ? 'desc' : 'asc' } : null))
    setPage(1)
  }

  return (
    <Card
      ctx={ctx}
      state={stateOf(ctx, inRange)}
      emptyText="برای این بازه و سال داده‌ای ثبت نشده است."
      title="جدول جزئیات انرژی"
      subtitle="تغییرها نسبت به همان انرژی و همان واحد در ماه قبل"
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
