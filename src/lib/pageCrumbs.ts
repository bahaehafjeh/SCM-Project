import { useSyncExternalStore } from 'react'
import type { Crumb } from '../components/PageHeader'

/**
 * Crumbs a page sets for the top bar (pages that are not in the sidebar, e.g. «هشدارها»).
 * The top bar shows these when set, else the crumbs of the route.
 */
let crumbs: Crumb[] | null = null
const subs = new Set<() => void>()

export function setPageCrumbs(next: Crumb[] | null) {
  crumbs = next
  subs.forEach((f) => f())
}

export function usePageCrumbs() {
  return useSyncExternalStore(
    (cb) => {
      subs.add(cb)
      return () => subs.delete(cb)
    },
    () => crumbs,
  )
}
