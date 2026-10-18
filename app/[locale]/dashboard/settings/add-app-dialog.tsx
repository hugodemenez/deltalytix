'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useCurrentLocale, useI18n } from '@/locales/client'
import { Button } from '@/components/ui/button'
import { validateOAuthAppInput } from '@/lib/api/oauth-app-input'
import type { OAuthAppFieldError } from '@/lib/api/oauth-app-input'
import type { ApiScope } from '@/lib/api/scopes'
import { createOwnedOAuthAppAction, type OwnedOAuthAppDTO } from './connections-actions'
import {
  defaultReadScopes,
  fieldErrorMessage,
  firstErrorStep,
} from './connections-format'
import { useIsMobile } from '@/hooks/use-mobile'
import {
  CopyValue,
  CredentialsReadyMark,
  DescriptionField,
  InfoCallout,
  NameField,
  RedirectUriEditor,
  ScopePicker,
  SettingsDialog,
  SplitFooter,
  StepBars,
  TextLink,
  outlineButtonClass,
  primaryButtonClass,
  toggleScope,
} from './connections-ui'

type Step = 1 | 2 | 3 | 4

export function AddAppDialog({
  open,
  onOpenChange,
  onCreated,
  onUseToken,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (app: OwnedOAuthAppDTO) => void
  onUseToken: () => void
}) {
  const t = useI18n()
  const locale = useCurrentLocale()
  const isMobile = useIsMobile()
  const [step, setStep] = useState<Step>(1)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [uris, setUris] = useState<string[]>([''])
  const [scopes, setScopes] = useState<string[]>(defaultReadScopes())
  const [errors, setErrors] = useState<OAuthAppFieldError[]>([])
  const [pending, setPending] = useState(false)
  const [secret, setSecret] = useState<string | null>(null)
  const [clientId, setClientId] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setStep(1)
    setName('')
    setDescription('')
    setUris([''])
    setScopes(defaultReadScopes())
    setErrors([])
    setPending(false)
    setSecret(null)
    setClientId(null)
  }, [open])

  const docsHref = `/${locale}/docs#authentication`
  const stepLabel =
    step === 1
      ? t('dashboard.settings.connections.step.details')
      : step === 2
        ? t('dashboard.settings.connections.step.redirects')
        : step === 3
          ? t('dashboard.settings.connections.step.permissions')
          : t('dashboard.settings.connections.step.credentials')

  function showErrors(next: OAuthAppFieldError[]) {
    setErrors(next)
    setStep(firstErrorStep(next))
  }

  function continueFromDetails() {
    const result = validateOAuthAppInput({ name, description }, 'update')
    if (!result.ok) {
      showErrors(result.errors)
      return
    }
    setErrors([])
    setStep(2)
  }

  function continueFromRedirects() {
    const result = validateOAuthAppInput({ redirectUris: uris }, 'update')
    if (!result.ok) {
      showErrors(result.errors)
      return
    }
    setErrors([])
    setStep(3)
  }

  async function createApp() {
    const parsed = validateOAuthAppInput(
      { name, description, redirectUris: uris, scopes },
      'create',
    )
    if (!parsed.ok) {
      showErrors(parsed.errors)
      return
    }
    setPending(true)
    try {
      const result = await createOwnedOAuthAppAction(parsed.value)
      if (!result.ok) {
        if (result.code === 'invalid') showErrors(result.errors)
        else toast.error(t('dashboard.settings.connections.notFound'))
        return
      }
      setSecret(result.clientSecret)
      setClientId(result.app.clientId)
      setName(result.app.name)
      setStep(4)
      setErrors([])
      onCreated(result.app)
    } catch {
      toast.error(t('dashboard.settings.connections.createFailed'))
    } finally {
      setPending(false)
    }
  }

  const title =
    step === 4
      ? t('dashboard.settings.connections.ready.title', { name })
      : step === 2
        ? t('dashboard.settings.connections.redirects.title')
        : step === 3
          ? t('dashboard.settings.connections.permissions.title')
          : t('dashboard.settings.connections.add.title')

  const intro =
    step === 1 ? (
      <>
        {t('dashboard.settings.connections.add.descriptionBefore')}
        <TextLink onClick={onUseToken} className="text-sm">
          {t('dashboard.settings.connections.add.apiToken')}
        </TextLink>
        {t('dashboard.settings.connections.add.descriptionAfter')}
      </>
    ) : step === 2 ? (
      t('dashboard.settings.connections.redirects.description')
    ) : step === 3 ? (
      t('dashboard.settings.connections.permissions.description')
    ) : (
      t('dashboard.settings.connections.ready.description')
    )

  return (
    <SettingsDialog
      open={open}
      onOpenChange={onOpenChange}
      wide
      title={title}
      description={intro}
      leading={
        step === 4 ? (
          <CredentialsReadyMark
            label={t('dashboard.settings.connections.step', {
              step: '4',
              label: stepLabel,
            })}
          />
        ) : (
          <StepBars
            step={step}
            label={t('dashboard.settings.connections.step', {
              step: String(step),
              label: stepLabel,
            })}
          />
        )
      }
    >
      {step === 1 ? (
        <>
          <NameField
            value={name}
            onChange={setName}
            error={fieldErrorMessage(errors, 'name')}
            autoFocus
          />
          <DescriptionField
            value={description}
            onChange={setDescription}
            error={fieldErrorMessage(errors, 'description')}
            hint={t('dashboard.settings.connections.descriptionHint')}
          />
        </>
      ) : null}
      {step === 2 ? (
        <RedirectUriEditor
          uris={uris}
          onChange={setUris}
          errors={errors}
          hint={t('dashboard.settings.connections.redirects.hint')}
        />
      ) : null}
      {step === 3 ? (
        <>
          <ScopePicker
            selected={scopes}
            onToggle={(scope: ApiScope) => setScopes((current) => toggleScope(current, scope))}
            stacked={isMobile}
          />
          {fieldErrorMessage(errors, 'scopes') ? (
            <p className="mt-2.5 text-xs leading-4 text-[#DC2626]">
              {fieldErrorMessage(errors, 'scopes')}
            </p>
          ) : (
            <p className="mt-2.5 text-xs leading-4 text-[#686D67] dark:text-muted-foreground">
              {t('dashboard.settings.connections.permissions.footnote')}
            </p>
          )}
        </>
      ) : null}
      {step === 4 && clientId && secret ? (
        <>
          <CopyValue
            label={t('dashboard.settings.connections.clientId')}
            value={clientId}
            compact
          />
          <CopyValue
            label={t('dashboard.settings.connections.clientSecret')}
            value={secret}
            once={t('dashboard.settings.connections.shownOnce')}
            compact
          />
          <InfoCallout>
            <span className="font-medium text-[#171717] dark:text-foreground">
              {t('dashboard.settings.connections.secretCalloutLead')}
            </span>{' '}
            {t('dashboard.settings.connections.secretCalloutBody')}
          </InfoCallout>
        </>
      ) : null}

      {step === 4 ? (
        <SplitFooter
          start={
            <TextLink href={docsHref}>{t('dashboard.settings.connections.apiDocs')}</TextLink>
          }
        >
          <Button
            type="button"
            className={primaryButtonClass}
            onClick={() => onOpenChange(false)}
          >
            {t('dashboard.settings.connections.done')}
          </Button>
        </SplitFooter>
      ) : (
        <SplitFooter
          start={
            step === 1 ? (
              <TextLink href={docsHref}>{t('dashboard.settings.connections.apiDocs')}</TextLink>
            ) : null
          }
        >
          {step === 1 ? (
            <Button
              type="button"
              variant="outline"
              className={outlineButtonClass}
              onClick={() => onOpenChange(false)}
            >
              {t('dashboard.settings.connections.cancel')}
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              className={outlineButtonClass}
              onClick={() => {
                setErrors([])
                setStep((current) => (current === 2 ? 1 : 2))
              }}
            >
              {t('dashboard.settings.connections.back')}
            </Button>
          )}
          <Button
            type="button"
            className={primaryButtonClass}
            disabled={pending}
            onClick={() => {
              if (step === 1) continueFromDetails()
              else if (step === 2) continueFromRedirects()
              else void createApp()
            }}
          >
            {step === 3
              ? t('dashboard.settings.connections.createApp')
              : t('dashboard.settings.connections.continue')}
          </Button>
        </SplitFooter>
      )}
    </SettingsDialog>
  )
}
