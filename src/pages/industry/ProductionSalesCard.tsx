import { useEffect, useId, useRef, useState } from 'react'
import { MousePointerClick, X } from 'lucide-react'
import { Select } from '../../components/ui/Select'
import { fa } from '../../lib/industry/format'
import { faDigits, monthOf } from '../../lib/industry/months'
import { PROD_SALES_PRODUCTS, productionVsSalesRows } from '../../lib/industry/sales'
import type { ProdSalesRow, SalesSet } from '../../lib/industry/sales'
import { Card, Tip, barPath, stateOf } from './parts'
import type { CardCtx } from './parts'

const H = 300
const POP_W = 430
const POP_H = 190
const PAD_X = 20
const PAD_TOP = 20
const PAD_BOT = 44
const SEG_GAP = 4
const COLOR_PROD = 'var(--raw-indigo-600)'
const COLOR_SALES = 'var(--raw-teal-500)'

type HoverSeries = 'production' | 'sales' | null

interface BarBox {
  idx: number
  row: ProdSalesRow
  cx: number
  xL: number
  xR: number
  yProdTop: number
  yTotalTop: number
}

/** Smooth horizontal-tangent path across top of bars and S-curve between bars */
function buildTopPath(pts: { xL: number; xR: number; y: number }[]) {
  if (!pts.length) return ''
  const segs: string[] = [`M${pts[0].xL} ${pts[0].y}`, `L${pts[0].xR} ${pts[0].y}`]
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i]
    const b = pts[i + 1]
    const mid = (a.xR + b.xL) / 2
    segs.push(`C${mid} ${a.y}, ${mid} ${b.y}, ${b.xL} ${b.y}`)
    segs.push(`L${b.xR} ${b.y}`)
  }
  return segs.join(' ')
}

/** Closed area path between upperPts (left->right) and lowerPts (right->left) */
function buildBandPath(upperPts: { xL: number; xR: number; y: number }[], lowerPts: { xL: number; xR: number; y: number }[]) {
  if (!upperPts.length || !lowerPts.length) return ''
  const top = buildTopPath(upperPts)
  const last = lowerPts[lowerPts.length - 1]
  const back: string[] = [`L${last.xR} ${last.y}`, `L${last.xL} ${last.y}`]
  for (let i = lowerPts.length - 2; i >= 0; i--) {
    const b = lowerPts[i + 1]
    const a = lowerPts[i]
    const mid = (a.xR + b.xL) / 2
    back.push(`C${mid} ${b.y}, ${mid} ${a.y}, ${a.xR} ${a.y}`)
    back.push(`L${a.xL} ${a.y}`)
  }
  back.push('Z')
  return `${top} ${back.join(' ')}`
}

/** Reusable SVG ribbon+bar visualizer for both the main card and the yearly drilldown modal */
function ProdSalesSvg({
  rows,
  width,
  height,
  padX,
  padTop,
  padBot,
  hoverSeries,
  byYear = false,
  selectedYear = null,
  onSelectYear,
  compactLabels = false,
  ariaLabel,
}: {
  rows: ProdSalesRow[]
  width: number
  height: number
  padX: number
  padTop: number
  padBot: number
  hoverSeries: HoverSeries
  byYear?: boolean
  selectedYear?: number | null
  onSelectYear?: (row: ProdSalesRow, cx: number) => void
  compactLabels?: boolean
  ariaLabel: string
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)
  const clipId = useId().replace(/:/g, '')

  const plotH = height - padTop - padBot
  const baseY = padTop + plotH
  const slotW = rows.length ? (width - padX * 2) / rows.length : 100
  const barW = Math.min(68, Math.max(18, slotW * 0.56))
  const maxVal = Math.max(1, ...rows.map((r) => r.production + r.sales))
  const pxPerUnit = plotH / (maxVal * 1.04)

  const boxes: BarBox[] = rows.map((row, idx) => {
    const cx = padX + slotW * (idx + 0.5)
    const xL = cx - barW / 2
    const xR = cx + barW / 2
    const total = row.production + row.sales
    const yProdTop = baseY - row.production * pxPerUnit
    const yTotalTop = baseY - total * pxPerUnit
    return { idx, row, cx, xL, xR, yProdTop, yTotalTop }
  })

  const prodTopPts = boxes.map((b) => ({ xL: b.xL, xR: b.xR, y: b.yProdTop }))
  const totalTopPts = boxes.map((b) => ({ xL: b.xL, xR: b.xR, y: b.yTotalTop }))
  const basePts = boxes.map((b) => ({ xL: b.xL, xR: b.xR, y: baseY }))

  const prodRibbonPath = buildBandPath(prodTopPts, basePts)
  const salesRibbonPath = buildBandPath(totalTopPts, prodTopPts)

  const colOpacity = (idx: number, series: 'production' | 'sales') => {
    if (hoverSeries && hoverSeries !== series) return 0.22
    if (hoveredIdx != null && hoveredIdx !== idx) return 0.48
    return 1
  }

  const prodRibbonOpacity = hoverSeries === 'sales' ? 0.25 : 1
  const salesRibbonOpacity = hoverSeries === 'production' ? 0.25 : 1
  const activeBox = hoveredIdx != null ? boxes[hoveredIdx] ?? null : null
  const showInnerText = barW >= 34

  return (
    <div className="ind-ps-wrap" onMouseLeave={() => setHoveredIdx(null)}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="ind-ps-svg" role="img" aria-label={ariaLabel}>
        <defs>
          <clipPath id={`${clipId}-plot`}>
            <rect x={0} y={0} width={width} height={baseY} />
          </clipPath>
        </defs>

        <g clipPath={`url(#${clipId}-plot)`}>
          {prodRibbonPath && <path d={prodRibbonPath} className="ind-ps-ribbon ind-ps-ribbon--prod" style={{ opacity: prodRibbonOpacity }} />}
          {salesRibbonPath && <path d={salesRibbonPath} className="ind-ps-ribbon ind-ps-ribbon--sales" style={{ opacity: salesRibbonOpacity }} />}
        </g>

        <line x1={padX - 6} x2={width - padX + 6} y1={baseY} y2={baseY} stroke="var(--color-border)" strokeWidth={1} />

        {boxes.map((b) => {
          const { idx, row, cx, xL, yProdTop, yTotalTop } = b
          const hasSales = row.sales > 0
          const hasProd = row.production > 0
          const gap = hasSales && hasProd ? SEG_GAP : 0
          const prodY0 = yProdTop + gap / 2
          const prodH = Math.max(0, baseY - prodY0)
          const salesY0 = yTotalTop
          const salesY1 = Math.max(salesY0, yProdTop - gap / 2)
          const salesH = Math.max(0, salesY1 - salesY0)
          const rProd = Math.min(6, barW / 4, prodH / 2)
          const rSales = Math.min(6, barW / 4, salesH / 2)
          const isHot = hoveredIdx === idx
          const isSelected = byYear && selectedYear === row.year

          return (
            <g
              key={row.key}
              className={`ind-ps-col ${isHot ? 'is-hot' : ''}`}
              tabIndex={0}
              role="button"
              aria-label={`${row.label}: تولید ${fa(row.production, 0)} تن، فروش ${fa(row.sales, 0)} تن${byYear ? '؛ کلیک برای دیدن ماه‌ها' : ''}`}
              onMouseEnter={() => setHoveredIdx(idx)}
              onFocus={() => setHoveredIdx(idx)}
              onBlur={() => setHoveredIdx(null)}
              onClick={() => byYear && onSelectYear?.(row, cx)}
              onKeyDown={(e) => {
                if (byYear && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault()
                  onSelectYear?.(row, cx)
                }
              }}
            >
              <rect
                x={cx - slotW * 0.44}
                y={padTop - 8}
                width={slotW * 0.88}
                height={plotH + 12}
                rx={10}
                fill={isSelected ? 'var(--brand-shades-50)' : 'var(--brand-shades-500)'}
                fillOpacity={isSelected ? 0.7 : isHot ? 0.06 : 0}
                stroke={isSelected ? 'var(--brand-shades-600)' : isHot && byYear ? 'var(--brand-shades-300)' : 'none'}
                strokeWidth={isSelected ? 1.5 : 1}
                strokeDasharray={isSelected ? undefined : '4 3'}
                style={{ transition: 'fill-opacity 150ms ease' }}
              />

              {prodH > 0 && (
                <path
                  d={barPath(xL, barW, prodY0, baseY, rProd, Math.min(4, rProd))}
                  fill={COLOR_PROD}
                  fillOpacity={colOpacity(idx, 'production')}
                  style={{ transition: 'fill-opacity 150ms ease' }}
                />
              )}

              {salesH > 0 && (
                <path
                  d={barPath(xL, barW, salesY0, salesY1, rSales, rSales)}
                  fill={COLOR_SALES}
                  fillOpacity={colOpacity(idx, 'sales')}
                  style={{ transition: 'fill-opacity 150ms ease' }}
                />
              )}

              {showInnerText && prodH >= 20 && row.production > 0 && (
                <text
                  x={cx}
                  y={prodY0 + prodH / 2}
                  dy={4}
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize={barW < 46 ? 10 : 11}
                  fontWeight={700}
                  fillOpacity={colOpacity(idx, 'production')}
                  style={{ pointerEvents: 'none' }}
                >
                  {fa(row.production, 0)}
                </text>
              )}

              {showInnerText && salesH >= 18 && row.sales > 0 && (
                <text
                  x={cx}
                  y={salesY0 + salesH / 2}
                  dy={4}
                  textAnchor="middle"
                  fill="var(--raw-neutral-900)"
                  fontSize={barW < 46 ? 10 : 11}
                  fontWeight={700}
                  fillOpacity={colOpacity(idx, 'sales')}
                  style={{ pointerEvents: 'none' }}
                >
                  {fa(row.sales, 0)}
                </text>
              )}

              {row.topLabel ? (
                <>
                  <text x={cx} y={baseY + 16} textAnchor="middle" fill="var(--color-muted-foreground)" fontSize={compactLabels ? 9.5 : 10.5} fontWeight={500}>
                    {row.topLabel}
                  </text>
                  <text x={cx} y={baseY + 30} textAnchor="middle" fill="var(--color-muted-foreground)" fontSize={compactLabels ? 9.5 : 10.5}>
                    {compactLabels && /^\d{4}\/\d{2}$/.test(row.key) ? faDigits(String(monthOf(row.key)).padStart(2, '0')) : row.bottomLabel}
                  </text>
                </>
              ) : (
                <text x={cx} y={baseY + 19} textAnchor="middle" fill="var(--color-muted-foreground)" fontSize={11} fontWeight={500}>
                  {row.bottomLabel}
                </text>
              )}
            </g>
          )
        })}
      </svg>

      {activeBox && (
        <div
          className="ind-ps-tip"
          style={{
            left: activeBox.cx > width * 0.56 ? activeBox.xL - 10 : activeBox.xR + 10,
            top: Math.max(4, Math.min(activeBox.yTotalTop - 6, height - 150)),
            transform: activeBox.cx > width * 0.56 ? 'translateX(-100%)' : 'none',
          }}
        >
          <Tip
            active
            label={activeBox.row.label}
            items={[
              { key: 'prod', name: 'تولید', color: COLOR_PROD, value: `${fa(activeBox.row.production, 0)} تن` },
              { key: 'sal', name: 'فروش', color: COLOR_SALES, value: `${fa(activeBox.row.sales, 0)} تن` },
            ]}
            summary={
              activeBox.row.sellThroughPct != null
                ? { label: 'نسبت فروش به تولید', value: `${fa(activeBox.row.sellThroughPct, 1)}٪` }
                : undefined
            }
            foot={
              byYear ? (
                <>
                  <MousePointerClick size={13} aria-hidden="true" /> کلیک برای دیدن ماه‌ها
                </>
              ) : undefined
            }
          />
        </div>
      )}
    </div>
  )
}

/** «تولید در برابر فروش»: follows the active range filter — monthly for 3m/6m/1y, yearly (with click-to-open monthly popover) for 3y/10y */
export function ProductionSalesCard({ ctx, sales }: { ctx: CardCtx; sales: SalesSet | null }) {
  const [product, setProduct] = useState<string>(PROD_SALES_PRODUCTS[0].value)
  const [hoverSeries, setHoverSeries] = useState<HoverSeries>(null)
  const [open, setOpen] = useState<{ year: number; x: number } | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(760)

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    setWidth(Math.max(320, el.clientWidth))
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width
      if (w && w > 0) setWidth(Math.max(320, w))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const { byYear, rows, monthly } = sales && ctx.ds ? productionVsSalesRows(sales, ctx.ds, ctx.range, product) : { byYear: false, rows: [], monthly: [] }
  const has = rows.some((r) => r.production + r.sales > 0)

  useEffect(() => setOpen(null), [byYear, product, ctx.range.from, ctx.range.to])
  useEffect(() => {
    if (!open) return
    const key = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(null)
    const down = (e: PointerEvent) => !wrapRef.current?.contains(e.target as Node) && setOpen(null)
    document.addEventListener('keydown', key)
    document.addEventListener('pointerdown', down)
    return () => (document.removeEventListener('keydown', key), document.removeEventListener('pointerdown', down))
  }, [open])

  const popW = Math.min(POP_W, width)
  const popLeft = open ? Math.max(0, Math.min(width - popW, open.x - popW / 2)) : 0
  const yearMonths = open ? monthly.filter((r) => r.year === open.year) : []

  return (
    <Card
      ctx={ctx}
      state={stateOf(ctx, has)}
      title="تولید در برابر فروش"
      subtitle={
        byYear
          ? `مقایسه سالانه تولید و فروش (${fa(rows.length)} سال)`
          : `مقایسه ماهانه تولید و فروش (${fa(rows.length)} ماه)`
      }
      guide={`مقدار تولید (نیلی) و فروش همان محصول (فیروزه‌ای) در بازه انتخاب‌شده.${byYear ? ' در بازه‌های بیش از ۲ سال، ستون‌ها سالانه نمایش داده می‌شوند و با کلیک روی هر سال، ماه‌های آن باز می‌شود.' : ''} با نگه داشتن نشانگر روی هر ستون، نسبت فروش به تولید دیده می‌شود. داده‌ها نمونه‌اند.`}
      actions={<Select label="کالا" value={product} options={PROD_SALES_PRODUCTS} onChange={setProduct} searchPlaceholder="جستجوی کالا..." />}
    >
      <div ref={wrapRef} className={`ind-ywrap ind-chart ${byYear ? 'is-years' : ''}`}>
        <ProdSalesSvg
          rows={rows}
          width={width}
          height={H}
          padX={PAD_X}
          padTop={PAD_TOP}
          padBot={PAD_BOT}
          hoverSeries={hoverSeries}
          byYear={byYear}
          selectedYear={open?.year ?? null}
          compactLabels={!byYear && rows.length > 9}
          onSelectYear={(row, cx) => setOpen((o) => (o?.year === row.year ? null : { year: row.year, x: cx }))}
          ariaLabel={`تولید در برابر فروش برای ${product} در ${fa(rows.length)} ${byYear ? 'سال' : 'ماه'}`}
        />

        {open && (
          <div className="ind-ypop" role="dialog" aria-label={`ماه‌های سال ${faDigits(String(open.year))}`} style={{ left: popLeft, width: popW }}>
            <div className="ind-ypop__head">
              <b>ماه‌های سال {faDigits(String(open.year))}</b>
              <button type="button" className="ind-ypop__close" aria-label="بستن" onClick={() => setOpen(null)}>
                <X size={15} aria-hidden="true" />
              </button>
            </div>
            <ProdSalesSvg
              rows={yearMonths}
              width={popW - 32}
              height={POP_H}
              padX={8}
              padTop={10}
              padBot={34}
              hoverSeries={hoverSeries}
              compactLabels
              ariaLabel={`تولید در برابر فروش ${product} در ماه‌های سال ${faDigits(String(open.year))}`}
            />
          </div>
        )}
      </div>

      <div className="ind-legend ind-legend--interactive ind-ps-legend" role="group" aria-label="راهنمای تولید و فروش">
        <button
          type="button"
          className={`ind-legend-btn ${hoverSeries === 'production' ? 'is-hot' : ''}`}
          onMouseEnter={() => setHoverSeries('production')}
          onMouseLeave={() => setHoverSeries(null)}
          onFocus={() => setHoverSeries('production')}
          onBlur={() => setHoverSeries(null)}
        >
          <span className="ind-legend__dot" style={{ background: COLOR_PROD }} aria-hidden="true" />
          تولید
        </button>
        <button
          type="button"
          className={`ind-legend-btn ${hoverSeries === 'sales' ? 'is-hot' : ''}`}
          onMouseEnter={() => setHoverSeries('sales')}
          onMouseLeave={() => setHoverSeries(null)}
          onFocus={() => setHoverSeries('sales')}
          onBlur={() => setHoverSeries(null)}
        >
          <span className="ind-legend__dot" style={{ background: COLOR_SALES }} aria-hidden="true" />
          فروش
        </button>
      </div>
    </Card>
  )
}
