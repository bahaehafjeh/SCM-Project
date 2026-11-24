import { useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { alertDetails, allAlerts } from '../data/overview'
import type { AlertItem } from '../data/overview'
import { alertActions, defaultTemplateSettings, notify, useAlertState } from '../lib/alertStore'
import type { TemplateEntry, TemplateSettings } from '../lib/alertStore'
import { currentUser } from '../lib/access'
import { metricLabel, modelFor, val, withValues } from '../lib/engine'
import type { Role as VarRole, ScenarioModel } from '../lib/engine'
import { fa } from '../components/overview/AlertParts'
import { ConfirmModal } from './scenario/ConfirmModal'
import '../components/overview/overview.css'
import '../components/overview/alerts-flow.css'
import './ScenarioPage.css'

const GROUP = { stress: 'حالت آماده‌ی فرض', action: 'اقدام · «اگر این کار را بکنیم؟»' } as const
export const ROLE_LABEL: Record<VarRole, string> = { action: 'اقدام', assumption: 'فرض', advanced: 'پیشرفته' }

// One entry per alert type that has a model, with the open alert used for the preview
const kinds = (() => {
  const seen = new Map<string, { m: ScenarioModel; alert: AlertItem }>()
  for (const a of allAlerts) {
    const m = modelFor(a, alertDetails[a.id])
    if (m && a.kind && !seen.has(a.kind)) seen.set(a.kind, { m, alert: a })
  }
  return [...seen.entries()]
})()

type Draft = { key?: string; name: string; note: string; group: 'stress' | 'action'; patch: Record<string, number> }

/**
 * «سناریوهای آماده» (settings): per alert type, which ready-made scenarios «افزودن سناریو» offers,
 * the unit's own ones, and who may use or create them. ?role=viewer shows it read-only.
 */
export function ScenarioTemplatesPage() {
  const st = useAlertState()
  const readOnly = currentUser().role === 'viewer'
  const [kind, setKind] = useState(kinds[0]?.[0] ?? '')
  const [draft, setDraft] = useState<Draft | null>(null)
  const [tried, setTried] = useState(false)
  const [removing, setRemoving] = useState<TemplateEntry | null>(null)
  const entry = kinds.find(([k]) => k === kind)?.[1]
  const t: TemplateSettings = st.templates[kind] ?? defaultTemplateSettings()
  const save = (next: TemplateSettings) => alertActions.setTemplates(kind, next)
  if (!entry) return null
  const { m, alert } = entry

  const rows: TemplateEntry[] = [...m.templates.map((x) => ({ ...x, builtIn: true })), ...t.custom]
  const changes = (patch: Record<string, number>) => m.describe(withValues(m, m.base, patch))

  // Validation: a unique name, at least one change, every value within its range
  const errors = draft
    ? {
        name: !draft.name.trim() ? 'نام را بنویسید.' : rows.some((r) => r.key !== draft.key && r.name.trim() === draft.name.trim()) ? 'سناریوی آماده‌ای با همین نام هست.' : '',
        patch: Object.keys(draft.patch).length === 0 ? 'دست‌کم یک متغیر را تغییر دهید.' : '',
        range: m.vars.filter((v) => draft.patch[v.key] !== undefined && (draft.patch[v.key] < v.min || draft.patch[v.key] > v.max)).map((v) => v.key),
      }
    : null
  const valid = !!errors && !errors.name && !errors.patch && errors.range.length === 0

  const submit = () => {
    setTried(true)
    if (!draft || !valid) return
    const item: TemplateEntry = { key: draft.key ?? `u${Date.now()}`, name: draft.name.trim(), note: draft.note.trim() || changes(draft.patch).join(' · '), group: draft.group, patch: draft.patch, builtIn: false }
    save({ ...t, custom: draft.key ? t.custom.map((c) => (c.key === draft.key ? item : c)) : [...t.custom, item] })
    notify(draft.key ? 'سناریوی آماده به‌روز شد' : 'سناریوی آماده اضافه شد')
    setDraft(null)
    setTried(false)
  }

  // Preview on the open alert of this type: the same engine the scenario page uses
  const preview = draft ? m.run(withValues(m, m.base, draft.patch)) : null
  const base = m.run(m.base)

  return (
    <div className="scn-page">
      {/* Header and «تنظیمات / سناریوهای آماده» come from the settings section (DomainSectionLayout) */}

      <div className="tpl-grid">
        <nav className="ov-panel tpl-kinds" aria-label="نوع هشدار">
          {kinds.map(([k, km]) => {
            const ts = st.templates[k] ?? defaultTemplateSettings()
            const count = km.m.templates.filter((x) => !ts.hidden.includes(x.key)).length + ts.custom.length
            return (
              <button key={k} type="button" className={`tpl-kind ${k === kind ? 'is-on' : ''}`} aria-pressed={k === kind} onClick={() => (setKind(k), setDraft(null), setTried(false))}>
                <span>{k}</span>
                <span className="tpl-kind__count" aria-label={`${fa(count)} سناریوی آماده`}>
                  {fa(count)}
                </span>
              </button>
            )
          })}
        </nav>

        <div className="scn-main">

          <section className="ov-panel">
            <div className="tpl-head">
              <h3>سناریوهای آماده «{kind}»</h3>
              {!readOnly && !draft && (
                <button type="button" className="abtn abtn--secondary abtn--sm" onClick={() => setDraft({ name: '', note: '', group: 'action', patch: {} })}>
                  <Plus size={14} aria-hidden="true" />
                  سناریوی آماده جدید
                </button>
              )}
            </div>

            {draft && errors && (
              <div className="tpl-form">
                <label className="afield">
                  <span className="afield__label">
                    نام <span className="afield__req">*</span>
                  </span>
                  <input className="afield__input tpl-input" value={draft.name} aria-invalid={tried && !!errors.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="مثلاً: تأخیر بندر ۱۰ روز" />
                  {tried && errors.name && <span className="svar__error">{errors.name}</span>}
                </label>
                <label className="afield">
                  <span className="afield__label">
                    توضیح یک‌خطی <span className="afield__opt">(اختیاری)</span>
                  </span>
                  <input className="afield__input tpl-input" maxLength={80} value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} placeholder={changes(draft.patch).join(' · ') || 'خلاصه تغییرها'} />
                </label>
                <div className="seg seg--fill" role="radiogroup" aria-label="گروه">
                  {(['stress', 'action'] as const).map((g) => (
                    <button key={g} type="button" role="radio" aria-checked={draft.group === g} aria-pressed={draft.group === g} onClick={() => setDraft({ ...draft, group: g })}>
                      {GROUP[g]}
                    </button>
                  ))}
                </div>
                <p className="afield__label">تغییر متغیرها · خالی یعنی همان مقدار هشدار</p>
                <div className="tpl-vars">
                  {m.vars.map((v) => {
                    const bad = errors.range.includes(v.key)
                    return (
                      <label key={v.key} className="tpl-var">
                        <span>
                          {v.label} <span className="afield__opt">({v.unit})</span> <span className="status-chip status-chip--muted scn-tag">{ROLE_LABEL[v.role]}</span>
                        </span>
                        <input
                          type="number"
                          className="afield__input tpl-input"
                          dir="ltr"
                          min={v.min}
                          max={v.max}
                          step={v.step}
                          aria-invalid={bad}
                          value={draft.patch[v.key] ?? ''}
                          placeholder={String(val(m.base, v.key))}
                          onChange={(e) => {
                            const patch = { ...draft.patch }
                            if (e.target.value === '') delete patch[v.key]
                            else patch[v.key] = +e.target.value
                            setDraft({ ...draft, patch })
                          }}
                        />
                        {bad && <span className="svar__error">مقدار باید بین {fa(v.min)} و {fa(v.max)} باشد.</span>}
                      </label>
                    )
                  })}
                </div>
                {tried && errors.patch && <p className="svar__error">{errors.patch}</p>}
                {/* 8-ز · More than one kind of action: allowed, but only alerts with a combined option can record it */}
                {draft.group === 'action' && m.vars.filter((v) => v.role === 'action' && !v.dependsOn && (draft.patch[v.key] ?? 0) > 0).length > 1 && (
                  <p className="tpl-note" role="note">این سناریو فقط روی هشدارهایی اعمال می‌شود که گزینهٔ ترکیبی دارند.</p>
                )}
                {preview && Object.keys(draft.patch).length > 0 && errors.range.length === 0 && (
                  <div className="tpl-preview" aria-live="polite">
                    <p className="afield__label">
                      پیش‌نمایش روی{' '}
                      <span dir="ltr" className="scn-code">
                        {alert.code}
                      </span>{' '}
                      · {alert.title}
                    </p>
                    <dl>
                      {m.metrics.map((x) => (
                        <div key={x.key}>
                          <dt>{metricLabel(x, m.base.horizon)}</dt>
                          <dd>
                            {x.fmt(preview.values[x.key])} <span className="is-muted">(بدون اقدام: {x.fmt(base.values[x.key])})</span>
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                )}
                <div className="tpl-form__foot">
                  <button type="button" className="abtn abtn--primary" onClick={submit}>
                    {draft.key ? 'ذخیره تغییرها' : 'افزودن سناریوی آماده'}
                  </button>
                  <button type="button" className="abtn abtn--ghost" onClick={() => (setDraft(null), setTried(false))}>
                    انصراف
                  </button>
                </div>
              </div>
            )}

            {(['stress', 'action'] as const).map((g) => {
              const list = rows.filter((r) => r.group === g)
              return (
                <div key={g} className="tpl-group">
                  <p className="scn-vars__title">{GROUP[g]}</p>
                  {list.length === 0 ? (
                    <p className="tpl-empty">در این گروه سناریوی آماده‌ای نیست.</p>
                  ) : (
                    <ul className="tpl-list">
                      {list.map((r) => {
                        const off = r.builtIn && t.hidden.includes(r.key)
                        return (
                          <li key={r.key} className={off ? 'is-off' : ''}>
                            <div className="tpl-list__text">
                              <strong>
                                {r.name}
                                <span className="status-chip status-chip--muted scn-tag">{r.builtIn ? 'پیش‌فرض' : 'ساخته شما'}</span>
                              </strong>
                              <span className="scn-chips">
                                {changes(r.patch).map((c) => (
                                  <span key={c}>{c}</span>
                                ))}
                              </span>
                            </div>
                            {!readOnly &&
                              (r.builtIn ? (
                                <label className="tpl-check">
                                  <input type="checkbox" role="switch" aria-label={`فعال بودن «${r.name}»`} checked={!off} onChange={() => save({ ...t, hidden: off ? t.hidden.filter((h) => h !== r.key) : [...t.hidden, r.key] })} />
                                </label>
                              ) : (
                                <span className="tpl-list__tools">
                                  <button type="button" className="aicon-btn" aria-label={`ویرایش ${r.name}`} onClick={() => setDraft({ key: r.key, name: r.name, note: r.note, group: r.group, patch: r.patch })}>
                                    <Pencil size={15} aria-hidden="true" />
                                  </button>
                                  <button type="button" className="aicon-btn" aria-label={`حذف ${r.name}`} onClick={() => setRemoving(r)}>
                                    <Trash2 size={15} aria-hidden="true" />
                                  </button>
                                </span>
                              ))}
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </div>
              )
            })}
          </section>
        </div>
      </div>
      {removing && (
        <ConfirmModal
          title={`حذف «${removing.name}»`}
          text="این سناریوی آماده از «افزودن سناریو» برداشته می‌شود. سناریوهایی که قبلاً با آن ساخته شده‌اند تغییری نمی‌کنند."
          confirm="حذف"
          onCancel={() => setRemoving(null)}
          onConfirm={() => {
            save({ ...t, custom: t.custom.filter((c) => c.key !== removing.key) })
            notify(`«${removing.name}» حذف شد`)
            setRemoving(null)
          }}
        />
      )}
    </div>
  )
}
