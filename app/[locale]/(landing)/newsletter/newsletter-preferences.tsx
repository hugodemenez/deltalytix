"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { useScopedI18n } from "@/locales/client"

interface NewsletterPreferencesProps {
  email?: string
}

interface Preferences {
  monthlyStats: boolean
  weeklyUpdates: boolean
  renewalNotifications: boolean
}

export function NewsletterPreferences({ email: initialEmail }: NewsletterPreferencesProps) {
  const t = useScopedI18n('newsletter')
  const [email, setEmail] = useState(initialEmail || "")
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [preferences, setPreferences] = useState<Preferences | null>(null)

  const loadPreferences = async (emailToLoad: string) => {
    if (!emailToLoad) return
    
    setLoading(true)
    try {
      const response = await fetch(`/api/email/preferences?email=${encodeURIComponent(emailToLoad)}`)
      
      if (response.ok) {
        const data = await response.json()
        setPreferences({
          monthlyStats: data.monthlyStats ?? true,
          weeklyUpdates: data.weeklyUpdates ?? true,
          renewalNotifications: data.renewalNotifications ?? true,
        })
      } else if (response.status === 404) {
        // Email not found, show default preferences
        setPreferences({
          monthlyStats: true,
          weeklyUpdates: true,
          renewalNotifications: true,
        })
      } else {
        toast.error(t("preferences.error.load"))
      }
    } catch (error) {
      console.error("Error loading preferences:", error)
      toast.error(t("preferences.error.load"))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (initialEmail) {
      loadPreferences(initialEmail)
    }
  }, [initialEmail])

  const handleSavePreferences = async () => {
    if (!email) {
      toast.error(t("preferences.error.emailRequired"))
      return
    }

    if (!preferences) return

    setSaving(true)
    try {
      const response = await fetch("/api/email/preferences", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          ...preferences,
        }),
      })

      if (response.ok) {
        toast.success(t("preferences.success.saved"))
      } else {
        toast.error(t("preferences.error.save"))
      }
    } catch (error) {
      console.error("Error saving preferences:", error)
      toast.error(t("preferences.error.save"))
    } finally {
      setSaving(false)
    }
  }

  const handleLoadPreferences = () => {
    loadPreferences(email)
  }

  const handlePreferenceChange = (key: keyof Preferences, value: boolean) => {
    setPreferences(prev => prev ? { ...prev, [key]: value } : null)
  }

  return (
    <Card className="shadow-xs">
      <CardHeader className="space-y-3 sm:space-y-4">
        <CardTitle className="text-lg sm:text-xl">{t("preferences.title")}</CardTitle>
        <CardDescription className="text-sm sm:text-base">{t("preferences.description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!initialEmail && (
          <div className="space-y-3">
            <Label htmlFor="email">{t("preferences.emailLabel")}</Label>
            <div className="flex gap-2">
              <Input
                id="email"
                type="email"
                placeholder={t("preferences.emailPlaceholder")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
              <Button
                onClick={handleLoadPreferences}
                disabled={loading || !email}
                variant="outline"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("preferences.load")}
              </Button>
            </div>
          </div>
        )}

        {preferences && (
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between space-x-2">
                <div className="space-y-0.5 flex-1">
                  <Label htmlFor="monthlyStats" className="text-base">
                    {t("preferences.options.monthlyStats.title")}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {t("preferences.options.monthlyStats.description")}
                  </p>
                </div>
                <Switch
                  id="monthlyStats"
                  checked={preferences.monthlyStats}
                  onCheckedChange={(checked) => handlePreferenceChange("monthlyStats", checked)}
                  disabled={saving}
                />
              </div>

              <div className="flex items-center justify-between space-x-2">
                <div className="space-y-0.5 flex-1">
                  <Label htmlFor="weeklyUpdates" className="text-base">
                    {t("preferences.options.weeklyUpdates.title")}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {t("preferences.options.weeklyUpdates.description")}
                  </p>
                </div>
                <Switch
                  id="weeklyUpdates"
                  checked={preferences.weeklyUpdates}
                  onCheckedChange={(checked) => handlePreferenceChange("weeklyUpdates", checked)}
                  disabled={saving}
                />
              </div>

              <div className="flex items-center justify-between space-x-2">
                <div className="space-y-0.5 flex-1">
                  <Label htmlFor="renewalNotifications" className="text-base">
                    {t("preferences.options.renewalNotifications.title")}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {t("preferences.options.renewalNotifications.description")}
                  </p>
                </div>
                <Switch
                  id="renewalNotifications"
                  checked={preferences.renewalNotifications}
                  onCheckedChange={(checked) => handlePreferenceChange("renewalNotifications", checked)}
                  disabled={saving}
                />
              </div>
            </div>

            <Button
              onClick={handleSavePreferences}
              disabled={saving}
              className="w-full sm:w-auto"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("preferences.saving")}
                </>
              ) : (
                t("preferences.save")
              )}
            </Button>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
