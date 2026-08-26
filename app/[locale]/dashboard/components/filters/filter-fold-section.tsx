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
  onClear,
  activeCount = 0,
  children,
  placement = "inline",
}: {
  label: string
  expanded: boolean
  onToggle: () => void
  onHoverOpen?: () => void
  onClear?: () => void
  activeCount?: number
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
    <div
      className={cn(
        "flex w-full items-center rounded-[4px]",
        "hover:bg-accent",
        expanded && "bg-accent"
      )}
    >
      <button
        type="button"
        className={cn(
          "flex min-w-0 flex-1 items-center gap-2 px-2 py-1.5 text-left text-sm text-[#171717] focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:text-foreground"
        )}
        onClick={onToggle}
        onPointerEnter={scheduleHoverOpen}
        onPointerLeave={clearHoverOpen}
        aria-expanded={expanded}
        aria-haspopup={placement === "submenu" ? "dialog" : undefined}
      >
        <span className="truncate">{label}</span>
        {activeCount > 0 ? (
          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#171717] px-1.5 text-[10px] font-semibold tabular-nums text-white dark:bg-foreground dark:text-background">
            {activeCount}
          </span>
        ) : null}
      </button>
      {activeCount > 0 && onClear ? (
        <button
          type="button"
          className="shrink-0 rounded-[4px] px-1.5 py-1 text-xs text-[#737373] hover:bg-white hover:text-[#171717] focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:text-muted-foreground dark:hover:bg-background dark:hover:text-foreground"
          aria-label={t("filters.commandMenu.clearSection", { section: label })}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation()
            event.preventDefault()
            onClear()
          }}
        >
          {t("common.clear")}
        </button>
      ) : null}
      <span aria-hidden className="pr-2 text-[#A3A3A3]">
        ›
      </span>
    </div>
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
