import createGlobe from 'cobe'
import type { COBEOptions, Marker } from 'cobe'
import { useEffect, useRef } from 'react'

import { cn } from '@/lib/utils'
import './globe.css'

type LatLon = [number, number]
type RGB = [number, number, number]
export type GlobeRoute = { from: LatLon; to: LatLon }

// Rotation is time-based so speed does not depend on the display refresh rate.
// 0.05 rad/s ≈ one turn every 2 minutes (the upstream demo turns ~6× faster).
const SPIN_RAD_PER_SEC = 0.05

// Route timeline (ms): the head travels origin → destination, then the tail retracts into the destination
// with a soft fade, the two focused ends dim, and the next pair starts.
const DRAW_MS = 2800
const TAIL_START_MS = 1700 // tail starts fading while the head is still approaching
const TAIL_END_MS = 3900
const FOCUS_OUT_MS = 4500
const CYCLE_MS = 5000

const R = 0.8 // cobe sphere radius in clip space
const SAMPLES = 120

const GLOBE_CONFIG: Omit<COBEOptions, 'width' | 'height'> = {
  devicePixelRatio: 2,
  phi: 0,
  theta: 0.3,
  dark: 0,
  diffuse: 0.4,
  mapSamples: 16000,
  mapBrightness: 1.2,
  baseColor: [1, 1, 1],
  markerColor: [1, 1, 1],
  glowColor: [1, 1, 1],
  markerElevation: 0,
}

// --- token colours -------------------------------------------------------

const cssVar = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim()

const hexToRgb = (hex: string, fallback: RGB): RGB => {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex)
  if (!m) return fallback
  const n = parseInt(m[1], 16)
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}

const isDark = () => {
  const theme = document.documentElement.dataset.theme
  return theme ? theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches
}

// Primary = brand-shades-600 (#416DFF). Read the primitive, not --color-primary,
// because the dark semantic set remaps primary to a neutral.
function tokenColors(): { globe: Partial<COBEOptions>; line: string } {
  const dark = isDark()
  const primary = hexToRgb(cssVar('--brand-shades-600'), [0.25, 0.43, 1])
  return {
    globe: {
      dark: dark ? 1 : 0,
      mapBrightness: dark ? 4 : 1.2,
      baseColor: dark ? hexToRgb(cssVar('--brand-neutrals-700'), [0.25, 0.25, 0.25]) : [1, 1, 1],
      glowColor: dark ? hexToRgb(cssVar('--brand-shades-900'), [0.1, 0.15, 0.4]) : hexToRgb(cssVar('--brand-shades-100'), [0.9, 0.93, 1]),
      markerColor: primary,
    },
    line: cssVar(dark ? '--brand-shades-400' : '--brand-shades-600') || '#416dff',
  }
}

// --- geometry ------------------------------------------------------------

// Same lat/lon → unit vector mapping cobe uses for markers and arcs.
const toVec = ([lat, lon]: LatLon): RGB => {
  const la = (lat * Math.PI) / 180
  const lo = (lon * Math.PI) / 180 - Math.PI
  const c = Math.cos(la)
  return [-c * Math.cos(lo), Math.sin(la), c * Math.sin(lo)]
}

const slerpVec = (a: RGB, b: RGB, w: number, t: number): RGB => {
  if (w < 1e-6) return b
  const s = Math.sin(w)
  const ka = Math.sin((1 - t) * w) / s
  const kb = Math.sin(t * w) / s
  return [ka * a[0] + kb * b[0], ka * a[1] + kb * b[1], ka * a[2] + kb * b[2]]
}

const angleBetween = (a: RGB, b: RGB) => Math.acos(Math.min(1, Math.max(-1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2])))

// cobe's screen projection: returns [x, y] in 0..1 of the canvas and whether the point is in front.
function project(v: RGB, phi: number, theta: number): [number, number, boolean] {
  const ct = Math.cos(theta)
  const st = Math.sin(theta)
  const cp = Math.cos(phi)
  const sp = Math.sin(phi)
  const x = cp * v[0] + sp * v[2]
  const y = sp * st * v[0] + ct * v[1] - cp * st * v[2]
  const z = -sp * ct * v[0] + st * v[1] + cp * ct * v[2]
  return [(x + 1) / 2, (-y + 1) / 2, z >= 0 || x * x + y * y >= R * R]
}

const clamp01 = (t: number) => Math.min(1, Math.max(0, t))
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)
const smoothstep = (e0: number, e1: number, x: number) => {
  const t = clamp01((x - e0) / (e1 - e0))
  return t * t * (3 - 2 * t)
}

// cobe centres longitude L when phi = 3π/2 − L (radians).
const phiFor = (lon: number) => (3 * Math.PI) / 2 - (lon * Math.PI) / 180
const frontLon = (phi: number) => ((((270 - (phi * 180) / Math.PI) % 360) + 540) % 360) - 180
const lonGap = (a: number, b: number) => Math.abs(((((a - b) % 360) + 540) % 360) - 180)

// Take routes in turn, skipping any whose ends are not (or not about to be) facing the viewer,
// so arcs are never drawn on the far side. Falls back to the best-facing route.
function nextRoute(routes: GlobeRoute[], phi: number, last: number) {
  const target = frontLon(phi) - 15 // rotation brings western longitudes to the front
  const gapOf = (r: GlobeRoute) => Math.max(lonGap(r.from[1], target), lonGap(r.to[1], target))
  let best = 0
  let bestGap = Infinity
  for (let k = 1; k <= routes.length; k++) {
    const i = (last + k) % routes.length
    if (i === last && routes.length > 1) continue
    const gap = gapOf(routes[i])
    if (gap < 70) return i
    if (gap < bestGap) [best, bestGap] = [i, gap]
  }
  return best
}

// --- overlay drawing -----------------------------------------------------

type Frame = { phi: number; theta: number; size: number; dpr: number; color: string; now: number }

// Arc lifted above the surface proportionally to its length; endpoints sit exactly on the markers.
function arcPoint(a: RGB, b: RGB, w: number, t: number): RGB {
  const p = slerpVec(a, b, w, t)
  const r = R * (1 + (0.08 + 0.22 * (w / Math.PI)) * Math.sin(Math.PI * t))
  return [p[0] * r, p[1] * r, p[2] * r]
}

function drawArc(ctx: CanvasRenderingContext2D, f: Frame, a: RGB, b: RGB, tail: number, head: number, fade: number) {
  if (head - tail < 1e-3) return
  const w = angleBetween(a, b)
  const px = f.size * f.dpr
  const pts: Array<[number, number, boolean, number]> = []
  const n = Math.max(2, Math.ceil(SAMPLES * (head - tail)))
  for (let i = 0; i <= n; i++) {
    const t = tail + ((head - tail) * i) / n
    const [x, y, vis] = project(arcPoint(a, b, w, t), f.phi, f.theta)
    // Fade from the tail end only; the band widens as the line closes on its destination.
    const alpha = fade > 0 ? smoothstep(tail, tail + 0.45 * fade, t) : 1
    pts.push([x * px, y * px, vis, alpha])
  }

  ctx.lineCap = 'round'
  ctx.strokeStyle = f.color
  // Pass 1: soft glow; pass 2: crisp core.
  for (const [width, strength] of [
    [3, 0.1],
    [1, 1],
  ]) {
    ctx.lineWidth = width * f.dpr
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0, v0] = pts[i - 1]
      const [x1, y1, v1, al] = pts[i]
      if (!v0 || !v1 || al <= 0.002) continue
      ctx.globalAlpha = al * strength
      ctx.beginPath()
      ctx.moveTo(x0, y0)
      ctx.lineTo(x1, y1)
      ctx.stroke()
    }
  }
  ctx.globalAlpha = 1
}

// Focus state for an active end: soft halo, a slow pulse ring and a solid dot with a light rim.
function drawFocus(ctx: CanvasRenderingContext2D, f: Frame, v: RGB, strength: number, pulseOrigin: number) {
  if (strength <= 0.01) return
  const [x, y, vis] = project([v[0] * R, v[1] * R, v[2] * R], f.phi, f.theta)
  if (!vis) return
  const px = f.size * f.dpr
  const cx = x * px
  const cy = y * px
  const d = f.dpr

  ctx.save()
  ctx.globalAlpha = strength
  const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, 22 * d)
  halo.addColorStop(0, f.color)
  halo.addColorStop(1, 'transparent')
  ctx.globalAlpha = strength * 0.28
  ctx.fillStyle = halo
  ctx.beginPath()
  ctx.arc(cx, cy, 22 * d, 0, Math.PI * 2)
  ctx.fill()

  const pulse = ((f.now - pulseOrigin) % 1800) / 1800
  ctx.globalAlpha = strength * 0.5 * (1 - pulse)
  ctx.strokeStyle = f.color
  ctx.lineWidth = 1.5 * d
  ctx.beginPath()
  ctx.arc(cx, cy, (5 + 13 * easeInOut(pulse)) * d, 0, Math.PI * 2)
  ctx.stroke()

  ctx.globalAlpha = strength
  ctx.shadowColor = f.color
  ctx.shadowBlur = 10 * d
  ctx.fillStyle = f.color
  ctx.beginPath()
  ctx.arc(cx, cy, 4.5 * d, 0, Math.PI * 2)
  ctx.fill()
  ctx.shadowBlur = 0
  ctx.strokeStyle = 'rgb(255 255 255 / 0.9)'
  ctx.lineWidth = 1.5 * d
  ctx.stroke()
  ctx.restore()
}

// -------------------------------------------------------------------------

export function Globe({
  className,
  config,
  routes = [],
  centerLon = 0,
}: {
  className?: string
  config?: Partial<COBEOptions>
  routes?: GlobeRoute[]
  /** Longitude facing the viewer on first render. */
  centerLon?: number
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const overlayRef = useRef<HTMLCanvasElement>(null)
  const pointerStart = useRef<number | null>(null)
  const dragOffset = useRef(0)
  const dragDelta = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current!
    const overlay = overlayRef.current!
    const ctx = overlay.getContext('2d')!
    const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const theta = config?.theta ?? GLOBE_CONFIG.theta
    let width = canvas.offsetWidth
    let colors = tokenColors()

    const hubs = new Map<string, LatLon>()
    routes.forEach((r) => [r.from, r.to].forEach((p) => hubs.set(p.join(), p)))
    const markers: Marker[] = [...hubs.values()].map((location) => ({ location, size: 0.02 }))
    const vecs = routes.map((r) => ({ a: toVec(r.from), b: toVec(r.to) }))

    let phi = phiFor(centerLon)
    let routeIdx = routes.length ? nextRoute(routes, phi, -1) : -1
    let routeStart = performance.now()

    const globe = createGlobe(canvas, {
      ...GLOBE_CONFIG,
      ...colors.globe,
      ...config,
      phi,
      width: width * 2,
      height: width * 2,
      markers,
    })

    let raf = 0
    let prev = performance.now()
    const frame = (now: number) => {
      const dt = Math.min(now - prev, 100) / 1000
      prev = now
      if (!reduceMotion && pointerStart.current === null) phi += SPIN_RAD_PER_SEC * dt
      const viewPhi = phi + dragDelta.current
      globe.update({ phi: viewPhi, width: width * 2, height: width * 2 })

      const px = Math.round(width * dpr)
      if (overlay.width !== px) overlay.width = overlay.height = px
      ctx.clearRect(0, 0, px, px)

      if (routeIdx >= 0) {
        if (now - routeStart >= (reduceMotion ? 6000 : CYCLE_MS)) {
          routeIdx = nextRoute(routes, viewPhi, routeIdx)
          routeStart = now
        }
        const e = now - routeStart
        const { a, b } = vecs[routeIdx]
        const f: Frame = { phi: viewPhi, theta, size: width, dpr, color: colors.line, now }

        if (reduceMotion) {
          drawArc(ctx, f, a, b, 0, 1, 0)
          drawFocus(ctx, f, a, 1, now)
          drawFocus(ctx, f, b, 1, now)
        } else {
          const head = easeInOut(clamp01(e / DRAW_MS))
          const tailK = clamp01((e - TAIL_START_MS) / (TAIL_END_MS - TAIL_START_MS))
          const tail = easeInOut(tailK)
          drawArc(ctx, f, a, b, tail, head, Math.min(1, tailK * 4))

          const fadeOut = 1 - smoothstep(TAIL_END_MS, FOCUS_OUT_MS, e)
          drawFocus(ctx, f, a, smoothstep(0, 400, e) * fadeOut, routeStart)
          drawFocus(ctx, f, b, smoothstep(DRAW_MS - 350, DRAW_MS + 150, e) * fadeOut, routeStart + DRAW_MS)
        }
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)

    const ro = new ResizeObserver(() => (width = canvas.offsetWidth))
    ro.observe(canvas)

    // Follow light/dark switches without remounting.
    const scheme = matchMedia('(prefers-color-scheme: dark)')
    const recolor = () => {
      colors = tokenColors()
      globe.update(colors.globe)
    }
    scheme.addEventListener('change', recolor)
    const mo = new MutationObserver(recolor)
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })

    const fadeIn = setTimeout(() => (canvas.style.opacity = '1'))
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(fadeIn)
      ro.disconnect()
      mo.disconnect()
      scheme.removeEventListener('change', recolor)
      globe.destroy()
    }
    // Routes/config are treated as initial values, like the upstream component.
  }, [])

  const setPointer = (value: number | null) => {
    pointerStart.current = value
    if (canvasRef.current) canvasRef.current.style.cursor = value !== null ? 'grabbing' : 'grab'
  }
  const move = (clientX: number) => {
    if (pointerStart.current === null) return
    dragDelta.current = (clientX - pointerStart.current) / 200
  }

  return (
    <div className={cn('globe', className)} aria-hidden="true">
      <canvas
        ref={canvasRef}
        className="globe__canvas"
        onPointerDown={(e) => setPointer(e.clientX - dragOffset.current * 200)}
        onPointerUp={() => {
          dragOffset.current = dragDelta.current
          setPointer(null)
        }}
        onPointerOut={() => {
          if (pointerStart.current !== null) dragOffset.current = dragDelta.current
          setPointer(null)
        }}
        onPointerMove={(e) => move(e.clientX)}
      />
      <canvas ref={overlayRef} className="globe__overlay" />
    </div>
  )
}
