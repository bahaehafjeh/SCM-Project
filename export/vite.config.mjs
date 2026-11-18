// Standalone build of «داشبورد تحلیلی صنعت» for sharing (one HTML file; see build-industry.mjs)
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const here = (p) => fileURLToPath(new URL(p, import.meta.url))
export default defineConfig({
  root: here('..'),
  base: './',
  publicDir: false,
  plugins: [react()],
  resolve: { alias: { '@': here('../src') } },
  build: {
    outDir: here('./dist'),
    emptyOutDir: true,
    assetsInlineLimit: 100_000_000,
    cssCodeSplit: false,
    rollupOptions: { input: here('./industry.html'), output: { inlineDynamicImports: true } },
  },
})
