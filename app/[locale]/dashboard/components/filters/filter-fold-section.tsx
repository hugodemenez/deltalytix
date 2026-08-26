"use client"

import type { ReactNode } from "react"
import { Command, CommandList } from "@/components/ui/command"
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

function isPortaledOverlayTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) return false
  return Boolean(
    target.closest("[data-radix-popper-content-wrapper]") ||
      target.closest("[data-radix-select-viewport]") ||
      target.closest('[role="listbox"]') ||
      target.closest("[data-sonner-toast]")
  )
}

export function FilterFoldSection({
  label,
  expanded,
  onToggle,
  children,
  placement = "inline",
}: {
  label: string
  expanded: boolean
  onToggle: () => void
  children: ReactNode
  placement?: "inline" | "submenu"
}) {
  const trigger = (
    <button
      type="button"
      className={cn(
        "flex w-full items-center justify-between rounded-[4px] px-2 py-1.5 text-sm text-[#171717] focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:text-foreground"
      )}
      onClick={onToggle}
      aria-expanded={expanded}
      aria-haspopup={placement === "submenu" ? "dialog" : undefined}
    >
      <span>{label}</span>
      <span aria-hidden className="text-[#A3A3A3]">
        ›
      </span>
    </button>
  )

  if (placement === "submenu") {
    return (
      <Popover
        open={expanded}
        onOpenChange={(nextOpen) => {
          if (nextOpen !== expanded) onToggle()
        }}
        modal={false}
      >
        <PopoverAnchor asChild>{trigger}</PopoverAnchor>
        <PopoverContent
          side="right"
          align="start"
          sideOffset={6}
          collisionPadding={8}
          aria-label={label}
          className={cn(
            "w-[min(20rem,calc(100vw-2rem))] overflow-hidden p-0",
            "max-h-[min(24rem,var(--radix-popover-content-available-height))]",
            "rounded-md border border-[#E5E5E5] bg-white shadow-md dark:border-border dark:bg-background"
          )}
          onOpenAutoFocus={(event) => event.preventDefault()}
          onCloseAutoFocus={(event) => event.preventDefault()}
          onInteractOutside={(event) => {
            if (isPortaledOverlayTarget(event.target)) {
              event.preventDefault()
            }
          }}
          onFocusOutside={(event) => {
            if (isPortaledOverlayTarget(event.target)) {
              event.preventDefault()
            }
          }}
        >
          <Command
            shouldFilter={false}
            className="max-h-[min(24rem,var(--radix-popover-content-available-height))]"
          >
            <CommandList className="max-h-[min(24rem,var(--radix-popover-content-available-height))] overflow-y-auto">
              {children}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    )
  }

  return (
    <div>
      {trigger}
      {expanded ? children : null}
    </div>
  )
}
