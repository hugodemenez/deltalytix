import type { CSSProperties } from 'react'

export type EmbedThemeVars = Partial<Record<string, string>>

// Keys map to CSS custom properties under :root and .dark
// Provide a compact, shared set used by all embed charts and containers.
export const THEME_PRESETS: Record<string, EmbedThemeVars> = {
  sunset: {
      '--background': '24 100% 98%',
      '--card': '24 100% 98%',
      '--popover': '24 100% 98%',
      '--foreground': '18 60% 10%',
      '--card-foreground': '18 60% 10%',
      '--popover-foreground': '18 60% 10%',
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
      '--chart-win': '120 72% 45%', // green
      '--chart-loss': '0 72% 45%', // red
      
  
      '--success': '142 72% 29%',
      '--success-foreground': '144 80% 10%',
      '--destructive': '0 72% 45%',
      '--destructive-foreground': '0 0% 98%',
  
      '--radius': '0.75rem',
    },
  ocean: {
      // backgrounds
      '--background': '210 40% 98%',
      '--card': '210 40% 98%',
      '--popover': '210 40% 98%',
      '--foreground': '222 47% 11%',
      '--card-foreground': '222 47% 11%',
      '--popover-foreground': '222 47% 11%',
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
      '--chart-loss': '0 70% 60%',
      '--chart-win': '160 84% 40%',
  
      // success / destructive
      '--success': '164 94% 30%',
      '--success-foreground': '160 84% 14%',
      '--destructive': '0 84% 60%',
      '--destructive-foreground': '0 0% 98%',
  
      // radius
      '--radius': '0.5rem',
    },
  "thor": {
    // Thor brand dark based on #0f1419 
    '--background': '210 25% 7.84%',
    '--card': '210 25% 8%',
    '--popover': '210 25% 8%',
    '--foreground': '210 20% 96%',
    '--card-foreground': '210 20% 96%',
    '--popover-foreground': '210 20% 96%',
    '--muted': '210 16% 14%',
    '--muted-foreground': '215 16% 60%',

    // borders / inputs / focus ring
    '--border': '210 15% 18%',
    '--input': '210 15% 18%',
    '--ring': '210 90% 56%',

    // chart palette (ensure loss color is subtle red)
    '--chart-1': '0 70% 60%', 
    '--chart-2': '190 92% 45%', // cyan
    '--chart-3': '160 84% 40%', // green
    '--chart-4': '260 84% 60%', // violet
    '--chart-5': '340 80% 60%', // magenta
    '--chart-loss': '0 70% 60%',
    '--chart-win': '160 84% 40%',

    // status colors
    '--success': '142 72% 29%',
    '--success-foreground': '0 0% 98%',
    '--destructive': '0 84% 60%',
    '--destructive-foreground': '0 0% 98%',

    // radius
    '--radius': '0.5rem',
  },
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function rgbToHslComponentsString(r: number, g: number, b: number): string {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h = 0, s = 0, l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break
      case g: h = (b - r) / d + 2; break
      case b: h = (r - g) / d + 4; break
    }
    h /= 6
  }
  const H = Math.round(h * 360)
  const S = Math.round(s * 100)
  const L = Math.round(l * 100)
  return `${H} ${S}% ${L}%`
}

function parseHexToHslComponentsString(hex: string): string | null {
  let h = hex.replace('#', '').trim()
  if (![3,4,6,8].includes(h.length)) return null
  if (h.length === 3 || h.length === 4) {
    h = h.split('').map((c) => c + c).join('')
  }
  const r = parseInt(h.slice(0,2), 16)
  const g = parseInt(h.slice(2,4), 16)
  const b = parseInt(h.slice(4,6), 16)
  return rgbToHslComponentsString(r, g, b)
}

function parseRgbToHslComponentsString(input: string): string | null {
  const match = input.trim().match(/^rgba?\(([^)]+)\)$/i)
  if (!match) return null
  const parts = match[1].split(',').map((p) => p.trim())
  if (parts.length < 3) return null
  const to255 = (v: string): number => {
    if (v.endsWith('%')) {
      return clamp(Math.round(parseFloat(v) * 2.55), 0, 255)
    }
    return clamp(parseInt(v, 10), 0, 255)
  }
  const r = to255(parts[0])
  const g = to255(parts[1])
  const b = to255(parts[2])
  return rgbToHslComponentsString(r, g, b)
}

function parseHslToComponentsString(input: string): string | null {
  const match = input.trim().match(/^hsla?\(([^)]+)\)$/i)
  if (!match) return null
  const parts = match[1].split(',').map((p) => p.trim())
  // Support space-separated as well
  const flat = parts.length === 1 ? parts[0].split(/[\s/]+/).filter(Boolean) : parts
  if (flat.length < 3) return null
  const h = flat[0]
  const s = flat[1]
  const l = flat[2]
  // normalize h
  let H = 0
  if (h.endsWith('deg')) H = parseFloat(h)
  else if (h.endsWith('rad')) H = parseFloat(h) * (180 / Math.PI)
  else if (h.endsWith('turn')) H = parseFloat(h) * 360
  else H = parseFloat(h)
  H = ((H % 360) + 360) % 360
  // normalize s,l ensure %
  const toPct = (v: string) => v.endsWith('%') ? `${clamp(parseFloat(v), 0, 100)}%` : `${clamp(parseFloat(v), 0, 100)}%`
  const S = toPct(s)
  const L = toPct(l)
  return `${Math.round(H)} ${S} ${L}`
}

function normalizeColorValueToHslComponents(value: string): string | null {
  if (!value) return null
  const v = value.trim()
  // Already an HSL components string like "210 40% 98%" or includes '/'
  if (/^\d+\s+\d+%\s+\d+%/.test(v)) {
    // strip any trailing alpha part after '/'
    const parts = v.split('/')
    return parts[0].trim()
  }
  if (v.startsWith('#')) return parseHexToHslComponentsString(v)
  if (/^rgba?\(/i.test(v)) return parseRgbToHslComponentsString(v)
  if (/^hsla?\(/i.test(v)) return parseHslToComponentsString(v)
  return null
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
    chartLoss: '--chart-loss',
    chartWin: '--chart-win',
    success: '--success',
    successFg: '--success-foreground',
    destructive: '--destructive',
    destructiveFg: '--destructive-foreground',
    tooltipBg: '--embed-tooltip-bg',
    tooltipBorder: '--embed-tooltip-border',
    tooltipRadius: '--embed-tooltip-radius',
  }

  const overrides: EmbedThemeVars = {}
  const colorish = new Set([
    'background','foreground','card','popover','muted','mutedFg','border','input','ring',
    'chart1','chart2','chart3','chart4','chart5','chart6','chart7','chart8',
    'success','successFg','destructive','destructiveFg','tooltipBg','tooltipBorder'
  ])

  Object.entries(map).forEach(([qp, cssVar]) => {
    const value = searchParams.get(qp)
    if (!value) return
    if (qp === 'radius' || qp === 'tooltipRadius') {
      overrides[cssVar] = value
      return
    }
    if (colorish.has(qp)) {
      const normalized = normalizeColorValueToHslComponents(value) || value
      overrides[cssVar] = normalized
    } else {
      overrides[cssVar] = value
    }
  })

  return overrides
}
