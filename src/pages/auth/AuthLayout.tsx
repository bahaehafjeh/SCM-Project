import { Outlet } from 'react-router-dom'
import { Globe } from '@/components/ui/globe'
import type { GlobeRoute } from '@/components/ui/globe'
import './auth.css'

// Decorative only: real port coordinates, but the pairs are illustrative and do not represent shipment data.
const PORT = {
  bandarAbbas: [27.18, 56.27],
  imamKhomeini: [30.43, 49.08],
  novorossiysk: [44.72, 37.77],
  jebelAli: [25.01, 55.06],
  mumbai: [18.95, 72.84],
  singapore: [1.29, 103.85],
  shanghai: [31.23, 121.47],
  rotterdam: [51.92, 4.48],
  santos: [-23.96, -46.33],
} satisfies Record<string, [number, number]>

const ROUTES: GlobeRoute[] = [
  { from: PORT.santos, to: PORT.bandarAbbas },
  { from: PORT.novorossiysk, to: PORT.imamKhomeini },
  { from: PORT.mumbai, to: PORT.bandarAbbas },
  { from: PORT.shanghai, to: PORT.bandarAbbas },
  { from: PORT.singapore, to: PORT.jebelAli },
  { from: PORT.rotterdam, to: PORT.imamKhomeini },
]

// Shared canvas for login/register; the globe stays mounted while switching between the two forms.
export function AuthLayout() {
  return (
    <div className="auth">
      <main className="auth__main">
        <Outlet />
      </main>
      <div className="auth__globe">
        <Globe routes={ROUTES} centerLon={50} />
      </div>
    </div>
  )
}
