import { Clock } from 'lucide-react'
import { routeById } from '../config/routes'
import { LAST_COMPUTED } from '../data/overview'
import { DailySummary } from '../components/overview/DailySummary'
import { PageHeader } from '../components/PageHeader'
import { KpiStrip } from '../components/overview/KpiStrip'
import { HealthGauge } from '../components/overview/HealthGauge'
import { CoverageChain } from '../components/overview/CoverageChain'
import { ChokepointDonut } from '../components/overview/ChokepointDonut'
import { ShipmentStatus } from '../components/overview/ShipmentStatus'
import { AlertsPanel } from '../components/overview/AlertsPanel'
import { LowStockGrid } from '../components/overview/LowStockGrid'
import { CommodityTrends } from '../components/overview/CommodityTrends'
import '../components/overview/overview.css'
// After overview.css: the alerts × scenario styles refine its panel and option rules
import '../components/overview/alerts-flow.css'

/** «نمای کلی زنجیره» — composition follows the owner's reference (docs/04). */
export function OverviewPage() {
  const route = routeById('overview')
  return (
    <div className="overview">
      <PageHeader
        title={route.label}
        description="وضعیت امروز تأمین، موجودی و حمل، و هشدارهایی که اقدام می‌خواهند"
        meta={
          <span className="ov-meta">
            {/* RTL: first is on the right, so the summary sits to the right of «آخرین محاسبه» */}
            <DailySummary />
            <span className="ov-computed">
              <Clock size={14} aria-hidden="true" />
              <span>آخرین محاسبه</span>
              <time className="ov-computed__time">{LAST_COMPUTED}</time>
            </span>
          </span>
        }
      />
      <div className="ov-grid">
        <div className="ov-row ov-row--kpi">
          {/* KPI cards on the start side, the gauge at the end (left) */}
          <KpiStrip />
          <HealthGauge />
        </div>
        <CoverageChain />
        <div className="ov-row ov-row--half">
          <ChokepointDonut />
          <AlertsPanel />
        </div>
        {/* Low-stock table (two thirds) leads on the start side, shipments follow */}
        <div className="ov-row ov-row--third ov-row--third-rev">
          <LowStockGrid />
          <ShipmentStatus />
        </div>
        <CommodityTrends />
      </div>
    </div>
  )
}
