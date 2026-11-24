import type { AppRoute } from '../config/routes'
import { sectionById, routeById } from '../config/routes'
import type { Crumb } from '../components/PageHeader'

/**
 * Breadcrumb shown in the header (docs/04 §5.2). Sidebar section titles («مرکز کنترل»,
 * «برنامه‌ریزی و اقدام») are labels, not levels, so they never appear. Every page opened from the
 * menu, inside a menu group or not (e.g. «نقشه مسیرها» under «تحلیل تجارت»), is not an inner page and
 * gets no breadcrumb (owner's call). Domain pages hang under «پوشش داده‌ها», which is where they are
 * opened from; detail pages set their own trail through PageHeader or setPageCrumbs.
 */
export function crumbsFor(route: AppRoute): Crumb[] {
  if (route.section) {
    const s = sectionById(route.section)
    const coverage = routeById('supply-coverage')
    // Domain sections hang under «پوشش داده‌ها»; settings stands on its own («تنظیمات / سناریوهای آماده»)
    const crumbs: Crumb[] = s.domain === 'supply-chain' ? [{ label: coverage.label, to: coverage.path }] : []
    crumbs.push(route.path === s.basePath ? { label: s.label } : { label: s.label, to: s.basePath })
    if (route.path !== s.basePath) crumbs.push({ label: route.label })
    return crumbs
  }
  return []
}
