import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

const root = process.cwd()

describe("calmer mobile journal layout", () => {
  it("keeps the compact redesign under 640px and leaves desktop journaling intact", () => {
    const widget = readFileSync(
      resolve(root, "app/[locale]/dashboard/components/mindset/mindset-widget.tsx"),
      "utf8",
    )
    const journaling = readFileSync(
      resolve(root, "app/[locale]/dashboard/components/mindset/journaling.tsx"),
      "utf8",
    )
    const compact = readFileSync(
      resolve(root, "lib/journal/compact-journal.ts"),
      "utf8",
    )
    const slider = readFileSync(
      resolve(
        root,
        "app/[locale]/dashboard/components/mindset/journal-mood-slider.tsx",
      ),
      "utf8",
    )
    const mobile = readFileSync(
      resolve(
        root,
        "app/[locale]/dashboard/components/mindset/journaling-mobile.tsx",
      ),
      "utf8",
    )

    expect(compact).toContain("639")
    expect(widget).toContain("COMPACT_JOURNAL_MEDIA_QUERY")
    expect(widget).toContain("JournalingMobile")
    expect(widget).toContain("<Journaling")
    expect(widget).toContain("<Timeline")
    expect(journaling).toContain("EmotionSelector")
    expect(journaling).toContain("mindset.journaling.save")
    expect(journaling).toContain("mindset.journaling.placeholder")
    expect(slider).toMatch(/min=\{1\}/)
    expect(slider).toMatch(/max=\{5\}/)
    expect(slider).toMatch(/step=\{1\}/)
    expect(slider).not.toMatch(/Sheet|Drawer|Vaul/)
    expect(mobile).not.toMatch(/Sheet|Drawer|Vaul/)
    expect(mobile).toContain("showToolbar={isWriting}")
    expect(mobile).toContain("toolbarVariant=\"compact\"")
    expect(mobile).toContain("JournalMobileSaveBar")
    expect(mobile).toContain("mindset.journaling.dayPlaceholder")
    expect(mobile).toContain("text-base")
    expect(mobile).not.toContain("text-[15px]")
    expect(journaling).not.toContain("toolbarVariant")
    expect(journaling).not.toContain("surfaceClassName")

    const header = readFileSync(
      resolve(
        root,
        "app/[locale]/dashboard/components/mindset/journal-mobile-header.tsx",
      ),
      "utf8",
    )
    expect(header).toContain("mindset.panes.journal")
    expect(header).toContain("mindset.panes.summary")
    expect(header).not.toContain("mindset.journaling.title")
    expect(header).toContain("Popover")
    expect(header).toContain("Calendar")
    expect(header).toContain("weekStartsOn={1}")
    expect(header).toContain('align="start"')
    expect(header).toContain("onDateChange")
    expect(header).not.toContain("onPreviousDay")
    expect(header).not.toContain("onNextDay")
    expect(header).not.toContain("mindset.previousDay")
    expect(header).not.toContain("ChevronLeft")
    expect(header).toContain("flex items-center gap-2 whitespace-nowrap")
    expect(header).toContain("h-8 shrink-0 gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium")
    expect(header).toContain("mindset.header.noTrades")
    expect(header).toContain(
      "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium tabular-nums whitespace-nowrap",
    )
    expect(header).toContain(
      "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400",
    )
    expect(header).toContain(
      "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400",
    )
    expect(header).toContain("border bg-muted text-muted-foreground")
    expect(header).toContain("hidden font-normal opacity-70 min-[360px]:inline")
    expect(header).toContain("min-w-60")
    expect(header).toContain("JournalExportMenuItems")
    expect(header).toContain("modifiers={{ green, red, flat }}")
    expect(header).toContain("modifiersClassNames={{")
    expect(header).toContain(
      "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
    )
    expect(header).toContain(
      "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
    )
    expect(header).toContain(
      "bg-muted text-muted-foreground ring-1 ring-inset ring-border",
    )
    expect(header).toContain(
      "aria-selected:bg-primary aria-selected:text-primary-foreground",
    )
    expect(header).not.toContain("JournalCalendarDayButton")
    expect(header).not.toContain("CalendarDayButton")
    expect(header).not.toContain("Gain")
    expect(header).not.toContain("Perte")
    expect(header).not.toContain("Neutre")
    expect(header).not.toContain("€")
  })

  it("reserves mood-tip space and keeps the tip over the thumb", () => {
    const slider = readFileSync(
      resolve(
        root,
        "app/[locale]/dashboard/components/mindset/journal-mood-slider.tsx",
      ),
      "utf8",
    )

    expect(slider).toContain("px-3 pb-2.5 pt-7")
    expect(slider).not.toContain('isDragging && "pt-7"')
    expect(slider).toContain(
      "pointer-events-none absolute bottom-full left-1/2 mb-1 -translate-x-1/2",
    )
    expect(slider).toContain("min-w-[44px] text-right text-xs text-muted-foreground")
  })

  it("uses export menu A on compact and desktop download menus", () => {
    const widget = readFileSync(
      resolve(root, "app/[locale]/dashboard/components/mindset/mindset-widget.tsx"),
      "utf8",
    )
    const exportItems = readFileSync(
      resolve(
        root,
        "app/[locale]/dashboard/components/mindset/journal-export-menu-items.tsx",
      ),
      "utf8",
    )

    expect(widget).toContain("JournalExportMenuItems")
    expect(widget).toContain('className="min-w-60"')
    expect(widget).toContain('aria-hidden className="mx-1 h-4 w-px bg-border"')
    expect(widget).not.toContain("ml-auto text-xs")
    expect(exportItems).toContain("FileText")
    expect(exportItems).toContain("FileType")
    expect(exportItems).toContain("items-start gap-3 py-2.5")
    expect(exportItems).toContain("flex flex-col")
    expect(exportItems).toContain("whitespace-nowrap font-medium")
    expect(exportItems).toContain("mt-0.5 text-xs text-muted-foreground")
    expect(exportItems).toContain("mindset.exportAllDocxDescription")
    expect(exportItems).not.toContain("ml-auto")
    expect(exportItems.match(/<DropdownMenuItem/g)?.length).toBe(2)
  })

  it("themes compact journal surfaces and keeps the editor at 16px", () => {
    const slider = readFileSync(
      resolve(
        root,
        "app/[locale]/dashboard/components/mindset/journal-mood-slider.tsx",
      ),
      "utf8",
    )
    const mobile = readFileSync(
      resolve(
        root,
        "app/[locale]/dashboard/components/mindset/journaling-mobile.tsx",
      ),
      "utf8",
    )
    const editor = readFileSync(
      resolve(root, "components/journal-editor/journal-editor.tsx"),
      "utf8",
    )
    const toolbar = readFileSync(
      resolve(root, "components/journal-editor/toolbar.tsx"),
      "utf8",
    )
    const saveBar = readFileSync(
      resolve(
        root,
        "app/[locale]/dashboard/components/mindset/journal-mobile-save-bar.tsx",
      ),
      "utf8",
    )

    expect(slider).toContain("bg-muted")
    expect(slider).toContain("text-muted-foreground")
    expect(slider).not.toContain("bg-[#111]")
    expect(slider).not.toContain("bg-[#2a2a2a]")
    expect(mobile).toContain('surfaceClassName="p-3 text-base leading-normal"')
    expect(editor).toContain(
      "min-h-[220px] rounded-[10px] border border-border bg-muted text-foreground",
    )
    expect(editor).toContain("text-base leading-normal")
    expect(editor).not.toContain("bg-[#141414]")
    expect(editor).not.toContain("text-[#e5e5e5]")
    expect(toolbar).toContain("border-border")
    expect(toolbar).not.toContain("border-[#222]")
    expect(saveBar).not.toContain("border-[#2a2a2a]")
    expect(saveBar).not.toContain("text-[#bdbdbd]")
  })
})
