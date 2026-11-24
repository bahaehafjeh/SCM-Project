// Builds export/dist and folds it into one self-contained HTML: scripts, styles, fonts and data inline
import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = fileURLToPath(new URL('.', import.meta.url))
const root = join(here, '..')
execSync('npx vite build --config export/vite.config.mjs', { cwd: root, stdio: 'inherit' })
const dist = join(here, 'dist')
let html = readFileSync(join(dist, 'export', 'industry.html'), 'utf8')
const asset = (p) => readFileSync(join(dist, p.replace(/^\.\.\//, '').replace(/^\.\//, '')), 'utf8')
html = html.replace(/<link rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g, (_, href) => {
  let css = asset(href)
  // Vazir is referenced from /fonts (the app's public folder): embed each file
  css = css.replace(/url\((['"]?)\/fonts\/([^'")]+)\1\)/g, (_m, _q, f) => `url(data:font/ttf;base64,${readFileSync(join(root, 'public', 'fonts', f)).toString('base64')})`)
  return `<style>${css}</style>`
})
html = html.replace(/<script type="module" crossorigin src="([^"]+)"><\/script>/g, (_, src) => `<script type="module">${asset(src).replace(/<\/script/g, '<\/script')}</script>`)
const out = join(here, 'industry-dashboard.html')
writeFileSync(out, html)
console.log('written', out, Math.round(html.length / 1024), 'KB;', readdirSync(dist).join(', '))
