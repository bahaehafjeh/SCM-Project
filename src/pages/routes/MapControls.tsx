import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { Globe, LocateFixed, Map as MapIcon, Minus, Pause, Play, Plus, Table } from 'lucide-react'
import { MONTHS } from '../../data/routes'
import type { Month } from '../../data/routes'
import { isIncompleteMonth } from '../../lib/routes/metrics'
import type { View } from '../../lib/routes/url'
import { gregorianMonth, monthNumber, persianMonth, yearOf } from './format'

const VIEWS: { key: View; label: string; icon: typeof MapIcon }[] = [
  { key: '2d', label: 'دوبعدی', icon: MapIcon },
  { key: '3d', label: 'سه‌بعدی', icon: Globe },
  { key: 'table', label: 'جدول', icon: Table },
]

/** «به سمت ایران» and the view segment (top, routes-map-prompt §5-4) */
export function ViewBar({ view, onView, iran, onIran, iranAvailable }: { view: View; onView: (v: View) => void; iran: boolean; onIran: (on: boolean) => void; iranAvailable: boolean }) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({})
  const onKey = (e: KeyboardEvent) => {
    const i = VIEWS.findIndex((v) => v.key === view)
    const to = e.key === 'ArrowLeft' ? i + 1 : e.key === 'ArrowRight' ? i - 1 : null
    if (to === null) return
    e.preventDefault()
    const v = VIEWS[(to + VIEWS.length) % VIEWS.length].key
    onView(v)
    refs.current[v]?.focus()
  }
  return (
    <div className="rctl rctl--bar">
      <label className={`rswitch ${iranAvailable ? '' : 'is-off'}`}>
        <button type="button" role="switch" aria-checked={iran} disabled={!iranAvailable} className="rswitch__track" onClick={() => onIran(!iran)}>
          <span className="rswitch__thumb" aria-hidden="true" />
        </button>
        به سمت ایران
      </label>
      <span className="rctl__sep" aria-hidden="true" />
      <div className="rseg" role="radiogroup" aria-label="نما" onKeyDown={onKey}>
        {VIEWS.map((v) => (
          <button
            key={v.key}
            ref={(el) => {
              refs.current[v.key] = el
            }}
            type="button"
            role="radio"
            aria-checked={view === v.key}
            tabIndex={view === v.key ? 0 : -1}
            className="rseg__item"
            onClick={() => onView(v.key)}
          >
            <v.icon size={14} aria-hidden="true" />
            {v.label}
          </button>
        ))}
      </div>
    </div>
  )
}

/** Zoom column (bottom left) */
export function ZoomColumn({ onIn, onOut, onLocate }: { onIn: () => void; onOut: () => void; onLocate: () => void }) {
  return (
    <div className="rzoom" role="group" aria-label="بزرگ‌نمایی">
      <button type="button" className="rglass-btn" onClick={onIn} aria-label="بزرگ‌نمایی" title="بزرگ‌نمایی">
        <Plus size={16} aria-hidden="true" />
      </button>
      <button type="button" className="rglass-btn" onClick={onOut} aria-label="کوچک‌نمایی" title="کوچک‌نمایی">
        <Minus size={16} aria-hidden="true" />
      </button>
      <button type="button" className="rglass-btn" onClick={onLocate} aria-label="بازگشت به نمای انتخاب" title="بازگشت به نمای انتخاب">
        <LocateFixed size={16} aria-hidden="true" />
      </button>
    </div>
  )
}

/**
 * Time-lapse (bottom right): play steps one month a second, once, from the chosen month to the end,
 * and stops on the incomplete month with a note. Picking a month reads every figure for that month.
 */
export function TimeLapse({ month, onMonth }: { month: Month | null; onMonth: (m: Month | null) => void }) {
  const [playing, setPlaying] = useState(false)
  const [note, setNote] = useState(false)
  const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const monthRef = useRef(month)
  monthRef.current = month

  useEffect(() => {
    if (!playing) return
    const t = setInterval(
      () => {
        const i = monthRef.current ? MONTHS.indexOf(monthRef.current) : -1
        const next = MONTHS[i + 1]
        if (!next) {
          setPlaying(false)
          return
        }
        onMonth(next)
        if (isIncompleteMonth(next)) {
          setPlaying(false)
          setNote(true)
        }
      },
      reduce ? 250 : 1000,
    )
    return () => clearInterval(t)
  }, [playing, onMonth, reduce])
  useEffect(() => {
    if (!note) return
    const t = setTimeout(() => setNote(false), 4000)
    return () => clearTimeout(t)
  }, [note])

  return (
    <div className={`rctl rctl--time ${reduce ? 'is-reduced' : ''}`}>
      <button
        type="button"
        className="rtime__play"
        aria-label={playing ? 'توقف' : 'پخش ماه‌به‌ماه'}
        title={playing ? 'توقف' : 'پخش ماه‌به‌ماه'}
        onClick={() => {
          if (playing) return setPlaying(false)
          // From the chosen month; from the start when none is chosen or the last one is
          if (!month || isIncompleteMonth(month)) onMonth(MONTHS[0])
          setNote(false)
          setPlaying(true)
        }}
      >
        {playing ? <Pause size={14} aria-hidden="true" /> : <Play size={14} aria-hidden="true" />}
      </button>
      <div className="rtime__months" role="group" aria-label="ماه">
        {MONTHS.map((m, i) => {
          const incomplete = isIncompleteMonth(m)
          return (
            <button key={m} type="button" className={`rtime__m ${month === m ? 'is-on' : ''} ${incomplete ? 'is-incomplete' : ''}`} aria-pressed={month === m} title={`${persianMonth(m)} · ${gregorianMonth(m)}${incomplete ? ' · ماه ناقص' : ''}`} onClick={() => onMonth(month === m ? null : m)}>
              <span>{monthNumber(m)}</span>
              {(i === 0 || m.endsWith('-01')) && <span className="rtime__y">{yearOf(m)}</span>}
            </button>
          )
        })}
      </div>
      {note && (
        <span className="rtime__note" role="status">
          داده این ماه کامل نیست
        </span>
      )}
    </div>
  )
}
