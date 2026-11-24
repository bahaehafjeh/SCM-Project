import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from 'react'
import { faDigits, monthName } from '../../lib/industry/months'

type Win = [number, number]
const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x))
/** Narrowest window: three months */
const MIN_SPAN = 2
const VW = 1000
const VH = 30

/**
 * A miniature of the whole range under a chart, with a window the chart shows: drag the window to
 * move through time, drag its edges to zoom in or out, click the track to jump there, double-click
 * to see everything. Each edge is also a keyboard slider (←/→ one month, PageUp/PageDown one year).
 * Laid out left to right like the chart above it.
 */
export function RangeNavigator({ months, values, win, onChange, color, inset }: { months: string[]; values: (number | null)[]; win: Win; onChange: (w: Win) => void; color: string; inset: { left: number; right: number } }) {
  const n = months.length
  const [a, b] = win
  const track = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const el = track.current
    if (!el) return
    const ro = new ResizeObserver(() => setWidth(el.clientWidth))
    ro.observe(el)
    setWidth(el.clientWidth)
    return () => ro.disconnect()
  }, [])

  const pct = (i: number) => (n <= 1 ? 0 : (i / (n - 1)) * 100)
  const idxAt = (clientX: number) => {
    const r = track.current!.getBoundingClientRect()
    return Math.round(clamp((clientX - r.left) / r.width, 0, 1) * (n - 1))
  }
  const span = Math.min(MIN_SPAN, n - 1)
  const set = (na: number, nb: number) => {
    na = clamp(na, 0, n - 1)
    nb = clamp(nb, 0, n - 1)
    if (nb - na >= span) onChange([na, nb])
  }
  const shift = (d: number, from: Win = win) => {
    const k = clamp(d, -from[0], n - 1 - from[1])
    onChange([from[0] + k, from[1] + k])
  }

  // One pointer at a time: an edge, or the window body (also after a click on the bare track)
  const drag = useRef<{ kind: 'a' | 'b' | 'body'; start: number; win: Win } | null>(null)
  const [dragging, setDragging] = useState(false)
  const grab = (kind: 'a' | 'b' | 'body') => (e: ReactPointerEvent) => {
    e.stopPropagation()
    e.preventDefault()
    track.current?.setPointerCapture(e.pointerId)
    drag.current = { kind, start: idxAt(e.clientX), win }
    setDragging(true)
  }
  const onTrackDown = (e: ReactPointerEvent) => {
    const i = idxAt(e.clientX)
    const w = b - a
    const na = clamp(i - Math.floor(w / 2), 0, n - 1 - w)
    onChange([na, na + w])
    track.current?.setPointerCapture(e.pointerId)
    drag.current = { kind: 'body', start: i, win: [na, na + w] }
    setDragging(true)
  }
  const onMove = (e: ReactPointerEvent) => {
    const d = drag.current
    if (!d) return
    const i = idxAt(e.clientX)
    if (d.kind === 'a') set(Math.min(i, d.win[1] - span), d.win[1])
    else if (d.kind === 'b') set(d.win[0], Math.max(i, d.win[0] + span))
    else shift(i - d.start, d.win)
  }
  const onUp = () => {
    drag.current = null
    setDragging(false)
  }

  const key = (edge: 'a' | 'b' | 'body') => (e: ReactKeyboardEvent) => {
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : e.key === 'PageUp' ? 12 : e.key === 'PageDown' ? -12 : null
    if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault()
      if (edge === 'a') set(e.key === 'Home' ? 0 : b - span, b)
      else if (edge === 'b') set(a, e.key === 'End' ? n - 1 : a + span)
      else shift(e.key === 'Home' ? -a : n - 1 - b)
      return
    }
    if (step == null) return
    e.preventDefault()
    if (edge === 'a') set(Math.min(a + step, b - span), b)
    else if (edge === 'b') set(a, Math.max(b + step, a + span))
    else shift(step)
  }

  // The silhouette: one area per run of months with a value (a gap stays a gap)
  const max = Math.max(1e-9, ...values.filter((v): v is number => v != null))
  const X = (i: number) => (n <= 1 ? 0 : (i / (n - 1)) * VW)
  const Y = (v: number) => VH - (v / max) * (VH - 6)
  const runs: number[][] = []
  values.forEach((v, i) => {
    if (v == null) return
    const last = runs[runs.length - 1]
    if (last && last[last.length - 1] === i - 1) last.push(i)
    else runs.push([i])
  })
  const area = runs.map((r) => `M${X(r[0])} ${VH} ${r.map((i) => `L${X(i)} ${Y(values[i]!)}`).join(' ')} L${X(r[r.length - 1])} ${VH} Z`).join(' ')
  const line = runs.map((r) => r.map((i, k) => `${k ? 'L' : 'M'}${X(i)} ${Y(values[i]!)}`).join(' ')).join(' ')

  // Edge labels merge into one when they would touch
  const close = ((pct(b) - pct(a)) / 100) * width < 128

  return (
    <div className={`ind-nav ${dragging ? 'is-dragging' : ''}`} style={{ marginInline: `${inset.left}px ${inset.right}px` }} dir="ltr">
      <div ref={track} className="ind-nav__track" onPointerDown={onTrackDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onDoubleClick={() => onChange([0, n - 1])}>
        <svg className="ind-nav__svg" viewBox={`0 0 ${VW} ${VH}`} preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <clipPath id="ind-nav-win">
              <rect x={X(a)} y={0} width={Math.max(0, X(b) - X(a))} height={VH} />
            </clipPath>
          </defs>
          <path d={area} fill={color} fillOpacity={0.1} />
          <path d={line} fill="none" stroke={color} strokeOpacity={0.35} strokeWidth={1.2} vectorEffect="non-scaling-stroke" />
          <g clipPath="url(#ind-nav-win)">
            <path d={area} fill={color} fillOpacity={0.22} />
            <path d={line} fill="none" stroke={color} strokeWidth={1.4} vectorEffect="non-scaling-stroke" />
          </g>
        </svg>
        {/* Outside the window is dimmed */}
        <div className="ind-nav__mask" style={{ left: 0, width: `${pct(a)}%` }} aria-hidden="true" />
        <div className="ind-nav__mask" style={{ left: `${pct(b)}%`, right: 0 }} aria-hidden="true" />
        <div
          className="ind-nav__win"
          style={{ left: `${pct(a)}%`, width: `${pct(b) - pct(a)}%` }}
          role="slider"
          tabIndex={0}
          aria-label="جابه‌جایی بازه‌ی نمایش"
          aria-valuemin={0}
          aria-valuemax={n - 1}
          aria-valuenow={a}
          aria-valuetext={`${monthName(months[a])} تا ${monthName(months[b])}`}
          onPointerDown={grab('body')}
          onKeyDown={key('body')}
        />
        {(['a', 'b'] as const).map((edge) => {
          const i = edge === 'a' ? a : b
          return (
            <div
              key={edge}
              className="ind-nav__handle"
              style={{ left: `${pct(i)}%` }}
              role="slider"
              tabIndex={0}
              aria-label={edge === 'a' ? 'آغاز بازه‌ی نمایش' : 'پایان بازه‌ی نمایش'}
              aria-valuemin={0}
              aria-valuemax={n - 1}
              aria-valuenow={i}
              aria-valuetext={monthName(months[i])}
              onPointerDown={grab(edge)}
              onKeyDown={key(edge)}
            />
          )
        })}
        {close ? (
          <span className="ind-nav__tag" style={{ left: `clamp(56px, ${(pct(a) + pct(b)) / 2}%, calc(100% - 56px))` }}>
            {faDigits(months[a])} – {faDigits(months[b])}
          </span>
        ) : (
          <>
            <span className="ind-nav__tag" style={{ left: `clamp(30px, ${pct(a)}%, calc(100% - 30px))` }}>
              {faDigits(months[a])}
            </span>
            <span className="ind-nav__tag" style={{ left: `clamp(30px, ${pct(b)}%, calc(100% - 30px))` }}>
              {faDigits(months[b])}
            </span>
          </>
        )}
      </div>
    </div>
  )
}
