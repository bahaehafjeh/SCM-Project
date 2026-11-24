import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, Outlet, useLocation } from 'react-router-dom'
import { X, Sparkles, ChevronRight } from 'lucide-react'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { REQUIRE_LOGIN } from '../../config/user'
import { isSignedIn } from '../../lib/session'
import { settleChecks, wakeDueReminders } from '../../lib/alertStore'
import { tickNotifications } from '../../lib/notificationStore'
import './AppShell.css'

const SIDEBAR_ID = 'app-sidebar'
const RAIL_KEY = 'scm-sidebar-rail'
const desktop = () => window.matchMedia('(min-width: 1024px)').matches

const readRail = () => {
  try {
    return localStorage.getItem(RAIL_KEY) === '1'
  } catch {
    return false
  }
}

export function AppShell() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [rail, setRail] = useState(readRail)
  const [isDesktop, setIsDesktop] = useState(desktop)
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 240)
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])
  const toggleRef = useRef<HTMLButtonElement>(null)
  const drawerRef = useRef<HTMLDivElement>(null)
  const mainRef = useRef<HTMLElement>(null)
  const location = useLocation()
  const { pathname } = location

  // Reminders that fell due go back to «نیازمند بررسی»: every minute, and when the page is shown again
  useEffect(() => {
    wakeDueReminders()
    settleChecks()
    // The same minute tick wakes reminders, closes finished effect checks and refreshes the bell
    const tick = setInterval(() => (wakeDueReminders(), settleChecks(), tickNotifications()), 60_000)
    const onShow = () => document.visibilityState === 'visible' && (wakeDueReminders(), settleChecks(), tickNotifications())
    document.addEventListener('visibilitychange', onShow)
    return () => {
      clearInterval(tick)
      document.removeEventListener('visibilitychange', onShow)
    }
  }, [])

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const on = () => setIsDesktop(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(RAIL_KEY, rail ? '1' : '0')
    } catch {
      /* preference lasts for this session only */
    }
  }, [rail])

  // Close the drawer on navigation and move focus to the new page's content.
  const firstRender = useRef(true)
  useEffect(() => {
    setDrawerOpen(false)
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    mainRef.current?.focus({ preventScroll: true })
    window.scrollTo(0, 0)
  }, [pathname])

  // Drawer: Escape closes; focus moves in on open and back to the toggle on close.
  useEffect(() => {
    if (!drawerOpen) return
    drawerRef.current?.querySelector<HTMLElement>('a, button')?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDrawerOpen(false)
        toggleRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [drawerOpen])

  // Desktop: the handle on the sidebar edge collapses it to a rail. Below that: the header menu opens the drawer.
  const toggleNav = () => setDrawerOpen((o) => !o)

  // Signed-out visitors go to the sign-in page and come back here after (off by default: REQUIRE_LOGIN)
  if (REQUIRE_LOGIN && !isSignedIn()) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />

  return (
    <div className={`app ${drawerOpen ? 'app--menu-open' : ''} ${isDesktop && rail ? 'app--rail' : ''}`}>
      <a href="#main" className="skip-link">
        پرش به محتوای اصلی
      </a>
      <div className="app__sidebar" ref={drawerRef}>
        <button
          type="button"
          className="app__drawer-close"
          onClick={() => {
            setDrawerOpen(false)
            toggleRef.current?.focus()
          }}
          aria-label="بستن منو"
        >
          <X size={20} aria-hidden="true" />
        </button>
        <Sidebar id={SIDEBAR_ID} rail={isDesktop && rail} />
        <button type="button" className="app__rail-toggle" onClick={() => setRail((r) => !r)} aria-expanded={!rail} aria-controls={SIDEBAR_ID} aria-label={rail ? 'باز کردن منو' : 'جمع کردن منو'} title={rail ? 'باز کردن منو' : 'جمع کردن منو'}>
          <ChevronRight size={14} strokeWidth={2.25} aria-hidden="true" />
        </button>
      </div>
      {drawerOpen && <div className="app__backdrop" onClick={() => setDrawerOpen(false)} aria-hidden="true" />}
      <div className="app__body">
        <Topbar onToggleNav={toggleNav} navExpanded={drawerOpen} sidebarId={SIDEBAR_ID} toggleRef={toggleRef} />
        <main id="main" ref={mainRef} tabIndex={-1} className="app__main">
          <Outlet />
        </main>
      </div>
      <Link to="/assistant" className={`app__fab ${scrolled ? 'app__fab--compact' : ''}`} aria-label="دستیار هوشمند">
        <Sparkles size={18} aria-hidden="true" />
        <span>دستیار هوشمند</span>
      </Link>
    </div>
  )
}
