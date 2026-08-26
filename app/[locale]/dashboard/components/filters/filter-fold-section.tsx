"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover"
import { useI18n } from "@/locales/client"
import { cn } from "@/lib/utils"

const HOVER_OPEN_DELAY_MS = 80

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
  onHoverOpen,
  children,
  placement = "inline",
}: {
  label: string
  expanded: boolean
  onToggle: () => void
  onHoverOpen?: () => void
  children: ReactNode
  placement?: "inline" | "submenu"
}) {
  const t = useI18n()
  const [query, setQuery] = useState("")
  const hoverOpenTimeoutRef = useRef<number | null>(null)

  const clearHoverOpen = () => {
    if (hoverOpenTimeoutRef.current !== null) {
      window.clearTimeout(hoverOpenTimeoutRef.current)
      hoverOpenTimeoutRef.current = null
    }
  }

  const scheduleHoverOpen = () => {
    if (placement !== "submenu" || !onHoverOpen || expanded) return
    clearHoverOpen()
    hoverOpenTimeoutRef.current = window.setTimeout(() => {
      hoverOpenTimeoutRef.current = null
      onHoverOpen()
    }, HOVER_OPEN_DELAY_MS)
  }

  useEffect(() => () => clearHoverOpen(), [])

  useEffect(() => {
    if (!expanded) setQuery("")
  }, [expanded])

  const trigger = (
    <button
      type="button"
      className={cn(
        "flex w-full items-center justify-between rounded-[4px] px-2 py-1.5 text-sm text-[#171717] focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:text-foreground",
        "hover:bg-accent",
        expanded && "bg-accent"
      )}
      onClick={onToggle}
      onPointerEnter={scheduleHoverOpen}
      onPointerLeave={clearHoverOpen}
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
            "flex w-[min(20rem,calc(100vw-2rem))] flex-col overflow-hidden p-0",
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
          <Command className="flex max-h-full min-h-0 flex-1 flex-col overflow-hidden rounded-none border-0 bg-transparent">
            <div className="shrink-0 border-b">
              <CommandInput
                value={query}
                onValueChange={setQuery}
                placeholder={t("filters.search")}
                aria-label={t("filters.search")}
                className="h-9"
              />
            </div>
            <CommandList className="min-h-0 flex-1 overflow-y-auto overscroll-contain max-h-[min(20.5rem,calc(var(--radix-popover-content-available-height)-3.25rem))]">
              <CommandEmpty>{t("filters.noResults")}</CommandEmpty>
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
