import { describe, expect, it } from 'vitest'
import { stages } from '../domain/supplyChain'
import { alertDetails, allAlerts } from './alerts'
import { chainImpact } from './chainImpact'

describe('«اثر روی زنجیره»: every alert, all seven stages', () => {
  for (const a of allAlerts)
    it(a.code, () => {
      const c = chainImpact[a.id]
      expect(c, 'has a chain').toBeTruthy()
      expect(stages.filter((s) => !c[s.id]).map((s) => s.id)).toEqual([])
      for (const s of stages) {
        const e = c[s.id]!
        // Either the alert's own figure (which must exist) or a sample text, never neither
        if (e.impact !== undefined) expect(alertDetails[a.id].impact[e.impact], `${s.id} → impact[${e.impact}]`).toBeTruthy()
        else expect(e.text, s.id).toBeTruthy()
      }
    })
})
