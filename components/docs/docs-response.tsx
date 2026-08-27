import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

type DocsResponseTone = "success" | "error"

type DocsResponseProps = {
  tone: DocsResponseTone
  label: string
  children: ReactNode
}

const TONE_STYLES: Record<
  DocsResponseTone,
  { rail: string; label: string }
> = {
  success: {
    rail:
      "[&_[data-rehype-pretty-code-figure]]:border-l-[3px] [&_[data-rehype-pretty-code-figure]]:border-l-emerald-700 dark:[&_[data-rehype-pretty-code-figure]]:border-l-emerald-400",
    label: "text-emerald-800 dark:text-emerald-300",
  },
  error: {
    rail:
      "[&_[data-rehype-pretty-code-figure]]:border-l-[3px] [&_[data-rehype-pretty-code-figure]]:border-l-rose-700 dark:[&_[data-rehype-pretty-code-figure]]:border-l-rose-400",
    label: "text-rose-800 dark:text-rose-300",
  },
}

/**
 * Marks a JSON example as a success or error payload.
 * Color is a cue only: the label is the accessible identifier.
 */
export function DocsResponse({ tone, label, children }: DocsResponseProps) {
  const styles = TONE_STYLES[tone]

  return (
    <div
      data-docs-response={tone}
      className={cn(
        "my-6 [&_[data-rehype-pretty-code-figure]]:my-0",
        styles.rail,
      )}
    >
      <p
        className={cn(
          "not-prose mb-2 text-xs font-medium uppercase tracking-wide",
          styles.label,
        )}
      >
        {label}
      </p>
      {children}
    </div>
  )
}
