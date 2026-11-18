import { useEffect, useId, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, LogOut, Moon, Settings, UserRound } from 'lucide-react'
import { currentUser, initialsOf } from '../../config/user'
import { signOut } from '../../lib/session'
import { applyTheme, readTheme } from '../../lib/theme'
import type { Theme } from '../../lib/theme'

/**
 * Profile pill with its menu: account, dark-mode switch, and sign-out set apart below a divider.
 * Escape or a click outside closes it and returns focus to the pill.
 */
export function UserMenu() {
  const [open, setOpen] = useState(false)
  const [theme, setTheme] = useState<Theme>(readTheme)
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const id = useId()

  useEffect(() => {
    if (!open) return
    menuRef.current?.querySelector<HTMLElement>('[role^="menuitem"]:not([aria-disabled="true"])')?.focus()
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        buttonRef.current?.focus()
      }
    }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  // ↑/↓ move between the enabled items
  const onMenuKey = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
    e.preventDefault()
    const items = Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role^="menuitem"]:not([aria-disabled="true"])') ?? [])
    const i = items.indexOf(document.activeElement as HTMLElement)
    items[(i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus()
  }

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    applyTheme(next)
    setTheme(next)
  }

  return (
    <div className="tb-user-wrap" ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        className="tb-user"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="tb-user__avatar" aria-hidden="true">
          {initialsOf(currentUser.name)}
        </span>
        <span className="tb-user__text">
          <span className="tb-user__name">{currentUser.name}</span>
          <span className="tb-user__title">{currentUser.title}</span>
        </span>
        <ChevronDown size={16} aria-hidden="true" className="tb-user__chevron" />
      </button>

      {open && (
        <div id={id} ref={menuRef} role="menu" aria-label="منوی کاربر" className="tb-menu" onKeyDown={onMenuKey}>
          <button type="button" role="menuitem" className="tb-menu__item" aria-disabled="true" tabIndex={-1}>
            <UserRound size={17} aria-hidden="true" />
            <span className="tb-menu__label">حساب کاربری</span>
            <span className="tb-menu__soon">به‌زودی</span>
          </button>
          <button
            type="button"
            role="menuitem"
            className="tb-menu__item"
            onClick={() => {
              setOpen(false)
              navigate('/settings')
            }}
          >
            <Settings size={17} aria-hidden="true" />
            <span className="tb-menu__label">تنظیمات</span>
          </button>
          <button
            type="button"
            role="menuitemcheckbox"
            aria-checked={theme === 'dark'}
            className="tb-menu__item"
            onClick={toggleTheme}
          >
            <Moon size={17} aria-hidden="true" />
            <span className="tb-menu__label">حالت تیره</span>
            <span className="tb-switch" aria-hidden="true">
              <span className="tb-switch__thumb" />
            </span>
          </button>
          <div className="tb-menu__sep" role="separator" />
          <button
            type="button"
            role="menuitem"
            className="tb-menu__item tb-menu__item--danger"
            onClick={() => {
              signOut()
              navigate('/login')
            }}
          >
            <LogOut size={17} aria-hidden="true" />
            <span className="tb-menu__label">خروج از سیستم</span>
          </button>
        </div>
      )}
    </div>
  )
}
