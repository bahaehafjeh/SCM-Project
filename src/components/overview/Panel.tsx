import type { CSSProperties, ReactNode } from 'react'
import { useId } from 'react'
import { CircleAlert, Inbox, Info, RotateCw } from 'lucide-react'

export type PanelState = 'ready' | 'loading' | 'empty' | 'error'

// Design review aid: ?state=loading|empty|error shows that state on every panel.
const previewState = (() => {
  const s = new URLSearchParams(window.location.search).get('state')
  return s === 'loading' || s === 'empty' || s === 'error' ? s : null
})()

/**
 * Overview panel: one surface, title block, optional actions. `guide` is the panel's reading note,
 * shown from an info icon beside the title on hover or focus (replaces the old footnotes).
 * `sample` marks a panel whose data is a design sample (class only; the owner removed the visible badge).
 * `state` swaps the body for a loading skeleton, an empty message or an error with retry.
 */
export function Panel({
  title,
  subtitle,
  actions,
  guide,
  sample = false,
  state = 'ready',
  emptyText = 'برای این بخش داده‌ای نیست.',
  emptyAction,
  onRetry,
  className = '',
  index = 0,
  titleAdornment,
  children,
}: {
  title: string
  subtitle?: ReactNode
  actions?: ReactNode
  guide?: ReactNode
  sample?: boolean
  state?: PanelState
  emptyText?: string
  /** A way out of the empty state (e.g. «تغییر بازه») */
  emptyAction?: ReactNode
  onRetry?: () => void
  className?: string
  /** Position in the reveal sequence */
  index?: number
  titleAdornment?: ReactNode
  children: ReactNode
}) {
  const id = useId()
  const shown = previewState ?? state
  return (
    <section className={`ov-panel ${sample ? 'ov-panel--sample' : ''} ${className}`} aria-labelledby={id} aria-busy={shown === 'loading' || undefined} style={{ '--i': index } as CSSProperties}>
      <header className="ov-panel__head">
        <div className="ov-panel__titles">
          <h2 id={id} className="ov-panel__title">
            {titleAdornment}
            {title}
            {guide && (
              <span className="ov-guide" tabIndex={0} aria-label="راهنما" aria-describedby={`${id}-guide`}>
                <Info size={16} aria-hidden="true" />
                <span id={`${id}-guide`} role="tooltip" className="ov-guide__pop">
                  {guide}
                </span>
              </span>
            )}
          </h2>
          {subtitle && <p className="ov-panel__subtitle">{subtitle}</p>}
        </div>
        {actions && shown === 'ready' && <div className="ov-panel__actions">{actions}</div>}
      </header>
      <div className="ov-panel__body">
        {shown === 'ready' && children}
        {shown === 'loading' && (
          <div className="ov-state ov-state--loading" aria-label="در حال بارگیری">
            <span className="ov-skel ov-skel--lg" />
            <span className="ov-skel" />
            <span className="ov-skel ov-skel--sm" />
          </div>
        )}
        {shown === 'empty' && (
          <div className="ov-state">
            <Inbox size={22} aria-hidden="true" />
            <p>{emptyText}</p>
            {emptyAction}
          </div>
        )}
        {shown === 'error' && (
          <div className="ov-state ov-state--error" role="alert">
            <CircleAlert size={22} aria-hidden="true" />
            <p>بارگیری داده این بخش انجام نشد. آخرین داده موجود را نمی‌توان نشان داد.</p>
            <button type="button" className="ov-btn" onClick={onRetry ?? (() => window.location.reload())}>
              <RotateCw size={14} aria-hidden="true" />
              تلاش دوباره
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
