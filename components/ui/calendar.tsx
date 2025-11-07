"use client"

import * as React from "react"
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from "lucide-react"
import { DayPicker } from "react-day-picker"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
        showOutsideDays={showOutsideDays}
        className={cn("p-3", className)}
        classNames={{
          months: "flex flex-col gap-4 sm:flex-row sm:gap-4",
          month: "space-y-4",
          month_caption: "relative flex items-center justify-center gap-1 pt-1",
          caption_label: "text-sm font-medium",
          nav: "flex items-center gap-1",
          button_previous: cn(
            buttonVariants({ variant: "outline" }),
            "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
          ),
          button_next: cn(
            buttonVariants({ variant: "outline" }),
            "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
          ),
          chevron: "h-4 w-4",
          month_grid: "w-full border-collapse",
          weekdays: "text-muted-foreground",
          weekday:
            "w-9 text-center text-[0.8rem] font-normal text-muted-foreground",
          weeks: "text-sm",
          week: "",
          day: cn(
            "relative h-9 w-9 overflow-hidden rounded-md p-0 text-center align-middle",
            "focus-within:z-20 focus-within:shadow-sm"
          ),
          day_button: cn(
            buttonVariants({ variant: "ghost" }),
            "h-9 w-9 p-0 font-normal",
            "aria-selected:bg-primary aria-selected:text-primary-foreground aria-selected:opacity-100",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          ),
          today: "bg-accent text-accent-foreground",
          outside: "text-muted-foreground opacity-50",
          disabled: "text-muted-foreground opacity-50",
          range_start: "rounded-l-md",
          range_end: "rounded-r-md",
          range_middle:
            "aria-selected:bg-accent aria-selected:text-accent-foreground",
          hidden: "hidden",
          ...classNames,
        }}
        components={{
          Chevron: ({ orientation, className, disabled }) => {
            const Icon =
              orientation === "up"
                ? ChevronUp
                : orientation === "down"
                  ? ChevronDown
                  : orientation === "right"
                    ? ChevronRight
                    : ChevronLeft
            return (
              <Icon
                className={cn(
                  "h-4 w-4",
                  disabled ? "opacity-40" : "",
                  className
                )}
                aria-hidden="true"
              />
            )
          },
        }}
        {...props}
      />
    )
}
Calendar.displayName = "Calendar"

export { Calendar }
