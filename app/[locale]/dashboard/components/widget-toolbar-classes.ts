/** Neutralize ghost `hover:text-accent-foreground` (white in dark mode on a white pill). */
const PILL_INTERACTIVE =
  "text-[#171717] transition-colors hover:bg-[#FAFAFA] hover:text-[#171717] dark:text-foreground dark:hover:bg-muted/40 dark:hover:text-foreground"

export const WIDGET_TOOLBAR_PILL_CELL =
  `inline-flex h-8 items-center justify-center gap-1.5 rounded-[4px] px-2.5 text-sm font-medium ${PILL_INTERACTIVE}`

export const WIDGET_TOOLBAR_PILL_ICON_CELL =
  `inline-flex size-8 items-center justify-center rounded-[4px] ${PILL_INTERACTIVE}`
