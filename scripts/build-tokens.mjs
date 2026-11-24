// Converts the Figma variable exports in /design-tokens into src/styles/tokens.css.
// Aliases are kept as var() references so every semantic value traces back to its primitive.
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const load = (f) => JSON.parse(readFileSync(join(root, 'design-tokens', f), 'utf8'))

const slug = (s) =>
  s
    .replace(/\(.*?\)/g, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

// Walk a token tree; yields { path: string[], token }
function* walk(node, path = []) {
  if (node && typeof node === 'object' && '$value' in node) {
    yield { path, token: node }
    return
  }
  for (const [k, v] of Object.entries(node ?? {})) {
    if (k.startsWith('$')) continue
    yield* walk(v, [...path, k])
  }
}

const colorValue = (v) => {
  if (typeof v === 'string') return v
  const a = v.alpha ?? 1
  if (a >= 1) return v.hex.toLowerCase()
  const [r, g, b] = v.components.map((c) => Math.round(c * 255))
  return `rgb(${r} ${g} ${b} / ${+a.toFixed(3)})`
}

// Primitive variables are named after their Figma path, so an alias name maps 1:1 to a CSS var.
const primName = (setPrefix, figmaName) =>
  `--${setPrefix}-${figmaName.split('/').map(slug).join('-')}`.replace('--brand-brand-', '--brand-')

const aliasVar = (token) => {
  const a = token.$extensions?.['com.figma.aliasData']
  if (!a) return null
  const set = a.targetVariableSetName
  if (set === 'raw colors') return primName('raw', a.targetVariableName)
  if (set === 'alpha') return primName('raw', a.targetVariableName)
  if (set === 'brand colors') return primName('brand', a.targetVariableName)
  return null
}

const lines = { root: [], dark: [] }
const defined = new Set()
const push = (target, name, value, comment) => {
  defined.add(name)
  lines[target].push(`  ${name}: ${value};${comment ? ` /* ${comment} */` : ''}`)
}

// 1. Primitives
for (const file of ['raw-colors.tokens.json', 'alpha.tokens.json']) {
  for (const { path, token } of walk(load(file))) {
    push('root', primName('raw', path.join('/')), colorValue(token.$value))
  }
}
// 2. Brand
for (const { path, token } of walk(load('brand-colors.tokens.json'))) {
  if (typeof token.$value === 'string' && token.$value.startsWith('{')) {
    // e.g. {brand-shades.600}
    const ref = token.$value.slice(1, -1).replace('.', '/')
    push('root', primName('brand', path.join('/')), `var(${primName('brand', ref)})`)
    continue
  }
  const ali = aliasVar(token)
  push('root', primName('brand', path.join('/')), ali ? `var(${ali})` : colorValue(token.$value))
}
// 3. Semantic colours, light → :root, dark → dark scope
const semantic = (file, target) => {
  for (const { path, token } of walk(load(file))) {
    // Drop the grouping level ("general", "card", "unofficial"...) except where needed to stay unique.
    const name = `--color-${path.map(slug).join('-').replace(/^(general|card|popover|focus)-/, '')}`
    const ali = aliasVar(token)
    if (ali && defined.has(ali)) push(target, name, `var(${ali})`)
    else if (ali) push(target, name, colorValue(token.$value), `alias ${ali} missing from export`)
    else push(target, name, colorValue(token.$value), 'raw hex in export')
  }
}
semantic('semantic-light.tokens.json', 'root')
semantic('semantic-dark.tokens.json', 'dark')

// 4. Radius, spacing, shadows
for (const { path, token } of walk(load('radius.tokens.json'))) {
  push('root', `--${slug(path.join('-'))}`, `${token.$value}px`)
}
for (const { path, token } of walk(load('spacing.tokens.json'))) {
  push('root', `--space-${slug(path.join('-'))}`, `${token.$value}px`)
}
const shadows = {}
for (const { path, token } of walk(load('shadows.tokens.json'))) {
  const [size, prop] = path
  ;(shadows[size] ??= {})[prop] = prop === 'color' ? colorValue(token.$value) : token.$value
}
for (const [size, s] of Object.entries(shadows)) {
  push('root', `--shadow-${size}`, `${s.x}px ${s.y}px ${s.blur}px ${s.spread}px ${s.color}`,
    size === 'sm' ? 'spread 15 as exported (suspected export error, see docs §6.5 T8)' : null)
}

// 5. Typography (Persian set; English family used as Latin fallback)
const weightMap = { Thin: 100, Light: 300, Regular: 400, Medium: 500, DemiBold: 600, 'Semi Bold': 600, Bold: 700 }
const fa = [...walk(load('typography-fa.tokens.json'))]
const en = [...walk(load('typography-en.tokens.json'))]
const enSans = en.find((t) => t.path.join('/') === 'font definitions/font-family-sans').token.$value
const faSans = fa.find((t) => t.path.join('/') === 'font definitions/font-family-sans').token.$value
push('root', '--font-sans', `'${faSans}', '${enSans}', system-ui, sans-serif`)
push('root', '--font-latin', `'${enSans}', system-ui, sans-serif`, 'Vazir FD-WOL has no Latin glyphs')
for (const { path, token } of fa) {
  if (path[0] === 'font definitions') continue
  const group = slug(path.slice(0, -1).join('-'))
  const leaf = path.at(-1)
  if (/weight/i.test(leaf)) {
    // "paragraph-medium-weight" → --type-paragraph-medium-weight; "heading 3 weight" → --type-heading-3-weight
    const variant = slug(leaf).replace(/^(paragraph|heading-\d|font)-?/, '').replace(/-?weight$/, '')
    push('root', `--type-${group}${variant ? '-' + variant : ''}-weight`, weightMap[token.$value] ?? 400)
  } else if (/font-size/.test(leaf)) push('root', `--type-${group}-size`, `${token.$value}px`)
  else if (/line.height/.test(leaf)) push('root', `--type-${group}-line`, `${token.$value}px`)
}

const css = `/* GENERATED by scripts/build-tokens.mjs from /design-tokens — do not edit by hand. */
:root {
${lines.root.join('\n')}
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme='light']) {
${lines.dark.map((l) => '  ' + l).join('\n')}
  }
}

:root[data-theme='dark'] {
${lines.dark.join('\n')}
}
`
writeFileSync(join(root, 'src/styles/tokens.css'), css)
console.log(`tokens.css: ${lines.root.length} root vars, ${lines.dark.length} dark overrides`)
