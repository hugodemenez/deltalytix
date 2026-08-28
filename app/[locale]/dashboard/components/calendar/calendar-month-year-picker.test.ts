import { describe, expect, it } from "vitest"
import { nativeCalendarSelectOverlayClassName } from "./calendar-month-year-picker"

describe("nativeCalendarSelectOverlayClassName", () => {
  it("strips native select chrome so Edge dark mode cannot cover the label", () => {
    expect(nativeCalendarSelectOverlayClassName).toContain("appearance-none")
    expect(nativeCalendarSelectOverlayClassName).toContain("bg-transparent")
    expect(nativeCalendarSelectOverlayClassName).toContain("hover:opacity-0!")
    expect(nativeCalendarSelectOverlayClassName).toContain("hover:bg-transparent!")
    expect(nativeCalendarSelectOverlayClassName).toContain("[&_option]:text-[#171717]")
    expect(nativeCalendarSelectOverlayClassName).not.toContain("text-transparent")
    expect(nativeCalendarSelectOverlayClassName).not.toContain("[color-scheme:only_light]")
  })
})
