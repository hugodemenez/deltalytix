import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

const root = process.cwd()

describe("Mindset journal editor", () => {
  it("uses the lightweight journal editor instead of TipTap", () => {
    const journaling = readFileSync(
      resolve(root, "app/[locale]/dashboard/components/mindset/journaling.tsx"),
      "utf8",
    )
    const dailyComment = readFileSync(
      resolve(root, "app/[locale]/dashboard/components/calendar/daily-comment.tsx"),
      "utf8",
    )
    const mindset = readFileSync(
      resolve(root, "app/[locale]/dashboard/components/mindset/mindset-widget.tsx"),
      "utf8",
    )
    const registry = readFileSync(
      resolve(root, "app/[locale]/dashboard/config/widget-registry.tsx"),
      "utf8",
    )
    const packageJson = readFileSync(resolve(root, "package.json"), "utf8")

    expect(journaling).toMatch(/from ["']@\/components\/journal-editor["']/)
    expect(journaling).not.toMatch(/tiptap/i)
    expect(dailyComment).toMatch(/from ["']@\/components\/journal-editor["']/)
    expect(dailyComment).not.toMatch(/tiptap/i)
    expect(mindset).not.toMatch(/tiptap/i)
    expect(mindset).not.toMatch(/Carousel|embla|useEmblaCarousel/)
    expect(registry).toContain("mindsetWidget")
    expect(registry).toContain("chatWidget")
    expect(registry).toMatch(/<CreateMindsetPreview\s*\/>/)
    expect(registry).not.toMatch(/createMindsetPreview\s*\(/)
    expect(registry).not.toMatch(/unavailable on mobile|hide.*mindset|hide.*chat/i)
    expect(packageJson).not.toMatch(/@tiptap|tiptap-extension|["']yjs["']/)
  })
})
