import { useState } from 'react'
import type { CSSProperties } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'
import { navTree, routeById } from '../../config/routes'
import type { NavNode } from '../../config/routes'
import { Badge, RouteStatusBadge } from '../Badge'
import { useAlertBuckets } from '../../lib/alertCounts'
import { useAlertState } from '../../lib/alertStore'
import { currentUser } from '../../lib/access'
import { turnOf } from '../../lib/actionRules'
import { formatNumber } from '../../lib/format'
import { Logo } from './Logo'
import './Sidebar.css'

const activeFor = (pathname: string, path: string, prefix?: string) => pathname === path || (!!prefix && (pathname === prefix || pathname.startsWith(prefix + '/')))

/** «هشدارها»: how many alerts wait for review (nothing when none) */
function AlertsCount() {
  const n = useAlertBuckets().review
  if (!n) return null
  return (
    <Badge tone="danger" title={`${formatNumber(n)} هشدار نیازمند بررسی`}>
      <span aria-hidden="true">{formatNumber(n)}</span>
      <span className="visually-hidden">{`${formatNumber(n)} هشدار نیازمند بررسی`}</span>
    </Badge>
  )
}

/** «اقدام‌ها»: how many wait for the current user (§8) */
function ActionsCount() {
  const st = useAlertState()
  const me = currentUser()
  const now = Date.now()
  const n = Object.values(st.actions).filter((a) => turnOf(a, me, now) === 'mine').length
  if (!n) return null
  return (
    <Badge tone="info" title={`${formatNumber(n)} اقدام منتظر شما`}>
      <span aria-hidden="true">{formatNumber(n)}</span>
      <span className="visually-hidden">{`${formatNumber(n)} اقدام منتظر شما`}</span>
    </Badge>
  )
}

function RouteItem({ id, prefix, child = false }: { id: string; prefix?: string; child?: boolean }) {
  const { pathname } = useLocation()
  const r = routeById(id)
  const active = activeFor(pathname, r.path, prefix)
  const Icon = r.icon
  return (
    <li>
      <NavLink to={r.path} end className={`sb-link ${child ? 'sb-link--child' : ''} ${r.status === 'in-development' ? 'sb-link--soon' : ''}`} aria-current={active ? 'page' : undefined} title={r.label}>
        <Icon size={child ? 15 : 18} strokeWidth={1.75} aria-hidden="true" className="sb-link__icon" />
        <span className="sb-link__label">{r.label}</span>
        {r.status === 'in-development' && <RouteStatusBadge status={r.status} />}
        {id === 'alerts' && <AlertsCount />}
        {id === 'planning-actions' && <ActionsCount />}
      </NavLink>
    </li>
  )
}

function Group({ node }: { node: Extract<NavNode, { kind: 'group' }> }) {
  const { pathname } = useLocation()
  const activeIndex = node.children.findIndex((c) => pathname === routeById(c).path)
  const hasActive = activeIndex >= 0
  const [open, setOpen] = useState(true)
  const expanded = open || hasActive
  const Icon = node.icon
  const id = `sb-group-${node.key}`
  return (
    <li>
      <button type="button" className={`sb-link sb-group ${hasActive ? 'sb-group--active' : ''}`} aria-expanded={expanded} aria-controls={id} onClick={() => setOpen((o) => !o)} title={node.label}>
        <Icon size={18} strokeWidth={1.75} aria-hidden="true" className="sb-link__icon" />
        <span className="sb-link__label">{node.label}</span>
        <ChevronDown size={16} aria-hidden="true" className="sb-group__chevron" />
      </button>
      {/* Height animates via grid rows; inert keeps collapsed links out of the tab order */}
      <div className="sb-collapse" data-open={expanded} inert={!expanded}>
        <ul id={id} className="sb-children" data-active={hasActive || undefined} style={hasActive ? ({ '--sb-active': activeIndex } as CSSProperties) : undefined}>
          {node.children.map((c) => (
            <RouteItem key={c} id={c} child />
          ))}
        </ul>
      </div>
    </li>
  )
}

export function Sidebar({ id, rail }: { id: string; rail: boolean }) {
  return (
    <aside className="sidebar" id={id} aria-label="ناوبری اصلی">
      <div className="sb-brand">
        <Logo compact={rail} />
      </div>

      <nav className="sb-nav" aria-label="بخش‌های سامانه">
        {navTree.map((section) => (
          <div key={section.label} className="sb-section">
            <p className="sb-section__label">{section.label}</p>
            <ul className="sb-list">{section.items.map((n) => (n.kind === 'route' ? <RouteItem key={n.route} id={n.route} prefix={n.matchPrefix} /> : <Group key={n.key} node={n} />))}</ul>
          </div>
        ))}
      </nav>
    </aside>
  )
}
