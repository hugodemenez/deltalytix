"use client"

import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

export function FilterFoldSection({
  label,
  expanded,
  onToggle,
  children,
}: {
  label: string
  expanded: boolean
  onToggle: () => void
  children: ReactNode
}) {
  return (
    <div>
      <button
        type="button"
        className={cn(
          "flex w-full items-center justify-between rounded-[4px] px-2 py-1.5 text-sm text-[#171717] focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:text-foreground"
        )}
        onClick={onToggle}
        aria-expanded={expanded}
      >
        <span>{label}</span>
        <span aria-hidden className="text-[#A3A3A3]">
          ›
        </span>
      </button>
      {expanded ? children : null}
    </div>
  )
}
