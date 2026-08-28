import { describe, expect, it } from "vitest"
import {
  WIDGET_TOOLBAR_PILL_CELL,
  WIDGET_TOOLBAR_PILL_ICON_CELL,
} from "./widget-toolbar-classes"

describe("widget toolbar pill classes", () => {
  it.each([
    ["cell", WIDGET_TOOLBAR_PILL_CELL],
    ["icon cell", WIDGET_TOOLBAR_PILL_ICON_CELL],
  ] as const)(
    "%s keeps a visible hover and readable dark-mode text",
    (_label, className) => {
      expect(className).toContain("hover:bg-[#FAFAFA]")
      expect(className).toContain("hover:text-[#171717]")
      expect(className).toContain("dark:text-foreground")
      expect(className).toContain("dark:hover:bg-muted/40")
      expect(className).toContain("dark:hover:text-foreground")
      expect(className).not.toContain("hover:bg-transparent")
    }
  )
})
