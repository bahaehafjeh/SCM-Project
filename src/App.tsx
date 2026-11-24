import { Suspense, lazy } from 'react'
import type React from 'react'
import { Navigate, createBrowserRouter, RouterProvider, useLocation } from 'react-router-dom'
import type { RouteObject } from 'react-router-dom'
import { routes, sections, routesOfSection } from './config/routes'
import { AppShell } from './components/shell/AppShell'
import { DomainSectionLayout } from './components/DomainSectionLayout'
import { PendingPage } from './pages/PendingPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { OverviewPage } from './pages/OverviewPage'
import { AlertsPage } from './pages/AlertsPage'
import { ScenarioPage } from './pages/ScenarioPage'
import { ScenarioTemplatesPage } from './pages/ScenarioTemplatesPage'
import { ActionsPage } from './pages/ActionsPage'
import { AuthLayout } from './pages/auth/AuthLayout'
import { LoginPage } from './pages/auth/LoginPage'
import { RegisterPage } from './pages/auth/RegisterPage'
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage'

// «نقشه مسیرها» carries the map library (about 1 MB): loaded only when the page is opened
const RoutesPage = lazy(() => import('./pages/routes/RoutesPage').then((m) => ({ default: m.RoutesPage })))
const IndustryPage = lazy(() => import('./pages/industry/IndustryPage').then((m) => ({ default: m.IndustryPage })))

// Pages built in later phases replace PendingPage here, keyed by route id.
const built: Record<string, () => React.JSX.Element> = {
  overview: () => <OverviewPage />,
  alerts: () => <AlertsPage />,
  'planning-scenarios': () => <ScenarioPage />,
  'settings-templates': () => <ScenarioTemplatesPage />,
  'planning-actions': () => <ActionsPage />,
  'trade-routes': () => (
    <Suspense fallback={<div className="ov-skel" style={{ height: 480 }} aria-label="در حال بارگذاری نقشه مسیرها" />}>
      <RoutesPage />
    </Suspense>
  ),
  'trade-industry': () => (
    <Suspense fallback={<div className="ov-skel" style={{ height: 480 }} aria-label="در حال بارگذاری داشبورد تحلیلی صنعت" />}>
      <IndustryPage />
    </Suspense>
  ),
}

/** Old «پیشنهادها» address: ?rec=REC-869 opens ACT-869 on «اقدام‌ها»; other parameters are kept */
function RecommendationsMoved() {
  const { search } = useLocation()
  const q = new URLSearchParams(search)
  const rec = q.get('rec')
  q.delete('rec')
  const id = rec ? rec.replace(/^REC-/, 'ACT-') : ''
  return <Navigate to={`/planning/actions${id ? `/${id}` : ''}${q.size ? `?${q}` : ''}`} replace />
}

/** Redirect that keeps the query string */
function MovedTo({ path }: { path: string }) {
  const { search } = useLocation()
  return <Navigate to={path + search} replace />
}

const pageFor = (id: string, inSection = false) => {
  if (built[id]) return built[id]()
  const route = routes.find((r) => r.id === id)!
  return <PendingPage key={id} route={route} inSection={inSection} />
}

const children: RouteObject[] = [
  ...routes.filter((r) => !r.section).map((r) => ({ path: r.path, element: pageFor(r.id) })),
  ...sections.map((s) => ({
    path: s.basePath,
    element: <DomainSectionLayout sectionId={s.id} />,
    children: [
      ...routesOfSection(s.id).map((r) => (r.path === s.basePath ? { index: true, element: pageFor(r.id, true) } : { path: r.path, element: pageFor(r.id, true) })),
      // A section without its own landing page opens its first page (/settings → /settings/scenario-templates)
      ...(routesOfSection(s.id).some((r) => r.path === s.basePath) ? [] : [{ index: true, element: <Navigate to={routesOfSection(s.id)[0].path} replace /> }]),
    ],
  })),
  // One alert open on the alerts page (deep links: /alerts/ALR-1042?step=decision)
  { path: '/alerts/:code', element: <AlertsPage /> },
  // One action open on «اقدام‌ها» (deep links: /planning/actions/ACT-881)
  { path: '/planning/actions/:id', element: <ActionsPage /> },
  { path: '/planning/recommendations', element: <RecommendationsMoved /> },
  // Old address of the ready-made scenarios: moved to settings, query kept (e.g. ?role=viewer)
  { path: '/planning/scenarios/templates', element: <MovedTo path="/settings/scenario-templates" /> },
  { path: '*', element: <NotFoundPage /> },
]

// Auth screens render outside the app shell.
const authRoutes: RouteObject = {
  element: <AuthLayout />,
  children: [
    { path: '/login', element: <LoginPage /> },
    { path: '/register', element: <RegisterPage /> },
    { path: '/forgot-password', element: <ForgotPasswordPage /> },
  ],
}

const router = createBrowserRouter([authRoutes, { element: <AppShell />, children }])

export function App() {
  return <RouterProvider router={router} />
}
