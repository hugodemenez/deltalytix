"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import {
  defaultNewsletterPreferences,
  type NewsletterPreferenceFields,
} from "@/lib/newsletter-email"

type NewsletterPreferencesFormProps = {
  email?: string
  token?: string
  isAuthenticated?: boolean
  copy: {
    title: string
    description: string
    missingEmail: string
    authRequired: string
    invalidToken: string
    statusLabel: string
    weeklySummaryLabel: string
    monthlyStatsLabel: string
    renewalNoticeLabel: string
    save: string
    loading: string
    saving: string
    saved: string
    loadError: string
    saveError: string
  }
}

export function NewsletterPreferencesForm({
  email,
  token,
  isAuthenticated = false,
  copy,
}: NewsletterPreferencesFormProps) {
  const [preferences, setPreferences] = useState<NewsletterPreferenceFields | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string>("")
  const [hasError, setHasError] = useState(false)
  const [authRequired, setAuthRequired] = useState(false)
  const [invalidToken, setInvalidToken] = useState(false)

  const canManage = useMemo(
    () => isAuthenticated || Boolean(email && token),
    [email, isAuthenticated, token],
  )

  useEffect(() => {
    if (!canManage) {
      return
    }

    const controller = new AbortController()

    const fetchPreferences = async () => {
      setIsLoading(true)
      setStatusMessage("")
      setHasError(false)
      setAuthRequired(false)
      setInvalidToken(false)
      setPreferences(null)

      try {
        const params = new URLSearchParams()
        if (!isAuthenticated) {
          if (email) params.set("email", email)
          if (token) params.set("token", token)
        }

        const queryString = params.toString()
        const response = await fetch(
          `/api/email/preferences${queryString ? `?${queryString}` : ""}`,
          { signal: controller.signal },
        )

        if (response.status === 401) {
          if (token) {
            setInvalidToken(true)
            setStatusMessage(copy.invalidToken)
          } else {
            setAuthRequired(true)
            setStatusMessage(copy.authRequired)
          }
          setHasError(true)
          return
        }

        if (response.status === 403) {
          setAuthRequired(true)
          setStatusMessage(copy.authRequired)
          setHasError(true)
          return
        }

        if (!response.ok) {
          throw new Error("Failed to load preferences")
        }

        const data = (await response.json()) as NewsletterPreferenceFields
        if (controller.signal.aborted) return

        setPreferences({
          isActive: data.isActive,
          weeklySummaryEnabled: data.weeklySummaryEnabled,
          monthlyStatsEnabled: data.monthlyStatsEnabled,
          renewalNoticeEnabled: data.renewalNoticeEnabled,
        })
      } catch {
        if (controller.signal.aborted) return
        setHasError(true)
        setStatusMessage(copy.loadError)
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      }
    }

    fetchPreferences()

    return () => {
      controller.abort()
    }
  }, [
    canManage,
    copy.authRequired,
    copy.invalidToken,
    copy.loadError,
    email,
    isAuthenticated,
    token,
  ])

  const handleSave = async () => {
    if (!preferences) return

    setIsSaving(true)
    setStatusMessage("")
    setHasError(false)
    setAuthRequired(false)
    setInvalidToken(false)

    try {
      const body: Record<string, unknown> = { ...preferences }

      if (!isAuthenticated) {
        if (!email || !token) {
          setAuthRequired(true)
          setStatusMessage(copy.authRequired)
          setHasError(true)
          return
        }
        body.email = email
        body.token = token
      }

      const response = await fetch("/api/email/preferences", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      })

      if (response.status === 401) {
        if (token) {
          setInvalidToken(true)
          setStatusMessage(copy.invalidToken)
        } else {
          setAuthRequired(true)
          setStatusMessage(copy.authRequired)
        }
        setHasError(true)
        return
      }

      if (response.status === 403) {
        setAuthRequired(true)
        setStatusMessage(copy.authRequired)
        setHasError(true)
        return
      }

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

  const renderToggle = (
    id: string,
    label: string,
    field: keyof NewsletterPreferenceFields,
  ) => (
    <div className="flex items-center justify-between rounded-md border p-3">
      <Label htmlFor={id} className="text-sm sm:text-base">
        {label}
      </Label>
      <Switch
        id={id}
        checked={preferences?.[field] ?? defaultNewsletterPreferences[field]}
        disabled={isLoading || isSaving}
        onCheckedChange={(checked) =>
          setPreferences((prev) => ({
            ...(prev ?? defaultNewsletterPreferences),
            [field]: checked,
          }))
        }
      />
    </div>
  )

  return (
    <Card className="shadow-xs">
      <CardHeader className="space-y-3 sm:space-y-4">
        <CardTitle className="text-lg sm:text-xl">{copy.title}</CardTitle>
        <CardDescription className="text-sm sm:text-base">{copy.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!canManage ? (
          <p className="text-sm sm:text-base text-muted-foreground">{copy.missingEmail}</p>
        ) : authRequired ? (
          <p className="text-sm sm:text-base text-destructive">{copy.authRequired}</p>
        ) : invalidToken ? (
          <p className="text-sm sm:text-base text-destructive">{copy.invalidToken}</p>
        ) : isLoading ? (
          <div className="flex items-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {copy.loading}
          </div>
        ) : !preferences ? (
          <p className="text-sm sm:text-base text-destructive">
            {statusMessage || copy.loadError}
          </p>
        ) : (
          <>
            {renderToggle("newsletter-status", copy.statusLabel, "isActive")}
            {renderToggle("weekly-summary", copy.weeklySummaryLabel, "weeklySummaryEnabled")}
            {renderToggle("monthly-stats", copy.monthlyStatsLabel, "monthlyStatsEnabled")}
            {renderToggle("renewal-notice", copy.renewalNoticeLabel, "renewalNoticeEnabled")}

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
