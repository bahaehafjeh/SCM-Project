import type { Severity } from '../../data/alerts'

// Needle angle per level, on a half dial that runs low (left) → high (right)
const ANGLE: Record<Severity, number> = { medium: 135, high: 90, critical: 35 }

/**
 * Small gauge for an alert's severity: a half dial whose needle points further right the more severe
 * the alert is. Drawn in the current text colour; the severity word always sits beside it.
 */
export function SeverityGauge({ severity, size = 14 }: { severity: Severity; size?: number }) {
  const a = (ANGLE[severity] * Math.PI) / 180
  const cx = 12
  const cy = 15
  const r = 9
  const nx = cx + 6.5 * Math.cos(a)
  const ny = cy - 6.5 * Math.sin(a)
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true" className="sev-gauge">
      {/* Dial */}
      <path d={`M${cx - r} ${cy} A${r} ${r} 0 0 1 ${cx + r} ${cy}`} opacity={0.35} />
      {/* The filled part of the dial, up to the needle */}
      <path d={`M${cx - r} ${cy} A${r} ${r} 0 0 1 ${cx + r * Math.cos(a)} ${cy - r * Math.sin(a)}`} />
      {/* Needle and hub */}
      <line x1={cx} y1={cy} x2={nx} y2={ny} />
      <circle cx={cx} cy={cy} r={1.6} fill="currentColor" stroke="none" />
    </svg>
  )
}
