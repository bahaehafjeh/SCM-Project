import type { ReactNode } from 'react'
import { useId } from 'react'
import './Section.css'

/** A titled content region. Surface="card" draws a panel; "plain" relies on spacing only. */
export function Section({
  title,
  description,
  actions,
  footer,
  surface = 'card',
  children,
}: {
  title: string
  description?: ReactNode
  actions?: ReactNode
  footer?: ReactNode
  surface?: 'card' | 'plain'
  children: ReactNode
}) {
  const id = useId()
  return (
    <section className={`section section--${surface}`} aria-labelledby={id}>
      <div className="section__head">
        <div>
          <h2 id={id}>{title}</h2>
          {description && <p className="section__description">{description}</p>}
        </div>
        {actions && <div className="section__actions">{actions}</div>}
      </div>
      <div className="section__body">{children}</div>
      {footer && <div className="section__footer">{footer}</div>}
    </section>
  )
}
