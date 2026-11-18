import { useEffect, useId, useRef, useState } from 'react'
import { Check, ChevronDown, ChevronUp, Filter, Search, X } from 'lucide-react'
import { CHOKEPOINTS, COUNTRY_FA, FORMS, GOODS, MODE_LABEL, MONTHS, ROUTES } from '../../data/routes'
import type { Mode, Month } from '../../data/routes'
import { filterRoutes, routeValue } from '../../lib/routes/metrics'
import { FORM_SLUG, GOOD_SLUG } from '../../lib/routes/url'
import type { RoutesState } from '../../lib/routes/url'
import { fa, money, persianMonth } from './format'

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
const ports = (pick: (r: (typeof ROUTES)[number]) => { id: string; name: string }): Opt[] => [...new Map(ROUTES.map((r) => [pick(r).id, pick(r)])).values()].map((x) => ({ value: x.id, label: x.name }))
const viaOpts: Opt[] = CHOKEPOINTS.map((c) => ({ value: c.id, label: c.name }))
const quartOpts: Opt[] = [
  { value: '1', label: 'چارک ۱ (کوچک‌ترین)' },
  { value: '2', label: 'چارک ۲' },
  { value: '3', label: 'چارک ۳' },
  { value: '4', label: 'چارک ۴ (بزرگ‌ترین تجارت‌ها)' },
]
const formOpts: Opt[] = FORMS.map((x) => ({ value: FORM_SLUG[x], label: x }))

/** «بازهٔ زمانی»: 12 (default), 6 or 3 months, or a custom from–to */
const LAST = MONTHS[MONTHS.length - 1]
const PRESETS: Opt[] = [
  { value: '12', label: '۱۲ ماه اخیر' },
  { value: '6', label: '۶ ماه' },
  { value: '3', label: '۳ ماه' },
  { value: 'custom', label: 'دلخواه' },
]
const presetOf = (s: Pick<RoutesState, 'from' | 'to'>) => (s.to !== LAST ? 'custom' : s.from === MONTHS[0] ? '12' : s.from === MONTHS[6] ? '6' : s.from === MONTHS[9] ? '3' : 'custom')

export type More = Pick<RoutesState, 'lp' | 'up' | 'via' | 'q' | 'form'>
const MORE_EMPTY: More = { lp: [], up: [], via: [], q: null, form: [] }
const moreCount = (m: More) => m.lp.length + m.up.length + m.via.length + (m.q ? 1 : 0) + m.form.length

/**
 * The filter card (§8): the first row applies at once; «فیلترهای بیشتر» opens below the card, over
 * the map, and applies only with «اعمال فیلترها» (the count is live before that).
 */
export function FilterCard({ s, set, compact }: { s: RoutesState; set: (patch: Partial<RoutesState>) => void; compact: boolean }) {
  const [moreOpen, setMoreOpen] = useState(false)
  const [draft, setDraft] = useState<More>({ lp: s.lp, up: s.up, via: s.via, q: s.q, form: s.form })
  const [sheet, setSheet] = useState(false)
  const preset = presetOf(s)
  const firstActive = s.goods.length + s.origin.length + s.dest.length + s.mode.length + (preset !== '12' ? 1 : 0)
  const anyActive = firstActive + moreCount(s) > 0
  useEffect(() => {
    if (!moreOpen) return
    setDraft({ lp: s.lp, up: s.up, via: s.via, q: s.q, form: s.form })
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setMoreOpen(false)
    document.addEventListener('keydown', esc)
    return () => document.removeEventListener('keydown', esc)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moreOpen])
  const live = filterRoutes({ ...s, ...draft })
  const liveValue = live.reduce((t, r) => t + routeValue(r, { ...s, ...draft }), 0)

  const fields = (
    <div className="rfilters__row">
      <Field label="کالا" opts={goodsOpts} value={s.goods} onChange={(goods) => set({ goods })} search />
      <Field label="کشور مبدأ" opts={countries((r) => r.originCountry)} value={s.origin} onChange={(origin) => set({ origin })} search />
      <Field label="کشور مقصد" opts={countries((r) => r.destCountry)} value={s.dest} onChange={(dest) => set({ dest })} search />
      <Field label="روش حمل" opts={modeOpts} value={s.mode} onChange={(mode) => set({ mode: mode as Mode[] })} />
      <div className="rperiod">
        <Field
          label="بازهٔ زمانی"
          single
          opts={PRESETS}
          value={preset === '12' ? [] : [preset]}
          onChange={(v) => {
            const p = v[0] ?? '12'
            if (p === '12') set({ from: MONTHS[0], to: LAST })
            else if (p === '6') set({ from: MONTHS[6], to: LAST })
            else if (p === '3') set({ from: MONTHS[9], to: LAST })
            else set({ from: MONTHS[0], to: MONTHS[MONTHS.length - 2] })
          }}
        />
        {preset === 'custom' && (
          <span className="rfield__range">
            <select aria-label="از ماه" value={s.from} onChange={(e) => set({ from: e.target.value as Month })}>
              {MONTHS.map((m) => (
                <option key={m} value={m}>
                  {persianMonth(m)}
                </option>
              ))}
            </select>
            تا
            <select aria-label="تا ماه" value={s.to} onChange={(e) => set({ to: e.target.value as Month })}>
              {MONTHS.map((m) => (
                <option key={m} value={m}>
                  {persianMonth(m)}
                </option>
              ))}
            </select>
          </span>
        )}
      </div>
    </div>
  )

  const head = (
    <div className="rfilters__head">
      <h2>
        <Filter size={15} aria-hidden="true" />
        فیلترها
      </h2>
      <button type="button" className={`rfilters__clear ${anyActive ? 'is-on' : ''}`} disabled={!anyActive} onClick={() => set({ goods: [], origin: [], dest: [], mode: [], from: MONTHS[0], to: LAST, ...MORE_EMPTY })}>
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
          فیلترها{anyActive ? ` (${fa(firstActive + moreCount(s))})` : ''}
        </button>
        {sheet && (
          <div className="rsheet" role="dialog" aria-modal="true" aria-label="فیلترها">
            <div className="rsheet__scrim" onClick={() => setSheet(false)} aria-hidden="true" />
            <div className="rsheet__body">
              {head}
              {fields}
              <MoreFields draft={draft} setDraft={setDraft} />
              <div className="rmore__foot">
                <button type="button" className="abtn abtn--primary abtn--sm" onClick={() => (set(draft), setSheet(false))}>
                  نمایش {fa(live.length)} مسیر
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    )

  // The card keeps its place; opened, it grows over the map (the wrapper holds the collapsed height)
  return (
    <div className="rfilters-wrap">
      <section className={`rfilters ${moreOpen ? 'is-open' : ''}`} aria-label="فیلترها">
        {head}
        {fields}
        {moreOpen && (
          <>
            <MoreFields draft={draft} setDraft={setDraft} />
            <div className="rmore__foot">
              <span className="rmore__count" aria-live="polite">
                با این فیلترها <strong>{fa(live.length)}</strong> مسیر نمونه · {money(liveValue)}
              </span>
              <button type="button" className="abtn abtn--ghost abtn--sm" onClick={() => setDraft(MORE_EMPTY)}>
                بازنشانی
              </button>
              <button
                type="button"
                className="abtn abtn--primary abtn--sm"
                onClick={() => {
                  set(draft)
                  setMoreOpen(false)
                }}
              >
                اعمال فیلترها
              </button>
            </div>
          </>
        )}
        <button type="button" className="rfilters__tab" aria-expanded={moreOpen} onClick={() => setMoreOpen(!moreOpen)}>
          {moreOpen ? 'فیلترهای کمتر' : 'فیلترهای بیشتر'}
          {!moreOpen && moreCount(s) > 0 && <span className="rfilters__n">{fa(moreCount(s))}</span>}
          {moreOpen ? <ChevronUp size={14} aria-hidden="true" /> : <ChevronDown size={14} aria-hidden="true" />}
        </button>
      </section>
      {moreOpen && <div className="rmore__scrim" onClick={() => setMoreOpen(false)} aria-hidden="true" />}
    </div>
  )
}

function MoreFields({ draft, setDraft }: { draft: More; setDraft: (m: More) => void }) {
  return (
    <div className="rfilters__row rfilters__row--more">
      <Field label="بندر بارگیری" opts={ports((r) => r.from)} value={draft.lp} onChange={(lp) => setDraft({ ...draft, lp })} search />
      <Field label="بندر تخلیه" opts={ports((r) => r.to)} value={draft.up} onChange={(up) => setDraft({ ...draft, up })} search />
      <Field label="گلوگاه سر راه" opts={viaOpts} value={draft.via} onChange={(via) => setDraft({ ...draft, via })} search />
      <Field label="چارک ارزش" single opts={quartOpts} value={draft.q ? [String(draft.q)] : []} onChange={(v) => setDraft({ ...draft, q: v[0] ? (Number(v[0]) as 1 | 2 | 3 | 4) : null })} />
      <Field label="شکل محموله" opts={formOpts} value={draft.form} onChange={(form) => setDraft({ ...draft, form })} />
    </div>
  )
}
