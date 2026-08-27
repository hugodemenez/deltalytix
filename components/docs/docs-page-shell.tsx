import type { ReactNode } from "react"
import { LANDING_SECTION_CONTAINER_CLASSNAME } from "@/app/[locale]/(landing)/components/landing-section-container"
import {
  DocsSectionNav,
  type DocsNavItem,
} from "@/components/docs/docs-section-nav"

type DocsPageShellProps = {
  navItems: DocsNavItem[]
  navLabel: string
  jumpLabel: string
  closeLabel: string
  children: ReactNode
}

/**
 * Single-page docs layout: sticky left section nav + main content column.
 */
export function DocsPageShell({
  navItems,
  navLabel,
  jumpLabel,
  closeLabel,
  children,
}: DocsPageShellProps) {
  return (
    <div
      className={`${LANDING_SECTION_CONTAINER_CLASSNAME} w-full pb-16 sm:pb-20 lg:pt-10`}
    >
      <div className="flex flex-col gap-0 lg:flex-row lg:gap-12 xl:gap-16">
        <DocsSectionNav
          items={navItems}
          label={navLabel}
          jumpLabel={jumpLabel}
          closeLabel={closeLabel}
        />
        <div className="min-w-0 flex-1 pt-8 lg:pt-0">{children}</div>
      </div>
    </div>
  )
}
