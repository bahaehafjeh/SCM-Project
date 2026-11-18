import { Link } from 'react-router-dom'
import { MapPin, Settings2, Split } from 'lucide-react'
import { alertDetails, allAlerts } from '../../data/overview'
import type { Severity } from '../../data/overview'
import { useAlertState } from '../../lib/alertStore'
import { modelFor } from '../../lib/engine'
import { PageHeader } from '../../components/PageHeader'
import { SeverityChip, fa } from '../../components/overview/AlertParts'
import { timeOf } from './helpers'

const RANK: Record<Severity, number> = { critical: 0, high: 1, medium: 2 }

/** Scenario page with no alert: open alerts that have a model, most severe first, and recent scenarios */
export function ScenarioStart({ title }: { title: string }) {
  const st = useAlertState()
  const open = allAlerts.filter((a) => !st.closed[a.id] && modelFor(a, alertDetails[a.id])).sort((x, y) => RANK[x.severity] - RANK[y.severity])
  const recent = Object.entries(st.applied)
    .map(([id, a]) => ({ alert: allAlerts.find((x) => x.id === id)!, a }))
    .filter((r) => r.alert)
    .sort((x, y) => y.a.snapshot.at.localeCompare(x.a.snapshot.at))
    .slice(0, 5)

  return (
    <div className="scn-page">
      <PageHeader title={title} description="سناریوها از یک هشدار ساخته می‌شوند تا با داده‌های همان هشدار کار کنند." />
      <section className="ov-panel scn-empty">
        <Split size={24} aria-hidden="true" />
        {open.length === 0 ? (
          <>
            <h2>هشدار بازی برای سنجش نیست</h2>
            <Link to="/settings/scenario-templates" className="ov-link">
              <Settings2 size={14} aria-hidden="true" /> تنظیم سناریوهای آماده
            </Link>
          </>
        ) : (
          <>
            <h2>یک هشدار را برای سنجش انتخاب کنید</h2>
            <ul>
              {open.map((a) => {
                const d = st.drafts[a.id]
                return (
                  <li key={a.id}>
                    <Link to={`/planning/scenarios?alert=${a.code}`} className="scn-empty__link">
                      <SeverityChip severity={a.severity} />
                      <span className="scn-empty__text">
                        {a.title}
                        <span className="scn-empty__kind">
                          {a.kind} · <MapPin size={12} aria-hidden="true" /> {a.place}
                        </span>
                      </span>
                      {d && <span className="status-chip status-chip--muted">پیش‌نویس دارد · {fa(d.list.length)} سناریو</span>}
                      <span dir="ltr" className="scn-code">
                        {a.code}
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </section>

      <section className="ov-panel scn-recent" aria-labelledby="scn-recent-h">
        <h3 id="scn-recent-h">سناریوهای اخیر</h3>
        {recent.length === 0 ? (
          <p className="is-muted">هنوز سناریویی روی هشداری اعمال نشده است.</p>
        ) : (
          <ul>
            {recent.map(({ alert, a }) => (
              <li key={a.id}>
                <span dir="ltr" className="scn-code">
                  {a.id}
                </span>
                <span>{a.name}</span>
                <span className="is-muted">اعمال‌شده ساعت {timeOf(a.snapshot.at)}</span>
                <Link to={`/alerts/${alert.code}?step=decision`} className="ov-link">
                  هشدار{' '}
                  <span dir="ltr" className="scn-code">
                    {alert.code}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
