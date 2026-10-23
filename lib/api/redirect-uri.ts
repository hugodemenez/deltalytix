const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"])

/**
 * Registered redirect URIs receive authorization codes, so they must be
 * absolute https URLs (plain http only on loopback, RFC 8252 §7.3), with no
 * fragment (RFC 6749 §3.1.2) and no embedded credentials. Anything else, such
 * as `javascript:` or `data:`, would turn the consent redirect into a script
 * sink or leak codes over cleartext.
 */
export function redirectUriProblem(value: string): string | null {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return "is not an absolute URL"
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return "must use https"
  }
  if (url.protocol === "http:" && !LOOPBACK_HOSTS.has(url.hostname)) {
    return "must use https unless it points to localhost"
  }
  if (url.hash || value.includes("#")) {
    return "must not contain a fragment"
  }
  if (url.username || url.password) {
    return "must not contain credentials"
  }
  return null
}
