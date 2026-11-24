import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent, ReactNode } from 'react'
import { ArrowLeft, Calendar, ChevronDown, TrendingDown, TrendingUp } from 'lucide-react'
import { Select } from '../../components/ui/Select'
import { BRIDGE_GROUP_LABEL, computeBridge, defaultBridgeMonths } from '../../lib/industry/derive'
import type { Bridge, BridgeFigures, BridgeGroup, BridgeStep, BridgeStepKey } from '../../lib/industry/derive'
import { fa, signed, signedPct } from '../../lib/industry/format'
import { monthName, monthOnly, shiftMonth } from '../../lib/industry/months'
import { Arrow, Card, stateOf } from './parts'
import type { CardCtx } from './parts'

const C = { up: 'var(--raw-emerald-600)', down: 'var(--raw-red-600)', zero: 'var(--raw-neutral-400)' }
const STEP_LABEL: Record<Exclude<BridgeStepKey, 'start' | 'end'>, string> = { qty: 'اثر مقدار', rate: 'اثر نرخ', new: 'اقلام جدید', removed: 'اقلام حذف‌شده', noUnit: 'بدون واحد معتبر' }
const GUIDE: { key: keyof typeof STEP_LABEL; text: string }[] = [
  { key: 'qty', text: 'تغییر مقدار (تن) × نرخ ضمنی ماه مبنا؛ فقط برای اقلام با واحد تن.' },
  { key: 'rate', text: 'باقی‌مانده‌ی تغییر مبلغ همان اقلام.' },
  { key: 'new', text: 'در ماه مبنا مبلغی نداشتند و در ماه جاری دارند؛ کل مبلغ ماه جاری.' },
  { key: 'removed', text: 'در ماه مبنا مبلغ داشتند و در ماه جاری ندارند؛ منفیِ کل مبلغ ماه مبنا.' },
  { key: 'noUnit', text: 'واحد مختلف یا نرخ ضمنی نامعتبر؛ فقط تغییر مبلغ کل گزارش می‌شود و به مقدار و نرخ تفکیک نمی‌شود.' },
]
const zero = (v: number) => Math.abs(v) < 0.05
const tone = (v: number | null) => (v == null || zero(v) ? 'is-zero' : v > 0 ? 'is-up' : 'is-down')
const colorOf = (s: BridgeStep) => (zero(s.value) ? C.zero : s.value > 0 ? C.up : C.down)

/** Closes on Escape and a click outside; focus back to the opener */
function usePopover(open: boolean, onClose: () => void, root: React.RefObject<HTMLElement | null>, back: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!open) return
    const key = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      onClose()
      back.current?.focus()
    }
    const down = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) onClose()
    }
    document.addEventListener('keydown', key)
    document.addEventListener('pointerdown', down)
    return () => (document.removeEventListener('keydown', key), document.removeEventListener('pointerdown', down))
  }, [open, onClose, root, back])
}

/** «تجزیه تغییر مبلغ خرید» (page-prompt §16): billion rial, always in rial */
export function BridgeCard({ ctx }: { ctx: CardCtx }) {
  const [picked, setPicked] = useState<{ end: string; base: string; current: string } | null>(null)
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set(['qtyRate']))
  const end = ctx.end
  const months = end ? (picked && picked.end === end ? picked : { end, ...defaultBridgeMonths(end) }) : null
  const has = !!(ctx.ds && months && ctx.ds.byMonth.has(months.base) && ctx.ds.byMonth.has(months.current))
  const bridge = has ? computeBridge(ctx.ds!.records, months!.base, months!.current) : null
  const emptyText = months && ctx.ds && !ctx.ds.byMonth.has(months.base) ? `برای ${monthName(months.base)} داده‌ای ثبت نشده است` : undefined

  return (
    <Card
      ctx={ctx}
      state={stateOf(ctx, !!bridge)}
      emptyText={emptyText}
      title="تجزیه تغییر مبلغ خرید"
      subtitle="اثر مقدار، اثر نرخ، اقلام جدید، اقلام حذف‌شده و اقلام بدون واحد معتبر"
      guide={<BridgeGuide />}
      actions={
        bridge &&
        months && (
          <div className="ind-bactions">
            <RangeButton
              ctx={ctx}
              base={months.base}
              current={months.current}
              onApply={(base, current) => {
                setPicked({ end: months.end, base, current })
                setOpenGroups(new Set(['qtyRate']))
              }}
            />
          </div>
        )
      }
    >
      {bridge && (
        <>
          <Summary bridge={bridge} />
          <Diverging bridge={bridge} />
          <GroupTable bridge={bridge} open={openGroups} onToggle={(id) => setOpenGroups((s) => (s.has(id) ? new Set([...s].filter((x) => x !== id)) : new Set([...s, id])))} />
        </>
      )}
    </Card>
  )
}

type DeltaKey = Exclude<BridgeStepKey, 'start' | 'end'>
/** Month names in the text: the bare name when both months share a year, else name and year */
const namer = (b: Bridge) => (m: string) => (b.base.slice(0, 4) === b.current.slice(0, 4) ? monthOnly(m) : monthName(m))

/** «مرداد ۱۴۰۵ ۱۶۷٬۲۰۴٫۰ ← شهریور ۱۴۰۵ ۹۸٬۴۸۱٫۳ میلیارد ریال −۶۸٬۷۲۲٫۶» and the percent change at the far end */
function Summary({ bridge }: { bridge: Bridge }) {
  const { p, c, d } = bridge.total
  const pc = p ? (d / p) * 100 : null
  const t = tone(d)
  return (
    <div className="ind-bsum">
      <span className="ind-bsum__side">
        <span className="ind-bsum__month">{monthName(bridge.base)}</span>
        <b className="n">{fa(p, 1)}</b>
      </span>
      <ArrowLeft size={18} strokeWidth={2} className="ind-bsum__arrow" aria-label="به" />
      <span className="ind-bsum__side">
        <span className="ind-bsum__month">{monthName(bridge.current)}</span>
        <b className="n">{fa(c, 1)}</b>
      </span>
      <span className={`ind-bsum__delta ${t}`}>
        میلیارد ریال <b className="n">{signed(d, 1)}</b>
      </span>
      {pc != null && (
        <span className={`ind-bsum__pct ${t}`}>
          <span className="n">{signedPct(pc, 1)}</span>
          {t === 'is-zero' ? null : d > 0 ? <TrendingUp size={14} aria-hidden="true" /> : <TrendingDown size={14} aria-hidden="true" />}
        </span>
      )}
    </div>
  )
}

/** The steps as bars on both sides of zero: decreases to the right, increases to the left, share of the base month at the end */
function Diverging({ bridge }: { bridge: Bridge }) {
  const name = namer(bridge)
  const steps = bridge.steps.filter((s) => s.kind === 'delta')
  const max = Math.max(...steps.map((s) => Math.abs(s.value)), 1e-9)
  const base = bridge.total.p
  const sub: Record<DeltaKey, string> = {
    qty: 'تغییر در مقدار خرید',
    rate: 'تغییر در قیمت واحد',
    new: `${name(bridge.base)} خریده نشده بودند`,
    removed: `${name(bridge.current)} خریده نشده‌اند`,
    noUnit: 'واحد معتبر ندارند',
  }
  const share = (v: number) => (base ? (v / base) * 100 : null)
  const describe = (s: BridgeStep) => `${STEP_LABEL[s.key as DeltaKey]}: ${zero(s.value) ? 'بدون تغییر' : `${s.value > 0 ? 'افزایش' : 'کاهش'} ${fa(Math.abs(s.value), 1)} میلیارد ریال (${signedPct(share(s.value), 1)} از ${name(bridge.base)})`}`
  return (
    <div className="ind-div" role="table" aria-label={`تجزیه تغییر مبلغ خرید از ${bridge.base} تا ${bridge.current}، میلیارد ریال`}>
      <div className="ind-div__row ind-div__row--head" role="row">
        <span role="columnheader">
          <span className="visually-hidden">عامل</span>
        </span>
        <span role="columnheader" className="ind-div__neg is-down">
          کاهش مبلغ خرید
        </span>
        <span role="columnheader" className="ind-div__pos is-up">
          افزایش مبلغ خرید
        </span>
        <span role="columnheader" className="ind-div__pc">
          <span className="visually-hidden">سهم از {name(bridge.base)}</span>
        </span>
      </div>
      {steps.map((s) => {
        const k = s.key as DeltaKey
        const t = tone(s.value)
        const bar = <span className="ind-div__bar" style={{ width: `max(3px, calc((100% - 96px) * ${Math.abs(s.value) / max}))`, background: colorOf(s) }} aria-hidden="true" />
        const label = <span className={`ind-div__val n ${t}`}>{signed(s.value, 1)}</span>
        return (
          <div key={s.key} className="ind-div__row" role="row" title={describe(s)}>
            <span role="cell" className="ind-div__name">
              <span className="ind-ring" style={{ borderColor: colorOf(s) }} aria-hidden="true" />
              <span>
                <b>{STEP_LABEL[k]}</b>
                <small>{sub[k]}</small>
              </span>
            </span>
            <span role="cell" className="ind-div__neg">
              {!zero(s.value) && s.value < 0 && (
                <>
                  {label}
                  {bar}
                </>
              )}
            </span>
            <span role="cell" className="ind-div__pos">
              {zero(s.value) ? (
                <span className="ind-muted">بدون تغییر</span>
              ) : (
                s.value > 0 && (
                  <>
                    {bar}
                    {label}
                  </>
                )
              )}
            </span>
            <span role="cell" className={`ind-div__pc n ${zero(s.value) ? 'ind-muted' : t}`}>
              {zero(s.value) ? `${fa(0, 1)}٪` : signedPct(share(s.value), 1)}
            </span>
          </div>
        )
      })}
    </div>
  )
}

/** Comparison months: a draft applied only with «اعمال» */
function RangeButton({ ctx, base, current, onApply }: { ctx: CardCtx; base: string; current: string; onApply: (base: string, current: string) => void }) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState({ base, current })
  const root = useRef<HTMLDivElement>(null)
  const btn = useRef<HTMLButtonElement>(null)
  const close = () => setOpen(false)
  usePopover(open, close, root, btn)
  const months = ctx.ds?.months ?? []
  const opt = (m: string) => ({ value: m, label: monthName(m) })
  const lastYear = shiftMonth(draft.current, -12)
  const setBase = (b: string) => setDraft((d) => ({ base: b, current: d.current > b ? d.current : (months.find((m) => m > b) ?? d.current) }))
  return (
    <div ref={root} className="ind-pos">
      <button
        ref={btn}
        type="button"
        className="ind-btn ind-btn--sm ind-rangebtn"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => {
          setDraft({ base, current })
          setOpen(!open)
        }}
      >
        <Calendar size={14} aria-hidden="true" />
        {/* Earlier month first (right), a short rule, then the later one */}
        <span className="n">{base}</span>
        <span className="ind-rangebtn__rule" aria-label="تا" />
        <span className="n">{current}</span>
      </button>
      {open && (
        <div className="ind-pop" role="dialog" aria-label="انتخاب بازه‌ی مقایسه">
          <p className="ind-pop__title">انتخاب بازه‌ی مقایسه</p>
          <div className="ind-pop__presets">
            <button type="button" className={`ind-chip ${draft.base === shiftMonth(draft.current, -1) ? 'is-on' : ''}`} disabled={!months.includes(shiftMonth(draft.current, -1))} onClick={() => setDraft((d) => ({ ...d, base: shiftMonth(d.current, -1) }))}>
              نسبت به ماه قبل
            </button>
            <button type="button" className={`ind-chip ${draft.base === lastYear ? 'is-on' : ''}`} disabled={!months.includes(lastYear)} onClick={() => setDraft((d) => ({ ...d, base: lastYear }))}>
              نسبت به همان ماه سال قبل
            </button>
          </div>
          <div className="ind-pop__pair">
            <Select label="ماه مبنا" value={draft.base} options={months.slice(0, -1).map(opt)} onChange={setBase} searchPlaceholder="جستجوی ماه" />
            <Select label="ماه جاری" value={draft.current} options={months.filter((m) => m > draft.base).map(opt)} onChange={(c) => setDraft((d) => ({ ...d, current: c }))} searchPlaceholder="جستجوی ماه" />
          </div>
          <div className="ind-pop__foot">
            <button
              type="button"
              className="ind-btn ind-btn--primary"
              onClick={() => {
                onApply(draft.base, draft.current)
                close()
                btn.current?.focus()
              }}
            >
              اعمال
            </button>
            <button
              type="button"
              className="ind-btn"
              onClick={() => {
                close()
                btn.current?.focus()
              }}
            >
              انصراف
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/** The title's ⓘ: how to read each step (spans only, since it lives inside the guide's tooltip span) */
function BridgeGuide() {
  return (
    <span className="ind-defs ind-defs--guide">
      <span className="ind-pop__title">راهنمای خواندن نمودار</span>
      {GUIDE.map((g) => (
        <span key={g.key} className="ind-defs__item">
          <span className="ind-defs__t">
            <span className="ind-ring" aria-hidden="true" />
            {STEP_LABEL[g.key]}
          </span>
          <span className="ind-defs__d">{g.text}</span>
        </span>
      ))}
      <span className="ind-defs__note">تجزیه همیشه ریالی است تا تغییر نرخ ارز دو ماه با اثر نرخ ماده مخلوط نشود.</span>
    </span>
  )
}

/** Change figure in colour (groups, total) */
const Signed = ({ v, strong = true }: { v: number | null; strong?: boolean }) => (v == null ? <span className="ind-muted">—</span> : <span className={`n ${tone(v)} ${strong ? 'ind-strong' : ''}`}>{signed(v, 1)}</span>)
/** Change pill (child rows) */
const Pill = ({ v }: { v: number | null }) =>
  v == null ? (
    <span className="ind-muted">—</span>
  ) : zero(v) ? (
    <span className="ind-muted n">۰٫۰</span>
  ) : (
    <span className={`ind-arrowval ind-strong ${v > 0 ? 'is-up' : 'is-down'}`}>
      <Arrow up={v > 0} />
      <span className="n">{signed(v, 1)}</span>
    </span>
  )

/** The grouped table under the waterfall (treegrid) */
function GroupTable({ bridge, open, onToggle }: { bridge: Bridge; open: Set<string>; onToggle: (id: string) => void }) {
  const cells = (f: BridgeFigures, child = false): ReactNode[] => [
    <span key="p" className="n">
      {fa(f.p, 1)}
    </span>,
    <span key="c" className="n">
      {fa(f.c, 1)}
    </span>,
    child && zero(f.d) && zero(f.p) && zero(f.c) ? (
      <span key="d" className="ind-muted n">
        {fa(0, 1)}
      </span>
    ) : (
      <Signed key="d" v={f.d} />
    ),
    child ? <Pill key="q" v={f.q} /> : <Signed key="q" v={f.q} />,
    child ? <Pill key="r" v={f.r} /> : <Signed key="r" v={f.r} />,
  ]
  const onKey = (g: BridgeGroup) => (e: ReactKeyboardEvent) => {
    if (e.key !== 'Enter' && e.key !== ' ') return
    e.preventDefault()
    onToggle(g.id)
  }
  return (
    <div className="ind-tree" role="treegrid" aria-label="جدول تجزیه">
      <div className="ind-tree__row ind-tree__row--head" role="row">
        <span role="columnheader">قلم</span>
        <span role="columnheader">{monthName(bridge.base)}</span>
        <span role="columnheader">{monthName(bridge.current)}</span>
        <span role="columnheader">تغییر</span>
        <span role="columnheader">اثر مقدار</span>
        <span role="columnheader">اثر نرخ</span>
      </div>
      {bridge.groups.map((g) => {
        const can = g.rows.length > 0
        const isOpen = can && open.has(g.id)
        return (
          <div key={g.id} role="rowgroup">
            <div className={`ind-tree__row ind-tree__row--group ${isOpen ? 'is-open' : ''} ${can ? 'is-active' : ''}`} role="row" aria-level={1} aria-expanded={can ? isOpen : undefined} tabIndex={can ? 0 : undefined} onClick={can ? () => onToggle(g.id) : undefined} onKeyDown={can ? onKey(g) : undefined}>
              <span role="gridcell" className="ind-tree__name">
                <span className="ind-tree__chev">{can && <ChevronDown size={15} aria-hidden="true" />}</span>
                <b>{BRIDGE_GROUP_LABEL[g.id]}</b>
                <span className="ind-count">
                  <span className="n">{fa(g.rows.length)}</span>
                </span>
              </span>
              {can ? (
                cells(g).map((c, i) => (
                  <span key={i} role="gridcell" className="ind-num">
                    {c}
                  </span>
                ))
              ) : (
                <>
                  {[0, 1, 2, 3, 4].map((i) => (
                    <span key={i} role="gridcell" className="ind-num ind-muted">
                      —
                    </span>
                  ))}
                </>
              )}
            </div>
            {isOpen &&
              g.rows.map((r) => (
                <div key={r.key} className="ind-tree__row ind-tree__row--child" role="row" aria-level={2}>
                  <span role="gridcell" className="ind-tree__name">
                    <span className="ind-tree__child">{r.item}</span>
                    <span className="ind-meta">
                      {r.source} · {r.unit}
                    </span>
                  </span>
                  {cells(r, true).map((c, i) => (
                    <span key={i} role="gridcell" className="ind-num">
                      {c}
                    </span>
                  ))}
                </div>
              ))}
          </div>
        )
      })}
      <div className="ind-tree__row ind-tree__row--total" role="row">
        <span role="gridcell" className="ind-tree__name">
          جمع
        </span>
        {cells(bridge.total).map((c, i) => (
          <span key={i} role="gridcell" className="ind-num">
            {c}
          </span>
        ))}
      </div>
    </div>
  )
}
