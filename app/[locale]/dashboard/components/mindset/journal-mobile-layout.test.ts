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
