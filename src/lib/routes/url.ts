import { GOODS, FORMS, MONTHS } from '../../data/routes'
import type { Mode, Month } from '../../data/routes'

/**
 * «نقشه مسیرها» state in the address (routes-map-prompt §9): a shared link opens exactly the same
 * view. Defaults are never written. Selections are pushed to history, filter changes replace.
 */
export type View = '2d' | '3d' | 'table'
export type Layer = 'main' | 'alt' | 'ports' | 'zones' | 'names'
export const DEFAULT_LAYERS: Layer[] = ['main', 'zones', 'names']

export interface RoutesState {
  view: View
  cp: string | null
  route: string | null
  iran: boolean
  month: Month | null
  goods: string[]
  origin: string[]
  dest: string[]
  mode: Mode[]
  from: Month
  to: Month
  /** «فیلترهای بیشتر»: loading port, unloading port, chokepoint on the way, value quartile, cargo form */
  lp: string[]
  up: string[]
  via: string[]
  q: 1 | 2 | 3 | 4 | null
  form: string[]
  layers: Layer[]
}

export const DEFAULT_STATE: RoutesState = {
  view: '2d',
  cp: null,
  route: null,
  iran: false,
  month: null,
  goods: [],
  origin: [],
  dest: [],
  mode: [],
  from: MONTHS[0],
  to: MONTHS[MONTHS.length - 1],
  lp: [],
  up: [],
  via: [],
  q: null,
  form: [],
  layers: DEFAULT_LAYERS,
}

/** Short Latin ids for the address (goods=soy,wheat) */
export const GOOD_SLUG: Record<(typeof GOODS)[number], string> = {
  قهوه: 'coffee',
  شکر: 'sugar',
  برنج: 'rice',
  'کود نیتروژنه': 'fertilizer',
  ذرت: 'corn',
  'گاز نفتی': 'lpg',
  'روغن پالم': 'palm',
  گندم: 'wheat',
  'دانهٔ سویا': 'soy',
  'دانهٔ کاکائو': 'cocoa',
  زغال‌سنگ: 'coal',
  'نفت خام': 'crude',
  'سنگ آهن': 'iron',
  'سنگ مس': 'copper',
}
export const FORM_SLUG: Record<(typeof FORMS)[number], string> = { 'فله خشک': 'dry', 'فله مایع': 'liquid', 'کیسه‌ای یا کانتینری': 'bagged' }
const VIEWS: View[] = ['2d', '3d', 'table']
const MODES: Mode[] = ['sea', 'road', 'mixed', 'unknown']
const LAYERS: Layer[] = ['main', 'alt', 'ports', 'zones', 'names']

const list = (q: URLSearchParams, k: string) =>
  (q.get(k) ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
const isMonth = (m: string | null): m is Month => !!m && (MONTHS as readonly string[]).includes(m)

export function parseState(search: string): RoutesState {
  const q = new URLSearchParams(search)
  const view = q.get('view') as View
  const from = q.get('from')
  const to = q.get('to')
  const quart = Number(q.get('q'))
  const layers = q.has('layers') ? list(q, 'layers').filter((l): l is Layer => LAYERS.includes(l as Layer)) : DEFAULT_LAYERS
  return {
    view: VIEWS.includes(view) ? view : DEFAULT_STATE.view,
    cp: q.get('cp') || null,
    route: q.get('route') || null,
    iran: q.get('iran') === '1',
    month: isMonth(q.get('month')) ? (q.get('month') as Month) : null,
    goods: list(q, 'goods'),
    origin: list(q, 'origin'),
    dest: list(q, 'dest'),
    mode: list(q, 'mode').filter((m): m is Mode => MODES.includes(m as Mode)),
    from: isMonth(from) ? from : DEFAULT_STATE.from,
    to: isMonth(to) ? to : DEFAULT_STATE.to,
    lp: list(q, 'lp'),
    up: list(q, 'up'),
    via: list(q, 'via'),
    q: quart >= 1 && quart <= 4 ? (quart as 1 | 2 | 3 | 4) : null,
    form: list(q, 'form'),
    layers,
  }
}

/** Only what differs from the default, in a fixed key order (so equal states make equal links) */
export function serializeState(s: RoutesState): string {
  const q = new URLSearchParams()
  if (s.view !== DEFAULT_STATE.view) q.set('view', s.view)
  if (s.cp) q.set('cp', s.cp)
  if (s.route) q.set('route', s.route)
  if (s.iran) q.set('iran', '1')
  if (s.month) q.set('month', s.month)
  for (const k of ['goods', 'origin', 'dest', 'mode'] as const) if (s[k].length) q.set(k, s[k].join(','))
  if (s.from !== DEFAULT_STATE.from) q.set('from', s.from)
  if (s.to !== DEFAULT_STATE.to) q.set('to', s.to)
  for (const k of ['lp', 'up', 'via'] as const) if (s[k].length) q.set(k, s[k].join(','))
  if (s.q) q.set('q', String(s.q))
  if (s.form.length) q.set('form', s.form.join(','))
  const sameLayers = s.layers.length === DEFAULT_LAYERS.length && DEFAULT_LAYERS.every((l) => s.layers.includes(l))
  if (!sameLayers) q.set('layers', LAYERS.filter((l) => s.layers.includes(l)).join(','))
  return q.toString()
}
