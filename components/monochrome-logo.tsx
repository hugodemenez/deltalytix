import Image from 'next/image'
import { cn } from '@/lib/utils'

const SERVICE_SLUGS = {
  rithmic: 'rithmic',
  'rithmic-protocol': 'rithmic',
  tradovate: 'tradovate',
  dxfeed: 'dxfeed',
  thor: 'thor',
  etp: 'thor',
} as const

export type MonochromeService = keyof typeof SERVICE_SLUGS

export function monochromePaths(slug: string) {
  return {
    path: `/logos/monochrome/${slug}-black.png`,
    darkPath: `/logos/monochrome/${slug}-white.png`,
  }
}

/**
 * Uses next/image (optimizer + cache). For monochrome pairs we only fetch the
 * black asset and invert it in dark mode, so each logo is one cached request.
 */
export function ThemeAwareLogo({
  path,
  darkPath,
  alt = '',
  size = 24,
  width,
  height,
  className,
  priority = false,
}: {
  path?: string
  darkPath?: string
  alt?: string
  size?: number
  /** Intrinsic width when the asset is not square (prefer over `size`). */
  width?: number
  /** Intrinsic height when the asset is not square (prefer over `size`). */
  height?: number
  className?: string
  priority?: boolean
}) {
  if (!path) return null

  const w = width ?? size
  const h = height ?? size

  return (
    <Image
      src={path}
      alt={alt}
      width={w}
      height={h}
      sizes={`${Math.max(w, h)}px`}
      priority={priority}
      className={cn(
        'object-contain',
        darkPath ? 'dark:invert' : undefined,
        className
      )}
    />
  )
}

export function ServiceMonochromeLogo({
  service,
  alt,
  size = 24,
  className,
  priority = false,
}: {
  service: string
  alt?: string
  size?: number
  className?: string
  priority?: boolean
}) {
  const slug = SERVICE_SLUGS[service as MonochromeService]
  if (!slug) return null
  const { path, darkPath } = monochromePaths(slug)
  return (
    <ThemeAwareLogo
      path={path}
      darkPath={darkPath}
      alt={alt}
      size={size}
      className={className}
      priority={priority}
    />
  )
}
