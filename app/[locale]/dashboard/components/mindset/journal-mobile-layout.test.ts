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
    const compactNews = readFileSync(
      resolve(
        root,
        "app/[locale]/dashboard/components/mindset/journal-mobile-news.tsx",
      ),
      "utf8",
    )
    const summary = readFileSync(
      resolve(
        root,
        "app/[locale]/dashboard/components/mindset/mindset-summary.tsx",
      ),
      "utf8",
    )
    const timeline = readFileSync(
      resolve(
        root,
        "app/[locale]/dashboard/components/mindset/hourly-financial-timeline.tsx",
      ),
      "utf8",
    )

    expect(compact).toContain("639")
    expect(widget).toContain("COMPACT_JOURNAL_MEDIA_QUERY")
    expect(widget).toContain("JournalingMobile")
    expect(widget).toContain("<Journaling")
    expect(widget).toContain("<Timeline")
    const compactBranch = widget.slice(
      widget.indexOf("if (isCompact)"),
      widget.lastIndexOf("return ("),
    )
    expect(compactBranch).toContain("JournalingMobile")
    expect(compactBranch).not.toContain("MindsetSummary")
    expect(compactBranch).not.toContain('pane === "summary"')
    expect(widget).toContain("<MindsetSummary")
    expect(summary).toContain("MMMM d, yyyy")
    expect(summary).toContain("mindset.emotion.title")
    expect(summary).toContain("mindset.journaling.title")
    expect(summary).toContain("<Pencil")
    expect(timeline).toContain("EEE d MMM yyyy")
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
    expect(mobile).toContain("commitVisible={isWriting}")
    expect(mobile).toContain("onCommit")
    expect(mobile).not.toContain("JournalMobileSaveBar")
    expect(mobile).not.toContain("pb-28")
    expect(mobile).not.toContain("onCancel")
    expect(mobile).not.toContain("mindset.cancel")
    expect(mobile).not.toContain("mindset.journaling.save")
    expect(mobile).toContain("mindset.journaling.dayPlaceholder")
    expect(mobile).toContain("text-base")
    expect(mobile).not.toContain("text-[15px]")
    expect(mobile).toContain("JournalMobileNews")
    expect(mobile).not.toContain("mindset.emotion.title")
    expect(mobile).not.toContain("mindset.journaling.title")
    expect(mobile).not.toContain("Pencil")
    expect(mobile).not.toContain("MMMM d, yyyy")
    expect(mobile).not.toContain("EEE d MMM yyyy")
    expect(compactNews).toContain("mindset.newsImpact.title")
    expect(compactNews).toContain("mindset.newsImpact.showOnlySelectedNews")
    expect(compactNews.indexOf("mindset.newsImpact.title")).toBeLessThan(
      compactNews.indexOf("mindset.newsImpact.showOnlySelectedNews"),
    )
    expect(compactNews.indexOf("rounded-[10px] border border-border")).toBeLessThan(
      compactNews.indexOf("mindset.newsImpact.showOnlySelectedNews"),
    )
    expect(compactNews).toContain("overflow-y-auto")
    expect(compactNews).toContain("overscroll-y-contain")
    expect(compactNews).toContain("data-journal-news-scroll")
    expect(compactNews.indexOf("data-journal-news-scroll")).toBeLessThan(
      compactNews.indexOf("mindset.newsImpact.showOnlySelectedNews"),
    )
    expect(compactNews).toContain("flex min-h-0 flex-1 flex-col")
    expect(compactNews).toContain("flex-none items-start gap-2")
    expect(compactNews).toContain("flex-none text-sm text-muted-foreground")
    expect(compactNews).toContain("min-h-0 flex-1 overflow-y-auto")
    expect(compactBranch).toContain("overflow-hidden")
    expect(compactBranch).not.toContain("overflow-y-auto")
    expect(compactBranch).toContain("h-full min-h-0 w-full flex-col overflow-hidden")
    expect(compactBranch).toContain("flex-none")
    expect(mobile).toContain("flex min-h-0 flex-1 flex-col")
    expect(mobile).toContain("mt-3 flex-none")
    expect(mobile).toContain("mt-3.5 flex-none")
    expect(compactNews).not.toContain("Pencil")
    expect(compactNews).not.toContain("MMMM d, yyyy")
    expect(compactNews).not.toContain("EEE d MMM yyyy")
    expect(compactNews).not.toContain("formattedDate")
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
    expect(slider).toContain("bg-muted")
    expect(slider).toContain("text-muted-foreground")
    expect(slider).not.toContain("bg-[#111]")
    expect(slider).not.toContain("bg-[#2a2a2a]")
    expect(mobile).toContain('surfaceClassName="p-3 text-base leading-normal"')
    expect(editor).toContain(
      "flex-none rounded-[10px] border border-border bg-muted text-foreground",
    )
    expect(editor).toContain(
      'commitVisible ? "min-h-[220px]" : "min-h-[4.75rem]"',
    )
    expect(editor).toContain("text-base leading-normal")
    expect(editor).not.toContain("bg-[#141414]")
    expect(editor).not.toContain("text-[#e5e5e5]")
    expect(toolbar).toContain("border-border")
    expect(toolbar).not.toContain("border-[#222]")
  })

  it("uses an in-editor check to save and leaves desktop Enregistrer alone", () => {
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
    const journaling = readFileSync(
      resolve(root, "app/[locale]/dashboard/components/mindset/journaling.tsx"),
      "utf8",
    )

    expect(editor).toContain('from "lucide-react"')
    expect(editor).toContain("<Check")
    expect(editor).toContain(
      "absolute bottom-[9px] right-[9px] z-10 h-8 w-8 rounded-full bg-primary text-primary-foreground",
    )
    expect(editor).toContain("commitVisible && \"pb-11\"")
    expect(mobile).toContain("commitVisible={isWriting}")
    expect(mobile).not.toContain("Annuler")
    expect(mobile).not.toContain("Enregistrer")
    expect(journaling).toContain("mindset.journaling.save")
  })
})
