import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowLeftRight, Banknote, ChevronDown, Clock, Gauge, Minus, Package, PackageX, Plus, ShieldAlert } from 'lucide-react'
import type { Scenario } from '../../lib/alertStore'
import { metricLabel, money, netCost } from '../../lib/engine'
import type { Metric, ModelRun, ScenarioModel } from '../../lib/engine'
import { COLORS, RISK_LABEL, SHORTAGE_KEYS, compareMetric, compareRisk, riskOf, netWords } from './helpers'
import type { CompareTone } from './helpers'
import '../../components/ui/Select.css'

/** One side's picker: the project's menu, each item with its colour dot and short name */
function Picker({ side, value, list, names, onChange }: { side: 'الف' | 'ب'; value: string; list: Scenario[]; names: string[]; onChange: (id: string) => void }) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const btn = useRef<HTMLButtonElement>(null)
  const i = Math.max(
    0,
    list.findIndex((s) => s.id === value),
  )
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && (setOpen(false), btn.current?.focus())
    const onDown = (e: PointerEvent) => !root.current?.contains(e.target as Node) && setOpen(false)
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onDown)
    }
  }, [open])
  return (
    <div className="scn-cmp__pick" ref={root}>
      <button ref={btn} type="button" className="ds-select__trigger scn-cmp__btn" aria-haspopup="menu" aria-expanded={open} aria-label={`سناریوی ${side}: ${names[i]}`} onClick={() => setOpen(!open)}>
        <span className="scn-dot" style={{ background: COLORS[i % COLORS.length] }} aria-hidden="true" />
        <span className="ds-select__value scn-cmp__name">{names[i]}</span>
        <ChevronDown size={16} aria-hidden="true" className="ds-select__chevron" />
      </button>
      {open && (
        <div className="tb-menu scn-cmp__menu" role="menu">
          {list.map((s, j) => (
            <button
              key={s.id}
              type="button"
              role="menuitemradio"
              aria-checked={s.id === value}
              className="tb-menu__item"
              autoFocus={s.id === value}
              onClick={() => {
                onChange(s.id)
                setOpen(false)
                btn.current?.focus()
              }}
            >
              <span className="scn-dot" style={{ background: COLORS[j % COLORS.length] }} aria-hidden="true" />
              <span className="tb-menu__label">{names[j]}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/** `a` / `b`: each side's own figure, shown under the difference with its colour line (no names: the pickers say which) */
/** «−۵۶ میلیون تومان» → the signed number kept left-to-right, the unit after it in Persian order */
function signed(text: string) {
  const m = text.match(/^([+−][\d۰-۹٬٫.,]+)\s*(.*)$/)
  if (!m) return text
  return (
    <>
      <bdi dir="ltr">{m[1]}</bdi>
      {m[2] && ` ${m[2]}`}
    </>
  )
}

/** An icon for a tile, from what its figure is about */
function TileIcon({ label }: { label: string }) {
  const I = /ریسک/.test(label) ? ShieldAlert : /هزینه/.test(label) ? Banknote : /کمبود|متأثر/.test(label) ? PackageX : /موجودی|مازاد|سهم/.test(label) ? Package : /روز|زمان|تأخیر|ترخیص/.test(label) ? Clock : Gauge
  return <I size={14} aria-hidden="true" />
}

/** `net`: «خالص» of each side against «بدون اقدام», where the problem itself is money */
type Tile = { label: string; big: string; tone: CompareTone; a: string; b: string; net?: { a: string; b: string } }

/**
 * «مقایسهٔ دو سناریو» (§10): the first picked scenario against the second on the table's two metrics,
 * the action cost and the risk. Closed until «+». Green when the first is better; cost and context
 * metrics are never coloured. Every figure is read from the table's runs and riskOf.
 */
export function ScenarioCompare(p: { open: boolean; onToggle: () => void; m: ScenarioModel; list: Scenario[]; runs: ModelRun[]; horizon: number; names: string[]; a: string; b: string; onA: (id: string) => void; onB: (id: string) => void; onSwap: () => void }) {
  const { m, list, runs, horizon } = p
  const cols: [Metric, Metric] = m.columns ?? m.metrics
  const ia = list.findIndex((s) => s.id === p.a)
  const ib = list.findIndex((s) => s.id === p.b)
  const same = ia === ib
  const A = runs[ia]
  const B = runs[ib]

  const metricTile = (c: Metric): Tile => {
    const r = compareMetric(c, A.values[c.key], B.values[c.key], SHORTAGE_KEYS.includes(c.key))
    return {
      label: metricLabel(c, horizon),
      big: r.text,
      tone: r.tone,
      a: c.fmt(A.values[c.key]),
      b: c.fmt(B.values[c.key]),
    }
  }
  const costTile = (): Tile => {
    const d = A.cost - B.cost
    const costText = (c: number) => (c === 0 ? 'بدون هزینهٔ مستقیم' : money(c))
    const na = netCost(m, A, runs[0])
    const nb = netCost(m, B, runs[0])
    const line = { a: costText(A.cost), b: costText(B.cost), ...(na !== null && nb !== null ? { net: { a: netWords(na).text, b: netWords(nb).text } } : {}) }
    return Math.abs(d) < 1e-9
      ? { label: 'هزینهٔ اقدام', big: 'بدون تفاوت', tone: 'same', ...line }
      : {
          label: 'هزینهٔ اقدام',
          big: `${d > 0 ? '+' : '−'}${money(Math.abs(d))}`,
          tone: 'neutral',
          ...line,
        }
  }
  const riskTile = (): Tile => {
    const ra = riskOf(m, cols, A, horizon).level
    const rb = riskOf(m, cols, B, horizon).level
    const r = compareRisk(ra, rb)
    return {
      label: 'ریسک',
      big: r.text,
      tone: r.tone,
      a: RISK_LABEL[ra],
      b: RISK_LABEL[rb],
    }
  }
  const tiles = same || ia < 0 || ib < 0 ? [] : [metricTile(cols[0]), metricTile(cols[1]), costTile(), riskTile()]

  return (
    <section className={`scn-cmp ${p.open ? 'is-open' : ''}`} aria-labelledby="scn-cmp-h">
      <div className="scn-cmp__head">
        {/* Closed until asked for: «+» opens it, «−» closes it */}
        <button type="button" className="scn-cmp__toggle" aria-expanded={p.open} aria-controls="scn-cmp-body" onClick={p.onToggle}>
          <span id="scn-cmp-h">مقایسهٔ دو سناریو</span>
          {p.open ? <Minus size={16} aria-hidden="true" /> : <Plus size={16} aria-hidden="true" />}
        </button>
        {p.open && (
          <div className="scn-cmp__sides">
            <Picker side="الف" value={p.a} list={list} names={p.names} onChange={p.onA} />
            <button type="button" className="aicon-btn scn-cmp__swap" onClick={p.onSwap} aria-label="جابه‌جا کردن دو سناریو" title="جابه‌جا کردن">
              <ArrowLeftRight size={16} aria-hidden="true" />
            </button>
            <Picker side="ب" value={p.b} list={list} names={p.names} onChange={p.onB} />
          </div>
        )}
      </div>
      {!p.open ? null : same ? (
        <p className="scn-cmp__empty">دو سناریوی متفاوت انتخاب کنید</p>
      ) : (
        <div className="scn-cmp__tiles" id="scn-cmp-body">
          {tiles.map((t) => (
            <div key={t.label} className="scn-cmp__tile">
              <span className="scn-cmp__label">
                <TileIcon label={t.label} />
                {t.label}
              </span>
              <span className={`scn-cmp__big is-${t.tone}`}>{signed(t.big)}</span>
              <span className="scn-cmp__line">
                <span className="scn-dot" style={{ background: COLORS[ia % COLORS.length] }} aria-hidden="true" />
                {t.a}
                <ArrowLeft size={12} aria-hidden="true" className="scn-cmp__sep" />
                <span className="visually-hidden">در برابر</span>
                <span className="scn-dot" style={{ background: COLORS[ib % COLORS.length] }} aria-hidden="true" />
                {t.b}
              </span>
              {t.net && (
                <span className="scn-cmp__line scn-cmp__net">
                  خالص: {t.net.a}
                  <ArrowLeft size={12} aria-hidden="true" className="scn-cmp__sep" />
                  <span className="visually-hidden">در برابر</span>
                  {t.net.b}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
