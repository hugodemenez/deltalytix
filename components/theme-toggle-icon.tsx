'use client'

import { Laptop, Moon, Sun } from 'lucide-react'
import { useTheme } from '@/context/theme-provider'
import { cn } from '@/lib/utils'

type ThemeToggleIconProps = {
  className?: string
}

/**
 * Hydration-safe theme icon for toggle buttons.
 * For "system" theme we always render the laptop icon so server and client match.
 */
export function ThemeToggleIcon({ className }: ThemeToggleIconProps) {
  const { theme } = useTheme()

  if (theme === 'light') {
    return <Sun className={cn('h-4 w-4', className)} />
  }

  if (theme === 'dark') {
    return <Moon className={cn('h-4 w-4', className)} />
  }

  return <Laptop className={cn('h-4 w-4', className)} />
}
