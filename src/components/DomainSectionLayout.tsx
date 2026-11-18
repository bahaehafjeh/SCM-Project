import { NavLink, Outlet } from 'react-router-dom'
import { sectionById, routesOfSection } from '../config/routes'
import { PageHeader } from './PageHeader'
import './DomainSectionLayout.css'

/**
 * PT-2 domain section: one shared header and a URL-based sub-navigation
 * (links, not tabs: each page has its own address and browser history).
 */
export function DomainSectionLayout({ sectionId }: { sectionId: string }) {
  const section = sectionById(sectionId)
  const pages = routesOfSection(sectionId)

  return (
    <>
      <PageHeader
        title={section.label}
        description={section.description}
        status={section.status}
      >
        <nav className="section-nav" aria-label={`بخش‌های ${section.label}`}>
          <ul>
            {pages.map((p) => {
              const Icon = p.icon
              return (
                <li key={p.id}>
                  <NavLink to={p.path} end className="section-nav__link">
                    <Icon size={16} aria-hidden="true" />
                    {p.label}
                  </NavLink>
                </li>
              )
            })}
          </ul>
        </nav>
      </PageHeader>
      <Outlet />
    </>
  )
}
