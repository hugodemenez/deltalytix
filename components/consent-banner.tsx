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

interface ConsentSettings {
  analytics_storage: boolean;
  ad_storage: boolean;
  ad_user_data: boolean;
  ad_personalization: boolean;
  functionality_storage: boolean;
  personalization_storage: boolean;
  security_storage: boolean;
}

function PreferencesContent({ 
  settings, 
  setSettings, 
  onSave, 
  onCancel,
  isDrawer = false
}: { 
  settings: ConsentSettings;
  setSettings: (settings: ConsentSettings) => void;
  onSave: () => void;
  onCancel: () => void;
  isDrawer?: boolean;
}) {
  return (
    <>
      <div className={isDrawer ? "px-4" : ""}>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="analytics">Analytics Cookies</Label>
              <p className="text-sm text-muted-foreground">
                Help us understand how visitors interact with our website
              </p>
            </div>
            <Switch
              id="analytics"
              checked={settings.analytics_storage}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, analytics_storage: checked })
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="advertising">Advertising Cookies</Label>
              <p className="text-sm text-muted-foreground">
                Used to show you relevant personalized ads
              </p>
            </div>
            <Switch
              id="advertising"
              checked={settings.ad_storage}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, ad_storage: checked })
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="ad_user_data">Ad User Data</Label>
              <p className="text-sm text-muted-foreground">
                Allow us to use your data to show relevant ads
              </p>
            </div>
            <Switch
              id="ad_user_data"
              checked={settings.ad_user_data}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, ad_user_data: checked })
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="ad_personalization">Ad Personalization</Label>
              <p className="text-sm text-muted-foreground">
                Allow personalized advertising based on your preferences
              </p>
            </div>
            <Switch
              id="ad_personalization"
              checked={settings.ad_personalization}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, ad_personalization: checked })
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="personalization">Personalization Cookies</Label>
              <p className="text-sm text-muted-foreground">
                Allow us to personalize content based on your preferences
              </p>
            </div>
            <Switch
              id="personalization"
              checked={settings.personalization_storage}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, personalization_storage: checked })
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="essential">Essential Cookies</Label>
              <p className="text-sm text-muted-foreground">
                Required for the website to function properly (always enabled)
              </p>
            </div>
            <Switch id="essential" checked={true} disabled />
          </div>
        </div>
      </div>

      {!isDrawer && (
        <div className="mt-6 flex justify-end gap-4">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={onSave}>
            Save Preferences
          </Button>
        </div>
      )}
    </>
  )
}

export function ConsentBanner() {
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
        className="fixed bottom-0 inset-x-0 z-50"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 10, opacity: 0 }}
        transition={{ 
          duration: 0.2,
          ease: [0.32, 0.72, 0, 1]
        }}
      >
        <div className="max-w-xl mx-auto p-4">
          <motion.div 
            className="bg-card rounded-lg shadow-lg border p-4 flex flex-col gap-4"
            whileHover={{ 
              scale: 1.002,
              transition: { duration: 0.2 }
            }}
            initial={{ y: 10, opacity: 0.8 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{
              duration: 0.15,
              ease: "easeOut"
            }}
          >
            <div className="flex items-start justify-between gap-4">
              <p className="text-sm text-muted-foreground">
                We use cookies to enhance your experience. 
                <Button 
                  variant="link" 
                  className="px-1 h-auto" 
                  onClick={() => setShowDetails(true)}
                >
                  Manage preferences
                </Button>
              </p>
              <div className="flex gap-2 shrink-0">
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
                  Essential Only
                </Button>
                <Button 
                  size="sm"
                  onClick={handleAcceptAll}
                >
                  Accept All
                </Button>
              </div>
            </div>
          </motion.div>
        </div>

        {isDesktop ? (
          <Dialog open={showDetails} onOpenChange={setShowDetails}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Cookie Preferences</DialogTitle>
                <DialogDescription>
                  Customize your cookie preferences. Essential cookies are always enabled as they are required for the website to function properly.
                </DialogDescription>
              </DialogHeader>
              <PreferencesContent
                settings={settings}
                setSettings={setSettings}
                onSave={handleSavePreferences}
                onCancel={() => setShowDetails(false)}
              />
            </DialogContent>
          </Dialog>
        ) : (
          <Drawer open={showDetails} onOpenChange={setShowDetails}>
            <DrawerContent>
              <div className="max-h-[85vh]">
                <DrawerHeader className="text-left">
                  <DrawerTitle>Cookie Preferences</DrawerTitle>
                  <DrawerDescription>
                    Customize your cookie preferences. Essential cookies are always enabled as they are required for the website to function properly.
                  </DrawerDescription>
                </DrawerHeader>
                <div className="px-4 py-2">
                  <PreferencesContent
                    settings={settings}
                    setSettings={setSettings}
                    onSave={handleSavePreferences}
                    onCancel={() => setShowDetails(false)}
                    isDrawer
                  />
                </div>
                <DrawerFooter className="pt-2">
                  <Button onClick={handleSavePreferences}>
                    Save Preferences
                  </Button>
                  <DrawerClose asChild>
                    <Button variant="outline">
                      Cancel
                    </Button>
                  </DrawerClose>
                </DrawerFooter>
              </div>
            </DrawerContent>
          </Drawer>
        )}
      </motion.div>
    </AnimatePresence>
  )
} 