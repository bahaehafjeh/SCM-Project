import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Check, CircleAlert, ClipboardList, Clock, Copy, FileText, Hourglass, Info, ListChecks, MessageSquare, MoreHorizontal, OctagonAlert, Package, RefreshCcw, Scale, Send, ShoppingCart, Split, Truck, UsersRound, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { IconButton } from '../../components/ui/IconButton'
import { SeverityChip, fa } from '../../components/overview/AlertParts'
import { alertDetails, allAlerts, agoText } from '../../data/alerts'
import type { CurrentUser } from '../../lib/access'
import { actionActions, notify, useAlertState } from '../../lib/alertStore'
import type { ActionItem, ActionKind } from '../../lib/alertStore'
import { STATUS_LABEL, acceptLeft, acceptWindow, currentStep, doneCount, isDoer, isLate, isOpen, isRequester, isUnitManager, lateDays, managerOf, verifyDay } from '../../lib/actionRules'
import { modelFor, money, paramsForOption } from '../../lib/engine'
import { setPageCrumbs } from '../../lib/pageCrumbs'
import { ActionForm, amountText, inUnitOf, minutesSince } from './ActionForm'
import type { Btn, Form } from './ActionForm'
import { dateOf, hm, systemOf } from './fmt'

const KIND_ICON: Record<ActionKind, LucideIcon> = { buy: ShoppingCart, move: Truck, doc: FileText, refer: UsersRound, other: Package }

/** One card of the page: a titled section */
function Card({ title, icon: I, aside, children, className = '' }: { title: string; icon: LucideIcon; aside?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`ov-panel actcard ${className}`} aria-label={title}>
      <header className="actcard__head">
        <h2>
          <I size={16} aria-hidden="true" />
          {title}
        </h2>
        {aside && <span className="actcard__aside">{aside}</span>}
      </header>
      {children}
    </section>
  )
}
/** Label and value pairs, two per line on the side */
function Facts({ items, cols = 3 }: { items: { label: string; value: ReactNode; tone?: 'danger' | 'warning' }[]; cols?: number }) {
  return (
    <dl className={`actfacts actfacts--${cols}`}>
      {items.map((x) => (
        <div key={x.label}>
          <dt>{x.label}</dt>
          <dd className={x.tone ? `is-${x.tone}` : undefined}>{x.value}</dd>
        </div>
      ))}
    </dl>
  )
}

/**
 * One action as a full page (owner decision, over §7's side panel): the header card with where it
 * stands and the one main button; summary, why, progress and the conversation; on the side its
 * details and where it came from.
 */
export function ActionDetail({ action: a, me, now, listLink, tabLabel }: { action: ActionItem; me: CurrentUser; now: number; listLink: (tab?: boolean) => string; tabLabel: string }) {
  const st = useAlertState()
  const msgRef = useRef<HTMLTextAreaElement>(null)
  const [form, setForm] = useState<Form>(null)
  const [msg, setMsg] = useState('')
  const [menu, setMenu] = useState(false)
  const alert = a.alertId ? allAlerts.find((x) => x.id === a.alertId) : undefined
  const detail = a.alertId ? alertDetails[a.alertId] : undefined
  const alertGone = !alert || !!st.closed[a.alertId]
  const model = alert && detail ? modelFor(alert, detail) : null
  const record = a.alertId ? st.records[a.alertId] : undefined
  const option = detail?.options.find((o) => o.id === a.option)
  const KindIcon = KIND_ICON[a.kind]

  // «اقدام‌ها › کارهای من › ACT-883» in the top bar
  useEffect(() => {
    setPageCrumbs([{ label: 'اقدام‌ها', to: listLink(false) }, { label: tabLabel, to: listLink(true) }, { label: a.id }])
    return () => setPageCrumbs(null)
  }, [a.id, tabLabel, listLink])
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [a.id])
  useEffect(() => {
    if (!menu) return
    const close = (e: PointerEvent) => !(e.target as Element).closest('.acthead__menu') && setMenu(false)
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [menu])

  const viewer = me.role === 'viewer'
  const doer = isDoer(a, me)
  const owner = a.owner === me.name
  const mgr = isUnitManager(a, me)
  const req = isRequester(a, me)
  const late = isLate(a, now)
  const left = acceptLeft(a, now)
  const cur = currentStep(a)
  const lastStep = !!cur && a.steps.indexOf(cur) === a.steps.length - 1
  const halfway = now - Date.parse(a.sentAt) >= acceptWindow(a.severity) / 2
  const scenarioLink = alert ? `/planning/scenarios?alert=${alert.code}` : null
  const auto = a.steps.some((s) => s.auto)
  const focusMsg = () => msgRef.current?.focus()
  const told = (b: Btn): Btn => ({ ...b, disabled: !!a.managerToldAt, title: a.managerToldAt ? 'اطلاع داده شده است.' : undefined })

  // ── The one main button and the rest, by status and role (§7); a viewer has none ──
  let primary: Btn | null = null
  const more: Btn[] = []
  if (!viewer) {
    if (a.status === 'new') {
      if (doer || mgr) {
        primary = { label: 'پذیرفتن', run: () => actionActions.accept(a.id) }
        more.push({ label: 'پیشنهاد تغییر', run: () => setForm('counter') }, { label: 'رد', run: () => setForm('reject'), danger: true })
        if (mgr) more.push({ label: 'ارجاع به…', run: () => setForm('refer') })
      } else if (req) {
        more.push(
          { label: 'یادآوری', run: () => actionActions.remind(a.id), disabled: !halfway || !!a.remindedAt, title: a.remindedAt ? 'یادآوری فرستاده شده است.' : !halfway ? 'از نیمهٔ مهلت پذیرش فعال می‌شود.' : undefined },
          { label: 'ویرایش', run: () => setForm('edit') },
          { label: 'لغو', run: () => setForm('cancel'), danger: true },
        )
      }
    } else if (a.status === 'counter' && req) {
      primary = { label: 'تأیید تغییر', run: () => actionActions.approveCounter(a.id) }
      more.push({ label: 'رد؛ همان درخواست اولیه', run: () => actionActions.declineCounter(a.id) })
    } else if (a.status === 'doing') {
      if (owner) {
        primary = lastStep ? { label: 'اعلام انجام', run: () => actionActions.done(a.id) } : { label: a.sync === 'failed' ? 'ثبت دستی مرحله' : `ثبت ${cur?.label ?? 'مرحله'}`, run: () => actionActions.step(a.id) }
        if (a.sync === 'failed') more.push({ label: 'تلاش دوباره', run: () => actionActions.retrySync(a.id) })
        if (late) more.push({ label: 'پیشنهاد موعد تازه', run: () => setForm('due'), disabled: !!a.dueProposal, title: a.dueProposal ? 'پیشنهاد موعد تازه فرستاده شده است.' : undefined })
        more.push({ label: 'اعلام مانع', run: () => setForm('block') })
      } else if (req) {
        if (a.dueProposal) primary = { label: 'پذیرفتن موعد تازه', run: () => actionActions.acceptDue(a.id) }
        more.push({ label: 'پیام', run: focusMsg })
        if (late) more.push(told({ label: 'اطلاع به مدیر واحد', run: () => actionActions.tellManager(a.id) }))
        more.push({ label: 'لغو', run: () => setForm('cancel'), danger: true })
      }
      if (mgr && !owner) more.push({ label: 'ارجاع به…', run: () => setForm('refer') })
    } else if (a.status === 'blocked') {
      if (owner) primary = { label: 'رفع شد', run: () => actionActions.unblock(a.id) }
      else if (req) more.push({ label: 'پیام', run: focusMsg }, told({ label: 'اطلاع به مدیر واحد', run: () => actionActions.tellManager(a.id) }))
    }
  }

  // ── Where it stands, in one line ──
  const step = `${fa(doneCount(a) + 1)} از ${fa(a.steps.length)}`
  const banner = ((): { tone: string; icon: LucideIcon; head: string; text: ReactNode } => {
    switch (a.status) {
      case 'new':
        return left !== null && left <= 0
          ? { tone: 'danger', icon: Hourglass, head: 'مهلت پذیرش گذشت', text: `به ${managerOf(a.unit) ?? `مدیر ${a.unit}`} اطلاع داده شد؛ اقدام خودکار رد نمی‌شود.` }
          : { tone: left !== null && left < 7_200_000 && (doer || mgr) ? 'danger' : 'info', icon: Hourglass, head: `منتظر پذیرش ${a.owner ?? a.unit}`, text: left !== null ? `${hm(left)} تا مهلت پذیرش` : '' }
      case 'counter':
        return { tone: req ? 'info' : 'neutral', icon: Scale, head: 'پیشنهاد تغییر', text: req ? `${a.counter?.by} تغییر پیشنهاد داده؛ تصمیم با شماست. تا پاسخ شما مهلت پذیرش متوقف است.` : `منتظر تصمیم ${a.requester}؛ کاری از شما لازم نیست.` }
      case 'doing':
        if (a.sync === 'failed') return { tone: 'warning', icon: RefreshCcw, head: `ثبت در ${systemOf(a) === 'بدون ثبت در سیستم' ? 'سیستم اجرایی' : systemOf(a)} انجام نشد`, text: 'کار متوقف نمی‌شود؛ مرحله‌ها را دستی ثبت کنید و نام ثبت‌کننده می‌ماند.' }
        if (late) return { tone: 'danger', icon: Clock, head: `${fa(lateDays(a, now))} روز از موعد گذشته`, text: `مرحلهٔ ${step}: ${cur?.label ?? ''}${a.dueProposal ? ` · موعد تازهٔ پیشنهادی: ${dateOf(a.dueProposal.due)}` : ''}` }
        return { tone: 'info', icon: ListChecks, head: `مرحلهٔ فعلی: ${cur?.label ?? ''}`, text: auto ? `${systemOf(a)} مرحله‌ها را خودکار ثبت می‌کند؛ اگر تحویل زودتر انجام شد، دستی ثبت کنید.` : `مرحلهٔ ${step} · هر مرحله را پس از انجام ثبت کنید.` }
      case 'blocked':
        return { tone: 'warning', icon: OctagonAlert, head: 'مانع', text: `${a.blocked?.reason} · از ${agoText(minutesSince(a.blocked?.since ?? a.sentAt, now))}` }
      case 'verify':
        return a.verify?.inBand === false
          ? { tone: 'warning', icon: CircleAlert, head: 'انحراف از پیش‌بینی', text: 'هشدار دوباره باز شد؛ خود اقدام باز نمی‌شود.' }
          : { tone: 'success', icon: Check, head: `سنجش اثر · روز ${fa(verifyDay(a, now))} از ۷`, text: 'در بازهٔ پیش‌بینی است؛ با ۷ روز در بازه یا بسته شدن هشدار، اقدام بسته می‌شود.' }
      case 'closed':
        return { tone: 'success', icon: Check, head: 'بسته شد', text: `${a.closedAt ? `${dateOf(a.closedAt)} · ` : ''}اثر در بازهٔ پیش‌بینی ماند.` }
      case 'rejected':
        return { tone: 'neutral', icon: X, head: 'رد شد', text: `${a.rejection?.reason}${a.rejection?.note ? `: ${a.rejection.note}` : ''}` }
      case 'cancel':
        return { tone: 'neutral', icon: X, head: 'لغو شد', text: a.cancel?.reason ?? '' }
    }
  })()

  // ── Why: the same engine run the alert's cards use ──
  const run = model && option && model.options[a.option] ? { base: model.run(model.base), withIt: model.run(paramsForOption(model, a.option, a.amount)), metrics: model.metrics } : null
  const counterRun = run && a.counter?.amount !== undefined ? model!.run(paramsForOption(model!, a.option, a.counter.amount)) : null
  const cost = run?.withIt.cost ? `${money(run.withIt.cost)} تومان` : null
  const route = a.kind === 'move' && detail?.stock?.transfer ? { from: detail.stock.transfer.source, to: detail.stock.warehouse } : null
  const history = (st.events[a.alertId || a.alertCode] ?? []).filter((e) => e.action === a.id)
  const canTalk = !viewer && (req || doer || mgr || inUnitOf(a, me))
  const copyLink = () => {
    navigator.clipboard?.writeText(window.location.href).then(
      () => notify('لینک اقدام کپی شد'),
      () => notify('کپی لینک انجام نشد'),
    )
    setMenu(false)
  }

  return (
    <div className="actpage">
      {/* Header card: kind, number, state, title; where it stands and the buttons */}
      <section className="ov-panel acthead" aria-labelledby="act-title">
        <div className="acthead__top">
          <span className="acthead__icon" aria-hidden="true">
            <KindIcon size={18} />
          </span>
          <div className="acthead__titles">
            <p className="acthead__chips">
              <span dir="ltr" className="acthead__id">
                {a.id}
              </span>
              <span className={`actstate actstate--${isOpen(a) ? (a.status === 'verify' ? 'ok' : 'live') : 'off'}`}>{STATUS_LABEL[a.status]}</span>
            </p>
            <h1 id="act-title">{a.title}</h1>
          </div>
          <div className="acthead__menu">
            <IconButton size="sm" label="گزینه‌های بیشتر" aria-haspopup="menu" aria-expanded={menu} onClick={() => setMenu(!menu)}>
              <MoreHorizontal size={17} aria-hidden="true" />
            </IconButton>
            {menu && (
              <div className="tb-menu" role="menu">
                <button type="button" role="menuitem" className="tb-menu__item" onClick={copyLink}>
                  <Copy size={16} aria-hidden="true" />
                  <span className="tb-menu__label">کپی لینک</span>
                </button>
                {!alertGone && (
                  <Link to={`/alerts/${a.alertCode}`} role="menuitem" className="tb-menu__item">
                    <Info size={16} aria-hidden="true" />
                    <span className="tb-menu__label">باز کردن هشدار</span>
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
        <div className={`acthead__bar actbar--${banner.tone}`} role="status">
          <banner.icon size={16} aria-hidden="true" />
          <p>
            <strong>{banner.head}</strong>
            {banner.text && <> · {banner.text}</>}
          </p>
          {(primary || more.length > 0 || (a.status === 'counter' && req) || (a.verify?.inBand === false && req)) && (
            <div className="acthead__btns">
              {more.map((b) => (
                <button key={b.label} type="button" className={`abtn abtn--sm ${b.danger ? 'abtn--ghost abtn--ghost-danger' : 'abtn--secondary'}`} aria-disabled={b.disabled || undefined} title={b.title} onClick={() => !b.disabled && b.run()}>
                  {b.label === 'پیام' && <MessageSquare size={14} aria-hidden="true" />}
                  {b.label === 'اعلام مانع' && <OctagonAlert size={14} aria-hidden="true" />}
                  {b.label}
                </button>
              ))}
              {scenarioLink && req && (a.status === 'counter' || (a.status === 'verify' && a.verify?.inBand === false)) && (
                <Link to={scenarioLink} className="abtn abtn--secondary abtn--sm">
                  <Split size={14} aria-hidden="true" />
                  {a.status === 'counter' ? 'سنجیدن در سناریوسازی' : 'بازبینی در سناریوسازی'}
                </Link>
              )}
              {primary && (
                <button type="button" className="abtn abtn--primary abtn--sm" onClick={primary.run}>
                  {primary.label}
                </button>
              )}
            </div>
          )}
        </div>
        {form && <ActionForm form={form} a={a} me={me} amountText={amountText} onClose={() => setForm(null)} />}
      </section>

      <div className="actgrid">
        <div className="actgrid__main">
          <Card title="خلاصه" icon={ClipboardList}>
            <Facts
              items={[
                ...(a.item ? [{ label: 'کالا', value: a.item }] : []),
                ...(a.amount !== undefined ? [{ label: 'مقدار', value: amountText(a) }] : []),
                ...(route
                  ? [
                      { label: 'مبدأ', value: route.from },
                      { label: 'تحویل در', value: route.to },
                    ]
                  : detail?.stock
                    ? [{ label: 'تحویل در', value: detail.stock.warehouse }]
                    : []),
                { label: 'موعد', value: a.due ? `${dateOf(a.due)}${late ? ` · ${fa(lateDays(a, now))} روز گذشته` : ''}` : 'بدون موعد', tone: late ? ('danger' as const) : undefined },
                ...(cost ? [{ label: 'هزینه', value: cost }] : []),
                { label: 'واحد اجرا', value: a.unit },
              ]}
            />
            {a.note && <p className="actnote">توضیح درخواست‌دهنده: {a.note}</p>}
          </Card>

          {a.status === 'counter' && a.counter && (
            <Card title="درخواست و پیشنهاد" icon={Scale} aside={`${a.counter.by} · ${agoText(minutesSince(a.counter.at, now))}`}>
              <table className="actcmp">
                <thead>
                  <tr>
                    <th scope="col" />
                    <th scope="col">{req ? 'درخواست شما' : 'درخواست'}</th>
                    <th scope="col">پیشنهاد واحد</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <th scope="row">مقدار</th>
                    <td>{amountText(a)}</td>
                    <td>{a.counter.split ?? amountText(a, a.counter.amount)}</td>
                  </tr>
                  <tr>
                    <th scope="row">موعد</th>
                    <td>{a.due ? dateOf(a.due) : '—'}</td>
                    <td>{a.counter.due ? dateOf(a.counter.due) : 'بدون تغییر'}</td>
                  </tr>
                  {run &&
                    counterRun &&
                    run.metrics.map((m) => (
                      <tr key={m.key}>
                        <th scope="row">{m.label}</th>
                        <td>{m.fmt(run.withIt.values[m.key])}</td>
                        <td>{m.fmt(counterRun.values[m.key])}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
              <p className="actnote">دلیل: {a.counter.reason}</p>
            </Card>
          )}

          <Card title="چرا" icon={CircleAlert}>
            {detail ? <p className="actnote actnote--lead">{detail.summary.replace(/\*\*/g, '')}</p> : <p className="actnote">هشدار این اقدام بسته شده و جزئیاتش در دسترس نیست.</p>}
            {run ? (
              <table className="actcmp">
                <thead>
                  <tr>
                    <th scope="col" />
                    <th scope="col">بدون اقدام</th>
                    <th scope="col">با این اقدام</th>
                  </tr>
                </thead>
                <tbody>
                  {run.metrics.map((m) => (
                    <tr key={m.key}>
                      <th scope="row">{m.label}</th>
                      <td>{m.fmt(run.base.values[m.key])}</td>
                      <td>{m.fmt(run.withIt.values[m.key])}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              option && <p className="actnote">اثر: {option.effect}</p>
            )}
          </Card>

          <Card title="پیشرفت" icon={ListChecks} aside={auto ? `مرحله‌ها را ${systemOf(a)} خودکار به‌روز می‌کند${a.externalRef ? ` · ${a.externalRef}` : ''}` : a.externalRef}>
            <ol className="actstepper" style={{ ['--n' as string]: a.steps.length }}>
              {a.steps.map((s, i) => {
                const here = s === cur && (a.status === 'doing' || a.status === 'blocked')
                return (
                  <li key={i} className={`${s.done ? 'is-done' : ''} ${here ? 'is-current' : ''} ${here && a.status === 'blocked' ? 'is-blocked' : ''}`}>
                    <span className="actstepper__dot" aria-hidden="true">
                      {s.done ? <Check size={12} /> : here && a.status === 'blocked' ? <OctagonAlert size={12} /> : null}
                    </span>
                    <span className="actstepper__label">{s.label}</span>
                    <span className="actstepper__meta">{s.done ? `${dateOf(s.done)} · ${s.auto ? 'خودکار' : (s.by ?? 'دستی')}` : here ? (a.status === 'blocked' ? 'مانع' : 'در جریان') : '—'}</span>
                  </li>
                )
              })}
            </ol>
          </Card>

          <Card title="گفتگو" icon={MessageSquare}>
            <ol className="actchat">
              {history.map((e, i) => (
                <li key={i} className={e.message ? (e.actor === me.name ? 'is-mine' : 'is-message') : 'is-event'}>
                  <span className="actchat__who">
                    <strong>{e.actor === me.name ? `${e.actor} (شما)` : e.actor}</strong> · {e.time}
                  </span>
                  <span className="actchat__text">{e.text}</span>
                </li>
              ))}
            </ol>
            {canTalk && (
              <form
                className="actchat__compose"
                onSubmit={(e) => {
                  e.preventDefault()
                  actionActions.message(a.id, msg)
                  setMsg('')
                }}
              >
                <label className="visually-hidden" htmlFor="act-msg">
                  پیام
                </label>
                <textarea
                  id="act-msg"
                  ref={msgRef}
                  rows={1}
                  placeholder="پیام بنویسید…"
                  value={msg}
                  onChange={(e) => setMsg(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      e.currentTarget.form?.requestSubmit()
                    }
                  }}
                />
                <IconButton size="sm" label="فرستادن" type="submit" disabled={!msg.trim()}>
                  <Send size={16} aria-hidden="true" />
                </IconButton>
              </form>
            )}
          </Card>
        </div>

        <aside className="actgrid__side">
          <Card title="مشخصات" icon={Info}>
            <Facts
              cols={1}
              items={[
                { label: 'وضعیت', value: <span className={`actstate actstate--${isOpen(a) ? (a.status === 'verify' ? 'ok' : 'live') : 'off'}`}>{STATUS_LABEL[a.status]}</span> },
                { label: 'واحد', value: a.unit },
                { label: 'مسئول', value: a.owner ?? <span className="amuted">بدون مسئول</span> },
                { label: 'درخواست‌دهنده', value: a.requester },
                ...(left !== null ? [{ label: 'مهلت پذیرش', value: left > 0 ? `${hm(left)} مانده` : 'گذشته', tone: left < 7_200_000 ? ('danger' as const) : undefined }] : []),
                { label: 'موعد', value: a.due ? dateOf(a.due) : 'بدون موعد', tone: late ? ('danger' as const) : undefined },
                ...(cost ? [{ label: 'هزینه', value: cost }] : []),
                { label: 'سیستم اجرا', value: a.externalRef ? `${a.externalRef}${a.sync === 'failed' ? ' · ثبت نشد' : a.sync === 'manual' ? ' · دستی' : ''}` : 'بدون ثبت در سیستم', tone: a.sync === 'failed' ? ('warning' as const) : undefined },
              ]}
            />
          </Card>
          <Card title="از کجا آمده" icon={Split}>
            <Facts
              cols={1}
              items={[
                {
                  label: 'هشدار',
                  value: alertGone ? (
                    <span className="amuted" title="این هشدار بسته شده و در فهرست هشدارها نیست">
                      <span dir="ltr">{a.alertCode}</span> · هشدار بسته شده
                    </span>
                  ) : (
                    <span className="actorigin">
                      <Link to={`/alerts/${a.alertCode}`} dir="ltr" className="ov-link">
                        {a.alertCode}
                      </Link>
                      {alert && <SeverityChip severity={alert.severity} />}
                    </span>
                  ),
                },
                ...(alert ? [{ label: 'عنوان هشدار', value: alert.title }] : []),
                ...(record?.scenario ? [{ label: 'سناریو', value: <span title="فقط خواندنی: نسخهٔ ثابت در لحظهٔ تصمیم">{`${record.scenario.id} · ${record.scenario.name}`}</span> }] : []),
                { label: 'ثبت تصمیم', value: `${dateOf(a.sentAt)} · ${a.requester}` },
                ...(a.groupId ? [{ label: 'تصمیم ترکیبی', value: 'دو اقدام برای دو واحد' }] : []),
              ]}
            />
          </Card>
        </aside>
      </div>
    </div>
  )
}
