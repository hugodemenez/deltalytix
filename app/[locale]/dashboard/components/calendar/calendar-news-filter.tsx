"use client"

import { Newspaper } from "lucide-react"
import { cn } from "@/lib/utils"
import { useI18n } from "@/locales/client"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ImportanceFilter } from "@/app/[locale]/dashboard/components/importance-filter"

type ImpactLevel = "low" | "medium" | "high"

/** Same chrome as navbar view / filter / account controls. */
const navbarTriggerClassName = cn(
  "inline-flex h-7 shrink-0 items-center justify-center gap-1 rounded-[4px]",
  "border border-[#E5E5E5] bg-white",
  "text-[13px] font-medium text-[#171717]",
  "transition-colors hover:bg-[#FAFAFA]",
  "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
  "data-[state=open]:bg-[#FAFAFA]",
  "dark:border-border dark:bg-background dark:text-foreground dark:hover:bg-muted/40 dark:data-[state=open]:bg-muted/40",
)

export function CalendarNewsFilter({
  value,
  onValueChange,
  className,
}: {
  value: ImpactLevel[]
  onValueChange: (levels: ImpactLevel[]) => void
  className?: string
}) {
  const t = useI18n()
  const label = t("calendar.importanceFilter.label")
  const accessibleName = t("calendar.importanceFilter.title")

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          data-slot="calendar-news-filter"
          className={cn(
            navbarTriggerClassName,
            "w-7 px-0 sm:w-auto sm:px-2",
            className,
          )}
          aria-label={accessibleName}
        >
          <Newspaper
            className="h-3.5 w-3.5"
            strokeWidth={1.75}
            aria-hidden="true"
          />
          <span className="hidden sm:inline">{label}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={6}
        className="rounded-[4px] border-[#E5E5E5] bg-white p-1 shadow-md dark:border-border dark:bg-background"
        onCloseAutoFocus={(event) => event.preventDefault()}
      >
        <div
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
        >
          <ImportanceFilter
            value={value}
            onValueChange={onValueChange}
            className="p-1"
          />
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
