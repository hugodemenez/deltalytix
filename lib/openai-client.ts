import { openai as openaiProvider } from "@ai-sdk/openai"

/**
 * Get configured OpenAI client with custom base URL if specified
 * Uses OPENAI_BASE_URL environment variable, defaults to OpenAI API if not set
 * Model can be overridden with OPENAI_MODEL environment variable
 */
export function openai(model: string) {
  const baseURL = process.env.OPENAI_BASE_URL
  const overrideModel = process.env.OPENAI_MODEL

  // Use override model if specified, otherwise use the passed model
  const finalModel = overrideModel || model

  if (baseURL) {
    return openaiProvider(finalModel, {
      baseURL,
      apiKey: process.env.OPENAI_API_KEY,
    })
  }

  return openaiProvider(finalModel)
}
