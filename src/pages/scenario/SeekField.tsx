import { Wand2 } from 'lucide-react'
import type { Scenario, ScenarioDraft } from '../../lib/alertStore'
import type { ScenarioModel, VarDef } from '../../lib/engine'
import { fa } from '../../components/overview/AlertParts'
import { Popover } from './Popover'
import { minSufficient, seekGoals } from './helpers'
import type { SeekGoal } from './helpers'

const GOAL: Record<SeekGoal, string> = {
  zero: 'موجودی صفر نشود',
  crit: 'پس از رسیدن، زیر مرز بحرانی نرود',
  safe: 'در پایان بازه به حد ایمن برسد',
}
const short = (v: VarDef) => v.label.replace(/^مقدار\s+/, '').replace(/\s+از\s.+$/, '')

/**
 * «کمترین مقدار کافی را پیدا کن» (§9): the lowest amount meeting each goal, with the shared
 * assumptions and everything else held. Values come only while the popover is open.
 */
export function SeekButton({ m, draft, sel, v, onSet }: { m: ScenarioModel; draft: ScenarioDraft; sel: Scenario; v: VarDef; onSet: (x: number) => void }) {
  const show = (x: number) => fa(x, v.step < 1 ? 1 : 0)
  const unit = m.chart.unit
  const ref = (tone: 'crit' | 'safe') => m.chart.refs.find((r) => r.tone === tone)
  const note: Record<SeekGoal, string> = {
    zero: `با فرض‌های فعلی، در ${fa(m.base.horizon)} روز`,
    crit: `مرز بحرانی ${fa(ref('crit')?.value ?? 0)} ${unit}`,
    safe: `حد ایمن ${fa(ref('safe')?.value ?? 0)} ${unit}`,
  }
  return (
    <Popover
      label={`کمترین ${short(v)} کافی`}
      className="scn-seek"
      button={
        <span className="scn-seek__btn">
          <Wand2 size={14} aria-hidden="true" />
          کمترین مقدار کافی را پیدا کن
        </span>
      }
    >
      {(close) => (
        <>
          <strong className="scn-pop__title">کمترین {short(v)} کافی</strong>
          <div className="scn-seek__rows">
            {seekGoals(m).map((g) => {
              const x = minSufficient(m, draft, sel, v.key, g)
              const over = x != null && !!v.limit && x > v.limit.max
              return (
                <div key={g} className="scn-seek__row">
                  <span className="scn-seek__goal">
                    {GOAL[g]}
                    <span className="scn-block__sub">{note[g]}</span>
                  </span>
                  {x == null ? (
                    <span className="is-muted">با این اقدام به‌تنهایی شدنی نیست</span>
                  ) : x === 0 ? (
                    // Already met with none of this action: nothing to set
                    <span className="is-muted">بدون این اقدام هم برقرار است</span>
                  ) : over ? (
                    <span className="scn-seek__val is-muted">
                      {show(x)} {v.unit}
                      <span className="status-chip status-chip--warn">بیش از مازاد</span>
                    </span>
                  ) : (
                    <span className="scn-seek__val">
                      <strong>
                        {show(x)} {v.unit}
                      </strong>
                      <button
                        type="button"
                        className={`abtn abtn--sm ${g === 'crit' ? 'abtn--primary' : 'abtn--secondary'}`}
                        onClick={() => {
                          onSet(x)
                          close()
                        }}
                      >
                        بگذار
                      </button>
                    </span>
                  )}
                </div>
              )
            })}
          </div>
          <span className="scn-pop__note">
            با فرض‌های مشترک فعلی حساب شده است
            {v.limit && ` · سقف مجاز ${fa(v.limit.max)} ${v.unit}`}
          </span>
        </>
      )}
    </Popover>
  )
}
