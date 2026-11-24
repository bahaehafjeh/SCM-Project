import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'

const GAP = 6
const EDGE = 8

/**
 * A small popover beside its button: Esc or a click outside closes it and focus goes back to the
 * button; the button carries aria-expanded. Used for «داده‌ی مبنا» and «هزینه‌ی این سناریو».
 * Children may be a function of `close`, for an action inside that ends the popover (e.g. «بگذار»).
 * The box is fixed to the viewport, so a scrolling table around it never clips it: it opens under
 * the button (above when there is no room), starting from the button's start edge, kept on screen.
 */
export function Popover({ label, button, className = '', title, children, disabled }: { label: string; button: ReactNode; className?: string; title?: string; children: ReactNode | ((close: () => void) => ReactNode); disabled?: boolean }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<CSSProperties>({ visibility: 'hidden' })
  const wrap = useRef<HTMLDivElement>(null)
  const btn = useRef<HTMLButtonElement>(null)
  const boxRef = useRef<HTMLDivElement>(null)
  const id = useId()

  useLayoutEffect(() => {
    if (!open) return
    const place = () => {
      const b = btn.current?.getBoundingClientRect()
      const box = boxRef.current
      if (!b || !box) return
      const w = box.offsetWidth
      const h = box.offsetHeight
      const rtl = getComputedStyle(box).direction === 'rtl'
      // Start edge: the button's right edge in RTL
      const left = Math.min(Math.max(rtl ? b.right - w : b.left, EDGE), window.innerWidth - w - EDGE)
      const below = b.bottom + GAP + h <= window.innerHeight - EDGE || b.top - GAP - h < EDGE
      // right/bottom auto: no stylesheet inset may pull it off the computed spot
      setPos({ left, top: below ? b.bottom + GAP : b.top - GAP - h, right: 'auto', bottom: 'auto', visibility: 'visible' })
    }
    place()
    // Its content can grow (a changed price adds a line): place it again so it stays on screen
    const ro = new ResizeObserver(place)
    if (boxRef.current) ro.observe(boxRef.current)
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const close = (refocus: boolean) => {
      setOpen(false)
      setPos({ visibility: 'hidden' })
      if (refocus) btn.current?.focus()
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close(true)
    const onDown = (e: PointerEvent) => !wrap.current?.contains(e.target as Node) && close(false)
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onDown)
    }
  }, [open])

  return (
    <div className={`scn-pop ${className}`} ref={wrap}>
      <button ref={btn} type="button" className="scn-pop__btn" aria-expanded={open} aria-controls={id} aria-haspopup="dialog" title={title} disabled={disabled} onClick={(e) => (e.stopPropagation(), setOpen(!open))}>
        {button}
      </button>
      {open && (
        <div ref={boxRef} id={id} className="scn-pop__box" role="dialog" aria-label={label} style={pos} onClick={(e) => e.stopPropagation()}>
          {typeof children === 'function' ? children(() => (setOpen(false), setPos({ visibility: 'hidden' }), btn.current?.focus())) : children}
        </div>
      )}
    </div>
  )
}
