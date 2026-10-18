import { afterEach, describe, expect, it, vi } from "vitest"
import { copyText } from "./connections-ui"

afterEach(() => {
  vi.unstubAllGlobals()
})

function stubDocument(execResult: boolean | Error) {
  const selection = { removeAllRanges: vi.fn(), addRange: vi.fn() }
  vi.stubGlobal("window", { getSelection: () => selection })
  vi.stubGlobal("document", {
    createRange: () => ({ selectNodeContents: vi.fn() }),
    execCommand: vi.fn(() => {
      if (execResult instanceof Error) throw execResult
      return execResult
    }),
  })
  return selection
}

describe("copyText", () => {
  it("awaits navigator.clipboard.writeText", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal("navigator", { clipboard: { writeText } })
    await expect(copyText("dltx_abc", null)).resolves.toBe(true)
    expect(writeText).toHaveBeenCalledWith("dltx_abc")
  })

  it("falls back to selection + execCommand when writeText rejects (iOS Safari)", async () => {
    vi.stubGlobal("navigator", {
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error("NotAllowedError")) },
    })
    const selection = stubDocument(true)
    await expect(copyText("dltx_abc", {} as HTMLElement)).resolves.toBe(true)
    expect(selection.addRange).toHaveBeenCalled()
  })

  it("reports failure and leaves the text selected when every path fails", async () => {
    vi.stubGlobal("navigator", {})
    const selection = stubDocument(new Error("unsupported"))
    await expect(copyText("dltx_abc", {} as HTMLElement)).resolves.toBe(false)
    expect(selection.addRange).toHaveBeenCalled()
  })
})
