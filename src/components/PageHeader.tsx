import { useEffect } from 'react'
import type { ReactNode } from 'react'
import type { RouteStatus } from '../config/routes'
import { setPageCrumbs } from '../lib/pageCrumbs'
import { RouteStatusBadge } from './Badge'
import './PageHeader.css'

export interface Crumb {
  label: string
  to?: string
}

/**
 * Title block shared by every page and by domain sections. Content comes from the route registry.
 * Its breadcrumb is shown in the top bar, not above the title.
 */
export function PageHeader({
  title,
  description,
  status,
  crumbs = [],
  currentCrumb,
  meta,
  children,
}: {
  /** Label of the last crumb when it differs from the title (pages inside a section) */
  currentCrumb?: string
  title: string
  description: string
  status?: RouteStatus
  /** Ancestors only; the current page is appended automatically */
  crumbs?: Crumb[]
  meta?: ReactNode
  /** Rendered under the title, e.g. a section sub-navigation */
  children?: ReactNode
}) {
  const trail = crumbs.length ? JSON.stringify([...crumbs, { label: currentCrumb ?? title }]) : ''
  useEffect(() => {
    if (!trail) return
    setPageCrumbs(JSON.parse(trail))
    return () => setPageCrumbs(null)
  }, [trail])
  return (
    <header className="page-header">
      <div className="page-header__row">
        <div className="page-header__titles">
          <div className="page-header__title-line">
            <h1>{title}</h1>
            {status && <RouteStatusBadge status={status} />}
          </div>
          <p className="page-header__description">{description}</p>
        </div>
        {meta && <div className="page-header__meta">{meta}</div>}
      </div>
      {children}
    </header>
  )
}
