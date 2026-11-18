import { useState } from 'react'
import { ChevronDown, RotateCcw, X } from 'lucide-react'
import type { Scenario, ScenarioDraft, TemplateEntry } from '../../lib/alertStore'
import { val } from '../../lib/engine'
import type { ScenarioModel, VarDef } from '../../lib/engine'
import { fa } from '../../components/overview/AlertParts'
import { VarField } from './VarField'
import { changedAssumptions, rowActionKeys } from './helpers'
import { SeekButton } from './SeekField'

const OPEN_KEY = 'scn-assumptions-open'
const readOpen = () => {
  try {
    return localStorage.getItem(OPEN_KEY) === '1'
  } catch {
    return false
  }
}

/**
 * The settings column, two blocks: «تنظیمات سناریو» (the selected row's actions) and «فرض‌های مشترک»
 * (one set of assumptions for every row, «بدون اقدام» included). Below 1200 px it is a side drawer.
 */
export function SettingsColumn(props: {
  m: ScenarioModel
  draft: ScenarioDraft
  sel: Scenario
  color: string
  /** The system's suggestion: the only row with a tag */
  picked: boolean
  /** «{reason} · {effect}» of the suggestion, from the data (§4), on hover of its tag */
  pickNote?: string
  /** «برگشت به پیشنهاد» / «برگشت به حالت اولیه», or null when nothing changed */
  revertLabel: string | null
  stressTemplates: TemplateEntry[]
  viewer: boolean
  open: boolean
  onClose: () => void
  onAction: (patch: Record<string, number>) => void
  onAssume: (patch: Record<string, number>, reset?: boolean) => void
  onRevert: () => void
}) {
  const { m, draft, sel } = props
  return (
    <aside className={`scn-side ${props.open ? 'is-open' : ''}`} aria-label="تنظیمات">
      <button type="button" className="aicon-btn scn-side__close" onClick={props.onClose} aria-label="بستن تنظیمات">
        <X size={16} aria-hidden="true" />
      </button>
      <ScenarioBlock {...props} key={sel.id} />
      {m.vars.some((v) => v.role === 'assumption') && <SharedAssumptions m={m} draft={draft} stress={props.stressTemplates} viewer={props.viewer} onAssume={props.onAssume} />}
    </aside>
  )
}

function ScenarioBlock({ m, draft, sel, picked, pickNote, revertLabel, viewer, onAction, onRevert }: Parameters<typeof SettingsColumn>[0]) {
  const reference = sel.origin === 'reference'
  const locked = reference || viewer
  const baseWord = sel.initialOrigin === 'alert' ? 'پیشنهاد' : 'اولیه'
  const keys = rowActionKeys(m, sel)
  const list = m.vars.filter((v) => keys.includes(v.key))
  const field = (v: VarDef, sub = false) => (
    <div key={v.key} className="scn-field">
      <VarField v={v} value={val(sel.params, v.key)} initial={val(sel.initial, v.key)} disabled={locked} baseWord={baseWord} sub={sub} onChange={(x) => onAction({ [v.key]: x })} />
      {v.seek && !locked && <SeekButton m={m} draft={draft} sel={sel} v={v} onSet={(x) => onAction({ [v.key]: x })} />}
    </div>
  )
  // A parent, then the fields that depend on it while it is above zero
  const withChildren = (v: VarDef) => [field(v), ...(val(sel.params, v.key) > 0 ? m.vars.filter((c) => c.dependsOn === v.key).map((c) => field(c, true)) : [])]

  return (
    <section className="ov-panel scn-block" aria-labelledby="scn-set-h">
      <div className="scn-block__head">
        <h3 id="scn-set-h">تنظیمات سناریو</h3>
      </div>
      <div className="scn-block__who">
        <span className="status-chip status-chip--muted scn-namechip" title={sel.name}>
          <span className="scn-namechip__text">{sel.name}</span>
        </span>
        {picked && (
          <span className="status-chip scn-tag scn-tag--pick" title={pickNote}>
            پیشنهادی
          </span>
        )}
        {revertLabel && !locked && (
          <button type="button" className="aicon-btn scn-revert-icon" onClick={onRevert} aria-label={revertLabel} title={revertLabel}>
            <RotateCcw size={14} aria-hidden="true" />
          </button>
        )}
      </div>

      {reference ? (
        <div className="scn-vars__locked">
          <p>مبنای مقایسه قابل تغییر نیست. فرض‌های مشترک را پایین‌تر می‌توانید عوض کنید.</p>
        </div>
      ) : (
        <div className="scn-block__group" id="scn-g-act">
          <p className="scn-vars__title">اقدام این سناریو</p>
          {list.length === 0 ? (
            <div className="scn-vars__empty">
              <p>این سناریو اقدامی ندارد.</p>
            </div>
          ) : (
            list.flatMap(withChildren)
          )}
        </div>
      )}
    </section>
  )
}

function SharedAssumptions({ m, draft, stress, viewer, onAssume }: { m: ScenarioModel; draft: ScenarioDraft; stress: TemplateEntry[]; viewer: boolean; onAssume: (patch: Record<string, number>, reset?: boolean) => void }) {
  const vars = m.vars.filter((v) => v.role === 'assumption')
  const now = (k: string) => draft.assumptions[k] ?? val(m.base, k)
  const n = changedAssumptions(m, draft)
  // A ready state is on when every assumption equals the data plus its patch
  const isOn = (t: TemplateEntry) => vars.every((v) => now(v.key) === (t.patch[v.key] ?? val(m.base, v.key)))
  // Folded by default (the chip still says how many changed); the choice is kept per browser
  const [open, setOpen] = useState(readOpen)
  const toggle = () => {
    setOpen(!open)
    try {
      localStorage.setItem(OPEN_KEY, open ? '0' : '1')
    } catch {
      /* private window: it opens folded next time */
    }
  }
  return (
    <section className={`ov-panel scn-block scn-shared ${open ? '' : 'is-collapsed'}`} aria-labelledby="scn-asm-h">
      <button type="button" className="scn-shared__head" aria-expanded={open} aria-controls="scn-asm-body" onClick={toggle}>
        <div>
          <h3 id="scn-asm-h">فرض‌های مشترک</h3>
          <p className="scn-block__sub">روی همهٔ سناریوها، از جمله «بدون اقدام»، اثر دارد</p>
        </div>
        {n > 0 && <span className="status-chip status-chip--warn">{fa(n)} تغییر</span>}
        <ChevronDown size={16} aria-hidden="true" className="scn-shared__chev" />
      </button>
      <div id="scn-asm-body" className="scn-shared__body">
        {stress.length > 0 && (
          <div className="scn-ready" role="group" aria-label="حالت آماده">
            <span className="scn-ready__label">حالت آماده:</span>
            {stress.map((t) => (
              <button key={t.key} type="button" className="chip" aria-pressed={isOn(t)} disabled={viewer} title={t.note} onClick={() => onAssume(Object.fromEntries(vars.filter((v) => t.patch[v.key] !== undefined).map((v) => [v.key, t.patch[v.key]])), true)}>
                {t.name}
              </button>
            ))}
          </div>
        )}
        {vars.map((v) => (
          <VarField key={v.key} v={v} value={now(v.key)} initial={val(m.base, v.key)} disabled={viewer} baseWord="واقعی" onChange={(x) => onAssume({ [v.key]: x })} />
        ))}
        <p className="scn-block__note">فرض‌ها پیش‌بینی را عوض می‌کنند و به واحد اجرا نمی‌روند. با «اعمال روی هشدار» فقط همراه سناریو در هشدار ثبت می‌شوند.</p>
      </div>
    </section>
  )
}
