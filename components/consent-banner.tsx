'use client'
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { useMediaQuery } from "@/hooks/use-media-query"
import { useI18n } from "@/locales/client"
import dynamic from "next/dynamic"

const ANALYTICS_CONSENT_COOKIE = "deltalytix_analytics_consent"
const CONSENT_EVENT = "deltalytix:analytics-consent"

function isDeltalytixHost() {
  const host = window.location.hostname
  return host === "deltalytix.app" || host.endsWith(".deltalytix.app")
}

function getSharedAnalyticsConsent() {
  const cookie = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${ANALYTICS_CONSENT_COOKIE}=`))

  if (!cookie) return null

  const value = cookie.split("=")[1]
  if (value === "granted") return true
  if (value === "denied") return false
  return null
}

async function syncPostHogConsent(analyticsEnabled: boolean) {
  const secure = window.location.protocol === "https:" ? "; Secure" : ""
  const value = analyticsEnabled ? "granted" : "denied"
  const attributes = `Max-Age=31536000; Path=/; SameSite=Lax${secure}`

  document.cookie = `${ANALYTICS_CONSENT_COOKIE}=${value}; ${attributes}`
  if (isDeltalytixHost()) {
    document.cookie = `${ANALYTICS_CONSENT_COOKIE}=${value}; ${attributes}; Domain=.deltalytix.app`
  }

  if (!process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN) return

  const { default: posthog } = await import("posthog-js")

  if (analyticsEnabled) {
    const wasOptedOut = posthog.has_opted_out_capturing()
    if (!posthog.has_opted_in_capturing()) {
      posthog.opt_in_capturing()
    }
    window.dispatchEvent(new Event(CONSENT_EVENT))

    if (wasOptedOut) {
      posthog.capture("$pageview", { $current_url: window.location.href })
    }
  } else if (!posthog.has_opted_out_capturing()) {
    posthog.opt_out_capturing()
  }
}

interface ConsentSettings {
  analytics_storage: boolean
  ad_storage: boolean
  ad_user_data: boolean
  ad_personalization: boolean
  functionality_storage: boolean
  personalization_storage: boolean
  security_storage: boolean
}

type ConsentTranslator = ReturnType<typeof useI18n>

const ConsentPreferences = dynamic(
  () =>
    import("./consent-preferences").then((m) => m.ConsentPreferences),
  { ssr: false },
)

function ConsentBannerContent({ t }: { t: ConsentTranslator }) {
  const [isVisible, setIsVisible] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [settings, setSettings] = useState<ConsentSettings>({
    analytics_storage: false,
    ad_storage: false,
    ad_user_data: false,
    ad_personalization: false,
    functionality_storage: true,
    personalization_storage: false,
    security_storage: true,
  })

  const isDesktop = useMediaQuery("(min-width: 768px)")

  useEffect(() => {
    const sharedAnalyticsConsent = getSharedAnalyticsConsent()
    const hasConsent = localStorage.getItem("cookieConsent")

    if (sharedAnalyticsConsent !== null) {
      let settingsToApply: ConsentSettings = {
        analytics_storage: sharedAnalyticsConsent,
        ad_storage: false,
        ad_user_data: false,
        ad_personalization: false,
        functionality_storage: true,
        personalization_storage: false,
        security_storage: true,
      }

      if (hasConsent) {
        try {
          settingsToApply = {
            ...(JSON.parse(hasConsent) as ConsentSettings),
            analytics_storage: sharedAnalyticsConsent,
          }
        } catch {
          localStorage.removeItem("cookieConsent")
        }
      }

      localStorage.setItem("cookieConsent", JSON.stringify(settingsToApply))
      setSettings(settingsToApply)
      void syncPostHogConsent(sharedAnalyticsConsent)
    } else if (hasConsent) {
      try {
        const savedSettings = JSON.parse(hasConsent) as ConsentSettings
        setSettings(savedSettings)
        void syncPostHogConsent(savedSettings.analytics_storage)
      } catch {
        localStorage.removeItem("cookieConsent")
        setIsVisible(true)
      }
    } else {
      setIsVisible(true)
    }

    const handleKeyPress = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "K") {
        localStorage.removeItem("cookieConsent")
        const secure = window.location.protocol === "https:" ? "; Secure" : ""
        document.cookie = `${ANALYTICS_CONSENT_COOKIE}=; Max-Age=0; Path=/; SameSite=Lax${secure}`
        if (isDeltalytixHost()) {
          document.cookie = `${ANALYTICS_CONSENT_COOKIE}=; Max-Age=0; Path=/; SameSite=Lax${secure}; Domain=.deltalytix.app`
        }
        setIsVisible(true)
      }
    }

    window.addEventListener("keydown", handleKeyPress)
    return () => window.removeEventListener("keydown", handleKeyPress)
  }, [])

  useEffect(() => {
    if (isVisible) {
      document.body.setAttribute("data-consent-banner", "visible")
    } else {
      document.body.removeAttribute("data-consent-banner")
    }

    return () => {
      document.body.removeAttribute("data-consent-banner")
    }
  }, [isVisible])

  const saveConsent = (consentSettings: ConsentSettings) => {
    localStorage.setItem("cookieConsent", JSON.stringify(consentSettings))
    void syncPostHogConsent(consentSettings.analytics_storage)
    window.gtag?.("consent", "update", {
      analytics_storage: consentSettings.analytics_storage ? "granted" : "denied",
      ad_storage: consentSettings.ad_storage ? "granted" : "denied",
      ad_user_data: consentSettings.ad_user_data ? "granted" : "denied",
      ad_personalization: consentSettings.ad_personalization ? "granted" : "denied",
      functionality_storage: consentSettings.functionality_storage
        ? "granted"
        : "denied",
      personalization_storage: consentSettings.personalization_storage
        ? "granted"
        : "denied",
      security_storage: consentSettings.security_storage ? "granted" : "denied",
    })
    setIsVisible(false)
  }

  const handleAcceptAll = () => {
    const allEnabled = {
      analytics_storage: true,
      ad_storage: true,
      ad_user_data: true,
      ad_personalization: true,
      functionality_storage: true,
      personalization_storage: true,
      security_storage: true,
    }
    setSettings(allEnabled)
    saveConsent(allEnabled)
  }

  const handleSavePreferences = () => {
    saveConsent(settings)
    setShowDetails(false)
  }

  if (!isVisible) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-9999 animate-in slide-in-from-bottom-4 fade-in duration-300 p-4 -m-4">
      <div className="bg-background/80 backdrop-blur-lg border-t border-border/50 p-4 shadow-lg">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">
                {t("landing.consent.banner.message")}{" "}
                {t("landing.consent.banner.updatePreferences")}{" "}
                <Button
                  variant="link"
                  className="p-0 h-auto text-sm text-foreground underline underline-offset-2"
                  onClick={() => setShowDetails(true)}
                >
                  {t("landing.consent.banner.managePreferences")}
                </Button>
                .
              </p>
            </div>
            <div className="flex gap-3 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  saveConsent({
                    ...settings,
                    analytics_storage: false,
                    ad_storage: false,
                    personalization_storage: false,
                  })
                }
              >
                {t("landing.consent.banner.rejectNonEssential")}
              </Button>
              <Button
                size="sm"
                className="bg-black text-white hover:bg-black/90"
                onClick={handleAcceptAll}
              >
                {t("landing.consent.banner.acceptAll")}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {showDetails ? (
        <ConsentPreferences
          t={t}
          isDesktop={isDesktop}
          open={showDetails}
          onOpenChange={setShowDetails}
          settings={settings}
          setSettings={setSettings}
          onSave={handleSavePreferences}
        />
      ) : null}
    </div>
  )
}

export function ConsentBanner() {
  const t = useI18n()
  return <ConsentBannerContent t={t} />
}
