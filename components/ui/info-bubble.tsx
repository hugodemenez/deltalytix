"use client"

import * as React from "react"
import { HelpCircle, Info } from "lucide-react"

import { useMediaQuery } from "@/hooks/use-media-query"
import { useI18n } from "@/locales/client"
import { cn } from "@/lib/utils"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

/** Prefer hover tooltips only when the device can truly hover. */
const CAN_HOVER_QUERY = "(hover: hover) and (pointer: fine)"

type InfoBubbleProps = {
  children: React.ReactNode
  /** Accessible name for the trigger. Defaults to a localized "More information". */
  label?: string
  side?: "top" | "right" | "bottom" | "left"
  align?: "start" | "center" | "end"
  sideOffset?: number
  /** Classes for the trigger button. */
  className?: string
  /** Classes for the Info / HelpCircle icon. */
  iconClassName?: string
  /** Classes for the tooltip / popover content panel. */
  contentClassName?: string
  icon?: "info" | "help"
  delayDuration?: number
}

/**
 * Widget info affordance that stays accessible on touch devices:
 * - Fine pointer + hover → tooltip (hover / focus)
 * - Touch / coarse pointer → popover (explicit tap, dismissible)
 */
export function InfoBubble({
  children,
  label,
  side = "top",
  align = "center",
  sideOffset = 4,
  className,
  iconClassName,
  contentClassName,
  icon = "info",
  delayDuration = 100,
}: InfoBubbleProps) {
  const t = useI18n()
  const canHover = useMediaQuery(CAN_HOVER_QUERY)
  const [open, setOpen] = React.useState(false)
  const accessibleLabel = label ?? t("common.moreInformation")
  const Icon = icon === "help" ? HelpCircle : Info

  const stopWidgetGestures = (event: React.SyntheticEvent) => {
    event.stopPropagation()
  }

  const trigger = (
    <button
      type="button"
      aria-label={accessibleLabel}
      className={cn(
        // 24px minimum target (WCAG 2.5.8) while staying compact in widget headers
        "inline-flex size-6 shrink-0 items-center justify-center rounded-sm text-muted-foreground transition-colors",
        "hover:text-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        canHover ? "cursor-help" : "cursor-pointer",
        className,
      )}
      onClick={stopWidgetGestures}
      onPointerDown={stopWidgetGestures}
      onTouchStart={stopWidgetGestures}
    >
      <Icon
        aria-hidden="true"
        className={cn("size-3.5", iconClassName)}
      />
    </button>
  )

  if (canHover) {
    return (
      <TooltipProvider delayDuration={delayDuration}>
        <Tooltip>
          <TooltipTrigger asChild>{trigger}</TooltipTrigger>
          <TooltipContent
            side={side}
            align={align}
            sideOffset={sideOffset}
            className={cn("max-w-[300px] text-sm", contentClassName)}
          >
            {children}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        side={side}
        align={align}
        sideOffset={sideOffset}
        role="note"
        aria-label={accessibleLabel}
        className={cn(
          "z-9999 w-auto max-w-[300px] p-3 text-sm",
          contentClassName,
        )}
        onOpenAutoFocus={(event) => {
          // Keep focus on the trigger for short informational content so
          // VoiceOver / TalkBack users can dismiss with a second tap / Escape.
          event.preventDefault()
        }}
        onClick={stopWidgetGestures}
        onPointerDown={stopWidgetGestures}
      >
        {children}
      </PopoverContent>
    </Popover>
  )
}
