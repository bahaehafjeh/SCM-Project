import type { SkySpecification, StyleSpecification } from 'maplibre-gl'
import type { Mode } from '../../data/routes'
import type { Level } from '../../lib/routes/metrics'

/**
 * Map colours and style, in one place (routes-map-prompt §5-2). The base-map colours have no design
 * token, so they are written here and nowhere else; everything else reads the design tokens, resolved
 * at run time because WebGL paint cannot read CSS variables.
 */
export const MAP_COLORS = {
  ocean: '#C2E4F6',
  land: '#F9F9F6',
  coast: '#C6CFD8',
  border: '#D6DCE3',
  countryLabel: '#8A96A3',
  horizon: '#AFDAF1',
} as const

/** A design token's value (custom properties resolve their var() chains when computed) */
export function token(name: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback
}

/** Token-backed colours of the data layers */
export const dataColors = () => ({
  corridor: token('--raw-blue-950', '#1d3173'),
  selected: token('--raw-orange-600', '#ff4000'),
  alternative: token('--raw-violet-600', '#7c3aed'),
  iran: token('--brand-shades-900', '#1e3a8a'),
  level: {
    high: token('--raw-red-600', '#dc2626'),
    medium: token('--raw-amber-600', '#d97706'),
    low: token('--raw-neutral-400', '#a3a3a3'),
  } satisfies Record<Level, string>,
  mode: {
    sea: token('--raw-blue-950', '#1d3173'),
    road: token('--raw-green-600', '#16a34a'),
    mixed: token('--raw-orange-500', '#f97316'),
    unknown: token('--raw-neutral-400', '#a3a3a3'),
  } satisfies Record<Mode, string>,
})

const base = typeof import.meta !== 'undefined' ? import.meta.env.BASE_URL : '/'
export const MAP_FILES = { countries: `${base}map/countries-50m.geojson`, land: `${base}map/land-50m.geojson`, names: `${base}map/country-names-fa.json` }

/**
 * The base map from local GeoJSON (Natural Earth 1:50m): no tile service, no key. If a vector tile
 * server is provided later, only these sources change; the layers and colours stay.
 */
export function baseStyle(iran: boolean): StyleSpecification {
  const c = dataColors()
  return {
    version: 8,
    sources: {
      countries: { type: 'geojson', data: MAP_FILES.countries },
      land: { type: 'geojson', data: MAP_FILES.land },
    },
    layers: [
      { id: 'ocean', type: 'background', paint: { 'background-color': MAP_COLORS.ocean } },
      { id: 'land', type: 'fill', source: 'land', paint: { 'fill-color': MAP_COLORS.land } },
      // «به سمت ایران»: Iran filled
      { id: 'iran', type: 'fill', source: 'countries', filter: ['==', ['get', 'iso'], 'IRN'], layout: { visibility: iran ? 'visible' : 'none' }, paint: { 'fill-color': c.iran, 'fill-opacity': 0.85 } },
      { id: 'borders', type: 'line', source: 'countries', paint: { 'line-color': MAP_COLORS.border, 'line-width': 0.5 } },
      { id: 'coast', type: 'line', source: 'land', paint: { 'line-color': MAP_COLORS.coast, 'line-width': 0.6 } },
    ],
  }
}

/** The globe's atmosphere (3D) */
export const SKY: SkySpecification = { 'atmosphere-blend': 0.5, 'horizon-color': MAP_COLORS.horizon }

/** Overview camera: 2D bounds (§5-5) and the 3D centre */
export const WORLD_BOUNDS: [[number, number], [number, number]] = [
  [-150, -46],
  [165, 68],
]
export const GLOBE_CENTER = { longitude: 55, latitude: 22, zoom: 1.15 }
/** Camera padding: room for the controls and the footer (§5-5) */
export const CAMERA_PADDING = { top: 64, bottom: 70, left: 24, right: 24 }

/** Corridor width: 0.7 + 4.8 × √(value / max) */
export const corridorWidth = (value: number, max: number) => 0.7 + 4.8 * Math.sqrt(max > 0 ? value / max : 0)
/** Chokepoint marker diameter: 9 + 0.76 × √value */
export const chokepointSize = (value: number) => 9 + 0.76 * Math.sqrt(Math.max(0, value))
