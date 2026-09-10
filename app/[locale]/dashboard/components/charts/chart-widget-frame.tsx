"use client"

import type { ReactNode } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { InfoBubble } from "@/components/ui/info-bubble"
import { cn } from "@/lib/utils"
import type { WidgetSize } from "@/app/[locale]/dashboard/types/dashboard"
import {
  ChartWidgetKindMark,
  type ChartWidgetKind,
} from "./chart-widget-kind"

interface ChartWidgetMastheadProps {
  kind: ChartWidgetKind
  eyebrow: string
  title: string
  subtitle?: string
  description: ReactNode
  actions?: ReactNode
  compact?: boolean
  titleClassName?: string
}

export function ChartWidgetMasthead({
  kind,
  eyebrow,
  title,
  subtitle,
  description,
  actions,
  compact = false,
  titleClassName,
}: ChartWidgetMastheadProps) {
  return (
    <div className="flex items-start justify-between gap-2">
      <div className="flex min-w-0 flex-1 items-start gap-2">
        <ChartWidgetKindMark kind={kind} compact={compact} />
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "mb-0.5 truncate font-medium leading-none text-muted-foreground",
              compact ? "text-[10px]" : "text-[11px]",
            )}
          >
            {eyebrow}
          </p>
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
      </div>
      {actions ? (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      ) : null}
    </div>
  )
}

interface ChartWidgetFrameProps {
  size?: WidgetSize
  kind: ChartWidgetKind
  eyebrow: string
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
  kind,
  eyebrow,
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
    <Card
      data-widget-kind={kind}
      className="flex h-full flex-col overflow-hidden"
    >
      <CardHeader
        className={cn(
          "flex shrink-0 flex-col items-stretch space-y-0 border-b bg-muted/40",
          compact ? "p-2" : "p-3 sm:p-4",
        )}
      >
        <ChartWidgetMasthead
          kind={kind}
          eyebrow={eyebrow}
          title={title}
          subtitle={subtitle}
          description={description}
          actions={actions}
          compact={compact}
          titleClassName={titleClassName}
        />
      </CardHeader>
      <CardContent className="relative min-h-0 flex-1 p-0">
        <div
          className={cn(
            "absolute inset-0",
            compact ? "p-1" : "p-2 sm:p-4",
            contentInteractive && "cursor-pointer",
          )}
          onClick={onContentClick}
        >
          {children}
        </div>
      </CardContent>
    </Card>
  )
}
