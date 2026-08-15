import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

const root = process.cwd()

describe("Mindset journal editor loading", () => {
  it("does not statically import TipTap into the dashboard widget graph", () => {
    const journaling = readFileSync(
      resolve(root, "app/[locale]/dashboard/components/mindset/journaling.tsx"),
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

    expect(journaling).not.toMatch(/from ["']@\/components\/tiptap-editor["']/)
    expect(journaling).toMatch(/from ["']@\/components\/tiptap-editor-lazy["']/)
    expect(mindset).not.toMatch(/tiptap-editor/)
    expect(registry).toContain("mindsetWidget")
    expect(registry).toContain("chatWidget")
    expect(registry).toMatch(/mindset-widget-lazy/)
    expect(registry).toMatch(/chat-widget-lazy/)
    expect(registry).not.toMatch(/from ["']\.\.\/components\/mindset\/mindset-widget["']/)
    expect(registry).not.toMatch(/from ["']\.\.\/components\/chat\/chat["']/)
    expect(registry).not.toMatch(/unavailable on mobile|hide.*mindset|hide.*chat/i)
  })

  it("loads TipTap after hydration instead of next/dynamic PPR slots", () => {
    const lazy = readFileSync(
      resolve(root, "components/tiptap-editor-lazy.tsx"),
      "utf8",
    )
    const editor = readFileSync(
      resolve(root, "components/tiptap-editor.tsx"),
      "utf8",
    )
    expect(lazy).toMatch(/client-only-lazy/)
    expect(lazy).not.toMatch(/next\/dynamic/)
    expect(editor).not.toMatch(/from ["']yjs["']/)
    expect(editor).not.toMatch(/@tiptap\/extension-collaboration/)
  })
})
