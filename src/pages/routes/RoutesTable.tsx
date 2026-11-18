import { useMemo, useState } from 'react'
import type { KeyboardEvent, ReactNode } from 'react'
import { ArrowDown, ArrowUp, Download, Search } from 'lucide-react'
import { CHOKEPOINTS, COUNTRY_FA, MODE_LABEL, MONTHS, chokepointById } from '../../data/routes'
import type { TradeRoute } from '../../data/routes'
import { LEVEL_LABEL, cpValue, dependencyOf, filterRoutes, routeValue, shareOf } from '../../lib/routes/metrics'
import type { Filters } from '../../lib/routes/metrics'
import { fa, fa1 } from './format'

export type TableTab = 'cps' | 'routes' | 'countries' | 'goods'
type Cell = { text: string; sort: number | string; node?: ReactNode }
type Row = { key: string; cells: Cell[]; onPick?: () => void }
type Table = { caption: string; cols: string[]; rows: Row[] }

/** Every tab's rows, shared by the table and the CSV export (so the file is exactly the view) */
export function tableOf(tab: TableTab, f: Filters, pick: { cp: (id: string) => void; route: (id: string) => void }): Table {
  const routes = filterRoutes(f)
  if (tab === 'cps')
    return {
      caption: 'گلوگاه‌ها: ارزش عبوری، سهم از ارزش مسیردار، تجارت‌ها، مسیرها و میزان وابستگی',
      cols: ['#', 'گلوگاه', 'ارزش (م‌د)', 'سهم', 'تجارت‌ها', 'مسیرها', 'وابستگی', 'روند ۱۲ ماه'],
      rows: CHOKEPOINTS.map((c) => ({ c, v: cpValue(c, f) }))
        .filter((x) => x.v > 0)
        .sort((a, b) => b.v - a.v)
        .map(({ c, v }, i) => {
          const d = dependencyOf(c)
          return {
            key: c.id,
            onPick: () => pick.cp(c.id),
            cells: [
              { text: fa(i + 1), sort: i + 1 },
              { text: c.name, sort: c.name },
              { text: fa1(Math.round(v * 10) / 10), sort: v },
              { text: `${fa1(shareOf(c, f))}٪`, sort: shareOf(c, f) },
              { text: fa(c.trades), sort: c.trades },
              { text: fa(c.routes), sort: c.routes },
              { text: `${LEVEL_LABEL[d.level]} ${fa(d.score)}`, sort: d.score, node: <span className={`rchip rchip--${d.level}`}>{`${LEVEL_LABEL[d.level]} · ${fa(d.score)}`}</span> },
              { text: c.monthly.map((x) => x.toFixed(1)).join(' '), sort: c.monthly[MONTHS.length - 2], node: <Spark values={c.monthly} /> },
            ],
          }
        }),
    }
  if (tab === 'routes')
    return {
      caption: 'مسیرهای نمونه: بندر به بندر، کالای اصلی، روش حمل، ارزش، تجارت، گلوگاه‌های سر راه و ماه‌های فعال',
      cols: ['مسیر', 'کالای اصلی', 'روش حمل', 'ارزش (م‌د)', 'تجارت', 'گلوگاه‌های سر راه', 'ماه فعال'],
      rows: [...routes]
        .sort((a, b) => routeValue(b, f) - routeValue(a, f))
        .map((r: TradeRoute) => ({
          key: r.id,
          onPick: () => pick.route(r.id),
          cells: [
            { text: `${r.from.name} (${r.from.code}) ← ${r.to.name} (${r.to.code})`, sort: r.from.name, node: <span title={`${r.from.code} ← ${r.to.code}`}>{`${r.from.name} ← ${r.to.name}`}</span> },
            { text: r.goods[0].name, sort: r.goods[0].name },
            { text: `${MODE_LABEL[r.mode]}${r.modeEstimated ? ' (برآورد)' : ''}`, sort: r.mode },
            { text: fa1(Math.round(routeValue(r, f) * 100) / 100), sort: routeValue(r, f) },
            { text: fa(r.trades), sort: r.trades },
            { text: r.chokepoints.map((x) => chokepointById(x)!.short).join('، ') || '—', sort: r.chokepoints.length },
            { text: `${fa(r.activeMonths)} از ${fa(MONTHS.length)}`, sort: r.activeMonths },
          ],
        })),
    }
  if (tab === 'countries') {
    const m = new Map<string, { out: number; in: number }>()
    for (const r of routes) {
      const v = routeValue(r, f)
      const o = m.get(r.originCountry) ?? { out: 0, in: 0 }
      o.out += v
      m.set(r.originCountry, o)
      const d = m.get(r.destCountry) ?? { out: 0, in: 0 }
      d.in += v
      m.set(r.destCountry, d)
    }
    return {
      caption: 'کشورهای مسیرهای نمونه: ارزش صادرات به‌عنوان مبدأ و واردات به‌عنوان مقصد',
      cols: ['کشور', 'به‌عنوان مبدأ (م‌د)', 'به‌عنوان مقصد (م‌د)'],
      rows: [...m.entries()]
        .sort((a, b) => b[1].out + b[1].in - (a[1].out + a[1].in))
        .map(([c, v]) => ({
          key: c,
          cells: [
            { text: COUNTRY_FA[c] ?? c, sort: COUNTRY_FA[c] ?? c },
            { text: v.out ? fa1(Math.round(v.out * 10) / 10) : '—', sort: v.out },
            { text: v.in ? fa1(Math.round(v.in * 10) / 10) : '—', sort: v.in },
          ],
        })),
    }
  }
  const g = new Map<string, { value: number; routes: number }>()
  for (const r of routes) {
    const scale = routeValue(r, f) / r.value
    for (const x of r.goods) {
      const e = g.get(x.name) ?? { value: 0, routes: 0 }
      e.value += x.value * scale
      e.routes += 1
      g.set(x.name, e)
    }
  }
  return {
    caption: 'کالاهای مسیرهای نمونه: ارزش و تعداد مسیر',
    cols: ['کالا', 'ارزش (م‌د)', 'مسیرها'],
    rows: [...g.entries()]
      .sort((a, b) => b[1].value - a[1].value)
      .map(([n, v]) => ({
        key: n,
        cells: [
          { text: n, sort: n },
          { text: fa1(Math.round(v.value * 10) / 10), sort: v.value },
          { text: fa(v.routes), sort: v.routes },
        ],
      })),
  }
}

/** CSV of a tab, with a BOM so spreadsheet programs read the Persian text */
export function downloadCsv(tab: TableTab, f: Filters) {
  const t = tableOf(tab, f, { cp: () => {}, route: () => {} })
  const esc = (s: string) => `"${s.replace(/"/g, '""')}"`
  const lines = [t.cols.map(esc).join(','), ...t.rows.map((r) => r.cells.map((c) => esc(c.text)).join(','))]
  const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `routes-${tab}.csv`
  a.click()
  URL.revokeObjectURL(a.href)
}

function Spark({ values }: { values: number[] }) {
  const w = 72
  const h = 20
  const max = Math.max(...values)
  const pts = values.map((v, i) => [(i / (values.length - 1)) * w, h - (v / max) * (h - 2) - 1])
  const solid = pts
    .slice(0, -1)
    .map((p) => p.join(','))
    .join(' ')
  const last = pts
    .slice(-2)
    .map((p) => p.join(','))
    .join(' ')
  return (
    <svg className="rspark" width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
      <polyline points={solid} />
      {/* The incomplete last month, dashed */}
      <polyline points={last} strokeDasharray="2 2" />
    </svg>
  )
}

const TABS: { key: TableTab; label: (f: Filters) => string }[] = [
  { key: 'cps', label: (f) => `گلوگاه‌ها (${fa(CHOKEPOINTS.filter((c) => cpValue(c, f) > 0).length)})` },
  { key: 'routes', label: (f) => `مسیرها (${fa(filterRoutes(f).length)})` },
  { key: 'countries', label: () => 'کشورها' },
  { key: 'goods', label: () => 'کالاها' },
]

/**
 * The table view (routes-map-prompt §11): the map's full equivalent for screen readers. Sorting by a
 * header, search, 25 rows a page, and a CSV of exactly this view. A row selects; the view stays.
 */
export function RoutesTable({ f, tab, onTab, onCp, onRoute }: { f: Filters; tab: TableTab; onTab: (t: TableTab) => void; onCp: (id: string) => void; onRoute: (id: string) => void }) {
  const [q, setQ] = useState('')
  const [sort, setSort] = useState<{ col: number; dir: 1 | -1 } | null>(null)
  const [page, setPage] = useState(0)
  const t = useMemo(() => tableOf(tab, f, { cp: onCp, route: onRoute }), [tab, f, onCp, onRoute])
  const rows = useMemo(() => {
    const w = q.trim()
    const filtered = w ? t.rows.filter((r) => r.cells.some((c) => c.text.includes(w))) : t.rows
    if (!sort) return filtered
    return [...filtered].sort((a, b) => {
      const x = a.cells[sort.col].sort
      const y = b.cells[sort.col].sort
      return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'fa')) * sort.dir
    })
  }, [t, q, sort])
  const pages = Math.max(1, Math.ceil(rows.length / 25))
  const shown = rows.slice(page * 25, page * 25 + 25)
  const onKey = (e: KeyboardEvent) => {
    const i = TABS.findIndex((x) => x.key === tab)
    const to = e.key === 'ArrowLeft' ? i + 1 : e.key === 'ArrowRight' ? i - 1 : null
    if (to === null) return
    e.preventDefault()
    onTab(TABS[(to + TABS.length) % TABS.length].key)
  }
  return (
    <div className="rtable">
      <div className="rtable__bar">
        <div className="rtabs" role="tablist" aria-label="جدول" onKeyDown={onKey}>
          {TABS.map((x) => (
            <button key={x.key} type="button" role="tab" aria-selected={tab === x.key} tabIndex={tab === x.key ? 0 : -1} onClick={() => (onTab(x.key), setPage(0), setSort(null))}>
              {x.label(f)}
            </button>
          ))}
        </div>
        <label className="rsearch">
          <Search size={14} aria-hidden="true" />
          <input value={q} onChange={(e) => (setQ(e.target.value), setPage(0))} placeholder="جستجو…" aria-label="جستجو در جدول" />
        </label>
        <button type="button" className="abtn abtn--secondary abtn--sm" onClick={() => downloadCsv(tab, f)}>
          <Download size={14} aria-hidden="true" />
          CSV
        </button>
      </div>
      <div className="rtable__scroll">
        <table>
          <caption className="visually-hidden">{t.caption}</caption>
          <thead>
            <tr>
              {t.cols.map((c, i) => (
                <th key={c} scope="col" aria-sort={sort?.col === i ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}>
                  <button type="button" onClick={() => setSort(sort?.col === i ? { col: i, dir: sort.dir === 1 ? -1 : 1 } : { col: i, dir: -1 })}>
                    {c}
                    {sort?.col === i && (sort.dir === 1 ? <ArrowUp size={12} aria-hidden="true" /> : <ArrowDown size={12} aria-hidden="true" />)}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.key} className={r.onPick ? 'is-pick' : ''} onClick={r.onPick} tabIndex={r.onPick ? 0 : undefined} onKeyDown={(e) => r.onPick && (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), r.onPick())}>
                {r.cells.map((c, i) =>
                  (i === 1 && tab === 'cps') || (i === 0 && tab !== 'cps') ? (
                    <th key={i} scope="row">
                      {c.node ?? c.text}
                    </th>
                  ) : (
                    <td key={i}>{c.node ?? c.text}</td>
                  ),
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {!shown.length && <p className="rlimit">ردیفی با این جستجو نیست.</p>}
      </div>
      <div className="rtable__foot">
        <span>سهم = ارزش عبوری ÷ ارزش مسیردار؛ جمع ستون ۱۰۰ نمی‌شود.</span>
        {pages > 1 && (
          <span className="rtable__pages">
            <button type="button" className="ov-link" disabled={page === 0} onClick={() => setPage(page - 1)}>
              قبلی
            </button>
            {fa(page + 1)} از {fa(pages)}
            <button type="button" className="ov-link" disabled={page >= pages - 1} onClick={() => setPage(page + 1)}>
              بعدی
            </button>
          </span>
        )}
      </div>
    </div>
  )
}
