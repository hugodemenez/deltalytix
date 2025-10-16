import type { CSSProperties } from 'react'

export type EmbedThemeVars = Partial<Record<string, string>>

// Keys map to CSS custom properties under :root and .dark
// Provide a compact, shared set used by all embed charts and containers.
export const THEME_PRESETS: Record<string, EmbedThemeVars> = {
  light: {},
  dark: {},
  ocean: {
    // backgrounds
    '--background': '210 40% 98%',
    '--card': '210 40% 98%',
    '--popover': '210 40% 98%',
    '--foreground': '222 47% 11%',
    '--muted': '210 40% 96%',
    '--muted-foreground': '215 16% 47%',

    // borders / inputs
    '--border': '214 32% 91%',
    '--input': '214 32% 91%',
    '--ring': '222 84% 5%',

    // chart palette
    '--chart-1': '199 89% 48%', // cyan
    '--chart-2': '201 79% 35%', // teal/dark cyan
    '--chart-3': '217 91% 60%', // blue
    '--chart-4': '187 92% 42%', // green-cyan
    '--chart-5': '231 48% 48%', // indigo

    // success / destructive
    '--success': '164 94% 30%',
    '--success-foreground': '160 84% 14%',
    '--destructive': '0 84% 60%',
    '--destructive-foreground': '0 0% 98%',

    // radius
    '--radius': '0.5rem',
  },
  sunset: {
    '--background': '24 100% 98%',
    '--card': '24 100% 98%',
    '--popover': '24 100% 98%',
    '--foreground': '18 60% 10%',
    '--muted': '20 35% 93%',
    '--muted-foreground': '18 20% 35%',

    '--border': '20 25% 86%',
    '--input': '20 25% 86%',
    '--ring': '18 60% 10%',

    '--chart-1': '12 76% 61%', // orange
    '--chart-2': '343 83% 45%', // raspberry
    '--chart-3': '43 74% 66%',  // yellow
    '--chart-4': '330 70% 60%', // pink
    '--chart-5': '27 87% 67%',  // amber

    '--success': '142 72% 29%',
    '--success-foreground': '144 80% 10%',
    '--destructive': '0 72% 45%',
    '--destructive-foreground': '0 0% 98%',

    '--radius': '0.75rem',
  },
}

// Apply a set of CSS vars onto a target (defaults to documentElement)
export function applyEmbedTheme(vars: EmbedThemeVars, target: HTMLElement | Document = document) {
  const root = (target as Document).documentElement ? (target as Document).documentElement : (target as HTMLElement)
  const style = root instanceof HTMLElement ? root.style : (root as HTMLElement).style
  Object.entries(vars).forEach(([k, v]) => {
    if (!k.startsWith('--')) return
    if (typeof v === 'string') {
      style.setProperty(k, v)
    } else {
      style.removeProperty(k)
    }
  })
}

// Convert CSS var overrides to a style object suitable for React elements
export function themeVarsToStyle(vars?: EmbedThemeVars): CSSProperties | undefined {
  if (!vars) return undefined
  // We rely on CSS custom properties passthrough; React accepts unknown CSS props when cast
  return vars as unknown as CSSProperties
}

// Map URL search params to CSS var overrides.
// Supported keys: background, foreground, border, radius, chart1..chart8, success, destructive, tooltipBg, tooltipBorder
export function getOverridesFromSearchParams(searchParams: URLSearchParams): EmbedThemeVars {
  const map: Record<string, string> = {
    background: '--background',
    foreground: '--foreground',
    card: '--card',
    popover: '--popover',
    muted: '--muted',
    mutedFg: '--muted-foreground',
    border: '--border',
    input: '--input',
    ring: '--ring',
    radius: '--radius',
    chart1: '--chart-1',
    chart2: '--chart-2',
    chart3: '--chart-3',
    chart4: '--chart-4',
    chart5: '--chart-5',
    chart6: '--chart-6',
    chart7: '--chart-7',
    chart8: '--chart-8',
    success: '--success',
    successFg: '--success-foreground',
    destructive: '--destructive',
    destructiveFg: '--destructive-foreground',
    tooltipBg: '--embed-tooltip-bg',
    tooltipBorder: '--embed-tooltip-border',
    tooltipRadius: '--embed-tooltip-radius',
  }

  const overrides: EmbedThemeVars = {}
  Object.entries(map).forEach(([qp, cssVar]) => {
    const value = searchParams.get(qp)
    if (value) overrides[cssVar] = value
  })

  return overrides
}
