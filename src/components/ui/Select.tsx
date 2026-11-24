import { useEffect, useId, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import './Select.css'

export interface SelectOption {
  value: string
  label: string
}

// Arabic and Persian forms of ی/ک match each other in the search.
const norm = (s: string) => s.replace(/ي/g, 'ی').replace(/ك/g, 'ک').toLowerCase()

/**
 * Design-system select: labelled trigger, popover with a search field and a checked listbox.
 * Keyboard: Enter/Space/↓ opens, ↑/↓ move, Enter picks, Escape closes and returns focus.
 */
export function Select({
  label,
  value,
  options,
  onChange,
  searchPlaceholder,
}: {
  label: string
  value: string
  options: SelectOption[]
  onChange: (value: string) => void
  searchPlaceholder: string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const id = useId()
  const current = options.find((o) => o.value === value)
  const shown = options.filter((o) => norm(o.label).includes(norm(query.trim())))

  useEffect(() => {
    if (!open) return
    setQuery('')
    setActive(Math.max(0, options.findIndex((o) => o.value === value)))
    searchRef.current?.focus()
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [open, options, value])

  const close = () => {
    setOpen(false)
    triggerRef.current?.focus()
  }
  const pick = (v: string) => {
    onChange(v)
    close()
  }

  const onTriggerKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
    }
  }
  const onSearchKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => Math.min(i + 1, shown.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (shown[active]) pick(shown[active].value)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      close()
    } else if (e.key === 'Tab') {
      setOpen(false)
    }
  }

  return (
    <div className="ds-select" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className="ds-select__trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onTriggerKey}
      >
        <span className="ds-select__label">{label}</span>
        <span className="ds-select__value">{current?.label}</span>
        <ChevronDown size={16} aria-hidden="true" className="ds-select__chevron" />
      </button>
      {open && (
        <div className="ds-select__pop">
          <input
            ref={searchRef}
            type="text"
            className="ds-select__search"
            placeholder={searchPlaceholder}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setActive(0)
            }}
            onKeyDown={onSearchKey}
            role="combobox"
            aria-expanded="true"
            aria-controls={`${id}-list`}
            aria-activedescendant={shown[active] ? `${id}-${shown[active].value}` : undefined}
            aria-label={searchPlaceholder}
            autoComplete="off"
          />
          <ul id={`${id}-list`} role="listbox" aria-label={label} className="ds-select__list">
            {shown.map((o, i) => (
              <li
                key={o.value}
                id={`${id}-${o.value}`}
                role="option"
                aria-selected={o.value === value}
                className={`ds-select__option ${i === active ? 'is-active' : ''}`}
                onPointerEnter={() => setActive(i)}
                onClick={() => pick(o.value)}
              >
                <span>{o.label}</span>
                {o.value === value && <Check size={16} aria-hidden="true" />}
              </li>
            ))}
            {shown.length === 0 && <li className="ds-select__empty">موردی یافت نشد</li>}
          </ul>
        </div>
      )}
    </div>
  )
}
