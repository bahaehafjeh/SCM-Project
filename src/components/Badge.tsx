import type { ReactNode } from 'react'
import type { RouteStatus } from '../config/routes'
import { statusMeta } from '../config/routes'
import type { DataState, Tone } from '../domain/states'
import { dataStateMeta } from '../domain/states'
import './Badge.css'

export function Badge({ tone = 'neutral', children, title }: { tone?: Tone; children: ReactNode; title?: string }) {
  return (
    <span className={`badge badge--${tone}`} title={title}>
      {children}
    </span>
  )
}

const statusTone: Record<RouteStatus, Tone> = {
  available: 'success',
  migrating: 'info',
  'in-development': 'neutral',
  planned: 'neutral',
}

/** Application readiness of a destination. Renders nothing for available pages. */
export function RouteStatusBadge({ status }: { status: RouteStatus }) {
  const meta = statusMeta[status]
  if (!meta.label) return null
  return (
    <Badge tone={statusTone[status]} title={meta.description}>
      {meta.label}
    </Badge>
  )
}

/** Why a value is absent (missing, not collected, mock…). */
export function DataStateBadge({ state }: { state: Exclude<DataState, 'value'> }) {
  const meta = dataStateMeta[state]
  return (
    <Badge tone={meta.tone} title={meta.hint}>
      {meta.label}
    </Badge>
  )
}
