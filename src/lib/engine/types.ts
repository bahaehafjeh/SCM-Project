/**
 * Shared calculation engine: the only place alert and scenario numbers are computed.
 * Input = facts (fixed, from the alert) + assumptions (what may turn out differently) + actions
 * (what we decide). Output = daily series, band, the type's metrics, cost and confidence.
 */

/** What a variable stands for: a decision, a belief about the world, or a detail for experts */
export type Role = 'action' | 'assumption' | 'advanced'

/** Scenario inputs. Advanced values live with the assumptions (they are beliefs about cost) */
export interface Params {
  actions: Record<string, number>
  assumptions: Record<string, number>
  horizon: number
}

export type Group = 'تقاضا' | 'تأمین و حمل' | 'زمان و مسیر' | 'ریسک' | 'هزینه'

export interface VarDef {
  key: string
  role: Role
  label: string
  unit: string
  min: number
  max: number
  step: number
  source: string
  group: Group
  /** Above this the value is invalid (e.g. more than the surplus) */
  limit?: { max: number; text: string }
  /** Shown only while this other variable is above zero, under it (e.g. arrival time under the amount) */
  dependsOn?: string
  /** An amount the page can search for: «کمترین مقدار کافی» (lowest value that meets a goal) */
  seek?: boolean
  /** A price: the action it prices (shown only while that action is above zero) */
  for?: string
}

/** One item of an action's cost: «انتقال ۱۰۰ تن × ۱٫۸ میلیون = ۱۸۰ میلیون تومان», with where the rate comes from */
export interface CostLine {
  /** «انتقال ۱۰۰ تن» */
  what: string
  /** million toman per unit */
  rate: number
  /** million toman */
  total: number
  /** «نرخ از سیستم حمل» */
  source: string
}

export interface Metric {
  key: string
  label: string
  /** Label for a given horizon, e.g. «موجودی در پایان ۳۰ روز» */
  labelAt?: (horizon: number) => string
  /** Unit shown once in the label or column head; the figure is then the number only */
  unit?: string
  fmt: (v: number) => string
  bad: (v: number) => boolean
  good?: (v: number) => boolean
  /** Context figure (e.g. the stock level): never coloured, only the outcome metric is */
  neutral?: boolean
  /** Short label for one-line summaries, e.g. «کمبود» */
  short?: string
  /** Which way is better; default lower (fewer shortage days, less cost) */
  better?: 'higher' | 'lower'
  /** The problem's own cost (holding, demurrage, price impact): «خالص» = its change + the action's cost */
  money?: boolean
  /** Formats a difference when `fmt` does not add up (e.g. «۱۲۰ / ۳۰۰») */
  fmtDelta?: (v: number) => string
}

/** One run of a model */
export interface ModelRun {
  series: number[]
  band: number[]
  values: Record<string, number>
  /** Lowest point of the series over the horizon */
  min: number
  /** million toman */
  cost: number
  confidence: number
  /** Inventory types: first day the stock reaches zero (null = not within the extended run) */
  emptyDay?: number | null
  /** No shortage within the horizon but less than a week of stock left: «کافی تا حدود روز n» */
  enoughUntil?: number | null
  /** Inventory types: first day demand goes unmet within the horizon (null = none) */
  firstShort?: number | null
}

export interface Template {
  key: string
  name: string
  note: string
  group: 'stress' | 'action'
  /** Absolute values set on the base, by variable key */
  patch: Record<string, number>
}

export interface OptionDef {
  /** The variable the option's amount drives */
  key?: string
  /** Other changes the option makes */
  patch?: Record<string, number>
}

export interface ScenarioModel {
  /** Heading of the scenario page */
  title: string
  /** Card metrics (same two on every option card of the type) */
  metrics: [Metric, Metric]
  /** Table outcome columns; default the card metrics */
  columns?: [Metric, Metric]
  chart: { title: string; unit: string; refs: { value: number; label: string; tone: 'safe' | 'crit' }[] }
  vars: VarDef[]
  fixed: { label: string; value: string; source: string }[]
  /** «بدون اقدام»: facts as they are, base assumptions, no actions */
  base: Params
  run(p: Params): ModelRun
  /** Alert option id → how it maps onto the variables */
  options: Record<string, OptionDef>
  /** The alert option a scenario stands for, with its amount */
  optionFor(p: Params): { option: string; amount?: number } | null
  /** More than one kind of action at once (e.g. transfer + purchase) */
  isCombined(p: Params): boolean
  describe(p: Params): string[]
  templates: Template[]
  /** «بدون اقدام» in words, from the same run the cards use */
  lead?(p: Params): string
  /** Numbers for the alert's texts (summary, happened, impact): token → text */
  tokens(p: Params): Record<string, string>
  /** Cost of doing nothing, shown before a rejection */
  noActionCost(p: Params): { label: string; value: string; tone?: 'danger' | 'warning' }[]
  /** Facts the model was built from, kept with snapshots */
  facts: unknown
  /** The action cost item by item, from the data's rates; models without priced variables have none */
  costLines?(p: Params): CostLine[]
  /** Why the horizon is what it is: the latest arrival among the alert's options or inbound shipments (§7) */
  horizonFrom?: { day: number; from: 'option' | 'inbound' }
  /** Arrivals that make the line jump, for chart markers («رسیدن انتقال», «محموله ورودی») */
  events?(p: Params): { day: number; label: string }[]
}

/** A fixed copy kept when a scenario is applied and when a decision is recorded */
export interface ScenarioSnapshot {
  id: string
  name: string
  facts: unknown
  assumptions: Record<string, number>
  actions: Record<string, number>
  horizon: number
  outcome: { values: Record<string, number>; cost: number; confidence: number; min: number; emptyDay?: number | null; series: number[]; band: number[] }
  /** ISO time */
  at: string
}
