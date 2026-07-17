import Image from 'next/image'
import { cn } from '@/lib/utils'

const SERVICE_SLUGS = {
  rithmic: 'rithmic',
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

export function ThemeAwareLogo({
  path,
  darkPath,
  alt = '',
  size = 24,
  className,
}: {
  path?: string
  darkPath?: string
  alt?: string
  size?: number
  className?: string
}) {
  if (!path) return null

  return (
    <>
      <Image
        src={path}
        alt={alt}
        width={size}
        height={size}
        className={cn(
          'object-contain',
          darkPath ? 'dark:hidden' : undefined,
          className
        )}
      />
      {darkPath ? (
        <Image
          src={darkPath}
          alt=""
          aria-hidden
          width={size}
          height={size}
          className={cn('hidden object-contain dark:block', className)}
        />
      ) : null}
    </>
  )
}

export function ServiceMonochromeLogo({
  service,
  alt,
  size = 24,
  className,
}: {
  service: string
  alt?: string
  size?: number
  className?: string
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
    />
  )
}
