import { Info } from 'lucide-react'
import type { Layer } from '../../lib/routes/url'
import { MODE_LABEL } from '../../data/routes'
import type { Mode } from '../../data/routes'
import { dataColors } from './mapStyle'

const LAYERS: { key: Layer; label: string }[] = [
  { key: 'main', label: 'مسیرهای اصلی' },
  { key: 'alt', label: 'مسیرهای جایگزین' },
  { key: 'ports', label: 'بنادر' },
  { key: 'zones', label: 'محدودهٔ گلوگاه' },
  { key: 'names', label: 'نام کشورها' },
]

/** The map card's footer (routes-map-prompt §5-4): layer switches, then the key */
export function MapFooter({ layers, onLayers }: { layers: Layer[]; onLayers: (l: Layer[]) => void }) {
  const c = dataColors()
  return (
    <footer className="rfoot">
      <div className="rfoot__row" role="group" aria-label="لایه‌ها">
        <span className="rfoot__label">لایه‌ها</span>
        {LAYERS.map((l) => (
          <label key={l.key} className="rcheck">
            <input type="checkbox" checked={layers.includes(l.key)} onChange={(e) => onLayers(e.target.checked ? [...layers, l.key] : layers.filter((x) => x !== l.key))} />
            {l.label}
          </label>
        ))}
      </div>
      <div className="rfoot__row rfoot__legend">
        <span className="rfoot__label">راهنما</span>
        {(Object.keys(MODE_LABEL) as Mode[]).map((m) => (
          <span key={m} className="rkey">
            <span className="rkey__line" style={{ background: c.mode[m] }} aria-hidden="true" />
            {MODE_LABEL[m]}
          </span>
        ))}
        <span className="rkey">
          <span className="rkey__line rkey__line--dash" style={{ color: c.alternative }} aria-hidden="true" />
          سناریو
        </span>
        <span className="rkey">
          <span className="rkey__dots" aria-hidden="true">
            <span style={{ borderColor: c.level.high }} />
            <span style={{ borderColor: c.level.medium }} />
            <span style={{ borderColor: c.level.low }} />
          </span>
          گلوگاه
        </span>
        <span className="rinfo" tabIndex={0} aria-label="راهنمای نقشه" aria-describedby="rmap-key">
          <Info size={14} aria-hidden="true" />
          <span id="rmap-key" role="tooltip" className="rinfo__pop">
            ضخامت خط = ارزش · رنگ گلوگاه = میزان وابستگی · مسیرها برآورد از بندرها هستند
          </span>
        </span>
      </div>
    </footer>
  )
}
