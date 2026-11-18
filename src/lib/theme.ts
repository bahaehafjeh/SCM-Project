export type Theme = 'light' | 'dark'

const KEY = 'scm-theme'

const systemTheme = (): Theme => (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')

/** The user's choice if they made one, otherwise the system theme. */
export function readTheme(): Theme {
  try {
    const saved = localStorage.getItem(KEY)
    if (saved === 'light' || saved === 'dark') return saved
  } catch {
    /* storage unavailable: fall back to the system */
  }
  return systemTheme()
}

/** Tokens switch on [data-theme] (tokens.css); without it they follow prefers-color-scheme. */
export function applyTheme(theme: Theme, persist = true) {
  document.documentElement.dataset.theme = theme
  if (!persist) return
  try {
    localStorage.setItem(KEY, theme)
  } catch {
    /* choice lasts for this session only */
  }
}

// Apply a saved choice as early as this module loads, before first paint of the shell.
try {
  const saved = localStorage.getItem(KEY)
  if (saved === 'light' || saved === 'dark') applyTheme(saved, false)
} catch {
  /* ignore */
}
