'use client'
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerClose,
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
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { motion, AnimatePresence } from "framer-motion"
import { useMediaQuery } from "@/hooks/use-media-query"
import { useI18n } from "@/locales/client"

interface ConsentSettings {
  analytics_storage: boolean;
  ad_storage: boolean;
  ad_user_data: boolean;
  ad_personalization: boolean;
  functionality_storage: boolean;
  personalization_storage: boolean;
  security_storage: boolean;
}


export function ConsentBanner() {
  const t = useI18n()
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
    const hasConsent = localStorage.getItem("cookieConsent")
    if (!hasConsent) {
      setIsVisible(true)
    }

    // Add keyboard shortcut for dev mode (Cmd/Ctrl + Shift + K)
    const handleKeyPress = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'K') {
        localStorage.removeItem("cookieConsent")
        setIsVisible(true)
      }
    }
    
    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [])

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
    window.gtag?.("consent", "update", {
      analytics_storage: consentSettings.analytics_storage ? "granted" : "denied",
      ad_storage: consentSettings.ad_storage ? "granted" : "denied",
      ad_user_data: consentSettings.ad_user_data ? "granted" : "denied",
      ad_personalization: consentSettings.ad_personalization ? "granted" : "denied",
      functionality_storage: consentSettings.functionality_storage ? "granted" : "denied",
      personalization_storage: consentSettings.personalization_storage ? "granted" : "denied",
      security_storage: consentSettings.security_storage ? "granted" : "denied",
    })
    setIsVisible(false)
  }

  if (!isVisible) return null

  return (
    <AnimatePresence>
      <motion.div 
        className="fixed bottom-0 left-0 right-0 z-9999 p-4 -m-4"
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
                  className="bg-black text-white hover:bg-black/90"
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
                            <DialogContent className="fixed left-[50%] top-[50%] z-9999 translate-x-[-50%] translate-y-[-50%] bg-white rounded-lg shadow-xl max-w-[480px] w-[90vw] max-h-[80vh] overflow-hidden border-0">
                <DialogHeader className="p-6 pb-4">
                  <DialogTitle className="text-lg font-medium text-gray-900">
                    {t('landing.consent.preferences.title')}
                  </DialogTitle>
                  <DialogDescription className="text-sm text-gray-600 mt-2 leading-relaxed">
                    {t('landing.consent.preferences.description')}{' '}
                    <a href="#" className="text-blue-600 underline">{t('landing.consent.preferences.learnMore')}</a>.
                  </DialogDescription>
                </DialogHeader>
              
              <div className="px-6 pb-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <input 
                      type="checkbox" 
                      checked={true} 
                      disabled 
                      className="mt-1 h-4 w-4 rounded border-gray-300 bg-gray-100"
                    />
                    <div>
                      <label className="text-sm font-medium text-gray-900">
                        {t('landing.consent.preferences.strictlyNecessary.title')}
                      </label>
                      <p className="text-sm text-gray-600 mt-1">
                        {t('landing.consent.preferences.strictlyNecessary.description')}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <input 
                      type="checkbox" 
                      checked={settings.analytics_storage}
                      onChange={(e) => setSettings({ ...settings, analytics_storage: e.target.checked })}
                      className="mt-1 h-4 w-4 rounded border-gray-300"
                    />
                    <div>
                      <label className="text-sm font-medium text-gray-900">
                        {t('landing.consent.preferences.analytics.title')}
                      </label>
                      <p className="text-sm text-gray-600 mt-1">
                        {t('landing.consent.preferences.analytics.description')}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <input 
                      type="checkbox" 
                      checked={settings.ad_storage}
                      onChange={(e) => setSettings({ ...settings, ad_storage: e.target.checked })}
                      className="mt-1 h-4 w-4 rounded border-gray-300"
                    />
                    <div>
                      <label className="text-sm font-medium text-gray-900">
                        {t('landing.consent.preferences.marketing.title')}
                      </label>
                      <p className="text-sm text-gray-600 mt-1">
                        {t('landing.consent.preferences.marketing.description')}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6">
                  <Button 
                    onClick={handleSavePreferences}
                    className="w-full bg-black text-white hover:bg-black/90 rounded-lg h-11"
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
            <DrawerContent className="z-10000 bg-white rounded-t-lg">
              <div className="h-[80vh] flex flex-col">
                <DrawerHeader className="text-left px-6 py-6">
                  <DrawerTitle className="text-lg font-medium text-gray-900">
                    {t('landing.consent.preferences.title')}
                  </DrawerTitle>
                  <DrawerDescription className="text-sm text-gray-600 mt-2 leading-relaxed">
                    {t('landing.consent.preferences.description')}{' '}
                    <a href="#" className="text-blue-600 underline">{t('landing.consent.preferences.learnMore')}</a>.
                  </DrawerDescription>
                </DrawerHeader>
                
                <div className="flex-1 overflow-y-auto px-6">
                  <div className="space-y-4 pb-6">
                    <div className="flex items-start gap-3">
                      <input 
                        type="checkbox" 
                        checked={true} 
                        disabled 
                        className="mt-1 h-4 w-4 rounded border-gray-300 bg-gray-100"
                      />
                      <div>
                        <label className="text-sm font-medium text-gray-900">
                          {t('landing.consent.preferences.strictlyNecessary.title')}
                        </label>
                        <p className="text-sm text-gray-600 mt-1">
                          {t('landing.consent.preferences.strictlyNecessary.description')}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <input 
                        type="checkbox" 
                        checked={settings.analytics_storage}
                        onChange={(e) => setSettings({ ...settings, analytics_storage: e.target.checked })}
                        className="mt-1 h-4 w-4 rounded border-gray-300"
                      />
                      <div>
                        <label className="text-sm font-medium text-gray-900">
                          {t('landing.consent.preferences.analytics.title')}
                        </label>
                        <p className="text-sm text-gray-600 mt-1">
                          {t('landing.consent.preferences.analytics.description')}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <input 
                        type="checkbox" 
                        checked={settings.ad_storage}
                        onChange={(e) => setSettings({ ...settings, ad_storage: e.target.checked })}
                        className="mt-1 h-4 w-4 rounded border-gray-300"
                      />
                      <div>
                        <label className="text-sm font-medium text-gray-900">
                          {t('landing.consent.preferences.marketing.title')}
                        </label>
                        <p className="text-sm text-gray-600 mt-1">
                          {t('landing.consent.preferences.marketing.description')}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <DrawerFooter className="px-6 pb-6">
                  <Button 
                    onClick={handleSavePreferences}
                    className="w-full bg-black text-white hover:bg-black/90 rounded-lg h-11"
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