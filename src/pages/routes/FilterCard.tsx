import { useEffect, useId, useRef, useState } from 'react'
import { Calendar, Check, ChevronDown, Filter, Search, X } from 'lucide-react'
import { COUNTRY_FA, GOODS, MODE_LABEL, MONTHS, ROUTES } from '../../data/routes'
import type { Mode, Month } from '../../data/routes'
import { GOOD_SLUG } from '../../lib/routes/url'
import type { RoutesState } from '../../lib/routes/url'
import { fa, persianMonth } from './format'

type Opt = { value: string; label: string }
const norm = (s: string) => s.replace(/ي/g, 'ی').replace(/ك/g, 'ک').toLowerCase()

/** One filter field: label, value and a chevron; active: blue, and the chevron clears it (§8) */
function Field({ label, opts, value, onChange, single = false, search = false }: { label: string; opts: Opt[]; value: string[]; onChange: (v: string[]) => void; single?: boolean; search?: boolean }) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const root = useRef<HTMLDivElement>(null)
  const id = useId()
  const active = value.length > 0
  const first = opts.find((o) => o.value === value[0])?.label
  const text = !active ? 'همه' : value.length === 1 ? first : `${first} +${fa(value.length - 1)}`
  useEffect(() => {
    if (!open) return
    const out = (e: PointerEvent) => !root.current?.contains(e.target as Node) && setOpen(false)
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', out)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('pointerdown', out)
      document.removeEventListener('keydown', esc)
    }
  }, [open])
  const shown = opts.filter((o) => norm(o.label).includes(norm(q.trim())))
  const toggle = (v: string) => (single ? (onChange(value[0] === v ? [] : [v]), setOpen(false)) : onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]))
  return (
    <div className={`rfield ${active ? 'is-active' : ''}`} ref={root}>
      <button type="button" className="rfield__btn" aria-haspopup="listbox" aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}>
        <span className="rfield__label">{label}</span>
        <span className="rfield__value">{text}</span>
      </button>
      {active ? (
        <button type="button" className="rfield__clear" aria-label={`برداشتن فیلتر ${label}`} onClick={() => onChange([])}>
          <X size={14} aria-hidden="true" />
        </button>
      ) : (
        <ChevronDown size={14} className="rfield__chev" aria-hidden="true" />
      )}
      {open && (
        <div className="rfield__pop" id={id}>
          {search && (
            <label className="rfield__search">
              <Search size={14} aria-hidden="true" />
              <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={`جستجوی ${label}…`} aria-label={`جستجوی ${label}`} />
            </label>
          )}
          <ul role="listbox" aria-multiselectable={!single} aria-label={label}>
            {shown.map((o) => (
              <li key={o.value} role="option" aria-selected={value.includes(o.value)}>
                <button type="button" onClick={() => toggle(o.value)}>
                  <span className={`rfield__box ${single ? 'is-radio' : ''}`} aria-hidden="true">
                    {value.includes(o.value) && <Check size={12} />}
                  </span>
                  {o.label}
                </button>
              </li>
            ))}
            {!shown.length && <li className="rfield__none">موردی نیست</li>}
          </ul>
        </div>
      )}
    </div>
  )
}

const goodsOpts: Opt[] = GOODS.map((g) => ({ value: GOOD_SLUG[g], label: g }))
const countries = (pick: (r: (typeof ROUTES)[number]) => string): Opt[] => [...new Set(ROUTES.map(pick))].map((c) => ({ value: c, label: COUNTRY_FA[c] ?? c })).sort((a, b) => a.label.localeCompare(b.label, 'fa'))
const modeOpts: Opt[] = (Object.keys(MODE_LABEL) as Mode[]).map((m) => ({ value: m, label: MODE_LABEL[m] }))

/** «بازهٔ زمانی»: 12 (default), 6 or 3 months, or a custom from–to */
const LAST = MONTHS[MONTHS.length - 1]
type PeriodPreset = '12' | '6' | '3' | 'custom'
const PRESETS: { value: PeriodPreset; label: string }[] = [
  { value: '12', label: '۱۲ ماه اخیر' },
  { value: '6', label: '۶ ماه' },
  { value: '3', label: '۳ ماه' },
  { value: 'custom', label: 'دلخواه' },
]
const presetOf = (s: Pick<RoutesState, 'from' | 'to'>): PeriodPreset => (s.to !== LAST ? 'custom' : s.from === MONTHS[0] ? '12' : s.from === MONTHS[6] ? '6' : s.from === MONTHS[9] ? '3' : 'custom')

/**
 * The filter card (§8): 4 direct dropdowns plus a button-style period selector in place of «فیلترهای بیشتر».
 */
export function FilterCard({ s, set, compact }: { s: RoutesState; set: (patch: Partial<RoutesState>) => void; compact: boolean }) {
  const [sheet, setSheet] = useState(false)
  const preset = presetOf(s)
  const activeCount = s.goods.length + s.origin.length + s.dest.length + s.mode.length + (preset !== '12' ? 1 : 0)
  const extraCount = s.lp.length + s.up.length + s.via.length + (s.q ? 1 : 0) + s.form.length
  const anyActive = activeCount + extraCount > 0

  const pickPreset = (p: PeriodPreset) => {
    if (p === '12') set({ from: MONTHS[0], to: LAST })
    else if (p === '6') set({ from: MONTHS[6], to: LAST })
    else if (p === '3') set({ from: MONTHS[9], to: LAST })
    else set({ from: MONTHS[0], to: MONTHS[MONTHS.length - 2] })
  }

  const fields = (
    <div className="rfilters__row">
      <Field label="کالا" opts={goodsOpts} value={s.goods} onChange={(goods) => set({ goods })} search />
      <Field label="کشور مبدأ" opts={countries((r) => r.originCountry)} value={s.origin} onChange={(origin) => set({ origin })} search />
      <Field label="کشور مقصد" opts={countries((r) => r.destCountry)} value={s.dest} onChange={(dest) => set({ dest })} search />
      <Field label="روش حمل" opts={modeOpts} value={s.mode} onChange={(mode) => set({ mode: mode as Mode[] })} />
    </div>
  )

  const periodButtons = (
    <div className="rperiod-bar">
      <span className="rperiod-bar__label">
        <Calendar size={14} aria-hidden="true" />
        بازهٔ زمانی
      </span>
      <div className="rperiod-seg" role="group" aria-label="بازهٔ زمانی">
        {PRESETS.map((p) => (
          <button
            key={p.value}
            type="button"
            className="rperiod-btn"
            aria-pressed={preset === p.value}
            onClick={() => pickPreset(p.value)}
          >
            {p.label}
          </button>
        ))}
      </div>
      {preset === 'custom' && (
        <div className="rperiod-custom">
          <select aria-label="از ماه" value={s.from} onChange={(e) => set({ from: e.target.value as Month })}>
            {MONTHS.map((m) => (
              <option key={m} value={m}>
                {persianMonth(m)}
              </option>
            ))}
          </select>
          <span className="rperiod-custom__sep">تا</span>
          <select aria-label="تا ماه" value={s.to} onChange={(e) => set({ to: e.target.value as Month })}>
            {MONTHS.map((m) => (
              <option key={m} value={m}>
                {persianMonth(m)}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  )

  const head = (
    <div className="rfilters__head">
      <h2>
        <Filter size={15} aria-hidden="true" />
        فیلترها
      </h2>
      <button
        type="button"
        className={`rfilters__clear ${anyActive ? 'is-on' : ''}`}
        disabled={!anyActive}
        onClick={() => set({ goods: [], origin: [], dest: [], mode: [], from: MONTHS[0], to: LAST, lp: [], up: [], via: [], q: null, form: [] })}
      >
        پاک کردن فیلترها
      </button>
    </div>
  )

  // Under 768 px: one «فیلترها (n)» button and a sheet
  if (compact)
    return (
      <>
        <button type="button" className="rfilters__open" onClick={() => setSheet(true)}>
          <Filter size={15} aria-hidden="true" />
          فیلترها{anyActive ? ` (${fa(activeCount + extraCount)})` : ''}
        </button>
        {sheet && (
          <div className="rsheet" role="dialog" aria-modal="true" aria-label="فیلترها">
            <div className="rsheet__scrim" onClick={() => setSheet(false)} aria-hidden="true" />
            <div className="rsheet__body">
              {head}
              {fields}
              {periodButtons}
              <div className="rmore__foot">
                <button type="button" className="abtn abtn--primary abtn--sm" onClick={() => setSheet(false)}>
                  تأیید
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    )

  return (
    <section className="rfilters" aria-label="فیلترها">
      {head}
      {fields}
      {periodButtons}
    </section>
  )
}
