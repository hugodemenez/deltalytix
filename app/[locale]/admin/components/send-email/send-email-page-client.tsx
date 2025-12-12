"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useI18n } from "@/locales/client"
import { UserSelector } from "./user-selector"
import { EmailPreview } from "./email-preview"
import {
  getUsersList,
  renderEmailPreview,
  sendEmailsToUsers,
  getDefaultTemplateProps,
  getRequiredTemplateProps,
  type EmailTemplate,
} from "../../actions/send-email"
import { Loader2, Send, Users } from "lucide-react"

interface User {
  id: string
  email: string
  firstName: string
  language: string
  createdAt: string
}

export function SendEmailPageClient() {
  const t = useI18n()
  const format = useCallback(
    (key: string, params?: Record<string, string | number>) => {
      const message = t(key as never)
      if (!params) return message
      return Object.entries(params).reduce(
        (acc, [paramKey, value]) => acc.replace(new RegExp(`{${paramKey}}`, "g"), String(value)),
        message
      )
    },
    [t]
  )
  const templateOptions: { value: EmailTemplate; labelKey: string; descriptionKey: string }[] = useMemo(
    () => [
      {
        value: "black-friday",
        labelKey: "admin.sendEmail.templates.blackFriday.label",
        descriptionKey: "admin.sendEmail.templates.blackFriday.description",
      },
      {
        value: "welcome",
        labelKey: "admin.sendEmail.templates.welcome.label",
        descriptionKey: "admin.sendEmail.templates.welcome.description",
      },
      {
        value: "weekly-recap",
        labelKey: "admin.sendEmail.templates.weeklyRecap.label",
        descriptionKey: "admin.sendEmail.templates.weeklyRecap.description",
      },
      {
        value: "new-feature",
        labelKey: "admin.sendEmail.templates.newFeature.label",
        descriptionKey: "admin.sendEmail.templates.newFeature.description",
      },
      {
        value: "renewal-notice",
        labelKey: "admin.sendEmail.templates.renewalNotice.label",
        descriptionKey: "admin.sendEmail.templates.renewalNotice.description",
      },
      {
        value: "team-invitation",
        labelKey: "admin.sendEmail.templates.teamInvitation.label",
        descriptionKey: "admin.sendEmail.templates.teamInvitation.description",
      },
      {
        value: "missing-data",
        labelKey: "admin.sendEmail.templates.missingData.label",
        descriptionKey: "admin.sendEmail.templates.missingData.description",
      },
      {
        value: "support-request",
        labelKey: "admin.sendEmail.templates.supportRequest.label",
        descriptionKey: "admin.sendEmail.templates.supportRequest.description",
      },
      {
        value: "support-subscription-error",
        labelKey: "admin.sendEmail.templates.supportSubscriptionError.label",
        descriptionKey: "admin.sendEmail.templates.supportSubscriptionError.description",
      },
    ],
    []
  )
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null)
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [customProps, setCustomProps] = useState<Record<string, unknown>>({})
  const [previewHtml, setPreviewHtml] = useState<string | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [sending, setSending] = useState(false)
  const [customSubject, setCustomSubject] = useState("")
  const [requiredProps, setRequiredProps] = useState<string[]>([])
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop")

  const selectedTemplateMeta = useMemo(
    () => templateOptions.find((option) => option.value === selectedTemplate),
    [selectedTemplate]
  )
  const selectedTemplateLabel = selectedTemplateMeta ? format(selectedTemplateMeta.labelKey) : ""

  useEffect(() => {
    const loadUsers = async () => {
      setLoadingUsers(true)
      try {
        const list = await getUsersList()
        setUsers(list)
      } catch (error) {
        console.error("Failed to load users:", error)
        toast.error(t("admin.sendEmail.toast.loadUsersError"))
      } finally {
        setLoadingUsers(false)
      }
    }

    loadUsers()
  }, [t])

  useEffect(() => {
    const loadRequiredProps = async () => {
      if (!selectedTemplate) {
        setRequiredProps([])
        return
      }
      const props = await getRequiredTemplateProps(selectedTemplate)
      setRequiredProps(props)
    }

    loadRequiredProps()
  }, [selectedTemplate])

  const updatePreview = useCallback(async () => {
    if (!selectedTemplate) {
      setPreviewHtml(null)
      return
    }

    setLoadingPreview(true)
    try {
      const defaultProps = await getDefaultTemplateProps(selectedTemplate)
      const mergedProps = { ...defaultProps, ...customProps }
      const result = await renderEmailPreview(selectedTemplate, mergedProps)

      if (result.success && result.html) {
        setPreviewHtml(result.html)
      } else {
        toast.error(result.error || t("admin.sendEmail.toast.previewError"))
      }
    } catch (error) {
      console.error("Failed to update preview:", error)
      toast.error(t("admin.sendEmail.toast.previewError"))
    } finally {
      setLoadingPreview(false)
    }
  }, [selectedTemplate, customProps, t])

  useEffect(() => {
    updatePreview()
  }, [updatePreview])

  const handleTemplateSelect = async (template: EmailTemplate) => {
    setSelectedTemplate(template)
    const defaults = await getDefaultTemplateProps(template)
    setCustomProps(defaults)
  }

  const handlePropChange = (key: string, value: unknown) => {
    setCustomProps((prev) => ({
      ...prev,
      [key]: value,
    }))
  }

  const handleSend = async () => {
    if (!selectedTemplate) {
      toast.error(t("admin.sendEmail.actions.validation.template"))
      return
    }

    if (selectedUsers.length === 0) {
      toast.error(t("admin.sendEmail.actions.validation.recipients"))
      return
    }

    const missingProps = requiredProps.filter((prop) => {
      const value = customProps[prop]
      return value === undefined || value === null || value === ""
    })

    if (missingProps.length > 0) {
      toast.error(format("admin.sendEmail.actions.validation.missingProps", { props: missingProps.join(", ") }))
      return
    }

    setSending(true)
    try {
      const result = await sendEmailsToUsers(selectedTemplate, selectedUsers, customProps, customSubject || undefined)

      if (result.error) {
        toast.error(result.error || t("admin.sendEmail.toast.sendError"))
      } else {
        const successCount = result.successCount ?? 0
        const errorCount = result.errorCount ?? 0
        toast.success(
          errorCount > 0
            ? format("admin.sendEmail.toast.sendPartialSuccess", { successCount, errorCount })
            : format("admin.sendEmail.toast.sendSuccess", { successCount })
        )
        setSelectedUsers([])
        setCustomSubject("")
      }
    } catch (error) {
      console.error("Failed to send emails:", error)
      toast.error(t("admin.sendEmail.toast.sendError"))
    } finally {
      setSending(false)
    }
  }

  const renderPropField = (key: string, value: unknown) => {
    if (typeof value === "boolean") {
      return (
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id={key}
            checked={value}
            onChange={(event) => handlePropChange(key, event.target.checked)}
            className="rounded"
          />
          <Label htmlFor={key} className="font-normal">
            {value ? t("admin.sendEmail.props.boolean.enabled") : t("admin.sendEmail.props.boolean.disabled")}
          </Label>
        </div>
      )
    }

    const isStringArray = Array.isArray(value) && value.every((item) => typeof item === "string")

    if (isStringArray) {
      return (
        <div className="space-y-2">
          {(value as string[]).map((item, index) => (
            <div key={`${key}-${index}`} className="flex gap-2">
              <Input
                value={item}
                onChange={(event) => {
                  const next = [...(value as string[])]
                  next[index] = event.target.value
                  handlePropChange(key, next)
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const next = (value as string[]).filter((_, itemIndex) => itemIndex !== index)
                  handlePropChange(key, next)
                }}
              >
                {t("admin.sendEmail.props.array.remove")}
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handlePropChange(key, [...(value as string[]), ""])}
          >
            {t("admin.sendEmail.props.array.add")}
          </Button>
        </div>
      )
    }

    if (typeof value === "number") {
      return (
        <Input
          type="number"
          id={key}
          value={String(value)}
          onChange={(event) => handlePropChange(key, Number(event.target.value))}
        />
      )
    }

    if (typeof value === "string" && (key === "locale" || key === "language")) {
      return (
        <div className="flex flex-col gap-2">
          <Tabs
            value={value}
            onValueChange={(newValue) => handlePropChange(key, newValue)}
            className="w-fit"
          >
            <TabsList>
              <TabsTrigger value="en">{t("admin.sendEmail.props.language.english")}</TabsTrigger>
              <TabsTrigger value="fr">{t("admin.sendEmail.props.language.french")}</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      )
    }

    if (typeof value === "object" && value !== null) {
      const stringValue = JSON.stringify(value, null, 2)
      return (
        <Textarea
          id={key}
          value={stringValue}
          onChange={(event) => {
            try {
              const parsed = JSON.parse(event.target.value)
              handlePropChange(key, parsed)
            } catch {
              handlePropChange(key, event.target.value)
            }
          }}
          rows={4}
        />
      )
    }

    return (
      <Input
        id={key}
        value={value === undefined || value === null ? "" : String(value)}
        onChange={(event) => handlePropChange(key, event.target.value)}
      />
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="lg:col-span-2 space-y-2">
          <Label htmlFor="template" className="text-sm font-medium">
            {t("admin.sendEmail.template.selectLabel")}
          </Label>
          <Select
            value={selectedTemplate ?? undefined}
            onValueChange={(value) => handleTemplateSelect(value as EmailTemplate)}
          >
            <SelectTrigger id="template" className="w-full max-w-xl">
              <SelectValue placeholder={t("admin.sendEmail.template.placeholder")} />
            </SelectTrigger>
            <SelectContent>
              {templateOptions.map((template) => (
                <SelectItem key={template.value} value={template.value}>
                  {format(template.labelKey)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedTemplateMeta ? (
            <p className="text-xs text-muted-foreground">{format(selectedTemplateMeta.descriptionKey)}</p>
          ) : (
            <p className="text-xs text-muted-foreground">{t("admin.sendEmail.template.helper")}</p>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("admin.sendEmail.props.title")}</CardTitle>
              <CardDescription>{t("admin.sendEmail.props.description")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="subject">{t("admin.sendEmail.subject.label")}</Label>
                <Input
                  id="subject"
                  placeholder={t("admin.sendEmail.subject.placeholder")}
                  value={customSubject}
                  onChange={(event) => setCustomSubject(event.target.value)}
                  disabled={!selectedTemplate}
                />
              </div>

              <ScrollArea className="max-h-[420px] pr-4">
                <div className="space-y-4">
                  {selectedTemplate ? (
                    Object.entries(customProps).map(([key, value]) => (
                      <div key={key} className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Label htmlFor={key} className="capitalize">
                            {key}
                          </Label>
                          {requiredProps.includes(key) && (
                            <Badge variant="outline" className="text-xs">
                              {t("admin.sendEmail.props.requiredBadge")}
                            </Badge>
                          )}
                        </div>
                        {renderPropField(key, value)}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">{t("admin.sendEmail.props.placeholder")}</p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("admin.sendEmail.recipients.title")}</CardTitle>
              <CardDescription>{t("admin.sendEmail.recipients.description")}</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingUsers ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <UserSelector users={users} selectedUsers={selectedUsers} onSelectionChange={setSelectedUsers} />
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="flex h-full flex-col">
          <CardHeader className="space-y-1">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <CardTitle>{t("admin.sendEmail.preview.title")}</CardTitle>
                <CardDescription>{t("admin.sendEmail.preview.description")}</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {t("admin.sendEmail.preview.device.label")}
                </span>
                <div className="inline-flex rounded-md border bg-muted/50 p-1 text-sm">
                  <Button
                    type="button"
                    variant={previewDevice === "desktop" ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setPreviewDevice("desktop")}
                  >
                    {t("admin.sendEmail.preview.device.desktop")}
                  </Button>
                  <Button
                    type="button"
                    variant={previewDevice === "mobile" ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setPreviewDevice("mobile")}
                  >
                    {t("admin.sendEmail.preview.device.mobile")}
                  </Button>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1 space-y-4 flex flex-col">
            {loadingPreview ? (
              <div className="flex h-full items-center justify-center py-12 text-sm text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2">{t("admin.sendEmail.preview.loading")}</span>
              </div>
            ) : previewHtml ? (
              <div
                className="mx-auto w-full flex-1"
                style={{
                  maxWidth: previewDevice === "mobile" ? "430px" : "1200px",
                }}
              >
                <EmailPreview
                  html={previewHtml}
                  height={previewDevice === "mobile" ? "900px" : "750px"}
                />
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center rounded-md border border-dashed p-8 text-center text-muted-foreground">
                {t("admin.sendEmail.preview.empty")}
              </div>
            )}
          </CardContent>
          <CardContent className="border-t pt-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>{format("admin.sendEmail.recipients.selected", { count: selectedUsers.length })}</span>
              </div>
              <Button size="lg" onClick={handleSend} disabled={!selectedTemplate || selectedUsers.length === 0 || sending}>
                {sending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("admin.sendEmail.actions.sending")}
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    {format("admin.sendEmail.actions.send", { count: selectedUsers.length })}
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}


