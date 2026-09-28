'use client'

import { AlertTriangle } from 'lucide-react'
import { useI18n } from '@/locales/client'
import { cn } from '@/lib/utils'
import {
  RITHMIC_WEEKEND_WARNING_KEY,
  RITHMIC_WEEKEND_WARNING_SHORT_KEY,
} from '@/lib/rithmic-weekend'

/**
 * Same weekend downtime copy Import already shows on Rithmic platforms.
 * Compact: short label on narrow screens, full sentence from `sm` up.
 */
export function RithmicWeekendWarning({
  id,
  compact = true,
  className,
}: {
  id?: string
  compact?: boolean
  className?: string
}) {
  const t = useI18n()

  return (
    <p
      id={id}
      data-testid="rithmic-weekend-warning"
      role="status"
      className={cn(
        'flex items-start gap-1.5 rounded-md bg-yellow-500/10 px-2 py-1 text-[11px] leading-snug text-yellow-800 dark:text-yellow-400 sm:text-xs',
        className
      )}
    >
      <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
      <span>
        {compact ? (
          <>
            <span className="sm:hidden">{t(RITHMIC_WEEKEND_WARNING_SHORT_KEY)}</span>
            <span className="hidden sm:inline">{t(RITHMIC_WEEKEND_WARNING_KEY)}</span>
          </>
        ) : (
          t(RITHMIC_WEEKEND_WARNING_KEY)
        )}
      </span>
    </p>
  )
}
