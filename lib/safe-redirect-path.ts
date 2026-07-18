/**
 * Sanitize user-controlled redirect targets (e.g. `?next=`) so only same-app
 * relative paths are allowed. Rejects protocol-relative URLs, absolute URLs,
 * and backslash tricks that can escape the origin.
 */
export function safeRedirectPath(
  nextParam: string | null | undefined,
  fallback = "/dashboard",
): string {
  if (!nextParam) {
    return fallback
  }

  let nextPath = nextParam

  try {
    nextPath = decodeURIComponent(nextPath)
  } catch {
    return fallback
  }

  if (
    nextPath.startsWith("//") ||
    nextPath.startsWith("\\") ||
    nextPath.includes("://") ||
    nextPath.includes("\\")
  ) {
    return fallback
  }

  const normalizedPath = nextPath.startsWith("/") ? nextPath : `/${nextPath}`

  if (normalizedPath.startsWith("//")) {
    return fallback
  }

  return normalizedPath
}
