import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent, ReactNode } from 'react'
import { ChevronDown, Plus, RotateCcw } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { AlertDetail } from '../../data/overview'
import type { Scenario, ScenarioOrigin, TemplateEntry } from '../../lib/alertStore'
import { paramsForOption, withValues } from '../../lib/engine'
import type { Params, ScenarioModel, VarDef } from '../../lib/engine'
import { fa } from '../../components/overview/AlertParts'
import { MAX_SCENARIOS, autoName, canApply, customStart, duplicateRow, fill, isActionOption } from './helpers'
import type { UnitRejection } from './helpers'

export type NewScenario = { name: string; params: Params; origin: ScenarioOrigin; option?: string }

/** «انتقال» from «مقدار انتقال از انبار شیراز» */
const shortLabel = (v: VarDef) => v.label.replace(/^مقدار\s+/, '').replace(/\s+(از|به)\s.+$/, '')

/** One menu entry: a title, and under it what it makes (or why it cannot be added) */
function Entry({ title, line, disabled, why, chip, icon, onPick }: { title: string; line: string; disabled: boolean; why?: string; chip?: string; icon?: ReactNode; onPick: () => void }) {
  return (
    <button type="button" role="menuitem" className="tb-menu__item scn-addmenu__item" aria-disabled={disabled || undefined} title={why} onClick={() => !disabled && onPick()}>
      {icon && <span className="scn-addmenu__icon">{icon}</span>}
      <span className="scn-addmenu__text">
        <span className="scn-addmenu__title">
          {title}
          {chip && <span className="status-chip status-chip--muted scn-addmenu__chip">{chip}</span>}
        </span>
        <span className="scn-addmenu__line">{line}</span>
      </span>
    </button>
  )
}

/**
 * 8-ج/د · «+ افزودن سناریو»: one button, a dropdown (no modal); one click on an entry = one new row.
 * Ready-made scenarios with the figures they make for this alert, a scenario of one chosen action, the
 * alert's own options the user removed, and the link to manage ready-made scenarios. An entry that
 * cannot be recorded on this alert, or is already in the table, is shown greyed with the reason.
 * Assumption states, blank scenarios and copies are not here (copies are in each row's ⋯).
 */
export function AddMenu(p: { m: ScenarioModel; detail: AlertDetail; list: Scenario[]; templates: TemplateEntry[]; unit: UnitRejection | null; canManage: boolean; onAdd: (it: NewScenario) => void }) {
  const { m, detail, list } = p
  const [open, setOpen] = useState(false)
  const [custom, setCustom] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const btn = useRef<HTMLButtonElement>(null)
  const menu = useRef<HTMLDivElement>(null)
  const full = list.length >= MAX_SCENARIOS

  const close = (refocus = true) => {
    setOpen(false)
    setCustom(false)
    if (refocus) btn.current?.focus()
  }
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    const onDown = (e: PointerEvent) => !root.current?.contains(e.target as Node) && close(false)
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onDown)
    menu.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onDown)
    }
  }, [open])
  // ↑ / ↓ move between entries, Home / End to the ends
  const onMenuKey = (e: ReactKeyboardEvent) => {
    const items = [...(menu.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])]
    const at = items.indexOf(document.activeElement as HTMLElement)
    const go = { ArrowDown: at + 1, ArrowUp: at - 1, Home: 0, End: items.length - 1 }[e.key]
    if (go === undefined || !items.length) return
    e.preventDefault()
    items[(go + items.length) % items.length].focus()
  }
  const pick = (it: NewScenario) => {
    close(false)
    p.onAdd(it)
  }
  // Why an entry cannot be added: not recordable on this alert (8-الف), or already a row
  // «در جدول هست» is for ready-made scenarios only: «سناریوی دلخواه» is a starting point the user then changes
  const status = (q: Params, dupCheck = true): { disabled: boolean; line?: string } => {
    const c = canApply(detail, m, q, p.unit)
    if (!c.ok) return { disabled: true, line: c.code === 'unitRejected' && p.unit ? `${c.reason}: ${p.unit.reason}` : c.reason }
    const dup = dupCheck ? duplicateRow(m, list, q) : -1
    if (dup >= 0) return { disabled: true, line: `در جدول هست · ردیف ${fa(dup + 1)}` }
    return { disabled: false }
  }

  // 1 · Ready-made scenarios: their figures for this alert, exactly the row they make
  const defined = p.templates.length > 0
  const ready = p.templates
    .map((t) => {
      const q = withValues(m, m.base, t.patch)
      const name = autoName(detail, m, q)
      const st = status(q)
      return { t, q, name, ...st, inTable: duplicateRow(m, list, q) >= 0 }
    })
    .filter((r) => !r.inTable)
  // 2 · A scenario of one action
  const actions = m.vars.filter((v) => v.role === 'action' && !v.dependsOn)
  // 3 · The alert's own options with no row any more
  const missing = detail.options.filter((o) => isActionOption(m, o.id) && !list.some((s) => s.option === o.id))

  return (
    <div className="scn-addmenu" ref={root}>
      <button
        ref={btn}
        type="button"
        className="abtn abtn--outline abtn--sm"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-disabled={full || undefined}
        title={full ? `جدول پر است (${fa(MAX_SCENARIOS)} از ${fa(MAX_SCENARIOS)})؛ یک سناریو را از منوی ⋯ حذف کنید.` : undefined}
        onClick={() => !full && (open ? close() : setOpen(true))}
      >
        افزودن سناریو
        <ChevronDown size={14} aria-hidden="true" />
      </button>
      {open && (
        <div ref={menu} className="tb-menu scn-addmenu__menu" role="menu" aria-label="افزودن سناریو" onKeyDown={onMenuKey}>
          {!defined ? (
            <>
              <p className="scn-addmenu__group">سناریوهای آماده</p>
              <p className="scn-addmenu__none">برای این نوع هشدار سناریوی آماده‌ای تعریف نشده.</p>
              <div className="tb-menu__sep" role="separator" />
            </>
          ) : (
            ready.length > 0 && (
              <>
                <p className="scn-addmenu__group">سناریوهای آماده</p>
                {ready.map((r) => (
                  <Entry key={r.t.key} title={r.t.name} line={r.line ?? r.name} disabled={r.disabled} why={r.line} chip={r.t.builtIn ? undefined : 'سازمان'} onPick={() => pick({ name: r.name, params: r.q, origin: 'template' })} />
                ))}
                <div className="tb-menu__sep" role="separator" />
              </>
            )
          )}
          <button type="button" role="menuitem" className="tb-menu__item scn-addmenu__item" aria-expanded={custom} onClick={() => setCustom(!custom)}>
            <span className="scn-addmenu__icon">
              <Plus size={14} aria-hidden="true" />
            </span>
            <span className="scn-addmenu__text">
              <span className="scn-addmenu__title">سناریوی دلخواه</span>
              <span className="scn-addmenu__line">یک اقدام را انتخاب کنید</span>
            </span>
            <ChevronDown size={14} aria-hidden="true" className={custom ? 'scn-addmenu__chev is-open' : 'scn-addmenu__chev'} />
          </button>
          {custom && (
            <div className="scn-addmenu__sub" role="group" aria-label="نوع اقدام">
              {actions.map((v) => {
                const q = customStart(detail, m, v.key)
                const st = status(q, false)
                return <Entry key={v.key} title={shortLabel(v)} line={st.line ?? autoName(detail, m, q)} disabled={st.disabled} why={st.line} onPick={() => pick({ name: autoName(detail, m, q), params: q, origin: 'user' })} />
              })}
            </div>
          )}

          {missing.length > 0 && (
            <>
              <div className="tb-menu__sep" role="separator" />
              <p className="scn-addmenu__group">بازگرداندن گزینهٔ هشدار</p>
              {missing.map((o) => (
                <Entry key={o.id} icon={<RotateCcw size={14} aria-hidden="true" />} title={fill(o.title, o.amount)} line={o.effect} disabled={false} onPick={() => pick({ name: fill(o.title, o.amount), params: paramsForOption(m, o.id, o.amount), origin: 'alert', option: o.id })} />
              ))}
            </>
          )}

          {p.canManage && (
            <>
              <div className="tb-menu__sep" role="separator" />
              <Link to="/settings/scenario-templates" role="menuitem" className="tb-menu__item scn-addmenu__link">
                مدیریت سناریوهای آماده
              </Link>
            </>
          )}
        </div>
      )}
    </div>
  )
}
