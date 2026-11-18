import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent, RefObject } from 'react'
import { Calendar, ChevronDown, ChevronLeft, ChevronRight, ExternalLink, Funnel } from 'lucide-react'
import { DEFAULT_RANGE, PRESETS, UNIT_LABEL, presetOf } from '../../lib/industry/derive'
import type { Dataset, Range, Unit } from '../../lib/industry/derive'
import { AXIS, AXIS_END, AXIS_START, DATA_START, FISCAL_YEAR_END, MONTH_NAMES, faDigits, monthName, monthOf, yearOf } from '../../lib/industry/months'
import { SAMPLE_BEFORE, SAMPLE_HISTORY } from '../../lib/industry/sample'
import { Seg } from './parts'

/** Listed symbols; only «غبشهر» has data loaded so far, the others open with every card empty */
export const SYMBOLS = ['بهپاک — صنعتی بهپاک', 'غبشهر — صنعتی بهشهر', 'غگل — گلوکوزان'] as const
export type Symbol = (typeof SYMBOLS)[number]
export const DATA_SYMBOL: Symbol = 'غبشهر — صنعتی بهشهر'
/** Codal has no stable link per report in the data; the link opens Codal itself */
export const CODAL_URL = 'https://www.codal.ir/'

/** Closes on Escape and on a click outside `root`; focus goes back to `back` */
function useDismiss(open: boolean, close: () => void, root: RefObject<HTMLElement | null>, back: RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.preventDefault()
      close()
      back.current?.focus()
    }
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) close()
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onDown)
    return () => (document.removeEventListener('keydown', onKey), document.removeEventListener('pointerdown', onDown))
  }, [open, close, root, back])
}

/** «غبشهر — صنعتی بهشهر» shown as «غبشهر | صنعتی بهشهر» (a grey vertical rule) */
export function withSep(text: string) {
  const [a, b] = text.split(' — ')
  return b == null ? (
    text
  ) : (
    <>
      {a}
      <span className="ind-sep" aria-hidden="true" />
      {b}
    </>
  )
}

/** A field that opens a list (نماد, بازه زمانی) */
function MenuField<T extends string>({ label, value, options, onPick, extra }: { label: string; value: string; options: { id: T; label: string; meta?: string; on: boolean }[]; onPick: (id: T) => void; extra?: { label: string; on: boolean; onPick: () => void } }) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const btn = useRef<HTMLButtonElement>(null)
  useDismiss(open, () => setOpen(false), root, btn)
  const pick = (f: () => void) => () => {
    f()
    setOpen(false)
    btn.current?.focus()
  }
  return (
    <div ref={root} className="ind-pos">
      <button ref={btn} type="button" title={`${label}: ${value}`} className={`ind-field ${open ? 'is-open' : ''}`} aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span className="ind-field__label">{label}</span>
        <span className="ind-field__value">{withSep(value)}</span>
        <ChevronDown size={16} className="ind-field__icon" aria-hidden="true" />
      </button>
      {open && (
        <ul className="ind-menu" role="listbox" aria-label={label}>
          {[...options.map((o) => ({ key: o.id as string, label: o.label, meta: o.meta, on: o.on, onPick: () => onPick(o.id) })), ...(extra ? [{ key: '__extra', label: extra.label, meta: undefined, on: extra.on, onPick: extra.onPick }] : [])].map((o) => (
            <li key={o.key} role="option" aria-selected={o.on}>
              <button type="button" className={o.on ? 'is-on' : ''} onClick={pick(o.onPick)}>
                <span className="ind-menu__name">{withSep(o.label)}</span>
                {o.meta && <span className="ind-menu__meta n">{o.meta}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/**
 * The page filter (page-prompt §7) in the system's filter card: symbol, period preset, month range,
 * amount unit and reset.
 */
export function FilterBar({
  ds,
  symbol,
  onSymbol,
  range,
  onRange,
  unit,
  onUnit,
  onReset,
  pickerOpen,
  onPicker,
}: {
  ds: Dataset | null
  symbol: Symbol
  onSymbol: (s: Symbol) => void
  range: Range
  onRange: (r: Range) => void
  unit: Unit
  onUnit: (u: Unit) => void
  onReset: () => void
  pickerOpen: boolean
  onPicker: (open: boolean) => void
}) {
  const preset = presetOf(range)
  // «از ماه تا ماه» appears only once «دلخواه» is chosen (or the range matches no preset)
  const [custom, setCustom] = useState(false)
  const showRange = custom || !preset
  const dirty = custom || symbol !== DATA_SYMBOL || unit !== 'usd' || range.from !== DEFAULT_RANGE.from || range.to !== DEFAULT_RANGE.to
  const rngRef = useRef<HTMLDivElement>(null)
  const rngBtn = useRef<HTMLButtonElement>(null)
  useDismiss(pickerOpen, () => onPicker(false), rngRef, rngBtn)

  return (
    <section className="ind-filter" aria-labelledby="ind-filter-title">
      <div className="ind-filter__head">
        <h2 id="ind-filter-title" className="ind-filter__title">
          <Funnel size={15} aria-hidden="true" />
          فیلتر
        </h2>
        <button
          type="button"
          className={`ind-filter__clear ${dirty ? 'is-on' : ''}`}
          disabled={!dirty}
          onClick={() => {
            setCustom(false)
            onReset()
          }}
        >
          پاک کردن فیلترها
        </button>
      </div>
      <div className="ind-filter__row">
        <div className="ind-field--sym">
          <MenuField label="نماد" value={symbol} options={SYMBOLS.map((s) => ({ id: s, label: s, on: s === symbol }))} onPick={onSymbol} />
        </div>

        <div className="ind-field-wrap--pre">
          <MenuField
            label="بازه زمانی"
            value={showRange ? 'دلخواه' : preset!.label}
            options={PRESETS.map((p) => ({ id: p.id, label: p.label, meta: `${AXIS[p.from]} – ${AXIS[p.to]}`, on: preset?.id === p.id }))}
            onPick={(id) => {
              const p = PRESETS.find((x) => x.id === id)!
              setCustom(false)
              onPicker(false)
              onRange({ from: p.from, to: p.to })
            }}
            // «دلخواه»: brings in «از ماه تا ماه» and opens its picker
            extra={{
              label: 'دلخواه',
              on: showRange,
              onPick: () => {
                setCustom(true)
                onPicker(true)
              },
            }}
          />
        </div>

        {showRange && (
          <div ref={rngRef} className="ind-pos ind-field-wrap--rng">
            <button ref={rngBtn} type="button" title={`از ${monthName(AXIS[range.from])} تا ${monthName(AXIS[range.to])}`} className={`ind-field ${pickerOpen ? 'is-open' : ''}`} aria-haspopup="dialog" aria-expanded={pickerOpen} onClick={() => onPicker(!pickerOpen)}>
              <Calendar size={16} className="ind-field__icon" aria-hidden="true" />
              <span className="ind-field__label">از ماه تا ماه</span>
              <span className="ind-field__value">
                {monthName(AXIS[range.from])} تا {monthName(AXIS[range.to])}
              </span>
            </button>
            {pickerOpen && (
              <RangePicker
                ds={ds}
                range={range}
                onRange={onRange}
                onClose={() => {
                  onPicker(false)
                  rngBtn.current?.focus()
                }}
              />
            )}
          </div>
        )}

        <Seg label="واحد مبلغ" value={unit} onChange={onUnit} options={(['usd', 'mr'] as const).map((u) => ({ value: u, label: UNIT_LABEL[u] }))} />
      </div>
    </section>
  )
}

/** The symbol's report line, on the page under the filter card */
export function SymbolInfo({ symbol, hasData, end, version, to, sampleNote = null }: { symbol: Symbol; hasData: boolean; end: string | null; version: string | null; to: string; sampleNote?: string | null }) {
  return (
    <div className="ind-symbol">
      <div>
        <p className="ind-symbol__name">
          <span>{withSep(symbol)}</span>
          {!hasData && <span className="ind-symbol__note">(داده‌ای برای این نماد ثبت نشده است)</span>}
        </p>
        {hasData && (
          <dl className="ind-facts">
            <div>
              <dt>شروع داده‌ها:</dt>
              <dd>
                <span className="n">{DATA_START}</span>
              </dd>
            </div>
            <div>
              <dt>آخرین گزارش{version ? ` (${version})` : ''}:</dt>
              <dd>
                <span className="n">{end ?? to}</span>
              </dd>
            </div>
            {sampleNote ? (
              <div title={`هنوز فایل ${sampleNote} این نماد نرسیده است؛ این ارقام ساختگی‌اند و از کدال نیستند`}>
                <dt>{sampleNote}:</dt>
                <dd>نمونه</dd>
              </div>
            ) : (
              SAMPLE_HISTORY && (
                <div title={`ماه‌های پیش از ${SAMPLE_BEFORE} با داده‌ی ساختگی پر شده‌اند تا بازه‌های بلند دیده شوند؛ این ردیف‌ها از کدال نیستند`}>
                  <dt>
                    پیش از <span className="n">{SAMPLE_BEFORE}</span>:
                  </dt>
                  <dd>داده نمونه</dd>
                </div>
              )
            )}
            <div>
              <dt>پایان سال مالی:</dt>
              <dd>
                <span className="n">{FISCAL_YEAR_END}</span>
              </dd>
            </div>
          </dl>
        )}
      </div>
      <a className="ind-link" href={CODAL_URL} target="_blank" rel="noreferrer">
        گزارش کدال
        <ExternalLink size={13} aria-hidden="true" />
      </a>
    </div>
  )
}

const YEARS = [yearOf(AXIS_START), yearOf(AXIS_END)]

/** Two month grids, «از ماه» and «تا ماه»; picks apply at once, «تأیید» closes (§7 RangePicker) */
function RangePicker({ ds, range, onRange, onClose }: { ds: Dataset | null; range: Range; onRange: (r: Range) => void; onClose: () => void }) {
  // The ready-made periods live in «بازه زمانی»; the picker is only for any two months. Focus goes to the dialog on open
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => box.current?.focus(), [])
  const onKey = (e: ReactKeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation()
      onClose()
    }
  }
  return (
    <div ref={box} tabIndex={-1} className="ind-picker" role="dialog" aria-label="انتخاب بازه‌ی زمانی" onKeyDown={onKey}>
      <div className="ind-picker__head">
        <strong>انتخاب بازه‌ی زمانی</strong>
      </div>
      <div className="ind-picker__cols">
        <MonthGrid title="از ماه" side="from" ds={ds} range={range} onPick={(i) => onRange({ from: i, to: Math.max(i, range.to) })} />
        <MonthGrid title="تا ماه" side="to" ds={ds} range={range} onPick={(i) => onRange({ from: Math.min(i, range.from), to: i })} />
      </div>
      <div className="ind-picker__foot">
        <span className="ind-picker__key">
          <span className="ind-dot" aria-hidden="true" />
          ماه دارای داده
          <span aria-hidden="true">·</span>
          بازه:{' '}
          <span className="n">
            {AXIS[range.from]} تا {AXIS[range.to]}
          </span>
        </span>
        <button type="button" className="ind-btn ind-btn--primary" onClick={onClose}>
          تأیید
        </button>
      </div>
    </div>
  )
}

function MonthGrid({ title, side, ds, range, onPick }: { title: string; side: 'from' | 'to'; ds: Dataset | null; range: Range; onPick: (i: number) => void }) {
  const selected = AXIS[side === 'from' ? range.from : range.to]
  const [year, setYear] = useState(yearOf(selected))
  const has = new Set(ds?.months ?? [])
  return (
    <div className="ind-grid">
      <p className="ind-grid__head">
        {title}: <b>{monthName(selected)}</b>
      </p>
      <div className="ind-year">
        {/* RTL: the earlier year on the right, the later on the left */}
        <button type="button" aria-label="سال قبل" disabled={year <= YEARS[0]} onClick={() => setYear(year - 1)}>
          <ChevronRight size={16} aria-hidden="true" />
        </button>
        <span className="n">{faDigits(String(year))}</span>
        <button type="button" aria-label="سال بعد" disabled={year >= YEARS[1]} onClick={() => setYear(year + 1)}>
          <ChevronLeft size={16} aria-hidden="true" />
        </button>
      </div>
      <div className="ind-months">
        {MONTH_NAMES.map((name, k) => {
          const code = `${year}/${String(k + 1).padStart(2, '0')}`
          const i = AXIS.indexOf(code)
          const disabled = i < 0 || (side === 'from' ? i > range.to : i < range.from)
          const on = code === selected
          const between = i > range.from && i < range.to
          return (
            <button key={code} type="button" className={`ind-month ${on ? 'is-on' : ''} ${between ? 'is-between' : ''}`} disabled={disabled} aria-pressed={on} aria-label={`${monthName(code)}${has.has(code) ? '، دارای داده' : ''}`} onClick={() => onPick(i)}>
              {has.has(code) && <span className="ind-dot" aria-hidden="true" />}
              {name}
              <span className="ind-month__num n">{faDigits(String(monthOf(code)).padStart(2, '0'))}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
