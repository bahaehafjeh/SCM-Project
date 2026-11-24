import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'

type Win = [number, number]
const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x))
/** Narrowest window: three months */
const MIN_SPAN = 2

/**
 * Mouse-wheel zoom on a time chart: scrolling up narrows the window around the month under the
 * pointer, scrolling down widens it. At either limit (three months, or the whole range) the wheel
 * is left alone, so the page scrolls on as usual. `inset` is the plot area's distance from the
 * element's left and right edges (the y-axis and margins), so the pointer maps to the right month.
 */
export function useWheelZoom(el: RefObject<HTMLElement | null>, n: number, win: Win, onChange: (w: Win) => void, inset: { left: number; right: number }) {
  // The listener is attached once per element; the latest values are read through a ref
  const live = useRef({ n, win, onChange, inset })
  live.current = { n, win, onChange, inset }
  useEffect(() => {
    const node = el.current
    if (!node) return
    const onWheel = (e: WheelEvent) => {
      const { n, win, onChange, inset } = live.current
      if (n < 4 || e.deltaY === 0) return
      const [a, b] = win
      const span = b - a
      const zoomIn = e.deltaY < 0
      const next = clamp(zoomIn ? Math.min(span - 1, Math.round(span * 0.8)) : Math.max(span + 1, Math.round(span * 1.25)), Math.min(MIN_SPAN, n - 1), n - 1)
      if (next === span) return
      e.preventDefault()
      const r = node.getBoundingClientRect()
      const f = clamp((e.clientX - r.left - inset.left) / Math.max(1, r.width - inset.left - inset.right), 0, 1)
      const pivot = a + f * span
      const na = clamp(Math.round(pivot - f * next), 0, n - 1 - next)
      onChange([na, na + next])
    }
    node.addEventListener('wheel', onWheel, { passive: false })
    return () => node.removeEventListener('wheel', onWheel)
    // Re-attached once the chart (and its element) appears, e.g. after loading
  }, [el, n >= 4])
}
