"use client"

import * as React from "react"
import * as TooltipPrimitive from "@radix-ui/react-tooltip"
import { createPortal } from "react-dom"

import { cn } from "@/lib/utils"

const SheetTooltipProvider = TooltipPrimitive.Provider

const SheetTooltip = TooltipPrimitive.Root

const SheetTooltipTrigger = TooltipPrimitive.Trigger

const SheetTooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => {
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  // Try to find sheet-specific portal first, fallback to regular tooltip portal
  const sheetPortal = document.getElementById('sheet-tooltip-portal')
  const regularPortal = document.getElementById('tooltip-portal')
  const portalContainer = sheetPortal || regularPortal

  if (!portalContainer) return null

  return createPortal(
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        "z-100 overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        className
      )}
      {...props}
    />,
    portalContainer
  )
})
SheetTooltipContent.displayName = TooltipPrimitive.Content.displayName

export { SheetTooltip, SheetTooltipTrigger, SheetTooltipContent, SheetTooltipProvider }
