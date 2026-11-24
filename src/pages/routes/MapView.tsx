import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import Map, { Layer, Marker, Source } from 'react-map-gl/maplibre'
import type { MapLayerMouseEvent, MapRef } from 'react-map-gl/maplibre'
import type { FeatureCollection, LineString, Polygon, Position } from 'geojson'
import 'maplibre-gl/dist/maplibre-gl.css'
import * as maplibregl from 'maplibre-gl'
// MapLibre finds its worker next to its own module; Vite's pre-bundled copy has none there, so the
// worker is bundled by Vite (with what it imports) and its address given explicitly, in dev and build
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import { Anchor } from 'lucide-react'
import { CHOKEPOINTS, ROUTES, routeById } from '../../data/routes'
import type { TradeRoute } from '../../data/routes'
import { buildCorridors } from '../../lib/routes/corridors'
import type { CorridorProps } from '../../lib/routes/corridors'
import { LEVEL_LABEL, cpValue, dependencyOf, routeValue, shareOf } from '../../lib/routes/metrics'
import type { Filters } from '../../lib/routes/metrics'
import type { Layer as LayerKey, View } from '../../lib/routes/url'
import { CAMERA_PADDING, GLOBE_CENTER, MAP_COLORS, MAP_FILES, SKY, WORLD_BOUNDS, baseStyle, chokepointSize, corridorWidth, dataColors } from './mapStyle'
import { fa1, money } from './format'

maplibregl.setWorkerUrl(workerUrl)

type Bounds = [[number, number], [number, number]]
const boundsOf = (coords: Position[]): Bounds => {
  const xs = coords.map((c) => c[0])
  const ys = coords.map((c) => c[1])
  return [
    [Math.min(...xs), Math.min(...ys)],
    [Math.max(...xs), Math.max(...ys)],
  ]
}

/** A white arrow for the selected route's direction (no glyphs needed) */
function arrowImage(): ImageData {
  const s = 24
  const c = document.createElement('canvas')
  c.width = s
  c.height = s
  const g = c.getContext('2d')!
  g.strokeStyle = '#ffffff'
  g.lineWidth = 3
  g.lineCap = 'round'
  g.lineJoin = 'round'
  g.beginPath()
  g.moveTo(8, 6)
  g.lineTo(16, 12)
  g.lineTo(8, 18)
  g.stroke()
  return g.getImageData(0, 0, s, s)
}

export interface MapViewProps {
  view: Exclude<View, 'table'>
  f: Filters
  routes: TradeRoute[]
  cp: string | null
  route: string | null
  layers: LayerKey[]
  iran: boolean
  hoverCp: string | null
  onHoverCp: (id: string | null) => void
  onSelectCp: (id: string) => void
  onSelectRoute: (id: string) => void
  onMapError: () => void
  /** Overlays drawn over the map (controls, time-lapse, banners) with the map's own handle */
  children?: (api: { zoomIn: () => void; zoomOut: () => void; locate: () => void }) => ReactNode
}

/**
 * The map (routes-map-prompt §5): local base map, corridors (never one line per route), alternatives,
 * the selected route, chokepoint and port markers. Layers keep their order by always being mounted;
 * selection dims other corridors through feature-state, without rebuilding the layer.
 */
export function MapView(p: MapViewProps) {
  const mapRef = useRef<MapRef>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const [loaded, setLoaded] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [labels, setLabels] = useState<{ iso: string; name: string; lng: number; lat: number }[]>([])
  const [hover, setHover] = useState<{ x: number; y: number; c: CorridorProps } | null>(null)
  const [pick, setPick] = useState<{ x: number; y: number; routes: string[] } | null>(null)
  const colors = useMemo(dataColors, [])
  // The projection the map starts with is part of the style; later switches wait for the style (below)
  const style = useMemo(() => ({ ...baseStyle(p.iran), projection: { type: p.view === '3d' ? 'globe' : 'mercator' }, ...(p.view === '3d' ? { sky: SKY } : {}) }), []) // eslint-disable-line react-hooks/exhaustive-deps
  const selected = p.route ? routeById(p.route) : undefined

  // ── Data ──
  const valueOf = (r: TradeRoute) => routeValue(r, p.f)
  const corridors = useMemo(() => {
    const fc = buildCorridors(p.routes, valueOf)
    const max = Math.max(0, ...fc.features.map((x) => x.properties.value))
    const byId = new globalThis.Map(ROUTES.map((r) => [r.id, r]))
    return {
      type: 'FeatureCollection',
      features: fc.features.map((x, i) => {
        const modes = new Set(x.properties.routes.map((id) => byId.get(id)!.mode))
        // One mode on the whole stretch: its colour; mixed stretches stay the sea colour
        const color = modes.size === 1 ? colors.mode[[...modes][0]] : colors.mode.sea
        return { ...x, id: i, properties: { ...x.properties, fid: i, w: corridorWidth(x.properties.value, max), color, routesJson: JSON.stringify(x.properties.routes) } }
      }),
    } as FeatureCollection<LineString>
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.routes, p.f])
  const zones: FeatureCollection<Polygon> = useMemo(() => ({ type: 'FeatureCollection', features: CHOKEPOINTS.map((c) => ({ type: 'Feature', properties: { id: c.id, color: colors.level[dependencyOf(c).level] }, geometry: c.zone })) }), [colors])
  const alternatives: FeatureCollection<LineString> = useMemo(() => {
    const src = selected ? [selected] : p.routes
    return { type: 'FeatureCollection', features: p.layers.includes('alt') ? src.filter((r) => r.alternative).map((r) => ({ type: 'Feature', properties: { id: r.id }, geometry: r.alternative!.geometry })) : [] }
  }, [selected, p.routes, p.layers])
  const selectedFc: FeatureCollection<LineString> = { type: 'FeatureCollection', features: selected ? [{ type: 'Feature', properties: {}, geometry: selected.geometry }] : [] }

  // ── Country names: the 20 most populous, in Persian, from the local base map ──
  useEffect(() => {
    Promise.all([fetch(MAP_FILES.countries).then((r) => r.json()), fetch(MAP_FILES.names).then((r) => r.json())])
      .then(([geo, names]: [{ features: { properties: { iso: string; pop: number; lx: number; ly: number } }[] }, Record<string, string>]) => {
        const top = geo.features
          .map((x) => x.properties)
          .filter((x) => names[x.iso])
          .sort((a, b) => b.pop - a.pop)
          .slice(0, 20)
        setLabels(top.map((x) => ({ iso: x.iso, name: names[x.iso], lng: x.lx, lat: x.ly })))
      })
      .catch(() => setLabels([]))
  }, [])

  // ── 2D ↔ 3D: the same map, centre and zoom; only once the style is loaded (switching earlier throws) ──
  useEffect(() => {
    const m = mapRef.current?.getMap()
    if (!loaded || !m) return
    m.setProjection({ type: p.view === '3d' ? 'globe' : 'mercator' })
    m.setSky(p.view === '3d' ? SKY : {})
  }, [p.view, loaded])

  // ── «به سمت ایران»: fill Iran ──
  useEffect(() => {
    const m = mapRef.current?.getMap()
    if (loaded && m?.getLayer('iran')) m.setLayoutProperty('iran', 'visibility', p.iran ? 'visible' : 'none')
  }, [p.iran, loaded])

  // ── Dim corridors that have nothing to do with the selection ──
  useEffect(() => {
    const m = mapRef.current?.getMap()
    if (!loaded || !m?.getSource('corridors')) return
    for (const x of corridors.features) {
      const routes: string[] = JSON.parse(String(x.properties!.routesJson))
      const related = selected ? routes.includes(selected.id) : p.cp ? routes.some((id) => routeById(id)?.chokepoints.includes(p.cp!)) : true
      m.setFeatureState({ source: 'corridors', id: x.properties!.fid as number }, { dim: !related })
    }
  }, [loaded, corridors, p.cp, selected])

  // ── Camera: the selection, else the whole world; never on panel collapse ──
  useEffect(() => {
    const m = mapRef.current
    if (!loaded || !m) return
    const opts = { padding: CAMERA_PADDING, duration: p.view === '3d' ? 1200 : 600 }
    if (selected) {
      const coords = [...selected.geometry.coordinates, ...(p.layers.includes('alt') && selected.alternative ? selected.alternative.geometry.coordinates : [])]
      m.fitBounds(boundsOf(coords), opts)
    } else if (p.cp) {
      const c = CHOKEPOINTS.find((x) => x.id === p.cp)!
      const main = [...p.routes]
        .filter((r) => r.chokepoints.includes(c.id))
        .sort((a, b) => b.value - a.value)
        .slice(0, 3)
      const coords: Position[] = [c.lngLat, ...main.flatMap((r) => r.geometry.coordinates)]
      if (coords.length > 1) m.fitBounds(boundsOf(coords), opts)
      else m.flyTo({ center: c.lngLat, zoom: 4, duration: opts.duration })
    } else if (p.view === '3d') m.flyTo({ center: [GLOBE_CENTER.longitude, GLOBE_CENTER.latitude], zoom: GLOBE_CENTER.zoom, duration: opts.duration })
    else m.fitBounds(WORLD_BOUNDS, opts)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, p.cp, p.route])

  // The container changes width when the panel opens or closes: resize, do not re-fit
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver(() => mapRef.current?.resize())
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const onMove = (e: MapLayerMouseEvent) => {
    const x = e.features?.[0]
    if (!x) return setHover(null)
    const props = x.properties as unknown as CorridorProps & { routesJson: string }
    setHover({ x: e.point.x, y: e.point.y, c: { ...props, routes: JSON.parse(props.routesJson) } })
  }
  const onClick = (e: MapLayerMouseEvent) => {
    const x = e.features?.[0]
    if (!x) return setPick(null)
    const routes: string[] = JSON.parse(String((x.properties as { routesJson: string }).routesJson))
    if (routes.length === 1) {
      setPick(null)
      p.onSelectRoute(routes[0])
    } else setPick({ x: e.point.x, y: e.point.y, routes: [...routes].sort((a, b) => (routeById(b)?.value ?? 0) - (routeById(a)?.value ?? 0)) })
  }

  const api = {
    zoomIn: () => mapRef.current?.zoomIn(),
    zoomOut: () => mapRef.current?.zoomOut(),
    locate: () => {
      const m = mapRef.current
      if (!m) return
      if (selected) m.fitBounds(boundsOf(selected.geometry.coordinates), { padding: CAMERA_PADDING })
      else if (p.cp) m.flyTo({ center: CHOKEPOINTS.find((x) => x.id === p.cp)!.lngLat, zoom: 3.5 })
      else if (p.view === '3d') m.flyTo({ center: [GLOBE_CENTER.longitude, GLOBE_CENTER.latitude], zoom: GLOBE_CENTER.zoom })
      else m.fitBounds(WORLD_BOUNDS, { padding: CAMERA_PADDING })
    },
  }

  const order = selected ? selected.chokepoints : []
  const ports = selected ? [selected.from, selected.to] : p.layers.includes('ports') ? [...new globalThis.Map(p.routes.flatMap((r) => [r.from, r.to]).map((x) => [x.id, x])).values()] : []

  return (
    <div ref={wrapRef} className={`rmap ${p.view === '3d' ? 'is-globe' : ''}`} style={{ ['--map-label' as string]: MAP_COLORS.countryLabel }}>
      <Map
        ref={mapRef}
        mapLib={maplibregl}
        initialViewState={p.view === '3d' ? GLOBE_CENTER : { bounds: WORLD_BOUNDS, fitBoundsOptions: { padding: CAMERA_PADDING } }}
        mapStyle={style}
        interactiveLayerIds={['corridors']}
        cursor={hover ? 'pointer' : 'grab'}
        attributionControl={false}
        onLoad={(e) => {
          const m = e.target
          if (!m.hasImage('route-arrow')) m.addImage('route-arrow', arrowImage())
          setLoaded(true)
          setZoom(m.getZoom())
        }}
        onZoom={(e) => setZoom(e.viewState.zoom)}
        onError={(e) => {
          if (/webgl/i.test(String(e.error?.message ?? ''))) p.onMapError()
        }}
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
        onClick={onClick}
        style={{ position: 'absolute', inset: 0 }}
      >
        <Source id="zones" type="geojson" data={zones}>
          <Layer id="zones-fill" type="fill" layout={{ visibility: p.layers.includes('zones') ? 'visible' : 'none' }} paint={{ 'fill-color': ['get', 'color'], 'fill-opacity': 0.12 }} />
          <Layer id="zones-line" type="line" layout={{ visibility: p.layers.includes('zones') ? 'visible' : 'none' }} paint={{ 'line-color': ['get', 'color'], 'line-width': 1, 'line-dasharray': [3, 2], 'line-opacity': 0.7 }} />
        </Source>
        <Source id="corridors" type="geojson" data={corridors} promoteId="fid">
          <Layer
            id="corridors"
            type="line"
            layout={{ 'line-cap': 'round', 'line-join': 'round', visibility: p.layers.includes('main') ? 'visible' : 'none' }}
            paint={{
              'line-color': ['get', 'color'],
              'line-width': ['*', ['get', 'w'], ['case', ['boolean', ['feature-state', 'dim'], false], 0.8, 1]],
              'line-opacity': ['case', ['boolean', ['feature-state', 'dim'], false], 0.12, 0.78],
            }}
          />
        </Source>
        <Source id="alternatives" type="geojson" data={alternatives}>
          <Layer id="alternatives" type="line" layout={{ 'line-cap': 'round' }} paint={{ 'line-color': colors.alternative, 'line-width': 2.4, 'line-dasharray': [2, 2] }} />
        </Source>
        <Source id="selected" type="geojson" data={selectedFc}>
          <Layer id="selected-halo" type="line" layout={{ 'line-cap': 'round', 'line-join': 'round' }} paint={{ 'line-color': '#ffffff', 'line-width': 9 }} />
          <Layer id="selected-line" type="line" layout={{ 'line-cap': 'round', 'line-join': 'round' }} paint={{ 'line-color': colors.selected, 'line-width': 3.4 }} />
          <Layer id="selected-arrows" type="symbol" layout={{ 'symbol-placement': 'line', 'symbol-spacing': 80, 'icon-image': 'route-arrow', 'icon-size': 0.55, 'icon-allow-overlap': true, 'icon-rotation-alignment': 'map' }} />
        </Source>

        {/* Country names: HTML with the app's own font (no glyphs to build), from zoom 1.5 */}
        {zoom >= 1.5 &&
          p.layers.includes('names') &&
          labels.map((l) => (
            <Marker key={l.iso} longitude={l.lng} latitude={l.lat} anchor="center" style={{ pointerEvents: 'none' }}>
              <span className="rmap__country">{l.name}</span>
            </Marker>
          ))}

        {ports.map((port) => (
          <Marker key={port.id} longitude={port.lngLat[0]} latitude={port.lngLat[1]} anchor="center">
            <span className="rport" title={`${port.name} · ${port.code}`}>
              <span className="rport__icon">
                <Anchor size={12} aria-hidden="true" />
              </span>
              <span className="rport__name">{port.name}</span>
            </span>
          </Marker>
        ))}

        {CHOKEPOINTS.map((c) => {
          const v = cpValue(c, p.f)
          const d = dependencyOf(c)
          const share = shareOf(c, p.f)
          const size = chokepointSize(v)
          const on = p.cp === c.id && !selected
          const n = order.indexOf(c.id)
          const dim = (selected && n < 0) || (!selected && p.cp && !on)
          return (
            <Marker key={c.id} longitude={c.lngLat[0]} latitude={c.lngLat[1]} anchor="center">
              <button
                type="button"
                className={`rcp rcp--${d.level} ${on ? 'is-on' : ''} ${p.hoverCp === c.id ? 'is-hover' : ''} ${dim ? 'is-dim' : ''}`}
                style={{ width: size, height: size, ['--lvl' as string]: colors.level[d.level] }}
                aria-label={`${c.name}، سهم ${fa1(share)} درصد، وابستگی ${LEVEL_LABEL[d.level]}`}
                aria-pressed={on}
                onMouseEnter={() => p.onHoverCp(c.id)}
                onMouseLeave={() => p.onHoverCp(null)}
                onFocus={() => p.onHoverCp(c.id)}
                onBlur={() => p.onHoverCp(null)}
                onClick={(e) => {
                  e.stopPropagation()
                  p.onSelectCp(c.id)
                }}
              >
                <span className="rcp__dot" aria-hidden="true" />
                {n >= 0 && (
                  <span className="rcp__n" aria-hidden="true">
                    {fa1(n + 1)}
                  </span>
                )}
                <span className="rcp__tip" role="tooltip">
                  <strong>{c.name}</strong>
                  <span>
                    سهم {fa1(share)}٪ · وابستگی {LEVEL_LABEL[d.level]}
                  </span>
                </span>
              </button>
            </Marker>
          )
        })}
      </Map>

      {/* Corridor tooltip (§12) */}
      {hover && !pick && (
        <div className="rtip" style={{ insetInlineStart: hover.x + 12, insetBlockStart: hover.y + 12 }} role="tooltip">
          <strong>{corridorName(hover.c)}</strong>
          <span>
            {money(hover.c.value)} · {fa1(hover.c.routes.length)} مسیر · {hover.c.mainGood}
          </span>
          <span className="rtip__hint">کلیک برای دیدن مسیرها</span>
        </div>
      )}
      {/* Several routes on one stretch: pick one */}
      {pick && (
        <div className="rpick" style={{ insetInlineStart: pick.x + 8, insetBlockStart: pick.y + 8 }} role="menu" aria-label="مسیرهای این کریدور">
          {pick.routes.map((id) => {
            const r = routeById(id)!
            return (
              <button key={id} type="button" role="menuitem" onClick={() => (setPick(null), p.onSelectRoute(id))}>
                <span>
                  {r.from.name.replace('بندر ', '')} ← {r.to.name.replace('بندر ', '')}
                </span>
                <span className="rpick__v">{money(routeValue(r, p.f))}</span>
              </button>
            )
          })}
        </div>
      )}
      {p.children?.(api)}
    </div>
  )
}

/** A corridor's name: from its first route's ends when it is one route, else «n مسیر» */
function corridorName(c: CorridorProps): string {
  const r = routeById(c.routes[0])
  if (c.routes.length === 1 && r) return `${r.from.name} ← ${r.to.name}`
  return `کریدور ${fa1(c.routes.length)} مسیر`
}
