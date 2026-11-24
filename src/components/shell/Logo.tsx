import raw from '../../assets/logo-supply-chain.svg?raw'

// The supplied logo, with its two wordmark fills mapped to classes so dark mode can recolour them.
const svg = raw
  .replace('fill="#0B1C50"', 'class="logo__word"')
  .replace('fill="#56647C"', 'class="logo__sub"')
  .replace('<svg ', '<svg role="img" aria-label="تجارت‌بان — پلتفرم هوشمند زنجیره تأمین" ')

// Full logo: the globe mark (x 202.5–300) is scaled to 80% and moved toward the wordmark (ends at x 168),
// leaving a 14-unit gap; the artboard is trimmed to the new right edge (260).
const MARK_PAINT = /<path([^>]*(?:#2778EE|#347EED|#174CC8)[^>]*)>/g
const full = svg
  .replace(MARK_PAINT, '<path transform="matrix(0.8 0 0 0.8 20 9.8)"$1>')
  .replace('viewBox="0 0 300 98"', 'viewBox="0 0 261 98"')
  .replace('width="300" height="98"', 'width="261" height="98"')

// Mark only (globe network, right side of the artwork) for the collapsed rail.
const mark = svg.replace('viewBox="0 0 300 98"', 'viewBox="200 -2 102 102"').replace('width="300" height="98"', 'width="40" height="40"')

export function Logo({ compact = false }: { compact?: boolean }) {
  return <span className={`logo ${compact ? 'logo--mark' : ''}`} dangerouslySetInnerHTML={{ __html: compact ? mark : full }} />
}
