/** Production fallback when the browser origin is not available yet. */
export const DOCS_ASSISTANT_FALLBACK_ORIGIN = "https://www.deltalytix.app"

export const DOCS_ASSISTANTS = ["claude", "chatgpt", "grok"] as const

export type DocsAssistant = (typeof DOCS_ASSISTANTS)[number]

/**
 * Fill the locale prompt with this site's docs and OpenAPI URLs.
 * `{docsUrl}` and `{openApiUrl}` stay literal until an origin is known.
 */
export function docsAssistantPrompt(template: string, origin: string): string {
  const base = origin.replace(/\/$/, "")
  return template
    .replaceAll("{docsUrl}", `${base}/docs`)
    .replaceAll("{openApiUrl}", `${base}/openapi.json`)
}

/**
 * Prefill links. Each assistant reads `q`.
 * Claude: https://claude.ai/new?q=
 * ChatGPT: https://chatgpt.com/?q=
 * Grok: https://grok.com/?q=
 */
export function docsAssistantHref(
  assistant: DocsAssistant,
  prompt: string,
): string {
  switch (assistant) {
    case "claude": {
      const url = new URL("https://claude.ai/new")
      url.searchParams.set("q", prompt)
      return url.toString()
    }
    case "chatgpt": {
      const url = new URL("https://chatgpt.com/")
      url.searchParams.set("q", prompt)
      return url.toString()
    }
    case "grok": {
      const url = new URL("https://grok.com/")
      url.searchParams.set("q", prompt)
      return url.toString()
    }
  }
}
