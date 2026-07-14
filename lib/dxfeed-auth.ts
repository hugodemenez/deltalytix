const LEGACY_AUTH_PATH = '/api/auth/token'
const V2_AUTH_PATH = '/api/v2/auth/token'

/** Resolve the configured Volumetrica auth endpoint to the documented v2 API. */
export function resolveDxFeedV2AuthUrl(configuredUrl?: string | null): string | null {
  if (!configuredUrl) return null

  try {
    const url = new URL(configuredUrl)
    const pathname = url.pathname.replace(/\/$/, '')
    if (pathname !== LEGACY_AUTH_PATH && pathname !== V2_AUTH_PATH) {
      return null
    }

    url.pathname = V2_AUTH_PATH
    url.search = ''
    url.hash = ''
    return url.toString()
  } catch {
    return null
  }
}
