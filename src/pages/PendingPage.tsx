import { Link } from 'react-router-dom'
import { Hourglass, ArrowLeft } from 'lucide-react'
import type { AppRoute } from '../config/routes'
import { statusMeta, routeById } from '../config/routes'
import { PageHeader } from '../components/PageHeader'
import { Section } from '../components/Section'
import './PendingPage.css'

/**
 * Shown for every destination that is not yet rebuilt (PT-6 / PT-7).
 * It states readiness honestly and lists only documented content — no placeholder numbers.
 */
export function PendingPage({ route, inSection = false }: { route: AppRoute; inSection?: boolean }) {
  const status = statusMeta[route.status]
  return (
    <>
      {!inSection && <PageHeader title={route.label} description={route.description} status={route.status} />}
      <div className="pending">
        {inSection && (
          <div className="pending__intro">
            <h2>{route.label}</h2>
            <p>{route.description}</p>
          </div>
        )}
        <div className="pending__notice" role="status">
          <Hourglass size={18} aria-hidden="true" />
          <div>
            <p className="pending__notice-title">{status.label}</p>
            <p>{status.description}</p>
            {route.feature && <p className="pending__feature">قابلیت مصوب {route.feature}</p>}
          </div>
        </div>

        <Section title="این بخش به چه پرسشی پاسخ می‌دهد؟" surface="plain">
          <p className="pending__question">{route.question}</p>
        </Section>

        {route.scope && (
          <Section title="محتوای مستند این بخش" description="فهرست محتوایی که در این بخش نمایش داده خواهد شد؛ مقادیر پس از بازسازی صفحه با منبع داده نمایش داده می‌شوند.">
            <ul className="pending__list">
              {route.scope.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </Section>
        )}

        {route.related && (
          <Section title="آنچه امروز می‌توانید بررسی کنید" surface="plain">
            <ul className="pending__links">
              {route.related.map((id) => {
                const r = routeById(id)
                return (
                  <li key={id}>
                    <Link to={r.path}>
                      {r.label}
                      <ArrowLeft size={16} aria-hidden="true" />
                    </Link>
                  </li>
                )
              })}
            </ul>
          </Section>
        )}

        {route.legacy && (
          <Section title="محل این محتوا در نسخه جاری سامانه" surface="plain">
            <ul className="pending__legacy">
              {route.legacy.map((l) => (
                <li key={l.label}>
                  {l.label}
                  {l.path && <span className="latin">{l.path}</span>}
                </li>
              ))}
            </ul>
          </Section>
        )}

        <p className="pending__spec">مرجع طراحی: سند معماری اطلاعات {route.spec}</p>
      </div>
    </>
  )
}
