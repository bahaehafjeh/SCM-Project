import { useEffect, useMemo, useState } from 'react'
import { ArrowUpLeft, ChartLine, ChevronLeft, Download, Table2, X } from 'lucide-react'
import type { Dataset } from '../../lib/industry/derive'
import {
  COVERAGE_STATUSES,
  COVERAGE_STATUS_MAP,
  COVERAGE_TABLES,
  COVERAGE_YEARS,
  buildCoverageModel,
  cellKey,
} from '../../lib/industry/coverage'
import type {
  CoverageMonthCell,
  CoverageStatus,
  CoverageTableId,
  CoverageYearCell,
} from '../../lib/industry/coverage'
import { fa } from '../../lib/industry/format'
import { faDigits } from '../../lib/industry/months'
import { DATA_SYMBOL, withSep } from './FilterBar'
import type { Symbol } from './FilterBar'

type View = 'chart' | 'table'

const VIEWS = [
  { value: 'chart', label: 'نمودار', icon: ChartLine },
  { value: 'table', label: 'جدول', icon: Table2 },
] as const

const TABLE_TO_TAB: Record<CoverageTableId, number> = {
  purchases: 0,
  sales: 1,
  energy: 2,
  fx: 3,
}

const TABLE_LABEL_MAP = Object.fromEntries(COVERAGE_TABLES.map((t) => [t.id, t.label])) as Record<CoverageTableId, string>

function downloadCoverageCsv(
  rows: {
    shortName: string
    tableLabel: string
    counts: Record<CoverageStatus, number>
  }[],
) {
  const esc = (v: string | number) => {
    const s = String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const headers = ['نماد', 'جدول', ...COVERAGE_STATUSES.map((s) => s.label)]
  const lines = [
    headers.map(esc).join(','),
    ...rows.map((r) =>
      [r.shortName, r.tableLabel, ...COVERAGE_STATUSES.map((s) => r.counts[s.id])].map(esc).join(','),
    ),
  ]
  const blob = new Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'codal-coverage-status.csv'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

interface Props {
  ds: Dataset | null
  onJumpToTab?: (tabIndex: number, symbol: Symbol) => void
}

export function DataCoveragePage({ ds, onJumpToTab }: Props) {
  const model = useMemo(() => buildCoverageModel(ds), [ds])
  const [view, setView] = useState<View>('chart')
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null)
  const [hoverLegend, setHoverLegend] = useState<CoverageStatus | null>(null)
  const [hoveredKey, setHoveredKey] = useState<string | null>(null)
  const [nonExtOpen, setNonExtOpen] = useState(false)

  const selectedCell: CoverageYearCell | null = selectedKey ? model.byKey.get(selectedKey) ?? null : null
  const selectedTable = selectedCell ? model.tables.find((t) => t.table.id === selectedCell.tableId)?.table ?? null : null

  const activeMonthCell: CoverageMonthCell | null = useMemo(() => {
    if (!selectedCell || !selectedMonth) return null
    return selectedCell.months.find((m) => m.month === selectedMonth) ?? null
  }, [selectedCell, selectedMonth])

  useEffect(() => {
    if (!selectedCell) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedKey(null)
        setSelectedMonth(null)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [selectedCell])

  const { summary } = model

  const toggleYearCell = (key: string) => {
    if (selectedKey === key) {
      setSelectedKey(null)
      setSelectedMonth(null)
      return
    }
    setSelectedKey(key)
    const yc = model.byKey.get(key)
    // Pre-select the first flagged month if one exists in this year, otherwise null until user clicks
    const flagged = yc?.months.find((m) => m.failedChecks > 0 || m.status === 'needs_review')
    setSelectedMonth(flagged ? flagged.month : null)
  }

  return (
    <div className="ind-cov-page">
      {/* 4 KPI cards */}
      <section className="ind-kpis ind-cov-kpis" aria-label="شاخص‌های کلیدی پوشش داده و کنترل کیفیت">
        <article className="ind-kpi">
          <p className="ind-kpi__label">نمادها</p>
          <p className="ind-kpi__value">
            <span className="ind-kpi__num n">{fa(summary.symbolCount)}</span>
          </p>
          <p className="ind-kpi__caption">
            <span className="n">{fa(summary.monthCount)}</span> ماه ·{' '}
            <span className="n">
              {faDigits(summary.startMonth)} تا {faDigits(summary.endMonth)}
            </span>
          </p>
        </article>

        <article className="ind-kpi">
          <p className="ind-kpi__label">خانه‌های استخراج‌شده</p>
          <p className="ind-kpi__value">
            <span className="ind-kpi__num n">{fa(summary.extractedPct, 1)}</span>
            <span className="ind-kpi__unit">٪</span>
          </p>
          <div className="ind-cov-bar" aria-hidden="true">
            <span style={{ width: `${Math.min(100, summary.extractedPct)}%` }} />
          </div>
          <p className="ind-kpi__caption">
            <span className="n">{fa(summary.extractedCells)}</span> از{' '}
            <span className="n">{fa(summary.totalCells)}</span> خانه نماد × ماه × جدول
          </p>
        </article>

        <article className="ind-kpi">
          <p className="ind-kpi__label">گزارش‌ها</p>
          <p className="ind-kpi__value">
            <span className="ind-kpi__num n">{fa(summary.totalReports)}</span>
          </p>
          <p className="ind-kpi__caption">
            <span className="n">{fa(summary.multiVersionMonths)}</span> ماه با بیش از یک نسخه
          </p>
        </article>

        <article className="ind-kpi">
          <p className="ind-kpi__label">کنترل‌های ناموفق ذخیره‌شده</p>
          <p className="ind-kpi__value">
            <span className="ind-kpi__num n">{fa(summary.failedChecks)}</span>
          </p>
          <p className="ind-kpi__caption">
            <span className="n">{fa(summary.discontinuities)}</span> ناپیوستگی در مقایسه‌های قابل انجام
          </p>
        </article>
      </section>

      {/* Transparent legend + chart/table switch matching other dashboard sections */}
      <div className="ind-cov-toolbar" role="region" aria-label="راهنمای وضعیت و انتخاب نما">
        <ul className="ind-cov-legend">
          {COVERAGE_STATUSES.map((st) => {
            const count = summary.statusCounts[st.id]
            const active = hoverLegend === st.id
            return (
              <li
                key={st.id}
                className={active ? 'is-hot' : undefined}
                onMouseEnter={() => view === 'chart' && setHoverLegend(st.id)}
                onMouseLeave={() => setHoverLegend(null)}
              >
                <span className="ind-cov-swatch" style={{ background: st.color }} aria-hidden="true" />
                <span>{st.label}</span>
                <span className="ind-cov-legend__count n">({fa(count)})</span>
              </li>
            )
          })}
        </ul>

        <div className="seg seg--compact ind-iconseg" role="group" aria-label="شیوه‌ی نمایش">
          {VIEWS.map((v) => (
            <button
              key={v.value}
              type="button"
              aria-pressed={view === v.value}
              aria-label={v.label}
              title={v.label}
              onClick={() => setView(v.value)}
            >
              <v.icon size={16} aria-hidden="true" />
            </button>
          ))}
        </div>
      </div>

      {view === 'chart' ? (
        /* Single-glance 2×2 matrix layout + left-side monthly date grid & detail box */
        <div className={`ind-cov-layout ${selectedCell ? 'is-open' : ''}`}>
          <div className="ind-cov-matrices">
            {model.tables.map(({ table, rows, extractedCount, totalCells }) => (
              <section key={table.id} className="ov-panel ind-card ind-cov-box" aria-labelledby={`cov-tbl-${table.id}`}>
                <header className="ind-cov-box__head">
                  <h2 id={`cov-tbl-${table.id}`} className="ind-cov-box__title">
                    {table.label}
                  </h2>
                  <span className="ind-cov-box__ratio n">
                    {fa(extractedCount)}/{fa(totalCells)}
                  </span>
                </header>

                <div className="ind-cov-scroll">
                  <div className="ind-cov-grid" role="grid" aria-label={`ماتریس پوشش سالانه ${table.label}`}>
                    <div className="ind-cov-grid__row ind-cov-grid__row--head" role="row">
                      <div className="ind-cov-grid__symhead" role="columnheader">
                        نماد
                      </div>
                      {COVERAGE_YEARS.map((y) => (
                        <div key={y} className="ind-cov-grid__yhead n" role="columnheader">
                          {faDigits(String(y))}
                        </div>
                      ))}
                    </div>

                    {rows.map((row) => (
                      <div key={row.symbol} className="ind-cov-grid__row" role="row">
                        <div className="ind-cov-grid__sym" role="rowheader" title={row.symbol}>
                          <span className="ind-cov-grid__symcode">{row.shortName}</span>
                        </div>

                        {row.years.map((yc) => {
                          const key = cellKey(table.id, row.symbol, yc.year)
                          const isSelected = selectedKey === key
                          const st = COVERAGE_STATUS_MAP[yc.dominantStatus]
                          const dimmed =
                            hoverLegend != null &&
                            yc.dominantStatus !== hoverLegend &&
                            yc.statusCounts[hoverLegend] === 0
                          const hasNote = yc.failedChecks > 0 || (yc.dominantStatus === 'extracted' && yc.statusCounts.needs_review > 0)
                          const showTip = hoveredKey === key

                          return (
                            <div key={yc.year} className="ind-cov-grid__cellwrap" role="gridcell">
                              <button
                                type="button"
                                className={`ind-cov-cell ${isSelected ? 'is-selected' : ''} ${dimmed ? 'is-dim' : ''}`}
                                style={{ backgroundColor: st.color }}
                                aria-pressed={isSelected}
                                aria-label={`${table.label}، ${row.shortName}، سال ${faDigits(String(yc.year))}: وضعیت غالب ${st.label} (${fa(yc.extractedCount)} از ${fa(yc.totalMonths)} ماه استخراج شده)`}
                                onClick={() => toggleYearCell(key)}
                                onMouseEnter={() => setHoveredKey(key)}
                                onMouseLeave={() => setHoveredKey((cur) => (cur === key ? null : cur))}
                                onFocus={() => setHoveredKey(key)}
                                onBlur={() => setHoveredKey((cur) => (cur === key ? null : cur))}
                              >
                                {hasNote && (
                                  <span
                                    className={`ind-cov-cell__mark ${yc.failedChecks > 0 ? 'is-fail' : 'is-rev'}`}
                                    aria-hidden="true"
                                  />
                                )}
                              </button>

                              {showTip && <YearHoverTip tableLabel={table.label} cell={yc} />}
                            </div>
                          )
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            ))}
          </div>

          {selectedCell && selectedTable && (
            <aside
              className="ov-panel ind-card ind-cov-inspector"
              aria-label={`ماه‌های ${selectedTable.label}، ${selectedCell.symbol}، سال ${faDigits(String(selectedCell.year))}`}
            >
              <header className="ind-cov-inspector__head">
                <div>
                  <p className="ind-cov-inspector__kicker">
                    <span>{selectedTable.label}</span>
                    <span aria-hidden="true">·</span>
                    <span>{withSep(selectedCell.symbol)}</span>
                  </p>
                  <h2 className="ind-cov-inspector__title">
                    سال <span className="n">{faDigits(String(selectedCell.year))}</span>
                  </h2>
                </div>
                <button
                  type="button"
                  className="ind-dq-close"
                  aria-label="بستن پنل جزئیات سال"
                  onClick={() => {
                    setSelectedKey(null)
                    setSelectedMonth(null)
                  }}
                >
                  <X size={16} aria-hidden="true" />
                </button>
              </header>

              {/* Colored month tiles showing ONLY the date inside each tile */}
              <div className="ind-cov-mgrid" role="group" aria-label={`ماه‌های سال ${faDigits(String(selectedCell.year))}`}>
                {selectedCell.months.map((m) => {
                  const st = COVERAGE_STATUS_MAP[m.status]
                  const isOn = selectedMonth === m.month
                  return (
                    <button
                      key={m.month}
                      type="button"
                      className={`ind-cov-mtile ${isOn ? 'is-selected' : ''}`}
                      style={{
                        backgroundColor: st.color,
                        color: st.textColor,
                      }}
                      aria-pressed={isOn}
                      aria-label={`${m.monthLabel} — ${st.label}`}
                      onClick={() => setSelectedMonth((cur) => (cur === m.month ? null : m.month))}
                    >
                      <span className="n">{faDigits(m.month)}</span>
                      {m.failedChecks > 0 && <span className="ind-cov-mtile__dot" aria-hidden="true" />}
                    </button>
                  )
                })}
              </div>

              {/* Detail panel revealed when clicking a month tile */}
              {activeMonthCell && (
                <div className="ind-cov-mdetail" role="region" aria-label="جزئیات ماه انتخاب‌شده">
                  <div className="ind-cov-mdetail__head">
                    <span>{activeMonthCell.shortName}</span>
                    <span aria-hidden="true">·</span>
                    <span className="n">{faDigits(activeMonthCell.month)}</span>
                    <span aria-hidden="true">·</span>
                    <span
                      className="ind-cov-mdetail__status"
                      style={{
                        color:
                          activeMonthCell.status === 'extracted'
                            ? 'var(--raw-emerald-700)'
                            : activeMonthCell.status === 'needs_review'
                              ? 'var(--raw-amber-700)'
                              : activeMonthCell.status === 'no_table'
                                ? 'var(--raw-orange-700)'
                                : activeMonthCell.status === 'failed'
                                  ? 'var(--raw-red-600)'
                                  : 'var(--color-muted-foreground)',
                      }}
                    >
                      {COVERAGE_STATUS_MAP[activeMonthCell.status].label}
                    </span>
                  </div>

                  {activeMonthCell.checkDetail ? (
                    <p className="ind-cov-mdetail__log" dir="auto">
                      {activeMonthCell.checkDetail}
                    </p>
                  ) : activeMonthCell.note ? (
                    <p className="ind-cov-mdetail__note">{activeMonthCell.note}</p>
                  ) : (
                    <p className="ind-cov-mdetail__note">
                      نسخه {activeMonthCell.versionLabel}
                      {activeMonthCell.rowCount != null ? ` · ${fa(activeMonthCell.rowCount)} ردیف استخراج‌شده` : ''}
                    </p>
                  )}

                  <div className="ind-cov-mdetail__foot">
                    <a
                      className="ind-link"
                      href={activeMonthCell.codalUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      گزارش کدال ↗
                    </a>

                    {selectedCell.symbol === DATA_SYMBOL && onJumpToTab && (
                      <button
                        type="button"
                        className="ind-cov-jumplink"
                        onClick={() => onJumpToTab(TABLE_TO_TAB[selectedCell.tableId], selectedCell.symbol)}
                      >
                        مشاهده در داشبورد
                        <ArrowUpLeft size={13} aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </aside>
          )}
        </div>
      ) : (
        /* Table View («وضعیت هر جدول») matching the reference table layout */
        <section className="ov-panel ind-card ind-cov-tcard" aria-labelledby="cov-table-title">
          <header className="ind-cov-tcard__head">
            <div>
              <h2 id="cov-table-title" className="ind-cov-tcard__title">
                وضعیت هر جدول
              </h2>
              <p className="ind-cov-tcard__sub">تعداد ماه‌ها در هر وضعیت؛ شامل ماه‌های بدون گزارش</p>
            </div>
            <div className="ind-cov-tcard__tools">
              <span className="ind-cov-tcard__rows n">{fa(model.tableSummaryRows.length)} ردیف</span>
              <button
                type="button"
                className="ind-btn ind-btn--sm"
                onClick={() => downloadCoverageCsv(model.tableSummaryRows)}
              >
                <Download size={14} aria-hidden="true" />
                دریافت همه ردیف‌ها CSV
              </button>
            </div>
          </header>

          <div className="ind-table ind-cov-tcard__wrap">
            <table>
              <thead>
                <tr>
                  <th scope="col">نماد</th>
                  <th scope="col">جدول</th>
                  {COVERAGE_STATUSES.map((s) => (
                    <th key={s.id} scope="col" className="ind-num">
                      {s.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {model.tableSummaryRows.map((row) => (
                  <tr key={`${row.symbol}|${row.tableId}`}>
                    <td>{row.shortName}</td>
                    <td>{row.tableLabel}</td>
                    {COVERAGE_STATUSES.map((s) => (
                      <td key={s.id} className="ind-num">
                        <span className="n">{fa(row.counts[s.id])}</span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="ind-cov-nonext">
            <button
              type="button"
              className="ind-cov-nonext__btn"
              aria-expanded={nonExtOpen}
              onClick={() => setNonExtOpen((v) => !v)}
            >
              <ChevronLeft size={14} className={nonExtOpen ? 'is-open' : undefined} aria-hidden="true" />
              <span>
                خانه‌های غیر از استخراج‌شده (<span className="n">{fa(model.nonExtractedCells.length)}</span>)
              </span>
            </button>

            {nonExtOpen && (
              <div className="ind-table ind-table--scroll ind-cov-nonext__list">
                <table>
                  <thead>
                    <tr>
                      <th scope="col">نماد</th>
                      <th scope="col">جدول</th>
                      <th scope="col">ماه</th>
                      <th scope="col">وضعیت</th>
                      <th scope="col">توضیحات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {model.nonExtractedCells.map((c) => {
                      const st = COVERAGE_STATUS_MAP[c.status]
                      return (
                        <tr key={`${c.tableId}|${c.symbol}|${c.month}`}>
                          <td>{c.shortName}</td>
                          <td>{TABLE_LABEL_MAP[c.tableId]}</td>
                          <td>
                            <span className="n">{faDigits(c.month)}</span>
                          </td>
                          <td>
                            <span className="ind-cov-nonext__tag">
                              <span className="ind-cov-swatch ind-cov-swatch--sm" style={{ background: st.color }} aria-hidden="true" />
                              {st.label}
                            </span>
                          </td>
                          <td>{c.checkDetail ?? c.note ?? '—'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  )
}

function YearHoverTip({ tableLabel, cell }: { tableLabel: string; cell: CoverageYearCell }) {
  return (
    <div className="ind-cov-tip" role="tooltip">
      <div className="ind-cov-tip__head">
        <strong>
          {cell.symbol.split(' — ')[0]} · <span className="n">{faDigits(String(cell.year))}</span>
        </strong>
        <span>{tableLabel}</span>
      </div>
      <div className="ind-cov-tip__list">
        {COVERAGE_STATUSES.filter((s) => cell.statusCounts[s.id] > 0).map((s) => (
          <div key={s.id} className="ind-cov-tip__row">
            <span className="ind-cov-tip__name">
              <span className="ind-cov-swatch ind-cov-swatch--sm" style={{ background: s.color }} aria-hidden="true" />
              {s.label}
            </span>
            <strong className="n">{fa(cell.statusCounts[s.id])} ماه</strong>
          </div>
        ))}
      </div>
    </div>
  )
}
