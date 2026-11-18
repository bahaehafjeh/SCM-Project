import { useEffect, useState } from 'react'
import type { RefObject } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Menu } from 'lucide-react'
import { routeByPath } from '../../config/routes'
import { crumbsFor } from '../../lib/crumbs'
import { usePageCrumbs } from '../../lib/pageCrumbs'
import { NotificationsBell } from './NotificationsBell'
import { RouteSearch } from './RouteSearch'
import { UserMenu } from './UserMenu'
import './Topbar.css'

/** Opens the alerts page on «نیازمند بررسی»; the dot shows only while an alert waits for review. */
export function Topbar({
  onToggleNav,
  navExpanded,
  sidebarId,
  toggleRef,
}: {
  onToggleNav: () => void
  navExpanded: boolean
  sidebarId: string
  toggleRef: RefObject<HTMLButtonElement | null>
}) {
  const { pathname } = useLocation()
  const route = routeByPath(pathname)
  const pageCrumbs = usePageCrumbs()
  const crumbs = pageCrumbs ?? (route ? crumbsFor(route) : [])
  // Sticky header: transparent at the top, a frosted surface once content scrolls beneath it
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 4)
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])
  return (
    <header className={`topbar ${scrolled ? 'is-scrolled' : ''}`}>
      <button
        ref={toggleRef}
        type="button"
        className="tb-toggle"
        onClick={onToggleNav}
        aria-expanded={navExpanded}
        aria-controls={sidebarId}
        aria-label={navExpanded ? 'بستن منو' : 'باز کردن منو'}
      >
        <Menu size={18} aria-hidden="true" />
      </button>
      {crumbs.length > 0 && (
        <nav aria-label="مسیر صفحه" className="tb-crumbs">
          <ol>
            {crumbs.map((c, i) => {
              const last = i === crumbs.length - 1
              return (
                <li key={c.label + i} aria-current={last ? 'page' : undefined}>
                  {c.to && !last ? <Link to={c.to}>{c.label}</Link> : <span>{c.label}</span>}
                </li>
              )
            })}
          </ol>
        </nav>
      )}
      <div className="tb-actions">
        <RouteSearch />
        <NotificationsBell />
        <UserMenu />
      </div>
    </header>
  )
}
