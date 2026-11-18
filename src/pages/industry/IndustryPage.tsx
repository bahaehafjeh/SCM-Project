import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import { ArrowLeftRight, ChartColumn, FileText, Package, Zap } from 'lucide-react'
import { routeById } from '../../config/routes'
import { PageHeader } from '../../components/PageHeader'
import { Panel } from '../../components/overview/Panel'
import { loadPurchases } from '../../lib/industry/data'
import { DEFAULT_RANGE, endMonth, indexRecords, reportVersionOf } from '../../lib/industry/derive'
import type { Dataset, Range, Unit } from '../../lib/industry/derive'
import { DATA_SYMBOL, FilterBar, SymbolInfo } from './FilterBar'
import type { Symbol } from './FilterBar'
import { KpiCards } from './KpiCards'
import { TrendCard } from './TrendCard'
import { CompositionCard } from './CompositionCard'
import { ShareCard } from './ShareCard'
import { SplitCard } from './SplitCard'
import { CumulativeCard } from './CumulativeCard'
import { RateCard } from './RateCard'
import { BridgeCard } from './BridgeCard'
import { DetailsTable } from './DetailsTable'
import { SalesKpis } from './SalesKpis'
import { YearCompareCard } from './YearCompareCard'
import { SalesTable } from './SalesTable'
import { SalesRateCard } from './SalesRateCard'
import { SalesDetailsTable } from './SalesDetailsTable'
import { FxRateCard } from './FxRateCard'
import { FxKpis } from './FxKpis'
import { FxDetailsTable } from './FxDetailsTable'
import { fxSeries } from '../../lib/industry/fx'
import { fxRecords } from '../../lib/industry/fxflows'
import { sampleSales } from '../../lib/industry/sales'
import type { CardCtx } from './parts'
import { AXIS } from '../../lib/industry/months'
import '../../components/overview/overview.css'
import './IndustryPage.css'

const TABS = [
  { label: 'خرید مواد اولیه', icon: Package },
  { label: 'تولید و فروش', icon: ChartColumn },
  { label: 'انرژی', icon: Zap },
  { label: 'منابع و مصارف ارزی', icon: ArrowLeftRight },
  { label: 'پوشش داده و کنترل کیفیت', icon: FileText },
]

/**
 * «داشبورد تحلیلی صنعت» › «خرید مواد اولیه» (page-prompt): monthly raw-material purchases of one
 * listed company from its Codal reports. One filter drives every card; «بازنشانی» returns the filter
 * and every card's own controls to their defaults.
 */
export function IndustryPage() {
  const route = routeById('trade-industry')
  const [ds, setDs] = useState<Dataset | null>(null)
  const [status, setStatus] = useState<CardCtx['status']>('loading')
  const [attempt, setAttempt] = useState(0)
  const [range, setRange] = useState<Range>(DEFAULT_RANGE)
  const [unit, setUnit] = useState<Unit>('usd')
  const [symbol, setSymbol] = useState<Symbol>(DATA_SYMBOL)
  const [pickerOpen, setPickerOpen] = useState(false)
  // Remounting the cards brings back each one's default controls
  const [generation, setGeneration] = useState(0)
  const [tab, setTab] = useState(0)
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])
  // Arrow keys move between tabs (RTL: left is next), Home/End jump to the ends
  const onTabKey = (e: ReactKeyboardEvent) => {
    const n = TABS.length
    const next = e.key === 'ArrowLeft' ? (tab + 1) % n : e.key === 'ArrowRight' ? (tab - 1 + n) % n : e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : null
    if (next == null) return
    e.preventDefault()
    setTab(next)
    tabRefs.current[next]?.focus()
  }

  useEffect(() => {
    const ac = new AbortController()
    setStatus('loading')
    loadPurchases(ac.signal).then(
      (rows) => {
        setDs(indexRecords(rows))
        setStatus('ready')
      },
      () => {
        if (!ac.signal.aborted) setStatus('error')
      },
    )
    return () => ac.abort()
  }, [attempt])

  // Only one symbol has data so far; any other reads an empty set (no figure is made up for it)
  const noSymbolData = symbol !== DATA_SYMBOL
  const data = useMemo(() => (ds && noSymbolData ? indexRecords([]) : ds), [ds, noSymbolData])
  const end = data ? endMonth(data, range) : null
  // Sales: sample rows until a sales file exists (labelled beside the symbol)
  const sales = useMemo(() => (data ? sampleSales(data) : null), [data])
  // Currency sources and uses: sample rows built on the purchase file and the sample export sales
  const fx = useMemo(() => (data ? fxSeries(data) : null), [data])
  const fxRecs = useMemo(() => (data && fx ? fxRecords(data, fx, (m) => sales?.byMonth.get(m)?.export ?? null) : []), [data, fx, sales])
  const onChangeRange = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
    setPickerOpen(true)
  }, [])
  const ctx: CardCtx = useMemo(() => ({ ds: data, status, range, unit, end, onRetry: () => setAttempt((a) => a + 1), onChangeRange, noSymbolData }), [data, status, range, unit, end, onChangeRange, noSymbolData])
  const reset = () => {
    setRange(DEFAULT_RANGE)
    setUnit('usd')
    setSymbol(DATA_SYMBOL)
    setPickerOpen(false)
    setGeneration((g) => g + 1)
  }

  return (
    <div className="ind-page">
      <PageHeader title={route.label} description="گزارش فعالیت ماهانه شرکت‌ها در کدال" />
      <FilterBar ds={data} symbol={symbol} onSymbol={setSymbol} range={range} onRange={setRange} unit={unit} onUnit={setUnit} onReset={reset} pickerOpen={pickerOpen} onPicker={setPickerOpen} />
      <SymbolInfo symbol={symbol} hasData={!noSymbolData} end={end} version={data ? reportVersionOf(data, end) : null} to={AXIS[range.to]} sampleNote={tab === 1 ? 'داده فروش' : tab === 3 ? 'نرخ ارز شرکت' : null} />

      <div className="ind-tabs" role="tablist" aria-label="بخش‌های داشبورد" onKeyDown={onTabKey}>
        {TABS.map((t, i) => (
          <button
            key={t.label}
            ref={(el) => {
              tabRefs.current[i] = el
            }}
            type="button"
            role="tab"
            id={`ind-tab-${i}`}
            aria-selected={i === tab}
            aria-controls="ind-tabpanel"
            tabIndex={i === tab ? 0 : -1}
            className="ind-tab"
            onClick={() => setTab(i)}
          >
            <t.icon size={16} aria-hidden="true" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 1 ? (
        <div key={generation} id="ind-tabpanel" className="ind-body" role="tabpanel" aria-labelledby="ind-tab-1">
          <SalesKpis ctx={ctx} sales={sales} />
          <YearCompareCard ctx={ctx} sales={sales} />
          <SalesRateCard ctx={ctx} sales={sales} />
          <SalesTable ctx={ctx} sales={sales} />
          <SalesDetailsTable ctx={ctx} sales={sales} />
        </div>
      ) : tab === 3 ? (
        <div key={generation} id="ind-tabpanel" className="ind-body" role="tabpanel" aria-labelledby="ind-tab-3">
          <FxKpis ctx={ctx} rows={fxRecs} fx={fx} />
          <FxRateCard ctx={ctx} fx={fx} />
          <FxDetailsTable ctx={ctx} records={fxRecs} />
        </div>
      ) : tab > 0 ? (
        <div id="ind-tabpanel" className="ind-body" role="tabpanel" aria-labelledby={`ind-tab-${tab}`}>
          <Panel title={TABS[tab].label} state="empty" emptyText="محتوای این بخش به‌زودی اضافه می‌شود.">
            {null}
          </Panel>
        </div>
      ) : (
        <div key={generation} id="ind-tabpanel" className="ind-body" role="tabpanel" aria-labelledby="ind-tab-0">
          <KpiCards ctx={ctx} />
          <TrendCard ctx={ctx} />
          <CompositionCard ctx={ctx} />
          <ShareCard ctx={ctx} />
          <div className="ind-two">
            <SplitCard ctx={ctx} />
            <CumulativeCard ctx={ctx} />
          </div>
          <RateCard ctx={ctx} />
          <BridgeCard ctx={ctx} />
          <DetailsTable ctx={ctx} />
        </div>
      )}
    </div>
  )
}
