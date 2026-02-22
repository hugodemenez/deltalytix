import { openai as openaiProvider } from "@ai-sdk/openai"

/**
 * Get configured OpenAI client with custom base URL if specified
 * Uses OPENAI_BASE_URL environment variable, defaults to OpenAI API if not set
 */
export function openai(model: string) {
  const baseURL = process.env.OPENAI_BASE_URL

  if (baseURL) {
    return openaiProvider(model, {
      baseURL,
      apiKey: process.env.OPENAI_API_KEY,
    })
  }

  return openaiProvider(model)
}
