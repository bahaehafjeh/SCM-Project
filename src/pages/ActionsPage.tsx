import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent, ReactNode } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { CalendarClock, ChevronLeft, CircleUserRound, Clock, FileText, Inbox, ListFilter, OctagonAlert, Package, Search, ShoppingCart, Truck, UserRound, UsersRound, X } from 'lucide-react'
import { routeById } from '../config/routes'
import { PageHeader } from '../components/PageHeader'
import { Select } from '../components/ui/Select'
import { SeverityGauge } from '../components/overview/SeverityGauge'
import { severityLabel } from '../components/overview/AlertParts'
import { AlertToast } from '../components/overview/AlertRow'
import { ActionDetail } from './actions/ActionDetail'
import { dateOf, hm, systemOf } from './actions/fmt'
import { currentUser } from '../lib/access'
import type { CurrentUser } from '../lib/access'
import { useAlertState } from '../lib/alertStore'
import type { ActionItem, ActionKind, ActionStatus } from '../lib/alertStore'
import { DAY, KIND_LABEL, STATUS_LABEL, TAB_LABEL, TURN_LABEL, acceptLeft, cardCounts, cardTest, deadlineOf, inTab, inWeek, isLate, isOpen, lateDays, membersOf, progressOf, searchHit, normSearch, sortActions, tabCount, tabsFor, toneOf, turnOf } from '../lib/actionRules'
import type { ActionTab, CardKey, SortKey, Turn } from '../lib/actionRules'
import { formatNumber } from '../lib/format'
import '../components/overview/overview.css'
import '../components/overview/alerts-flow.css'
import './ActionsPage.css'

const fa = (n: number) => formatNumber(n)
const KIND_ICON: Record<ActionKind, typeof ShoppingCart> = { buy: ShoppingCart, move: Truck, doc: FileText, refer: UsersRound, other: Package }

// ── Filters kept in the address, so every state has its own link and Back returns to it ──
type ChipKey = 'all' | Exclude<Turn, never>
const CHIPS: ChipKey[] = ['all', 'mine', 'flow', 'others', 'closed']
const CHIP_LABEL: Record<ChipKey, string> = { all: 'همه', ...TURN_LABEL }
const CARDS: { key: CardKey; label: string; icon: typeof Inbox; tone: string; zero: string }[] = [
  { key: 'mine', label: 'منتظر شما', icon: Inbox, tone: 'blue', zero: 'کاری منتظر شما نیست' },
  { key: 'late', label: 'دیرکرد', icon: Clock, tone: 'red', zero: 'همه سر موعدند' },
  { key: 'stuck', label: 'گیر کرده', icon: OctagonAlert, tone: 'orange', zero: 'مانعی گزارش نشده' },
  { key: 'week', label: 'موعد این هفته', icon: CalendarClock, tone: 'ink', zero: 'موعدی در این هفته نیست' },
]
const DUE_OPTS = [
  { value: 'today', label: 'امروز' },
  { value: 'week', label: 'این هفته' },
  { value: 'past', label: 'گذشته' },
  { value: 'none', label: 'بدون موعد' },
]
const SORTS: { value: SortKey; label: string }[] = [
  { value: 'urgency', label: 'فوریت' },
  { value: 'due', label: 'موعد' },
  { value: 'newest', label: 'تازه‌ترین' },
  { value: 'severity', label: 'شدت' },
]
const SENT_OPTS = [
  { value: '1', label: 'امروز' },
  { value: '7', label: '۷ روز اخیر' },
  { value: '30', label: '۳۰ روز اخیر' },
]
const sameDay = (x: number, y: number) => new Date(x).toDateString() === new Date(y).toDateString()

/** Select filters: key in the address → its label and test */
type FilterKey = 'type' | 'sev' | 'due' | 'owner' | 'team' | 'as' | 'status' | 'req' | 'item' | 'alert' | 'sys' | 'sent'
const MORE: FilterKey[] = ['status', 'req', 'item', 'alert', 'sys', 'sent']
const FILTER_LABEL: Record<FilterKey, string> = { type: 'نوع', sev: 'شدت', due: 'موعد', owner: 'مسئول', team: 'واحد', as: 'نقش من', status: 'وضعیت', req: 'درخواست‌دهنده', item: 'کالا', alert: 'هشدار', sys: 'سیستم اجرا', sent: 'تاریخ ثبت' }
const SEV_OPTS = (['critical', 'high', 'medium'] as const).map((s) => ({ value: s, label: severityLabel[s] }))

function testFilter(k: FilterKey, v: string, a: ActionItem, me: CurrentUser, now: number): boolean {
  switch (k) {
    case 'type':
      return a.kind === v
    case 'sev':
      return a.severity === v
    case 'due':
      return v === 'none' ? !a.due : !!a.due && isOpen(a) && (v === 'today' ? sameDay(Date.parse(a.due), now) : v === 'week' ? inWeek(a, now) : Date.parse(a.due) < now)
    case 'owner':
      return v === '—' ? !a.owner : a.owner === v
    case 'team':
      return a.unit === v
    case 'as':
      return v === 'requester' ? a.requester === me.name : a.owner === me.name || (!a.owner && a.unit === me.unit)
    case 'status':
      return a.status === v
    case 'req':
      return a.requester === v
    case 'item':
      return a.item === v
    case 'alert':
      return a.alertCode === v
    case 'sys':
      return systemOf(a) === v
    case 'sent':
      return now - Date.parse(a.sentAt) <= Number(v) * DAY
  }
}

/**
 * «اقدام‌ها» (actions-page-prompt §5): the sister of «هشدارها». Cards, tabs, filters and chips all
 * count from the same rules (lib/actionRules) as the rows, so no number can disagree with the list.
 */
export function ActionsPage() {
  const route = routeById('planning-actions')
  const { id } = useParams()
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const st = useAlertState()
  const me = currentUser()
  const [now, setNow] = useState(() => Date.now())
  const [moreOpen, setMoreOpen] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({})

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000)
    // «/» goes to the search (not while typing somewhere)
    const onKey = (e: globalThis.KeyboardEvent) => {
      const el = e.target as HTMLElement
      if (e.key !== '/' || /input|textarea|select/i.test(el.tagName) || el.isContentEditable) return
      e.preventDefault()
      searchRef.current?.focus()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      clearInterval(t)
      window.removeEventListener('keydown', onKey)
    }
  }, [])

  const all = useMemo(() => Object.values(st.actions), [st.actions])
  const tabs = tabsFor(me)
  const tabParam = params.get('tab') as ActionTab | null
  const tab: ActionTab = tabParam && tabs.includes(tabParam) ? tabParam : tabs[0]
  const chipParam = params.get('chip') as ChipKey | null
  const chip: ChipKey = chipParam && CHIPS.includes(chipParam) ? chipParam : 'all'
  const f = params.get('f') as CardKey | null
  const q = params.get('q') ?? ''
  const sort = (SORTS.some((s) => s.value === params.get('sort')) ? params.get('sort') : 'urgency') as SortKey
  const get = (k: FilterKey) => params.get(k) ?? ''

  /** One change of state = one entry in history (Back returns to it) */
  const setParam = (patch: Record<string, string | null>, replace = false) => {
    const next = new URLSearchParams(params)
    for (const [k, v] of Object.entries(patch))
      if (v === null || v === '' || v === 'all') next.delete(k)
      else next.set(k, v)
    setParams(next, { replace })
  }

  const tabList = all.filter((a) => inTab(a, tab, me))
  // Filters that do not depend on the tab: a select only shown on another tab is dropped
  const visibleKeys: FilterKey[] = ['type', 'sev', 'due', ...MORE, ...(tab === 'unit' ? (['owner'] as const) : []), ...(tab === 'all' ? (['team'] as const) : []), ...(tab === 'mine' ? (['as'] as const) : [])]
  const active = visibleKeys.filter((k) => get(k))
  const passFilters = (a: ActionItem, skip?: FilterKey | 'q' | 'f') => (skip === 'q' || !q || searchHit(a, q) !== null) && (skip === 'f' || !f || !cardTest[f] || cardTest[f](a, me, now)) && active.every((k) => k === skip || testFilter(k, get(k), a, me, now))
  const inChip = (a: ActionItem, c: ChipKey) => (c === 'all' ? isOpen(a) : turnOf(a, me, now) === c)
  const filtered = tabList.filter((a) => passFilters(a))
  const shown = sortActions(
    filtered.filter((a) => inChip(a, chip)),
    sort,
    me,
    now,
  )
  const cards = cardCounts(tabList, me, now)
  const scopeTotal = tabList.filter((a) => (chip === 'closed' ? !isOpen(a) : isOpen(a))).length
  const anyFilter = active.length > 0 || !!q || !!f || chip !== 'all'

  // The «نقش من» select only when I hold actions in both roles
  const mineRoles = tab === 'mine' && tabList.some((a) => a.requester === me.name) && tabList.some((a) => a.owner === me.name || (!a.owner && a.unit === me.unit))
  const memberOpts = me.unit ? [...membersOf(me.unit).map((n) => ({ value: n, label: n })), { value: '—', label: 'بدون مسئول' }] : []
  const unitOpts = [...new Set(all.map((a) => a.unit))].map((u) => ({ value: u, label: u }))
  const distinct = (pick: (a: ActionItem) => string | undefined) => [...new Set(tabList.map(pick).filter(Boolean) as string[])].map((v) => ({ value: v, label: v }))

  const current = id ? (st.actions[id] ?? null) : null
  // The action opens as its own page (owner decision); its address keeps the list's state for the way back
  const select = (a: ActionItem) => navigate(`/planning/actions/${a.id}${params.size ? `?${params}` : ''}`)
  const search = params.toString()
  const listLink = useCallback((withState?: boolean) => `/planning/actions${withState && search ? `?${search}` : ''}`, [search])

  // A link to an action outside the current tab or chip moves to where it is (once per opened action)
  useEffect(() => {
    if (!current) return
    const next: Record<string, string | null> = {}
    if (!inTab(current, tab, me)) next.tab = tabs.find((t) => inTab(current, t, me)) ?? null
    if (!isOpen(current) && chip !== 'closed') next.chip = 'closed'
    else if (isOpen(current) && chip !== 'all' && !inChip(current, chip)) next.chip = null
    if (Object.keys(next).length) setParam(next, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const goTab = (t: ActionTab) => setParam({ tab: t === tabs[0] ? null : t, chip: null, f: null, owner: null, team: null, as: null })
  const onTabKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = tabs.indexOf(tab)
    const to = e.key === 'ArrowLeft' ? i + 1 : e.key === 'ArrowRight' ? i - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : null
    if (to === null) return
    e.preventDefault()
    const t = tabs[(to + tabs.length) % tabs.length]
    goTab(t)
    tabRefs.current[t]?.focus()
  }
  // «منتظر شما» card and chip are one filter (§5-2)
  const cardOn = (k: CardKey) => (k === 'mine' ? chip === 'mine' : f === k)
  const toggleCard = (k: CardKey) => (k === 'mine' ? setParam({ chip: chip === 'mine' ? null : 'mine' }) : setParam({ f: f === k ? null : k }))

  const valueLabel = (k: FilterKey, v: string): string => {
    if (k === 'type') return KIND_LABEL[v as ActionKind] ?? v
    if (k === 'sev') return severityLabel[v as keyof typeof severityLabel] ?? v
    if (k === 'due') return DUE_OPTS.find((o) => o.value === v)?.label ?? v
    if (k === 'as') return v === 'requester' ? 'درخواست‌دهنده' : 'مسئول'
    if (k === 'status') return STATUS_LABEL[v as ActionStatus] ?? v
    if (k === 'owner' && v === '—') return 'بدون مسئول'
    if (k === 'sent') return SENT_OPTS.find((o) => o.value === v)?.label ?? v
    return v
  }
  const CARD_LABEL: Record<CardKey, string> = { mine: 'منتظر شما', late: 'دیرکرد', stuck: 'گیر کرده', week: 'موعد این هفته' }
  // Tags of the active filters, each removable
  const tags: { key: string; label: string; clear: () => void }[] = [
    ...(q ? [{ key: 'q', label: `جستجو: ${q}`, clear: () => setParam({ q: null }) }] : []),
    ...(f && f !== 'mine' ? [{ key: 'f', label: `کارت: ${CARD_LABEL[f]}`, clear: () => setParam({ f: null }) }] : []),
    ...active.map((k) => ({ key: k, label: `${FILTER_LABEL[k]}: ${valueLabel(k, get(k))}`, clear: () => setParam({ [k]: null }) })),
  ]
  const clearAll = () => setParam({ q: null, f: null, chip: null, ...Object.fromEntries(visibleKeys.map((k) => [k, null])) })

  // No result: offer the one filter whose removal brings results back (§5-7)
  const rescue = (() => {
    if (shown.length || !anyFilter) return null
    const tries: { label: string; patch: Record<string, null>; test: (a: ActionItem) => boolean }[] = [
      ...active.map((k) => ({ label: `${FILTER_LABEL[k]}: ${valueLabel(k, get(k))}`, patch: { [k]: null }, test: (a: ActionItem) => passFilters(a, k) && inChip(a, chip) })),
      ...(f ? [{ label: CARD_LABEL[f], patch: { f: null }, test: (a: ActionItem) => passFilters(a, 'f') && inChip(a, chip) }] : []),
      ...(q ? [{ label: `جستجو: ${q}`, patch: { q: null }, test: (a: ActionItem) => passFilters(a, 'q') && inChip(a, chip) }] : []),
      ...(chip !== 'all' ? [{ label: CHIP_LABEL[chip], patch: { chip: null }, test: (a: ActionItem) => passFilters(a) && isOpen(a) }] : []),
    ]
    return tries.find((t) => tabList.some(t.test)) ?? null
  })()

  const unitOpen = me.unit ? all.filter((a) => a.unit === me.unit && isOpen(a)).length : 0
  const queueEmpty = tab === 'mine' && tabCount(all, 'mine', me) === 0 && !anyFilter

  if (current)
    return (
      <div className="actions-page">
        <ActionDetail key={current.id} action={current} me={me} now={now} listLink={listLink} tabLabel={TAB_LABEL[tab]} />
        <AlertToast />
      </div>
    )

  return (
    <div className="alerts-page actions-page">
      <PageHeader title={route.label} description={route.description} />

      <div className="apage">
        <section className="ov-panel apage__list" aria-label="فهرست اقدام‌ها">
          {/* ۵-۲ · Cards: the active tab's counts; a click filters the list */}
          <div className="acards" role="group" aria-label="خلاصهٔ اقدام‌ها">
            {CARDS.map((c) => {
              const list = cards[c.key]
              const n = list.length
              const I = c.icon
              return (
                <button key={c.key} type="button" className={`acard acard--${c.tone} ${n ? '' : 'is-zero'}`} aria-pressed={cardOn(c.key)} onClick={() => toggleCard(c.key)}>
                  <span className="acard__head">
                    <I size={16} aria-hidden="true" />
                    {c.label}
                  </span>
                  <span className="acard__n">{fa(n)}</span>
                  <span className="acard__line">{n ? cardLine(c.key, list, me, now) : c.zero}</span>
                </button>
              )
            })}
          </div>
          <p className="acards__note">عددها مربوط به «{TAB_LABEL[tab]}» است · کلیک روی کارت = فقط همان‌ها</p>

          {/* ۵-۳ · Tabs */}
          <div className="apage__bar">
            <div className="seg seg--compact" role="tablist" aria-label="دامنهٔ اقدام‌ها" onKeyDown={onTabKey}>
              {tabs.map((t) => (
                <button
                  key={t}
                  ref={(el) => {
                    tabRefs.current[t] = el
                  }}
                  type="button"
                  role="tab"
                  aria-selected={tab === t}
                  aria-pressed={tab === t}
                  tabIndex={tab === t ? 0 : -1}
                  onClick={() => goTab(t)}
                >
                  {TAB_LABEL[t]} <span className="seg__count">({fa(tabCount(all, t, me))})</span>
                </button>
              ))}
            </div>
          </div>

          {/* ۵-۴ · Search and filters, one line */}
          <div className="afilters">
            <label className="afilters__search">
              <Search size={15} aria-hidden="true" />
              <span className="visually-hidden">جستجوی اقدام</span>
              <input ref={searchRef} type="search" placeholder="شماره، کالا یا حواله…" value={q} onChange={(e) => setParam({ q: e.target.value }, true)} autoComplete="off" />
              <kbd className="latin" aria-hidden="true">
                /
              </kbd>
            </label>
            <Select label="نوع اقدام" value={get('type') || 'all'} options={[{ value: 'all', label: 'همه' }, ...Object.entries(KIND_LABEL).map(([value, label]) => ({ value, label }))]} onChange={(v) => setParam({ type: v })} searchPlaceholder="جستجوی نوع…" />
            <Select label="شدت هشدار" value={get('sev') || 'all'} options={[{ value: 'all', label: 'همه' }, ...SEV_OPTS]} onChange={(v) => setParam({ sev: v })} searchPlaceholder="جستجوی شدت…" />
            <Select label="موعد" value={get('due') || 'all'} options={[{ value: 'all', label: 'همه' }, ...DUE_OPTS]} onChange={(v) => setParam({ due: v })} searchPlaceholder="جستجوی موعد…" />
            {tab === 'unit' && <Select label="مسئول" value={get('owner') || 'all'} options={[{ value: 'all', label: 'همه' }, ...memberOpts]} onChange={(v) => setParam({ owner: v })} searchPlaceholder="جستجوی نام…" />}
            {tab === 'all' && <Select label="واحد" value={get('team') || 'all'} options={[{ value: 'all', label: 'همه' }, ...unitOpts]} onChange={(v) => setParam({ team: v })} searchPlaceholder="جستجوی واحد…" />}
            {mineRoles && (
              <Select
                label="نقش من"
                value={get('as') || 'all'}
                options={[
                  { value: 'all', label: 'همه' },
                  { value: 'owner', label: 'مسئول' },
                  { value: 'requester', label: 'درخواست‌دهنده' },
                ]}
                onChange={(v) => setParam({ as: v })}
                searchPlaceholder="جستجو…"
              />
            )}
            <MoreFilters
              open={moreOpen}
              setOpen={setMoreOpen}
              values={Object.fromEntries(MORE.map((k) => [k, get(k)]))}
              options={{
                status: (Object.keys(STATUS_LABEL) as ActionStatus[]).map((s) => ({ value: s, label: STATUS_LABEL[s] })),
                req: distinct((a) => a.requester),
                item: distinct((a) => a.item),
                alert: distinct((a) => a.alertCode),
                sys: distinct(systemOf),
                sent: SENT_OPTS,
              }}
              count={(vals) => tabList.filter((a) => (!q || searchHit(a, q) !== null) && (!f || cardTest[f](a, me, now)) && visibleKeys.every((k) => (MORE.includes(k) ? !vals[k] || testFilter(k, vals[k], a, me, now) : !get(k) || testFilter(k, get(k), a, me, now))) && inChip(a, chip)).length}
              onApply={(vals) => setParam(Object.fromEntries(MORE.map((k) => [k, vals[k] || null])))}
            />
            <div className="afilters__end">
              <Select label="ترتیب" value={sort} options={SORTS} onChange={(v) => setParam({ sort: v === 'urgency' ? null : v })} searchPlaceholder="جستجو…" />
            </div>
          </div>

          {/* ۵-۵ · Chips: who has the move; no group headers, one flat list */}
          <div className="chips achips" role="group" aria-label="نوبت">
            {CHIPS.map((c) => (
              <button key={c} type="button" className="chip" aria-pressed={chip === c} onClick={() => setParam({ chip: c === 'all' ? null : chip === c ? null : c })}>
                {CHIP_LABEL[c]}
                <span className="chip__count">{fa(filtered.filter((a) => inChip(a, c)).length)}</span>
              </button>
            ))}
          </div>
          {anyFilter && (
            <div className="atags">
              {tags.map((t) => (
                <button key={t.key} type="button" className="chip chip--clear" onClick={t.clear} aria-label={`برداشتن فیلتر ${t.label}`}>
                  {t.label}
                  <X size={13} aria-hidden="true" />
                </button>
              ))}
              {(tags.length > 0 || chip !== 'all') && (
                <button type="button" className="ov-link atags__clear" onClick={clearAll}>
                  پاک کردن همه
                </button>
              )}
              <span className="atags__count">
                {fa(shown.length)} از {fa(scopeTotal)} اقدام
              </span>
            </div>
          )}

          <ul className="alerts alerts--page aitems" aria-live="polite">
            {shown.map((a, i) => (
              <ActionRow key={a.id} a={a} me={me} now={now} index={i} selected={id === a.id} q={q} onOpen={() => select(a)} />
            ))}
          </ul>
          {shown.length === 0 &&
            (queueEmpty ? (
              <div className="apage__empty">
                <Inbox size={22} aria-hidden="true" />
                <p>
                  کاری منتظر شما نیست
                  {unitOpen > 0 && ` · ${fa(unitOpen)} اقدام واحد در جریان است`}
                </p>
                {tabs.includes('unit') && (
                  <button type="button" className="abtn abtn--secondary abtn--sm" onClick={() => goTab('unit')}>
                    دیدن «واحد من»
                  </button>
                )}
              </div>
            ) : (
              <div className="apage__empty">
                <ListFilter size={22} aria-hidden="true" />
                <p>{anyFilter ? 'با این فیلترها اقدامی نیست' : 'اقدامی نیست'}</p>
                {rescue ? (
                  <button type="button" className="abtn abtn--secondary abtn--sm" onClick={() => setParam(rescue.patch)}>
                    برداشتن «{rescue.label}»
                  </button>
                ) : (
                  anyFilter && (
                    <button type="button" className="abtn abtn--secondary abtn--sm" onClick={clearAll}>
                      پاک کردن همهٔ فیلترها
                    </button>
                  )
                )}
              </div>
            ))}
        </section>
      </div>
      <AlertToast />
    </div>
  )
}

/** The line under a card's number (§5-2) */
function cardLine(k: CardKey, list: ActionItem[], me: CurrentUser, now: number): string {
  if (k === 'mine') {
    const a = [...list].sort((x, y) => (deadlineOf(x, me, now) ?? Infinity) - (deadlineOf(y, me, now) ?? Infinity))[0]
    const left = acceptLeft(a, now)
    const when = left !== null ? `${hm(left)} تا پذیرش` : a.due ? `موعد ${dateOf(a.due)}` : 'بدون موعد'
    return `${when} · ${a.title}`
  }
  if (k === 'late') {
    const a = [...list].sort((x, y) => lateDays(y, now) - lateDays(x, now))[0]
    return `${fa(lateDays(a, now))} روز تأخیر · ${a.title}`
  }
  if (k === 'stuck') {
    const blocked = list.filter((a) => a.status === 'blocked').length
    const failed = list.filter((a) => a.status !== 'blocked' && a.sync === 'failed').length
    return [blocked && `${fa(blocked)} مانع`, failed && `${fa(failed)} ثبت نشد`].filter(Boolean).join(' · ')
  }
  const a = [...list].sort((x, y) => Date.parse(x.due!) - Date.parse(y.due!))[0]
  return `نزدیک‌ترین: ${dateOf(a.due!)}`
}

/** The search hit inside the external reference, marked */
function Marked({ text, q }: { text: string; q: string }) {
  const w = normSearch(q)
  const norm = normSearch(text)
  const at = norm.indexOf(w)
  if (!w || at < 0) return <>{text}</>
  return (
    <>
      {text.slice(0, at)}
      <mark className="amark">{text.slice(at, at + w.length)}</mark>
      {text.slice(at + w.length)}
    </>
  )
}

/**
 * One action, two lines and no more (§5-6): title; severity · alert · owner · whose turn. On the end
 * side the due date and the progress, in one line each. The edge carries the only colour.
 */
function ActionRow({ a, me, now, index, selected, q, onOpen }: { a: ActionItem; me: CurrentUser; now: number; index: number; selected: boolean; q: string; onOpen: () => void }) {
  const tone = toneOf(a, me, now)
  const turn = turnOf(a, me, now)
  const p = progressOf(a, now)
  const late = isLate(a, now)
  const Icon = KIND_ICON[a.kind]
  const refHit = q && searchHit(a, q) === 'ref' && a.externalRef
  return (
    <li className={`alert aitem ${selected ? 'is-open' : ''} ${isOpen(a) ? '' : 'is-closed'}`} style={{ '--d': `${Math.min(index, 8) * 40}ms` } as CSSProperties}>
      <div className="alert__row" onClick={onOpen}>
        {tone && <span className={`alert__mark amark--${tone}`} aria-hidden="true" />}
        <span className="alert__type" aria-hidden="true">
          <Icon size={16} />
        </span>
        <div className="alert__text">
          <p className="alert__line">
            <span className="alert__title">{a.title}</span>
          </p>
          <ul className="alert__meta aitem__meta">
            {a.severity && (
              <li title={`شدت هشدار: ${severityLabel[a.severity]}`}>
                <SeverityGauge severity={a.severity} />
                <span dir="ltr" className="aitem__code">
                  {a.alertCode}
                </span>
              </li>
            )}
            {!a.severity && (
              <li dir="ltr" className="aitem__code">
                {a.alertCode}
              </li>
            )}
            <li className={a.owner ? '' : 'aitem__none'}>
              {a.owner ? <UserRound size={13} aria-hidden="true" /> : <CircleUserRound size={13} aria-hidden="true" />}
              {a.owner ?? 'بدون مسئول'}
            </li>
            <li className={`status-chip ${turn === 'mine' ? 'aturn--mine' : 'status-chip--muted'}`}>{TURN_LABEL[turn]}</li>
            {refHit && (
              <li className="aitem__ref">
                <Marked text={a.externalRef!} q={q} />
              </li>
            )}
          </ul>
        </div>
        <div className="aitem__end">
          {/* Delivered: the delivery day, not a due date that no longer applies */}
          <span className={`aitem__due ${late ? 'is-late' : ''}`}>
            {a.doneAt ? `تحویل ${dateOf(a.doneAt)}` : a.status === 'rejected' && a.rejection ? `رد شد ${dateOf(a.rejection.at)}` : a.status === 'cancel' && a.cancel ? `لغو شد ${dateOf(a.cancel.at)}` : a.due ? (late ? `موعد ${dateOf(a.due)} · ${fa(lateDays(a, now))} روز گذشته` : `موعد ${dateOf(a.due)}`) : 'بدون موعد'}
          </span>
          <span className={`aitem__prog ${p.tone ? `is-${p.tone}` : ''}`}>
            <span className="aitem__prog-text">{p.text}</span>
            <span className="aitem__bar" aria-hidden="true">
              <span style={{ width: `${p.pct}%` }} />
            </span>
          </span>
        </div>
        <button type="button" className="alert__more" data-action={a.id} aria-label={`باز کردن جزئیات: ${a.title}`} title="باز کردن جزئیات">
          <ChevronLeft size={18} aria-hidden="true" />
        </button>
      </div>
    </li>
  )
}

/** «فیلترهای بیشتر»: a dashed button with its active count; a panel with the rarer fields */
function MoreFilters({ open, setOpen, values, options, count, onApply }: { open: boolean; setOpen: (v: boolean) => void; values: Record<string, string>; options: Record<string, { value: string; label: string }[]>; count: (vals: Record<string, string>) => number; onApply: (vals: Record<string, string>) => void }) {
  const [draft, setDraft] = useState(values)
  const root = useRef<HTMLDivElement>(null)
  const n = Object.values(values).filter(Boolean).length
  useEffect(() => {
    if (!open) return
    setDraft(values)
    const onDown = (e: PointerEvent) => !root.current?.contains(e.target as Node) && !(e.target as Element).closest?.('.ds-select') && setOpen(false)
    const onKey = (e: globalThis.KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])
  const field = (k: FilterKey): ReactNode => <Select key={k} label={FILTER_LABEL[k]} value={draft[k] || 'all'} options={[{ value: 'all', label: 'همه' }, ...options[k]]} onChange={(v) => setDraft({ ...draft, [k]: v === 'all' ? '' : v })} searchPlaceholder="جستجو…" />
  return (
    <div className="amore" ref={root}>
      <button type="button" className="amore__btn" aria-expanded={open} aria-haspopup="dialog" onClick={() => setOpen(!open)}>
        <ListFilter size={14} aria-hidden="true" />
        فیلترهای بیشتر
        {n > 0 && <span className="amore__n">{fa(n)}</span>}
      </button>
      {open && (
        <div className="amore__pop" role="dialog" aria-label="فیلترهای بیشتر">
          <div className="amore__grid">{MORE.map(field)}</div>
          <div className="amore__foot">
            <button
              type="button"
              className="abtn abtn--primary abtn--sm"
              onClick={() => {
                onApply(draft)
                setOpen(false)
              }}
            >
              نمایش {fa(count(draft))} نتیجه
            </button>
            <button type="button" className="abtn abtn--ghost abtn--sm" onClick={() => setDraft(Object.fromEntries(MORE.map((k) => [k, ''])))}>
              پاک کردن
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
