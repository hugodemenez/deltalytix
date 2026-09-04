"use client"

import type { ReactNode } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { InfoBubble } from "@/components/ui/info-bubble"
import { cn } from "@/lib/utils"
import type { WidgetSize } from "@/app/[locale]/dashboard/types/dashboard"

interface ChartWidgetFrameProps {
  size?: WidgetSize
  title: string
  subtitle?: string
  description: ReactNode
  actions?: ReactNode
  children: ReactNode
  contentInteractive?: boolean
  onContentClick?: () => void
  titleClassName?: string
}

export function ChartWidgetFrame({
  size = "medium",
  title,
  subtitle,
  description,
  actions,
  children,
  contentInteractive = false,
  onContentClick,
  titleClassName,
}: ChartWidgetFrameProps) {
  const compact = size === "small"

  return (
    <Card className="flex h-full flex-col">
      <CardHeader
        className={cn(
          "flex shrink-0 flex-col items-stretch space-y-0 border-b",
          compact ? "p-2" : "p-3 sm:p-4",
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <CardTitle
                className={cn(
                  "line-clamp-1 font-semibold tracking-[-0.02em]",
                  compact ? "text-sm" : "text-base",
                  titleClassName,
                )}
              >
                {title}
              </CardTitle>
              <InfoBubble
                side="top"
                iconClassName={cn(compact ? "size-3.5" : "size-4")}
              >
                {typeof description === "string" ? <p>{description}</p> : description}
              </InfoBubble>
            </div>
            {subtitle ? (
              <p
                className={cn(
                  "mt-0.5 line-clamp-2 text-muted-foreground",
                  compact ? "text-[10px] leading-tight" : "text-xs",
                )}
              >
                {subtitle}
              </p>
            ) : null}
          </div>
          {actions ? (
            <div className="flex shrink-0 items-center gap-2">{actions}</div>
          ) : null}
        </div>
      </CardHeader>
      <CardContent
        className={cn("min-h-0 flex-1", compact ? "p-1" : "p-2 sm:p-4")}
      >
        <div
          className={cn("h-full w-full", contentInteractive && "cursor-pointer")}
          onClick={onContentClick}
        >
          {children}
        </div>
      </CardContent>
    </Card>
  )
}
