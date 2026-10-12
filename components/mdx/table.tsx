import type { HTMLAttributes, TableHTMLAttributes } from "react"
import { cn } from "@/lib/utils"

type WithoutRef<T> = Omit<T, "ref">

/**
 * Scrollable MDX table shell: contains wide tables on small screens and keeps
 * the header row sticky while the table body scrolls.
 */
export function MdxTable({
  className,
  ...props
}: WithoutRef<TableHTMLAttributes<HTMLTableElement>>) {
  return (
    <div
      className={cn(
        "mdx-table-scroll my-6 max-w-full overflow-auto overscroll-x-contain",
        "max-h-[min(60vh,28rem)] rounded-sm border border-neutral-200 dark:border-neutral-800",
        "[-webkit-overflow-scrolling:touch]",
      )}
    >
      <table
        className={cn(
          "w-max min-w-full border-collapse text-left text-sm",
          className,
        )}
        {...props}
      />
    </div>
  )
}

export function MdxThead({
  className,
  ...props
}: WithoutRef<HTMLAttributes<HTMLTableSectionElement>>) {
  return (
    <thead
      className={cn(
        "border-b border-neutral-200 dark:border-neutral-800",
        className,
      )}
      {...props}
    />
  )
}

export function MdxTh({
  className,
  ...props
}: WithoutRef<HTMLAttributes<HTMLTableCellElement>>) {
  return (
    <th
      className={cn(
        "sticky top-0 z-10 whitespace-nowrap border-b border-neutral-200 bg-[oklch(0.97_0_0)] px-3 py-2.5 text-left text-xs font-semibold tracking-tight text-neutral-900 sm:px-4 sm:py-3 sm:text-sm dark:border-neutral-800 dark:bg-[oklch(0.17_0_0)] dark:text-neutral-100",
        className,
      )}
      {...props}
    />
  )
}

export function MdxTd({
  className,
  ...props
}: WithoutRef<HTMLAttributes<HTMLTableCellElement>>) {
  return (
    <td
      className={cn(
        "border-b border-neutral-200 px-3 py-2.5 align-top text-sm text-neutral-700 sm:px-4 sm:py-3 dark:border-neutral-800 dark:text-neutral-300",
        className,
      )}
      {...props}
    />
  )
}

export function MdxTr({
  className,
  ...props
}: WithoutRef<HTMLAttributes<HTMLTableRowElement>>) {
  return (
    <tr
      className={cn(
        "m-0 p-0 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-900/30",
        className,
      )}
      {...props}
    />
  )
}

/** Components map for next-mdx-remote / compileMDX. */
export const mdxTableComponents = {
  table: MdxTable,
  thead: MdxThead,
  th: MdxTh,
  td: MdxTd,
  tr: MdxTr,
}
