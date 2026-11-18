import { Info } from 'lucide-react'
import type { SourceRef } from '../domain/sources'
import { datasets } from '../domain/sources'
import './SourceNote.css'

/**
 * Provenance line under a figure or section. Unknown metadata is stated as unknown, never omitted.
 * Precursor of the contextual F05 source-transparency entry point.
 */
export function SourceNote({ source }: { source: SourceRef }) {
  const ds = datasets[source.dataset]
  return (
    <div className="source-note">
      <Info size={14} aria-hidden="true" className="source-note__icon" />
      <dl>
        <div>
          <dt>منبع</dt>
          <dd>{ds.title}</dd>
        </div>
        <div>
          <dt>روش محاسبه</dt>
          <dd>{source.method ?? 'مستند نشده است'}</dd>
        </div>
        <div>
          <dt>آخرین به‌روزرسانی</dt>
          <dd>{ds.lastUpdated ?? 'ثبت نشده'}</dd>
        </div>
        <div>
          <dt>برگرفته از نسخه جاری سامانه در</dt>
          <dd>{source.capturedOn}</dd>
        </div>
      </dl>
    </div>
  )
}
