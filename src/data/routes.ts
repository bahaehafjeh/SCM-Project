// TEMPORARY sample, replace with the routes dataset
//
// «نقشه مسیرها» (routes-map-prompt §3). The routes dataset (DS-02 / DS-05: predicted ports, sea route,
// chokepoints) is not in the code, so this is a sample, labelled «نمونه» wherever it is shown.
//   · Chokepoint figures and the totals are the design's (routes-map-prompt §3 table): whole-dataset
//     aggregates. Owner decision 2026-11-15: they stay as the dataset level.
//   · Ten port-to-port routes, believable and on real sea lanes, stand for the route records (owner
//     decision 2026-11-15). Five are Hormuz's main routes of the design, two go to Iranian ports and
//     add up to the design's «ایران ۱۱٫۸», the rest cover Panama, the Cape and the Channel.
// Commodities, cargo forms, vessels and transport modes use DS-02's own vocabulary (discovery report).
import type { Feature, LineString, Polygon } from 'geojson'

export const sample = true as const

/** The dataset's twelve months; the last is still being collected */
export const MONTHS = ['2025-05', '2025-06', '2025-07', '2025-08', '2025-09', '2025-10', '2025-11', '2025-12', '2026-01', '2026-02', '2026-03', '2026-04'] as const
export type Month = (typeof MONTHS)[number]
export const INCOMPLETE_MONTH: Month = '2026-04'

/** DS-02's 14 essential commodities (A-03 legend); «دانهٔ سویا» is the dataset's «سویا» (HS 1201) */
export const GOODS = ['قهوه', 'شکر', 'برنج', 'کود نیتروژنه', 'ذرت', 'گاز نفتی', 'روغن پالم', 'گندم', 'دانهٔ سویا', 'دانهٔ کاکائو', 'زغال‌سنگ', 'نفت خام', 'سنگ آهن', 'سنگ مس'] as const
/** DS-02's cargo forms and vessel classes */
export const FORMS = ['فله خشک', 'فله مایع', 'کیسه‌ای یا کانتینری'] as const

export type Mode = 'sea' | 'road' | 'mixed' | 'unknown'
export const MODE_LABEL: Record<Mode, string> = { sea: 'دریایی', road: 'جاده‌ای', mixed: 'ترکیبی', unknown: 'نامشخص' }

export interface Port {
  id: string
  /** Persian name; the UN/LOCODE only in tooltips and the table */
  name: string
  code: string
  /** ISO 3166-1 alpha-2 */
  country: string
  lngLat: [number, number]
}

export interface Dependency {
  score: number
  /** The three parts, 0–100; the score is their mean */
  value: number
  trades: number
  concentration: number
}

export interface Chokepoint {
  id: string
  name: string
  short: string
  lngLat: [number, number]
  zone: Polygon
  /** Billion USD over the whole period */
  value: number
  trades: number
  routes: number
  dependency: Dependency
  /** Billion USD by month (MONTHS order); sums to `value` */
  monthly: number[]
  /** The alternative, in words, when there is one */
  alt?: string
}

export interface RouteGood {
  name: (typeof GOODS)[number]
  form: (typeof FORMS)[number]
  vessel: string
  /** Billion USD */
  value: number
}

export interface TradeRoute {
  id: string
  from: Port
  to: Port
  originCountry: string
  destCountry: string
  mode: Mode
  modeEstimated: boolean
  km: number
  /** Billion USD */
  value: number
  /** Million tonnes */
  tonnes: number
  trades: number
  activeMonths: number
  /** Billion USD by month */
  monthly: number[]
  /** In the order of the voyage */
  chokepoints: string[]
  geometry: LineString
  goods: RouteGood[]
  alternative?: { via: string; km: number; extraKm: number; extraDays: number; skips: string[]; geometry: LineString }
}

// ── Countries (Persian names, ISO alpha-2) ──
export const COUNTRY_FA: Record<string, string> = {
  AE: 'امارات',
  PA: 'پاناما',
  SA: 'عربستان',
  CN: 'چین',
  IN: 'هند',
  QA: 'قطر',
  KR: 'کرهٔ جنوبی',
  KW: 'کویت',
  BR: 'برزیل',
  IR: 'ایران',
  RU: 'روسیه',
  NL: 'هلند',
  US: 'آمریکا',
  JP: 'ژاپن',
}

// ── Ports ──
const P = (id: string, name: string, country: string, lngLat: [number, number]): Port => ({ id, name, code: id, country, lngLat })
export const PORTS: Record<string, Port> = Object.fromEntries(
  [
    P('AEJEA', 'بندر جبل علی', 'AE', [55.03, 25.01]),
    P('PABLB', 'بندر بالبوا', 'PA', [-79.57, 8.95]),
    P('SARTA', 'بندر راس‌تنوره', 'SA', [50.16, 26.64]),
    P('CNSHA', 'بندر شانگهای', 'CN', [121.8, 31.2]),
    P('INBOM', 'بندر مومبای', 'IN', [72.84, 18.94]),
    P('SADMM', 'بندر دمام', 'SA', [50.21, 26.5]),
    P('CNNGB', 'بندر نینگبو', 'CN', [121.85, 29.93]),
    P('QARLF', 'بندر رأس لفان', 'QA', [51.55, 25.93]),
    P('KRINC', 'بندر اینچئون', 'KR', [126.6, 37.45]),
    P('KWSWK', 'بندر شویخ کویت', 'KW', [47.93, 29.35]),
    P('INMAA', 'بندر چنای', 'IN', [80.3, 13.1]),
    P('BRSSZ', 'بندر سانتوس', 'BR', [-46.3, -23.97]),
    P('IRBKM', 'بندر امام خمینی', 'IR', [49.08, 30.43]),
    P('RUNVS', 'بندر نووروسیسک', 'RU', [37.77, 44.72]),
    P('IRBND', 'بندرعباس', 'IR', [56.2, 27.15]),
    P('BRPNG', 'بندر پاراناگوا', 'BR', [-48.5, -25.5]),
    P('NLRTM', 'بندر روتردام', 'NL', [4.0, 51.95]),
    P('USMSY', 'بندر نیواورلئان', 'US', [-90.06, 29.93]),
    P('JPYOK', 'بندر یوکوهاما', 'JP', [139.65, 35.45]),
    P('IRZBR', 'بندر چابهار', 'IR', [60.6, 25.3]),
  ].map((p) => [p.id, p]),
)

// ── Chokepoints (design table, §3) ──
const box = ([lng, lat]: [number, number], dx: number, dy: number): Polygon => ({
  type: 'Polygon',
  coordinates: [
    [
      [lng - dx, lat - dy],
      [lng + dx, lat - dy],
      [lng + dx, lat + dy],
      [lng - dx, lat + dy],
      [lng - dx, lat - dy],
    ],
  ],
})
/** Month weights: steady, the last month about half collected */
const W = [1.02, 1.0, 0.98, 1.01, 1.03, 1.0, 0.99, 1.02, 1.04, 1.03, 1.05, 0.45]
/**
 * A chokepoint's months: the period's value spread by W, with a trend over the last three complete
 * months (Hormuz up, the Red Sea down, the Cape up as ships go round), rescaled to sum to the value
 */
const spread = (value: number, trend = 1): number[] => {
  const raw = W.map((w, i) => w * (i >= 8 && i <= 10 ? trend : 1))
  const sum = raw.reduce((s, x) => s + x, 0)
  return raw.map((x) => +((value * x) / sum).toFixed(3))
}
const cp = (id: string, name: string, short: string, lngLat: [number, number], size: [number, number], value: number, trades: number, routes: number, parts: [number, number, number], trend?: number, alt?: string): Chokepoint => ({
  id,
  name,
  short,
  lngLat,
  zone: box(lngLat, size[0], size[1]),
  value,
  trades,
  routes,
  dependency: { score: Math.round((parts[0] + parts[1] + parts[2]) / 3), value: parts[0], trades: parts[1], concentration: parts[2] },
  monthly: spread(value, trend),
  alt,
})
export const CHOKEPOINTS: Chokepoint[] = [
  cp('panama', 'کانال پاناما', 'پاناما', [-79.7, 9.1], [1.2, 1.0], 378.4, 46820, 611, [88, 72, 74], 1, 'دور زدن از تنگهٔ ماژلان یا حمل ریلی از سواحل آمریکا؛ هر دو بسیار طولانی‌تر'),
  cp('hormuz', 'تنگهٔ هرمز', 'هرمز', [56.4, 26.5], [1.3, 1.0], 262.3, 41206, 912, [82, 61, 79], 1.12, 'بنادر بیرون تنگه (فجیره، صحار، چابهار) و حمل زمینی، با ظرفیت محدود'),
  cp('gibraltar', 'تنگهٔ جبل‌الطارق', 'جبل‌الطارق', [-5.6, 35.95], [1.2, 0.8], 254.7, 57818, 1408, [80, 76, 51], 1, 'بدون جایگزین دریایی نزدیک؛ دور زدن آفریقا از دماغهٔ امید نیک'),
  cp('suez', 'کانال سوئز', 'سوئز', [32.55, 30.4], [1.0, 1.2], 143.2, 22917, 498, [60, 55, 59], 0.84, 'دماغهٔ امید نیک، حدود ۶ تا ۱۰ روز بیشتر'),
  cp('bab', 'تنگهٔ باب‌المندب', 'باب‌المندب', [43.4, 12.6], [1.0, 1.0], 131.5, 20384, 455, [56, 52, 57], 0.82, 'دماغهٔ امید نیک، همراه با دور زدن سوئز'),
  cp('malacca', 'تنگهٔ مالاکا', 'مالاکا', [100.3, 3.2], [1.6, 1.3], 118.9, 19652, 402, [52, 50, 51], 1, 'تنگه‌های لومبوک یا سوندا، حدود ۲ روز بیشتر'),
  cp('bosphorus', 'تنگهٔ بسفر', 'بسفر', [29.05, 41.1], [0.8, 0.6], 89.4, 15730, 288, [40, 41, 45], 1),
  cp('dardanelles', 'تنگهٔ داردانل', 'داردانل', [26.4, 40.2], [0.8, 0.6], 89.4, 15730, 291, [40, 41, 45], 1),
  cp('manche', 'کانال مانش', 'مانش', [1.4, 50.9], [1.2, 0.7], 84.2, 18044, 376, [37, 44, 36], 1, 'مسیر شمال اسکاتلند، حدود ۲ روز بیشتر'),
  cp('cape', 'دماغهٔ امید نیک', 'امید نیک', [18.5, -35.2], [2.2, 1.6], 52.6, 6912, 174, [24, 22, 38], 1.3),
  cp('taiwan', 'تنگهٔ تایوان', 'تایوان', [119.5, 24.3], [1.2, 1.4], 41.3, 7408, 163, [20, 23, 29], 1, 'شرق تایوان، کمتر از یک روز بیشتر'),
]
export const chokepointById = (id: string) => CHOKEPOINTS.find((c) => c.id === id)

/** Whole-dataset totals (§3) */
export const TOTALS = { value: 2199.3, trades: 163305, routes: 3827, tonnesBn: 6.71, routedValue: 1121.7 }
/** The same totals by month (W), so a month or a range is read the same way as the chokepoints */
export const TOTAL_MONTHLY = { value: spread(TOTALS.value), routed: spread(TOTALS.routedValue), trades: spread(TOTALS.trades), tonnesBn: spread(TOTALS.tonnesBn), routes: W.map((w) => Math.round(TOTALS.routes * Math.min(1, 0.9 * w))) }

/** Hormuz's own breakdown in the design (billion USD); the other chokepoints have none in the sample */
export const BREAKDOWN: Record<string, { goods: [string, number][]; dests: [string, number][]; origins: [string, number][]; topRoutes: string[] }> = {
  hormuz: {
    goods: [
      ['گاز نفتی', 121.6],
      ['کود نیتروژنه', 48.9],
      ['گندم', 23.4],
      ['ذرت', 19.7],
      ['دانهٔ سویا', 14.2],
    ],
    dests: [
      ['CN', 98.4],
      ['IN', 52.7],
      ['JP', 31.2],
      ['KR', 24.6],
      ['IR', 11.8],
    ],
    origins: [
      ['SA', 96.1],
      ['AE', 71.4],
      ['QA', 44.2],
      ['KW', 28.9],
      ['BR', 7.1],
    ],
    topRoutes: ['SARTA-CNSHA', 'AEJEA-INBOM', 'SADMM-CNNGB', 'QARLF-KRINC', 'KWSWK-INMAA'],
  },
}

// ── Sea lanes: shared waypoints, so routes that share a lane share its segments (corridors) ──
const L: Record<string, [number, number]> = {
  pgNorth: [49.8, 28.6],
  pgMid: [52.5, 26.6],
  hormuz: [56.4, 26.5],
  omanGulf: [58.8, 24.2],
  arabSea: [62.0, 21.5],
  indiaSouth: [73.5, 10.0],
  sriLanka: [80.6, 5.6],
  andaman: [94.0, 6.2],
  malacca: [100.3, 3.2],
  singapore: [103.9, 1.2],
  scsSouth: [110.0, 8.0],
  scsNorth: [115.5, 17.0],
  taiwan: [119.5, 24.3],
  eastChina: [124.5, 32.5],
  aden: [52.0, 14.0],
  bab: [43.4, 12.6],
  redSeaS: [38.5, 20.0],
  redSeaN: [34.5, 26.5],
  suez: [32.55, 30.4],
  portSaid: [32.3, 31.4],
  medEast: [25.0, 34.0],
  medMid: [15.0, 37.0],
  medWest: [5.0, 37.5],
  gibraltar: [-5.6, 35.95],
  atlNE: [-15.0, 33.0],
  atlMid: [-45.0, 20.0],
  caribbean: [-68.0, 15.0],
  panamaN: [-76.5, 11.0],
  panama: [-79.7, 9.1],
  cape: [18.5, -35.2],
  indianSW: [40.0, -28.0],
  indianW: [55.0, -5.0],
  arabSeaS: [60.0, 15.0],
}
const line = (...pts: [number, number][]): LineString => ({ type: 'LineString', coordinates: pts })
const p = (id: string) => PORTS[id].lngLat

/** A route's months: its value spread by W, with months it was idle set to zero */
const months = (value: number, idle: number[] = []): number[] => {
  const raw = W.map((w, i) => (idle.includes(i) ? 0 : w))
  const sum = raw.reduce((s, x) => s + x, 0)
  return raw.map((x) => +((value * x) / sum).toFixed(3))
}
const route = (r: Omit<TradeRoute, 'from' | 'to' | 'originCountry' | 'destCountry' | 'monthly' | 'activeMonths'> & { idle?: number[] }): TradeRoute => {
  const [a, b] = r.id.split('-')
  const monthly = months(r.value, r.idle)
  const { idle: _idle, ...rest } = r
  void _idle
  return { ...rest, from: PORTS[a], to: PORTS[b], originCountry: PORTS[a].country, destCountry: PORTS[b].country, monthly, activeMonths: monthly.filter((x) => x > 0).length }
}
const liquid = (name: RouteGood['name'], value: number): RouteGood => ({ name, form: 'فله مایع', vessel: 'نفتکش', value })
const dry = (name: RouteGood['name'], value: number): RouteGood => ({ name, form: 'فله خشک', vessel: 'فله‌بر', value })

export const ROUTES: TradeRoute[] = [
  // The design's sample route (§3), figures as given
  route({
    id: 'AEJEA-PABLB',
    mode: 'sea',
    modeEstimated: true,
    km: 17200,
    value: 6.42,
    tonnes: 3.18,
    trades: 1284,
    idle: [6],
    chokepoints: ['hormuz', 'bab', 'suez', 'gibraltar', 'panama'],
    geometry: line(p('AEJEA'), L.hormuz, L.omanGulf, L.aden, L.bab, L.redSeaS, L.redSeaN, L.suez, L.portSaid, L.medEast, L.medMid, L.medWest, L.gibraltar, L.atlNE, L.atlMid, L.caribbean, L.panamaN, L.panama, p('PABLB')),
    goods: [dry('کود نیتروژنه', 3.96), liquid('گاز نفتی', 2.46)],
    alternative: { via: 'دماغهٔ امید نیک', km: 20800, extraKm: 3600, extraDays: 7, skips: ['bab', 'suez', 'gibraltar'], geometry: line(p('AEJEA'), L.hormuz, L.omanGulf, L.arabSeaS, L.indianW, L.indianSW, L.cape, [0.0, -25.0], [-35.0, -5.0], [-60.0, 10.0], L.panamaN, L.panama, p('PABLB')) },
  }),
  // Hormuz's main routes (§3, billion USD as given)
  route({
    id: 'SARTA-CNSHA',
    mode: 'sea',
    modeEstimated: false,
    km: 11400,
    value: 52.3,
    tonnes: 84.4,
    trades: 3140,
    chokepoints: ['hormuz', 'malacca', 'taiwan'],
    geometry: line(p('SARTA'), L.pgMid, L.hormuz, L.omanGulf, L.arabSea, L.indiaSouth, L.sriLanka, L.andaman, L.malacca, L.singapore, L.scsSouth, L.scsNorth, L.taiwan, L.eastChina, p('CNSHA')),
    goods: [liquid('گاز نفتی', 52.3)],
    alternative: { via: 'تنگهٔ لومبوک', km: 12800, extraKm: 1400, extraDays: 2, skips: ['malacca'], geometry: line(p('SARTA'), L.pgMid, L.hormuz, L.omanGulf, L.arabSea, L.indiaSouth, L.sriLanka, [100.0, -6.0], [115.7, -8.7], [118.5, -2.0], [122.5, 5.0], [125.5, 15.0], [124.5, 25.0], p('CNSHA')) },
  }),
  route({
    id: 'AEJEA-INBOM',
    mode: 'sea',
    modeEstimated: true,
    km: 1950,
    value: 18.6,
    tonnes: 37.9,
    trades: 2610,
    chokepoints: ['hormuz'],
    geometry: line(p('AEJEA'), L.hormuz, L.omanGulf, L.arabSea, p('INBOM')),
    goods: [liquid('گاز نفتی', 11.2), dry('کود نیتروژنه', 7.4)],
  }),
  route({
    id: 'SADMM-CNNGB',
    mode: 'sea',
    modeEstimated: false,
    km: 11300,
    value: 14.9,
    tonnes: 29.2,
    trades: 1880,
    chokepoints: ['hormuz', 'malacca', 'taiwan'],
    geometry: line(p('SADMM'), L.pgMid, L.hormuz, L.omanGulf, L.arabSea, L.indiaSouth, L.sriLanka, L.andaman, L.malacca, L.singapore, L.scsSouth, L.scsNorth, L.taiwan, p('CNNGB')),
    goods: [liquid('گاز نفتی', 9.8), dry('کود نیتروژنه', 5.1)],
  }),
  route({
    id: 'QARLF-KRINC',
    mode: 'sea',
    modeEstimated: false,
    km: 12300,
    value: 12.7,
    tonnes: 20.5,
    trades: 1420,
    chokepoints: ['hormuz', 'malacca', 'taiwan'],
    geometry: line(p('QARLF'), L.pgMid, L.hormuz, L.omanGulf, L.arabSea, L.indiaSouth, L.sriLanka, L.andaman, L.malacca, L.singapore, L.scsSouth, L.scsNorth, L.taiwan, L.eastChina, p('KRINC')),
    goods: [liquid('گاز نفتی', 12.7)],
  }),
  route({
    id: 'KWSWK-INMAA',
    mode: 'unknown',
    modeEstimated: true,
    km: 3300,
    value: 9.4,
    tonnes: 20.6,
    trades: 1350,
    idle: [2],
    chokepoints: ['hormuz'],
    geometry: line(p('KWSWK'), L.pgNorth, L.pgMid, L.hormuz, L.omanGulf, L.arabSea, L.indiaSouth, L.sriLanka, [82.0, 9.0], p('INMAA')),
    goods: [dry('کود نیتروژنه', 5.3), liquid('گاز نفتی', 4.1)],
  }),
  // To Iranian ports: together the design's «ایران ۱۱٫۸» among Hormuz's destinations
  route({
    id: 'BRSSZ-IRBKM',
    mode: 'sea',
    modeEstimated: true,
    km: 15500,
    value: 7.1,
    tonnes: 16.1,
    trades: 690,
    idle: [1],
    chokepoints: ['cape', 'hormuz'],
    geometry: line(p('BRSSZ'), [-30.0, -30.0], L.cape, L.indianSW, L.indianW, L.arabSeaS, L.omanGulf, L.hormuz, L.pgMid, L.pgNorth, p('IRBKM')),
    goods: [dry('دانهٔ سویا', 4.6), dry('ذرت', 2.5)],
    alternative: { via: 'بندر چابهار و حمل زمینی', km: 15800, extraKm: 300, extraDays: 4, skips: ['hormuz'], geometry: line(p('BRSSZ'), [-30.0, -30.0], L.cape, L.indianSW, L.indianW, L.arabSeaS, p('IRZBR'), [59.0, 29.5], [52.5, 31.0], p('IRBKM')) },
  }),
  route({
    id: 'RUNVS-IRBND',
    mode: 'sea',
    modeEstimated: false,
    km: 7300,
    value: 4.7,
    tonnes: 18.1,
    trades: 820,
    chokepoints: ['bosphorus', 'dardanelles', 'suez', 'bab', 'hormuz'],
    geometry: line(p('RUNVS'), [32.0, 42.8], [29.05, 41.1], [27.8, 40.7], [26.4, 40.2], [25.5, 37.0], [28.5, 33.5], L.portSaid, L.suez, L.redSeaN, L.redSeaS, L.bab, L.aden, L.omanGulf, L.hormuz, p('IRBND')),
    goods: [dry('گندم', 4.7)],
  }),
  // Panama, westward to Japan (longitudes past −180 keep the line on the Pacific)
  route({
    id: 'USMSY-JPYOK',
    mode: 'sea',
    modeEstimated: false,
    km: 16900,
    value: 8.9,
    tonnes: 33.4,
    trades: 1150,
    chokepoints: ['panama'],
    geometry: line(p('USMSY'), [-88.0, 25.0], [-85.5, 21.5], [-81.0, 15.0], L.panamaN, L.panama, [-82.0, 7.0], [-120.0, 20.0], [-170.0, 33.0], [-200.0, 34.5], [-220.35, 35.45]),
    goods: [dry('ذرت', 6.1), dry('دانهٔ سویا', 2.8)],
  }),
  // The Channel
  route({
    id: 'BRPNG-NLRTM',
    mode: 'sea',
    modeEstimated: true,
    km: 10800,
    value: 4.8,
    tonnes: 11.2,
    trades: 740,
    idle: [9],
    chokepoints: ['manche'],
    geometry: line(p('BRPNG'), [-38.0, -15.0], [-30.0, 0.0], [-22.0, 25.0], [-12.0, 45.0], [-5.0, 49.0], [1.4, 50.9], p('NLRTM')),
    goods: [dry('دانهٔ سویا', 4.8)],
  }),
]
export const routeById = (id: string) => ROUTES.find((r) => r.id === id)

/** Map features for a route's line (used by the map and the tests) */
export const routeFeature = (r: TradeRoute): Feature<LineString> => ({ type: 'Feature', properties: { id: r.id }, geometry: r.geometry })
