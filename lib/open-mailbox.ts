export type Platform = "ios" | "android" | "macos" | "desktop"

export type MailboxTarget = {
  primary: string
  fallback?: string
  openInNewTab?: boolean
}

export type MailboxOpenResult = "opened" | "manual-check"

function getEmailDomain(email: string): string | undefined {
  return email.split("@")[1]?.toLowerCase().trim()
}

export function detectPlatform(
  userAgent: string,
  platform: string,
  maxTouchPoints: number,
  touchSupport = false,
  uaPlatform?: string,
): Platform {
  const isIOS =
    uaPlatform === "iOS" ||
    /iPad|iPhone|iPod/.test(userAgent) ||
    platform === "iPhone" ||
    platform === "iPad" ||
    platform === "iPod" ||
    (platform === "MacIntel" && maxTouchPoints > 1) ||
    (touchSupport && /Macintosh/.test(userAgent) && maxTouchPoints > 1)

  if (isIOS) return "ios"

  if (uaPlatform === "Android" || /Android/i.test(userAgent)) return "android"

  if (/Mac/.test(platform)) return "macos"

  return "desktop"
}

function resolveIOSMailboxTarget(domain: string): MailboxTarget {
  if (domain === "gmail.com" || domain === "googlemail.com") {
    return { primary: "googlegmail://", fallback: "message://" }
  }

  if (
    domain.endsWith("outlook.com") ||
    domain.endsWith("hotmail.com") ||
    domain.endsWith("live.com") ||
    domain.endsWith("msn.com") ||
    domain.endsWith("office365.com") ||
    domain.endsWith("outlook.fr") ||
    domain.endsWith("outlook.de")
  ) {
    return { primary: "ms-outlook://", fallback: "message://" }
  }

  if (
    domain.endsWith("proton.me") ||
    domain.endsWith("protonmail.com") ||
    domain.endsWith("pm.me")
  ) {
    return { primary: "protonmail://", fallback: "message://" }
  }

  if (domain.endsWith("yahoo.com") || domain.endsWith("yahoo.fr")) {
    return { primary: "ymail://mail/", fallback: "message://" }
  }

  return { primary: "message://" }
}

export function resolveMailboxTarget(
  email: string,
  platform: Platform,
): MailboxTarget | null {
  const domain = getEmailDomain(email)
  if (!domain) return null

  if (platform === "ios") {
    return resolveIOSMailboxTarget(domain)
  }

  const isMobileNative = platform === "android"
  const opensNativeMail = platform === "macos"

  if (domain === "gmail.com" || domain === "googlemail.com") {
    if (isMobileNative) {
      return {
        primary: "googlegmail://",
        fallback: "https://mail.google.com/mail/u/0/#inbox",
        openInNewTab: true,
      }
    }
    return {
      primary: "https://mail.google.com/mail/u/0/#inbox",
      openInNewTab: true,
    }
  }

  if (
    domain.endsWith("outlook.com") ||
    domain.endsWith("hotmail.com") ||
    domain.endsWith("live.com") ||
    domain.endsWith("msn.com") ||
    domain.endsWith("office365.com") ||
    domain.endsWith("outlook.fr") ||
    domain.endsWith("outlook.de")
  ) {
    if (isMobileNative) {
      return {
        primary: "ms-outlook://",
        fallback: "https://outlook.live.com/mail/0/inbox",
        openInNewTab: true,
      }
    }
    return {
      primary: "https://outlook.live.com/mail/0/inbox",
      openInNewTab: true,
    }
  }

  if (
    domain.endsWith("proton.me") ||
    domain.endsWith("protonmail.com") ||
    domain.endsWith("pm.me")
  ) {
    return {
      primary: "https://mail.proton.me/inbox",
      openInNewTab: true,
    }
  }

  if (
    domain.endsWith("icloud.com") ||
    domain.endsWith("me.com") ||
    domain.endsWith("mac.com")
  ) {
    if (opensNativeMail) {
      return { primary: "message://" }
    }
    return {
      primary: "https://www.icloud.com/mail",
      openInNewTab: true,
    }
  }

  if (domain.endsWith("yahoo.com") || domain.endsWith("yahoo.fr")) {
    if (isMobileNative) {
      return {
        primary: "ymail://mail/",
        fallback: "https://mail.yahoo.com/",
        openInNewTab: true,
      }
    }
    return {
      primary: "https://mail.yahoo.com/",
      openInNewTab: true,
    }
  }

  if (domain.endsWith("aol.com")) {
    return {
      primary: "https://mail.aol.com/",
      openInNewTab: true,
    }
  }

  if (domain.includes("zoho.com")) {
    return {
      primary: "https://mail.zoho.com/",
      openInNewTab: true,
    }
  }

  if (platform === "macos") {
    return { primary: "message://" }
  }

  if (platform === "android") {
    return {
      primary:
        "intent:#Intent;action=android.intent.action.MAIN;category=android.intent.category.APP_EMAIL;end",
    }
  }

  return null
}

function openUrl(url: string, newTab: boolean) {
  if (newTab) {
    window.open(url, "_blank", "noopener,noreferrer")
    return
  }

  window.location.assign(url)
}

function openWithFallback(
  primary: string,
  fallback: string,
  webFallbackInNewTab: boolean,
) {
  let leftPage = false
  const markLeft = () => {
    leftPage = true
  }

  window.addEventListener("pagehide", markLeft, { once: true })
  window.addEventListener("blur", markLeft, { once: true })

  const onVisibilityChange = () => {
    if (document.visibilityState === "hidden") {
      markLeft()
    }
  }

  document.addEventListener("visibilitychange", onVisibilityChange)
  window.location.assign(primary)

  window.setTimeout(() => {
    document.removeEventListener("visibilitychange", onVisibilityChange)
    if (!leftPage) {
      openUrl(fallback, webFallbackInNewTab)
    }
  }, 1200)
}

export function openMailbox(email: string): MailboxOpenResult {
  if (typeof window === "undefined") return "manual-check"

  const navigatorWithHints = navigator as Navigator & {
    userAgentData?: { platform?: string }
  }

  const platform = detectPlatform(
    navigator.userAgent,
    navigator.platform,
    navigator.maxTouchPoints,
    "ontouchend" in document,
    navigatorWithHints.userAgentData?.platform,
  )
  const target = resolveMailboxTarget(email, platform)

  if (!target) return "manual-check"

  if (target.fallback) {
    openWithFallback(
      target.primary,
      target.fallback,
      Boolean(target.openInNewTab),
    )
    return "opened"
  }

  openUrl(target.primary, Boolean(target.openInNewTab))
  return "opened"
}
