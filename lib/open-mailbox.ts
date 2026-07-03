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
): Platform {
  const isIOS =
    /iPad|iPhone|iPod/.test(userAgent) ||
    (platform === "MacIntel" && maxTouchPoints > 1)

  if (isIOS) return "ios"
  if (/Android/i.test(userAgent)) return "android"
  if (/Mac/.test(platform)) return "macos"
  return "desktop"
}

export function resolveMailboxTarget(
  email: string,
  platform: Platform,
): MailboxTarget | null {
  const domain = getEmailDomain(email)
  if (!domain) return null

  const isMobileNative = platform === "ios" || platform === "android"
  const opensNativeMail = platform === "ios" || platform === "macos"

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

  if (platform === "ios" || platform === "macos") {
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

export function openMailbox(email: string): MailboxOpenResult {
  if (typeof window === "undefined") return "manual-check"

  const platform = detectPlatform(
    navigator.userAgent,
    navigator.platform,
    navigator.maxTouchPoints,
  )
  const target = resolveMailboxTarget(email, platform)

  if (!target) return "manual-check"

  if (target.fallback) {
    const openedAt = Date.now()
    openUrl(target.primary, false)

    window.setTimeout(() => {
      if (
        document.visibilityState === "visible" &&
        Date.now() - openedAt < 2000
      ) {
        openUrl(target.fallback!, Boolean(target.openInNewTab))
      }
    }, 750)

    return "opened"
  }

  openUrl(target.primary, Boolean(target.openInNewTab))
  return "opened"
}
