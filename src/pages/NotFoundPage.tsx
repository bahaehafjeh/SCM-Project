import { Link, useLocation } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'

export function NotFoundPage() {
  const { pathname } = useLocation()
  return (
    <>
      <PageHeader title="صفحه یافت نشد" description="نشانی واردشده با هیچ بخشی از سامانه مطابقت ندارد." />
      <p>
        نشانی <span className="latin">{pathname}</span> وجود ندارد. از منو یا جستجو استفاده کنید، یا به <Link to="/">نمای کلی</Link> بازگردید.
      </p>
    </>
  )
}
