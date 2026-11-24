import type { CSSProperties, KeyboardEvent } from 'react'
import { RotateCcw } from 'lucide-react'
import type { VarDef } from '../../lib/engine'
import { fa } from '../../components/overview/AlertParts'

const clamp = (v: VarDef, x: number) => Math.min(v.max, Math.max(v.min, x))
const round = (v: VarDef, x: number) => +x.toFixed(v.step < 1 ? 1 : 0)
const show = (v: VarDef, x: number) => fa(x, v.step < 1 ? 1 : 0)

/**
 * One variable. Row 1: label, and the number box with its unit. Row 2: the slider, full width,
 * filling from the right. Row 3, only once changed: «{baseWord} {start value}» and ↺. The source
 * shows on hovering the label. A value over the limit shows its error under the field.
 * ← and ↑ raise the value, → and ↓ lower it.
 */
export function VarField({
  v,
  value,
  initial,
  disabled,
  onChange,
  baseWord,
  compact,
  sub,
}: {
  v: VarDef
  value: number
  initial: number
  disabled: boolean
  onChange: (x: number) => void
  /** «واقعی» for assumptions (the alert's data), «پیشنهاد» / «اولیه» for actions and prices */
  baseWord: string
  compact?: boolean
  /** A dependent field shown under its parent (indented, with a side line) */
  sub?: boolean
}) {
  const changed = value !== initial
  const error = v.limit && value > v.limit.max ? v.limit.text : undefined
  const text = `${show(v, value)} ${v.unit}`
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    const d = { ArrowLeft: 1, ArrowUp: 1, ArrowRight: -1, ArrowDown: -1, PageUp: 10, PageDown: -10 }[e.key]
    if (d === undefined) return
    e.preventDefault()
    onChange(round(v, clamp(v, value + d * v.step)))
  }
  const id = `var-${v.key}`
  return (
    <div id={id} className={`svar svar--v2 ${changed ? 'is-changed' : ''} ${error ? 'is-error' : ''} ${compact ? 'svar--compact' : ''} ${sub ? 'svar--sub' : ''}`}>
      <div className="svar__top">
        {/* The source is on hover, not written under every field */}
        <label className="svar__label" htmlFor={`${id}-n`} title={v.source}>
          {v.label}
          {changed && <span className="visually-hidden"> (تغییر کرده)</span>}
        </label>
        <span className="svar__num">
          <input
            id={`${id}-n`}
            type="number"
            dir="ltr"
            inputMode="decimal"
            className="svar__input"
            min={v.min}
            max={v.max}
            step={v.step}
            value={value}
            disabled={disabled}
            aria-invalid={!!error}
            aria-describedby={error ? `${id}-e` : undefined}
            onKeyDown={(e) => (e.key === 'ArrowUp' || e.key === 'ArrowDown') && (e.preventDefault(), onChange(round(v, clamp(v, value + (e.key === 'ArrowUp' ? v.step : -v.step)))))}
            onChange={(e) => e.target.value !== '' && onChange(round(v, clamp(v, +e.target.value)))}
          />
          <span className="svar__unit">{v.unit}</span>
        </span>
      </div>
      <input
        type="range"
        dir="rtl"
        className="svar__range"
        min={v.min}
        max={v.max}
        step={v.step}
        value={value}
        disabled={disabled}
        aria-label={v.label}
        aria-valuetext={text}
        aria-invalid={!!error}
        onKeyDown={onKey}
        onChange={(e) => onChange(+e.target.value)}
        style={{ '--p': `${((value - v.min) / (v.max - v.min)) * 100}%` } as CSSProperties}
      />
      {/* Only once changed: where it started, and ↺ to go back (the icon says it; the label is for screen readers) */}
      {changed && (
        <div className="svar__foot">
          <span className="svar__source">
            {baseWord} {show(v, initial)} {v.unit}
          </span>
          {!disabled && (
            <button type="button" className="svar__back" onClick={() => onChange(initial)} aria-label={`برگرداندن به ${show(v, initial)} ${v.unit}`} title={`برگرداندن به ${show(v, initial)} ${v.unit}`}>
              <RotateCcw size={14} aria-hidden="true" />
            </button>
          )}
        </div>
      )}
      {error && (
        <p id={`${id}-e`} className="svar__error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
