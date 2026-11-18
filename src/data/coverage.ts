import type { DataDomainId } from '../domain/supplyChain'
import type { Measured } from '../domain/states'
import { measured, noValue } from '../domain/states'
import type { SourceRef } from '../domain/sources'

/**
 * Requirements coverage per data domain, transcribed from the live build (`/ui/data`, 2026-10-27).
 * Coverage = share of defined data requirements that are covered. It is not data quality,
 * record completeness or project progress (definition shown in the live build).
 */
export interface DomainCoverage {
  domain: DataDomainId
  coverage: Measured<number>
  /** Number of requirements behind the percentage, when documented */
  requirementCount: number | null
  /** Whether a requirement-level breakdown exists in the product */
  hasRequirementDetail: boolean
}

export const coverageSource: SourceRef = {
  dataset: 'coverage-assessment',
  capture: 'screencapture-172-16-4-49-8000-ui-data-2026-10-27',
  capturedOn: '۱۴۰۵/۰۸/۰۵',
  method: null, // Formula not documented (Discovery D4, Q7)
}

export const domainCoverage: DomainCoverage[] = [
  { domain: 'raw-materials-warehousing', coverage: measured(40), requirementCount: 14, hasRequirementDetail: true },
  { domain: 'industries', coverage: measured(5), requirementCount: null, hasRequirementDetail: false },
  { domain: 'packaging', coverage: measured(15), requirementCount: null, hasRequirementDetail: false },
  { domain: 'distribution', coverage: measured(15), requirementCount: null, hasRequirementDetail: false },
  { domain: 'retail', coverage: measured(20), requirementCount: null, hasRequirementDetail: false },
  { domain: 'consumer', coverage: noValue('not-collected'), requirementCount: null, hasRequirementDetail: false },
]

/** Mean over domains that have a value; excluded domains are reported, never counted as zero. */
export function coverageSummary(rows: DomainCoverage[]) {
  const withValue = rows.filter((r) => r.coverage.state === 'value')
  const values = withValue.map((r) => (r.coverage as { value: number }).value)
  const mean = values.length ? values.reduce((a, b) => a + b, 0) / values.length : null
  return {
    mean,
    included: withValue.length,
    excluded: rows.filter((r) => r.coverage.state !== 'value').map((r) => r.domain),
    max: withValue.reduce<DomainCoverage | null>(
      (best, r) => (!best || (r.coverage as { value: number }).value > (best.coverage as { value: number }).value ? r : best),
      null,
    ),
  }
}
