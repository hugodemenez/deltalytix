'use client'
import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { motion, AnimatePresence } from "framer-motion"
import { useMediaQuery } from "@/hooks/use-media-query"
import { useI18n } from "@/locales/client"
import type { ConsentSettings } from "@/lib/consent-settings"
import posthog from "posthog-js"

const ANALYTICS_CONSENT_COOKIE = "deltalytix_analytics_consent"
const CONSENT_EVENT = "deltalytix:analytics-consent"
const CONSENT_UPDATED_EVENT = "deltalytix:consent-updated"

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

function syncPostHogConsent(analyticsEnabled: boolean) {
  const secure = window.location.protocol === "https:" ? "; Secure" : ""
  const value = analyticsEnabled ? "granted" : "denied"
  const attributes = `Max-Age=31536000; Path=/; SameSite=Lax${secure}`

  // Keep the current-origin cookie in sync, then share the same choice with
  // production and beta. This avoids asking twice or silently opting beta out.
  document.cookie = `${ANALYTICS_CONSENT_COOKIE}=${value}; ${attributes}`
  if (isDeltalytixHost()) {
    document.cookie = `${ANALYTICS_CONSENT_COOKIE}=${value}; ${attributes}; Domain=.deltalytix.app`
  }

  if (!process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN) return

  if (analyticsEnabled) {
    const wasOptedOut = posthog.has_opted_out_capturing()
    if (!posthog.has_opted_in_capturing()) {
      posthog.opt_in_capturing()
    }
    window.dispatchEvent(new Event(CONSENT_EVENT))

    if (wasOptedOut) {
      posthog.capture("$pageview", { $current_url: window.location.href })
    }
  } else {
    if (!posthog.has_opted_out_capturing()) {
      posthog.opt_out_capturing()
    }
  }
}

type ConsentTranslator = ReturnType<typeof useI18n>

function ConsentOption({
  id,
  title,
  description,
  checked,
  onCheckedChange,
  disabled,
}: {
  id: string
  title: string
  description: string
  checked: boolean
  onCheckedChange?: (checked: boolean) => void
  disabled?: boolean
}) {
  return (
    <div className="flex items-start gap-3">
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(value) => onCheckedChange?.(value === true)}
        disabled={disabled}
        className="mt-1"
      />
      <div>
        <Label htmlFor={id} className="text-sm font-medium text-foreground">
          {title}
        </Label>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      </div>
    </div>
  )
}

function ConsentOptions({
  t,
  settings,
  setSettings,
  idPrefix,
}: {
  t: ConsentTranslator
  settings: ConsentSettings
  setSettings: (settings: ConsentSettings) => void
  idPrefix: string
}) {
  return (
    <div className="space-y-4">
      <ConsentOption
        id={`${idPrefix}-necessary`}
        title={t('landing.consent.preferences.strictlyNecessary.title')}
        description={t('landing.consent.preferences.strictlyNecessary.description')}
        checked
        disabled
      />
      <ConsentOption
        id={`${idPrefix}-analytics`}
        title={t('landing.consent.preferences.analytics.title')}
        description={t('landing.consent.preferences.analytics.description')}
        checked={settings.analytics_storage}
        onCheckedChange={(checked) => setSettings({ ...settings, analytics_storage: checked })}
      />
      <ConsentOption
        id={`${idPrefix}-marketing`}
        title={t('landing.consent.preferences.marketing.title')}
        description={t('landing.consent.preferences.marketing.description')}
        checked={settings.ad_storage}
        onCheckedChange={(checked) => setSettings({ ...settings, ad_storage: checked })}
      />
    </div>
  )
}

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
  const bannerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const sharedAnalyticsConsent = getSharedAnalyticsConsent()
    const hasConsent = localStorage.getItem("cookieConsent")

    // Parent-domain cookie is the cross-origin source of truth. Prefer it over
    // a stale origin-local choice so beta/prod cannot overwrite each other.
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
      syncPostHogConsent(sharedAnalyticsConsent)
    } else if (hasConsent) {
      try {
        const savedSettings = JSON.parse(hasConsent) as ConsentSettings
        setSettings(savedSettings)
        // Migrates existing origin-local consent onto the shared Domain cookie.
        syncPostHogConsent(savedSettings.analytics_storage)
      } catch {
        localStorage.removeItem("cookieConsent")
        setIsVisible(true)
      }
    } else {
      setIsVisible(true)
    }

    // Add keyboard shortcut for dev mode (Cmd/Ctrl + Shift + K)
    const handleKeyPress = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'K') {
        localStorage.removeItem("cookieConsent")
        const secure = window.location.protocol === "https:" ? "; Secure" : ""
        document.cookie = `${ANALYTICS_CONSENT_COOKIE}=; Max-Age=0; Path=/; SameSite=Lax${secure}`
        if (isDeltalytixHost()) {
          document.cookie = `${ANALYTICS_CONSENT_COOKIE}=; Max-Age=0; Path=/; SameSite=Lax${secure}; Domain=.deltalytix.app`
        }
        setIsVisible(true)
      }
    }
    
    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [])

  // Radix (and vaul on top of it) decides an interaction happened "outside" an
  // open dialog from a document-level pointerdown listener, and closes on it.
  // A React onPointerDown cannot stop that: React delegates handlers to the
  // root container, so its stopPropagation runs on the same node as Radix's
  // listener and therefore too late. Stopping the event on the banner element
  // itself keeps it from ever reaching document, so choosing a consent option
  // no longer tears down whatever modal the user had open.
  useEffect(() => {
    const node = bannerRef.current
    if (!node) return

    const stop = (event: Event) => event.stopPropagation()
    const events = ["pointerdown", "mousedown", "touchstart"] as const
    events.forEach((type) => node.addEventListener(type, stop))
    return () => events.forEach((type) => node.removeEventListener(type, stop))
  }, [isVisible])

  // Add/remove data attribute when banner visibility changes
  useEffect(() => {
    if (isVisible) {
      document.body.setAttribute('data-consent-banner', 'visible')
    } else {
      document.body.removeAttribute('data-consent-banner')
    }
    
    // Cleanup on unmount
    return () => {
      document.body.removeAttribute('data-consent-banner')
    }
  }, [isVisible])

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

  const saveConsent = (consentSettings: ConsentSettings) => {
    localStorage.setItem("cookieConsent", JSON.stringify(consentSettings))
    syncPostHogConsent(consentSettings.analytics_storage)
    // <GoogleTag /> owns everything Google-side: it loads the tag on first
    // consent and relays later changes, so the banner only has to announce.
    window.dispatchEvent(new CustomEvent(CONSENT_UPDATED_EVENT, {
      detail: consentSettings,
    }))
    setIsVisible(false)
  }

  if (!isVisible) return null

  return (
    <AnimatePresence>
      <motion.div
        // The banner outlives any modal on the page, so it has to survive what
        // Radix does to the rest of the document while a dialog/drawer is open:
        // - body gets `pointer-events: none`, which the banner inherits, hence
        //   the explicit `pointer-events-auto`;
        // - `hideOthers()` marks every other body child `aria-hidden`, and it
        //   only spares `[aria-live]` nodes, hence the live region.
        // Without these, an open drawer leaves the banner visible but dead.
        ref={bannerRef}
        className="fixed bottom-0 left-0 right-0 z-9999 p-4 -m-4 pointer-events-auto"
        aria-live="polite"
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        exit={{ y: 100 }}
        transition={{ 
          duration: 0.3,
          ease: [0.32, 0.72, 0, 1]
        }}
      >
        <div className="bg-background/80 backdrop-blur-lg border-t border-border/50 p-4 shadow-lg">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">
                  {t('landing.consent.banner.message')} {t('landing.consent.banner.updatePreferences')}{' '}
                  <Button 
                    variant="link" 
                    className="p-0 h-auto text-sm text-foreground underline underline-offset-2" 
                    onClick={() => setShowDetails(true)}
                  >
                    {t('landing.consent.banner.managePreferences')}
                  </Button>.
                </p>
              </div>
              <div className="flex gap-3 shrink-0">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => saveConsent({
                    ...settings,
                    analytics_storage: false,
                    ad_storage: false,
                    personalization_storage: false,
                  })}
                >
                  {t('landing.consent.banner.rejectNonEssential')}
                </Button>
                <Button
                  size="sm"
                  onClick={handleAcceptAll}
                >
                  {t('landing.consent.banner.acceptAll')}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {isDesktop ? (
          <>
            {showDetails && <div className="fixed inset-0 z-9998 bg-black/20 backdrop-blur-xs" />}
            <Dialog open={showDetails} onOpenChange={setShowDetails}>
              <DialogContent className="fixed left-[50%] top-[50%] z-9999 translate-x-[-50%] translate-y-[-50%] rounded-lg shadow-xl max-w-[480px] w-[90vw] max-h-[80vh] overflow-hidden">
                <DialogHeader className="p-6 pb-4">
                  <DialogTitle className="text-lg font-medium text-foreground">
                    {t('landing.consent.preferences.title')}
                  </DialogTitle>
                  <DialogDescription className="text-sm text-muted-foreground mt-2 leading-relaxed">
                    {t('landing.consent.preferences.description')}{' '}
                    <a href="#" className="text-info underline">{t('landing.consent.preferences.learnMore')}</a>.
                  </DialogDescription>
                </DialogHeader>

                <div className="px-6 pb-6">
                  <ConsentOptions
                    t={t}
                    settings={settings}
                    setSettings={setSettings}
                    idPrefix="consent-dialog"
                  />

                  <div className="mt-6">
                    <Button
                      onClick={handleSavePreferences}
                      className="w-full rounded-lg h-11"
                    >
                      {t('landing.consent.preferences.done')}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </>
        ) : (
          <Drawer open={showDetails} onOpenChange={setShowDetails}>
            <DrawerContent className="z-10000 rounded-t-lg">
              <div className="h-[80vh] flex flex-col">
                <DrawerHeader className="text-left px-6 py-6">
                  <DrawerTitle className="text-lg font-medium text-foreground">
                    {t('landing.consent.preferences.title')}
                  </DrawerTitle>
                  <DrawerDescription className="text-sm text-muted-foreground mt-2 leading-relaxed">
                    {t('landing.consent.preferences.description')}{' '}
                    <a href="#" className="text-info underline">{t('landing.consent.preferences.learnMore')}</a>.
                  </DrawerDescription>
                </DrawerHeader>

                <div className="flex-1 overflow-y-auto px-6">
                  <div className="pb-6">
                    <ConsentOptions
                      t={t}
                      settings={settings}
                      setSettings={setSettings}
                      idPrefix="consent-drawer"
                    />
                  </div>
                </div>

                <DrawerFooter className="px-6 pb-6">
                  <Button
                    onClick={handleSavePreferences}
                    className="w-full rounded-lg h-11"
                  >
                    {t('landing.consent.preferences.done')}
                  </Button>
                </DrawerFooter>
              </div>
            </DrawerContent>
          </Drawer>
        )}
      </motion.div>
    </AnimatePresence>
  )
}

export function ConsentBanner() {
  const t = useI18n()
  return <ConsentBannerContent t={t} />
}
