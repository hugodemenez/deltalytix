"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

type NewsletterPreferences = {
  isActive: boolean
  weeklySummaryEnabled: boolean
  monthlyStatsEnabled: boolean
  renewalNoticeEnabled: boolean
}

type NewsletterPreferencesFormProps = {
  email?: string
  copy: {
    title: string
    description: string
    missingEmail: string
    statusLabel: string
    weeklySummaryLabel: string
    monthlyStatsLabel: string
    renewalNoticeLabel: string
    save: string
    saving: string
    saved: string
    saveError: string
  }
}

const defaultPreferences: NewsletterPreferences = {
  isActive: true,
  weeklySummaryEnabled: true,
  monthlyStatsEnabled: true,
  renewalNoticeEnabled: true,
}

export function NewsletterPreferencesForm({
  email,
  copy,
}: NewsletterPreferencesFormProps) {
  const [preferences, setPreferences] = useState<NewsletterPreferences | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string>("")
  const [hasError, setHasError] = useState(false)

  const canManage = useMemo(() => Boolean(email), [email])

  useEffect(() => {
    if (!email) {
      setPreferences(defaultPreferences)
      return
    }

    const fetchPreferences = async () => {
      setIsLoading(true)
      setStatusMessage("")
      setHasError(false)
      try {
        const response = await fetch(`/api/email/preferences?email=${encodeURIComponent(email)}`)
        if (!response.ok) {
          throw new Error("Failed to load preferences")
        }

        const data = (await response.json()) as NewsletterPreferences
        setPreferences({
          isActive: data.isActive,
          weeklySummaryEnabled: data.weeklySummaryEnabled,
          monthlyStatsEnabled: data.monthlyStatsEnabled,
          renewalNoticeEnabled: data.renewalNoticeEnabled,
        })
      } catch {
        setHasError(true)
        setStatusMessage(copy.saveError)
      } finally {
        setIsLoading(false)
      }
    }

    fetchPreferences()
  }, [email, copy.saveError])

  const handleSave = async () => {
    if (!email || !preferences) return

    setIsSaving(true)
    setStatusMessage("")
    setHasError(false)

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

      if (!response.ok) {
        throw new Error("Failed to save preferences")
      }

      setStatusMessage(copy.saved)
    } catch {
      setHasError(true)
      setStatusMessage(copy.saveError)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card className="shadow-xs">
      <CardHeader className="space-y-3 sm:space-y-4">
        <CardTitle className="text-lg sm:text-xl">{copy.title}</CardTitle>
        <CardDescription className="text-sm sm:text-base">{copy.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!canManage ? (
          <p className="text-sm sm:text-base text-muted-foreground">{copy.missingEmail}</p>
        ) : isLoading || !preferences ? (
          <div className="flex items-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {copy.saving}
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between rounded-md border p-3">
              <Label htmlFor="newsletter-status" className="text-sm sm:text-base">
                {copy.statusLabel}
              </Label>
              <Switch
                id="newsletter-status"
                checked={preferences.isActive}
                disabled={isLoading || isSaving}
                onCheckedChange={(checked) =>
                  setPreferences((prev) => ({
                    ...(prev ?? defaultPreferences),
                    isActive: checked,
                  }))
                }
              />
            </div>

            <div className="flex items-center justify-between rounded-md border p-3">
              <Label htmlFor="weekly-summary" className="text-sm sm:text-base">
                {copy.weeklySummaryLabel}
              </Label>
              <Switch
                id="weekly-summary"
                checked={preferences.weeklySummaryEnabled}
                disabled={isLoading || isSaving}
                onCheckedChange={(checked) =>
                  setPreferences((prev) => ({
                    ...(prev ?? defaultPreferences),
                    weeklySummaryEnabled: checked,
                  }))
                }
              />
            </div>

            <div className="flex items-center justify-between rounded-md border p-3">
              <Label htmlFor="monthly-stats" className="text-sm sm:text-base">
                {copy.monthlyStatsLabel}
              </Label>
              <Switch
                id="monthly-stats"
                checked={preferences.monthlyStatsEnabled}
                disabled={isLoading || isSaving}
                onCheckedChange={(checked) =>
                  setPreferences((prev) => ({
                    ...(prev ?? defaultPreferences),
                    monthlyStatsEnabled: checked,
                  }))
                }
              />
            </div>

            <div className="flex items-center justify-between rounded-md border p-3">
              <Label htmlFor="renewal-notice" className="text-sm sm:text-base">
                {copy.renewalNoticeLabel}
              </Label>
              <Switch
                id="renewal-notice"
                checked={preferences.renewalNoticeEnabled}
                disabled={isLoading || isSaving}
                onCheckedChange={(checked) =>
                  setPreferences((prev) => ({
                    ...(prev ?? defaultPreferences),
                    renewalNoticeEnabled: checked,
                  }))
                }
              />
            </div>

            <Button onClick={handleSave} disabled={isLoading || isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {copy.saving}
                </>
              ) : (
                copy.save
              )}
            </Button>

            {statusMessage && (
              <p className={hasError ? "text-sm text-destructive" : "text-sm text-green-600"}>
                {statusMessage}
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
