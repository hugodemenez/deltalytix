'use client'

import { useCallback, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useI18n } from '@/locales/client'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getDxFeedErrorToastContent } from '@/lib/dxfeed-client-messages'
import { showToastWithCopy } from '@/lib/toast-copy'
import { useDxFeedSyncContext } from '@/context/dxfeed-sync-context'
import {
  captureConnectionCreated,
  captureConnectionFailed,
} from '@/lib/connection-analytics'
import { DxFeedErrorCode } from '@/lib/dxfeed-errors'
import { authenticateDxFeed } from './actions'

const fieldClassName =
  'h-11 w-full min-w-0 max-w-full rounded-sm border-black/10 bg-transparent text-base sm:text-sm shadow-none focus-visible:border-black/30 focus-visible:ring-0 focus-visible:ring-offset-0 dark:border-white/10 dark:focus-visible:border-white/30'

const primaryButtonClassName =
  'inline-flex h-11 w-full items-center justify-center rounded-sm bg-[oklch(0.22_0.01_95)] px-6 text-sm font-medium text-white transition-[opacity,transform] duration-150 hover:opacity-85 active:scale-[0.96] disabled:pointer-events-none disabled:opacity-40 dark:bg-[oklch(0.94_0.01_95)] dark:text-[oklch(0.17_0_0)]'

const invalidFieldClassName =
  'border-destructive/60 focus-visible:border-destructive/70 dark:border-destructive/60 dark:focus-visible:border-destructive/70'

type DxFeedFieldErrors = Partial<Record<'email' | 'password', string>>

function FieldBorderError({
  id,
  message,
  className,
}: {
  id: string
  message?: string
  className?: string
}) {
  if (!message) return null

  return (
    <p
      id={id}
      className={cn(
        'pointer-events-none absolute right-2 top-0 z-10 max-w-[calc(100%-1rem)] -translate-y-1/2 truncate bg-background px-1 text-[10px] font-medium leading-none text-destructive',
        className,
      )}
    >
      {message}
    </p>
  )
}

export function DxFeedConnectForm({
  onConnected,
  initialEmail,
  sourceUi = 'connect_view',
}: {
  onConnected?: () => void
  initialEmail?: string
  /** Which surface rendered this form; reported with connection analytics. */
  sourceUi?: 'connect_view' | 'credentials_manager'
}) {
  const t = useI18n()
  const { loadAccounts } = useDxFeedSyncContext()
  const [loginEmail, setLoginEmail] = useState(initialEmail ?? '')
  const [loginPassword, setLoginPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<DxFeedFieldErrors>({})
  const emailInputRef = useRef<HTMLInputElement>(null)
  const passwordInputRef = useRef<HTMLInputElement>(null)

  const clearFieldError = useCallback((field: keyof DxFeedFieldErrors) => {
    setFieldErrors((current) => {
      if (!current[field]) return current
      const next = { ...current }
      delete next[field]
      return next
    })
  }, [])

  const validateForm = useCallback(() => {
    const errors: DxFeedFieldErrors = {}

    if (!loginEmail.trim()) {
      errors.email = t('dxfeedSync.error.emailRequired')
    } else if (emailInputRef.current?.validity.typeMismatch) {
      errors.email = t('dxfeedSync.error.emailInvalid')
    }
    if (!loginPassword) {
      errors.password = t('dxfeedSync.error.passwordRequired')
    }

    setFieldErrors(errors)

    const firstInvalidControl = errors.email
      ? emailInputRef.current
      : errors.password
        ? passwordInputRef.current
        : null
    if (firstInvalidControl) {
      requestAnimationFrame(() => firstInvalidControl.focus())
    }

    return Object.keys(errors).length === 0
  }, [loginEmail, loginPassword, t])

  const handleConnect = useCallback(async () => {
    try {
      setIsLoading(true)
      const result = await authenticateDxFeed(loginEmail, loginPassword)

      if (result.error) {
        captureConnectionFailed('dxfeed', {
          source_ui: sourceUi,
          prop_firm_id: result.propFirmId,
          prop_firm_name: result.propfirmName,
          error_code: result.error,
          http_status:
            typeof result.errorParams?.status === 'number'
              ? result.errorParams.status
              : undefined,
        })
        const { title, description } = getDxFeedErrorToastContent(
          t,
          result.error,
          result.errorParams,
        )
        showToastWithCopy('error', title, {
          description,
          copyLabel: t('common.copy'),
        })
        return
      }

      showToastWithCopy('success', t('dxfeedSync.connected'), {
        copyLabel: t('common.copy'),
      })
      captureConnectionCreated('dxfeed', {
        source_ui: sourceUi,
        prop_firm_id: result.propFirmId,
        prop_firm_name: result.propfirmName,
      })
      setLoginEmail('')
      setLoginPassword('')
      setFieldErrors({})
      await loadAccounts()
      onConnected?.()
    } catch (error) {
      console.error('DxFeed connect error:', error)
      captureConnectionFailed('dxfeed', {
        source_ui: sourceUi,
        error_code: DxFeedErrorCode.AUTH_UNEXPECTED,
      })
      showToastWithCopy('error', t('dxfeedSync.error.authFailed'), {
        description: t('dxfeedSync.errors.hintCheckCredentials'),
        copyLabel: t('common.copy'),
      })
    } finally {
      setIsLoading(false)
    }
  }, [loginEmail, loginPassword, sourceUi, t, loadAccounts, onConnected])

  return (
    <form
      className="flex w-full min-w-0 flex-col space-y-5 overflow-x-hidden"
      onSubmit={(e) => {
        e.preventDefault()
        if (validateForm()) void handleConnect()
      }}
      autoComplete="on"
      noValidate
      aria-busy={isLoading}
    >
      <p className="text-sm leading-relaxed text-black/55 dark:text-white/55">
        {t('dxfeedSync.addAccount.description')}
      </p>

      <div className="min-w-0 space-y-2">
        <Label
          htmlFor="dxfeed-email"
          className="text-sm text-black/55 dark:text-white/55"
        >
          {t('dxfeedSync.addAccount.emailLabel')}
        </Label>
        <div className="relative min-w-0">
          <Input
            ref={emailInputRef}
            id="dxfeed-email"
            name="email"
            type="email"
            autoComplete="username"
            value={loginEmail}
            onChange={(e) => {
              setLoginEmail(e.target.value)
              clearFieldError('email')
            }}
            placeholder={t('dxfeedSync.addAccount.emailPlaceholder')}
            className={cn(
              fieldClassName,
              fieldErrors.email && invalidFieldClassName,
            )}
            required
            aria-invalid={Boolean(fieldErrors.email)}
            aria-describedby={
              fieldErrors.email ? 'dxfeed-email-error' : undefined
            }
          />
          <FieldBorderError
            id="dxfeed-email-error"
            message={fieldErrors.email}
          />
        </div>
      </div>

      <div className="min-w-0 space-y-2">
        <Label
          htmlFor="dxfeed-password"
          className="text-sm text-black/55 dark:text-white/55"
        >
          {t('dxfeedSync.addAccount.passwordLabel')}
        </Label>
        <div className="relative min-w-0">
          <Input
            ref={passwordInputRef}
            id="dxfeed-password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={loginPassword}
            onChange={(e) => {
              setLoginPassword(e.target.value)
              clearFieldError('password')
            }}
            placeholder={t('dxfeedSync.addAccount.passwordPlaceholder')}
            className={cn(
              fieldClassName,
              fieldErrors.password && invalidFieldClassName,
            )}
            required
            aria-invalid={Boolean(fieldErrors.password)}
            aria-describedby={
              fieldErrors.password ? 'dxfeed-password-error' : undefined
            }
          />
          <FieldBorderError
            id="dxfeed-password-error"
            message={fieldErrors.password}
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className={primaryButtonClassName}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {t('dxfeedSync.addAccount.connecting')}
          </>
        ) : (
          t('dxfeedSync.addAccount.connect')
        )}
      </button>
    </form>
  )
}
