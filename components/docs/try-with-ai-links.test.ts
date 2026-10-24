import { describe, expect, it } from "vitest"
import {
  DOCS_ASSISTANTS,
  docsAssistantHref,
  docsAssistantPrompt,
} from "./try-with-ai-links"

const TEMPLATE =
  "Read the docs at {docsUrl} and the spec at {openApiUrl}. Ask me which endpoint I want to try first."

describe("docsAssistantPrompt", () => {
  it("builds docs and OpenAPI links from the current origin", () => {
    expect(
      docsAssistantPrompt(TEMPLATE, "https://beta.deltalytix.app"),
    ).toBe(
      "Read the docs at https://beta.deltalytix.app/docs and the spec at https://beta.deltalytix.app/openapi.json. Ask me which endpoint I want to try first.",
    )
  })

  it("drops a trailing slash so paths are not doubled", () => {
    expect(docsAssistantPrompt("{docsUrl}", "http://localhost:3000/")).toBe(
      "http://localhost:3000/docs",
    )
  })
})

describe("docsAssistantHref", () => {
  const prompt = "List my accounts"

  it("offers Claude, ChatGPT, and Grok", () => {
    expect(DOCS_ASSISTANTS).toEqual(["claude", "chatgpt", "grok"])
  })

  it("prefills Claude with q", () => {
    const href = docsAssistantHref("claude", prompt)
    const url = new URL(href)
    expect(url.origin + url.pathname).toBe("https://claude.ai/new")
    expect(url.searchParams.get("q")).toBe(prompt)
  })

  it("prefills ChatGPT with q", () => {
    const href = docsAssistantHref("chatgpt", prompt)
    const url = new URL(href)
    expect(url.origin + url.pathname).toBe("https://chatgpt.com/")
    expect(url.searchParams.get("q")).toBe(prompt)
  })

  it("prefills Grok with q", () => {
    const href = docsAssistantHref("grok", prompt)
    const url = new URL(href)
    expect(url.origin + url.pathname).toBe("https://grok.com/")
    expect(url.searchParams.get("q")).toBe(prompt)
  })
})
