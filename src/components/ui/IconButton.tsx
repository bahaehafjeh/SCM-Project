import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/utils'

/**
 * Round icon-only button, the same one the top bar uses (search, notifications): bordered, card
 * surface, lifts on hover. `label` is the accessible name and the tooltip.
 */
export function IconButton({
  label,
  size = 'md',
  className,
  children,
  ...props
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'> & { label: string; size?: 'sm' | 'md'; children: ReactNode }) {
  return (
    <button type="button" className={cn('tb-icon', size === 'sm' && 'tb-icon--sm', className)} aria-label={label} title={label} {...props}>
      {children}
    </button>
  )
}
