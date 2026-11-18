import { useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Anchor, Flag, ListChecks, Search, Waypoints } from 'lucide-react'
import { CHOKEPOINTS, COUNTRY_FA, PORTS, ROUTES } from '../../data/routes'
import { routes, sectionById, domainById, statusMeta } from '../../config/routes'
import { useAlertState } from '../../lib/alertStore'
import { normSearch } from '../../lib/actionRules'
import { formatNumber } from '../../lib/format'
import './RouteSearch.css'

// Arabic and Persian forms of ی/ک are treated as the same letter.
const norm = (s: string) => s.replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/‌/g, ' ').toLowerCase()

const index = routes
  .filter((r) => !r.hidden)
  .map((r) => {
    const parent = r.section ? sectionById(r.section).label : r.domain === 'utility' ? 'ابزارها' : domainById(r.domain).label
    return { route: r, parent, text: norm([r.label, parent, r.description, r.question, ...(r.scope ?? [])].join(' ')) }
  })

/**
 * Finds destinations (pages and their documented content). Full data search is not in scope yet.
 * Collapsed to an icon button (like alerts); expands into the field on click or Ctrl K.
 */
export function RouteSearch() {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [expanded, setExpanded] = useState(false)
  // Plays the shrink animation before the field gives way to the icon button
  const [closing, setClosing] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const refocusButton = useRef(false)
  const listRef = useRef<HTMLUListElement>(null)
  const navigate = useNavigate()
  const { actions } = useAlertState()

  // Pages, then actions by their number (ACT-…) or the executing system's reference (§8)
  const results = useMemo(() => {
    const words = norm(query).trim().split(/\s+/).filter(Boolean)
    if (!words.length) return []
    const pages = index.filter((e) => words.every((w) => e.text.includes(w))).map((e) => ({ key: e.route.id, to: e.route.path, icon: e.route.icon, title: e.route.label, parent: `${e.parent}${statusMeta[e.route.status].label ? ` · ${statusMeta[e.route.status].label}` : ''}` }))
    const q = normSearch(query)
    const acts = Object.values(actions)
      .filter((a) => normSearch(a.id).includes(q) || (!!a.externalRef && normSearch(a.externalRef).includes(q)))
      .map((a) => ({ key: a.id, to: `/planning/actions/${a.id}`, icon: ListChecks, title: a.title, parent: `اقدام‌ها · ${a.id}${a.externalRef ? ` · ${a.externalRef}` : ''}` }))
    // «نقشه مسیرها»: a chokepoint opens its panel; a port and a country set the matching filter
    const has = (t: string) => words.every((w) => norm(t).includes(w))
    const cps = CHOKEPOINTS.filter((c) => has(`${c.name} ${c.short}`)).map((c) => ({ key: `cp-${c.id}`, to: `/trade/routes?cp=${c.id}`, icon: Waypoints, title: c.name, parent: 'نقشه مسیرها · گلوگاه' }))
    const ports = Object.values(PORTS)
      .filter((x) => ROUTES.some((r) => r.from.id === x.id || r.to.id === x.id) && has(`${x.name} ${x.code}`))
      .map((x) => ({ key: `port-${x.id}`, to: `/trade/routes?${ROUTES.some((r) => r.from.id === x.id) ? 'lp' : 'up'}=${x.id}`, icon: Anchor, title: x.name, parent: `نقشه مسیرها · بندر · ${x.code}` }))
    const countries = Object.entries(COUNTRY_FA)
      .filter(([iso, name]) => ROUTES.some((r) => r.originCountry === iso || r.destCountry === iso) && has(name))
      .map(([iso, name]) => ({ key: `country-${iso}`, to: `/trade/routes?${ROUTES.some((r) => r.originCountry === iso) ? 'origin' : 'dest'}=${iso}`, icon: Flag, title: name, parent: 'نقشه مسیرها · کشور' }))
    return [...pages, ...cps, ...ports, ...countries, ...acts].slice(0, 8)
  }, [query, actions])

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setClosing(false)
        setExpanded(true)
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Focus the field when it appears, and the button again after Escape collapses it
  useEffect(() => {
    if (expanded) inputRef.current?.focus()
    else if (refocusButton.current) {
      refocusButton.current = false
      buttonRef.current?.focus()
    }
  }, [expanded])

  const close = () => {
    setOpen(false)
    setQuery('')
  }
  const collapse = (refocus = false) => {
    close()
    refocusButton.current = refocus
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) setExpanded(false)
    else setClosing(true)
  }

  const links = () => Array.from(listRef.current?.querySelectorAll<HTMLAnchorElement>('a') ?? [])

  const onInputKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      links()[0]?.focus()
    } else if (e.key === 'Enter' && results[0]) {
      navigate(results[0].to)
      collapse()
    } else if (e.key === 'Escape') {
      collapse(true)
    }
  }

  const onListKey = (e: KeyboardEvent<HTMLUListElement>) => {
    const all = links()
    const i = all.indexOf(document.activeElement as HTMLAnchorElement)
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      all[Math.min(i + 1, all.length - 1)]?.focus()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (i <= 0) inputRef.current?.focus()
      else all[i - 1]?.focus()
    } else if (e.key === 'Escape') {
      collapse(true)
    }
  }

  const showPanel = open && query.trim().length > 0

  if (!expanded)
    return (
      <button ref={buttonRef} type="button" className="tb-icon" onClick={() => setExpanded(true)} aria-label="جستجوی بخش‌های سامانه (Ctrl K)" title="جستجو (Ctrl K)">
        <Search size={18} strokeWidth={1.75} aria-hidden="true" />
      </button>
    )

  return (
    <div
      className={`route-search ${closing ? 'is-closing' : ''}`}
      onBlur={(e) => {
        if (e.currentTarget.contains(e.relatedTarget as Node)) return
        setOpen(false)
        if (!query.trim()) collapse()
      }}
      onAnimationEnd={(e) => {
        if (e.animationName !== 'rs-close') return
        setClosing(false)
        setExpanded(false)
      }}
    >
      <label className="route-search__field">
        <Search size={16} aria-hidden="true" />
        <span className="visually-hidden">جستجوی بخش‌های سامانه</span>
        <input
          ref={inputRef}
          type="search"
          placeholder="جستجو…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onInputKey}
          aria-describedby="route-search-status"
          autoComplete="off"
        />
        <kbd className="latin" aria-hidden="true">
          Ctrl K
        </kbd>
      </label>
      <p id="route-search-status" className="visually-hidden" aria-live="polite">
        {showPanel ? (results.length ? `${formatNumber(results.length)} نتیجه` : 'نتیجه‌ای یافت نشد') : ''}
      </p>
      {showPanel && (
        <div className="route-search__panel">
          {results.length ? (
            <ul ref={listRef} onKeyDown={onListKey}>
              {results.map(({ key, to, icon: Icon, title, parent }) => (
                <li key={key}>
                  <Link to={to} onClick={() => collapse()}>
                    <Icon size={16} aria-hidden="true" />
                    <span className="route-search__text">
                      <span className="route-search__title">{title}</span>
                      <span className="route-search__parent">{parent}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="route-search__empty">چیزی با «{query}» یافت نشد. جستجو نام و محتوای بخش‌ها، شمارهٔ اقدام و شمارهٔ حواله یا درخواست را می‌گردد.</p>
          )}
        </div>
      )}
    </div>
  )
}
