import { useEffect, useRef, useState } from 'react'
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { pageItems } from '../../lib/industry/derive'
import { fa, signed } from '../../lib/industry/format'
import { Arrow } from './parts'

export const PAGE_SIZES = [10, 20, 50] as const
export type PageSize = (typeof PAGE_SIZES)[number]

/** A change in percent inside a table: chevron and signed figure in green or red; flat grey; missing «—» */
export function TableChange({ v }: { v: number | null }) {
  if (v == null) return <span className="ind-muted">—</span>
  if (Math.abs(v) < 0.05) return <span className="ind-muted n">۰٪</span>
  return (
    <span className={`ind-tchg ${v > 0 ? 'is-up' : 'is-down'}`}>
      <Arrow up={v > 0} size={13} />
      <span className="n">{signed(v, 1)}٪</span>
    </span>
  )
}
export const Num = ({ v, d = 0 }: { v: number | null; d?: number }) => (v == null ? <span className="ind-muted">—</span> : <span className="n">{fa(v, d)}</span>)

/** The tables' footer: «صفحه x از y», rows per page, and the page numbers */
export function TablePager({ page, pages, size, disabled, onPage, onSize }: { page: number; pages: number; size: PageSize; disabled: boolean; onPage: (p: number) => void; onSize: (s: PageSize) => void }) {
  const [menu, setMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const sizeBtn = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!menu) return
    const key = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setMenu(false)
      sizeBtn.current?.focus()
    }
    const down = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenu(false)
    }
    document.addEventListener('keydown', key)
    document.addEventListener('pointerdown', down)
    return () => (document.removeEventListener('keydown', key), document.removeEventListener('pointerdown', down))
  }, [menu])
  return (
    <div className="ind-pg">
      <div className="ind-pg__side">
        <span>
          صفحه <b className="n">{fa(page)}</b> از <b className="n">{fa(pages)}</b>
        </span>
        <div ref={menuRef} className="ind-pos">
          <button ref={sizeBtn} type="button" className="ind-btn ind-btn--sm ind-size" aria-haspopup="listbox" aria-expanded={menu} disabled={disabled} onClick={() => setMenu(!menu)}>
            {fa(size)} / صفحه
            <ChevronDown size={16} aria-hidden="true" />
          </button>
          {menu && (
            <ul className="ind-menu ind-menu--up" role="listbox" aria-label="تعداد در صفحه">
              {PAGE_SIZES.map((s) => (
                <li key={s} role="option" aria-selected={s === size}>
                  <button
                    type="button"
                    className={s === size ? 'is-on' : ''}
                    onClick={() => {
                      onSize(s)
                      setMenu(false)
                      sizeBtn.current?.focus()
                    }}
                  >
                    {fa(s)} / صفحه
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <div className="ind-pg__nums">
        <button type="button" className="ind-pg__btn" aria-label="صفحه قبل" disabled={page <= 1 || disabled} onClick={() => onPage(page - 1)}>
          <ChevronRight size={16} aria-hidden="true" />
        </button>
        {pageItems(page, pages).map((x, i) =>
          x === '…' ? (
            <span key={`gap-${i}`} className="ind-pg__gap">
              …
            </span>
          ) : (
            <button key={x} type="button" className={`ind-pg__btn ${x === page ? 'is-on' : ''}`} aria-current={x === page ? 'page' : undefined} disabled={disabled} onClick={() => onPage(x)}>
              <span className="n">{fa(x)}</span>
            </button>
          ),
        )}
        <button type="button" className="ind-pg__btn" aria-label="صفحه بعد" disabled={page >= pages || disabled} onClick={() => onPage(page + 1)}>
          <ChevronLeft size={16} aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}
