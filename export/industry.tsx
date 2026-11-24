// The industry dashboard on its own page, with its data built in (no server needed)
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import csv from '../public/data/purchases_1404-02_1405-06.csv?raw'
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '../src/styles/tokens.css'
import '../src/styles/tokens-extension.css'
import '../src/styles/base.css'
import { IndustryPage } from '../src/pages/industry/IndustryPage'

// The page loads its CSV with fetch; here the file is answered from the bundle
const realFetch = window.fetch.bind(window)
window.fetch = (input, init) => (String(input instanceof Request ? input.url : input).includes('purchases_') ? Promise.resolve(new Response(csv, { headers: { 'content-type': 'text/csv; charset=utf-8' } })) : realFetch(input, init))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <main style={{ maxWidth: 1320, margin: '0 auto', padding: '32px clamp(16px, 4vw, 48px) 64px' }}>
      <IndustryPage />
    </main>
  </StrictMode>,
)
