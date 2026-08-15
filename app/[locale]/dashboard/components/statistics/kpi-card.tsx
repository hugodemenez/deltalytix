import type { ReactNode } from 'react'
import { Card } from '@/components/ui/card'
import { InfoBubble } from '@/components/ui/info-bubble'
import { cn } from '@/lib/utils'

export function KpiCard({
  title,
  value,
  tooltip,
  valueClassName,
}: {
  title: string
  value: ReactNode
  tooltip: ReactNode
  valueClassName?: string
}) {
  return (
    <Card className="h-full">
      <div className="flex h-full flex-col items-start justify-center gap-2 px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="truncate text-xs font-medium leading-tight tracking-[-0.02em] text-[#686D67] dark:text-muted-foreground">
            {title}
          </span>
          <InfoBubble
            icon="help"
            side="bottom"
            sideOffset={5}
            iconClassName="size-3"
            contentClassName="max-w-[300px]"
          >
            {tooltip}
          </InfoBubble>
        </div>
        <div
          className={cn(
            'text-left text-xl font-semibold leading-none tracking-[-0.025em] text-foreground tabular-nums',
            valueClassName
          )}
        >
          {value}
        </div>
      </div>
    </Card>
  )
}
