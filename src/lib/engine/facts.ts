/** Facts each model is built from. They come from the alert and never change in a scenario. */

/** A shipment already on its way */
export interface Inbound {
  /** tonnes */
  qty: number
  /** Day it lands, counted from today (day 0) */
  day: number
  label: string
}

/** Inventory alerts (shortage, forecast run-out, demand spike) */
export interface StockFacts {
  item: string
  warehouse: string
  /** tonnes */
  stock: number
  safety: number
  /** Critical stock level, tonnes — from the organisation's rule, not derived */
  critical?: number
  /** tonnes a day, from the alert's consumption data */
  consumption: number
  /** Demand above the forecast, % (demand spike) or seasonal growth (forecast) */
  growth?: number
  /** Shipments on their way */
  inbound: Inbound[]
  transfer: {
    source: string
    surplus: number
    days: number
    costPerTon: number
  }
  purchase: { days: number; costPerTon: number }
  /** Maximum allowed level, tonnes: no option may take the stock above it */
  max?: number
}

export interface SurplusFacts {
  item: string
  warehouse: string
  stock: number
  max: number
  safety: number
  /** tonnes a day */
  demand: number
  /** Periodic order: tonnes every n days */
  order: number
  every: number
  /** Where the surplus can go; `costPerTon`: freight in million toman a tonne */
  dest: { name: string; room: number; days: number; costPerTon: number }
}

export interface DelayFacts {
  item: string
  port: string
  warehouse: string
  /** tonnes */
  shipment: number
  share: number
  stock: number
  use: number
  safety: number
  /** Critical stock level, tonnes — from the organisation's rule, not derived */
  critical?: number
  /** Delay causes, days */
  anchorage: number
  weather: number
  /** Days since the planned arrival (the delay already used up) */
  elapsed: number
  bridge: {
    source: string
    surplus: number
    days: number
  }
}

export interface StopFacts {
  item: string
  place: string
  qty: number
  silentHours: number
  /** Expected days the stop goes on */
  stop: number
}

export interface CustomsFacts {
  item: string
  port: string
  qty: number
  dwell: number
  docs: number
  clear: number
  /** million toman a day */
  rate: number
  budget: number
}

export interface PoFacts {
  item: string
  supplier: string
  po: string
  ordered: number
  delivered: number
  fill: number
  delay: number
  altSupplier: string
  altDays: number
}

export interface RiskFacts {
  item: string
  supplier: string
  score: number
  share: number
  cap: number
  /** tonnes a day bought from this supplier at full share */
  daily: number
}

export interface PriceFacts {
  item: string
  monthly: number
  /** million toman a tonne */
  price: number
  fx: number
  threshold: number
  room: number
}

export interface IncidentFacts {
  port: string
  duration: number
  items: { name: string; cover: number }[]
  alt: string
}

export type ModelFacts = { kind: 'surplus'; f: SurplusFacts } | { kind: 'delay'; f: DelayFacts } | { kind: 'stop'; f: StopFacts } | { kind: 'customs'; f: CustomsFacts } | { kind: 'po'; f: PoFacts } | { kind: 'risk'; f: RiskFacts } | { kind: 'price'; f: PriceFacts } | { kind: 'incident'; f: IncidentFacts }
