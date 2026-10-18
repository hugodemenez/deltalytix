'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useI18n } from '@/locales/client'
import { Button } from '@/components/ui/button'
import type { ApiScope } from '@/lib/api/scopes'
import { useIsMobile } from '@/hooks/use-mobile'
import { createPersonalAccessTokenAction } from '../developers/actions'
import { defaultReadScopes, localizeOAuthAppMessage } from './connections-format'
import {
  CopyValue,
  NameField,
  oauthAppErrorTranslator,
  ScopeChips,
  ScopePicker,
  SettingsDialog,
  outlineButtonClass,
  primaryButtonClass,
  toggleScope,
} from './connections-ui'

export type CreatedToken = {
  id: string
  name: string
  scopes: string[]
  token: string
}

export function CreateTokenDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (token: CreatedToken) => void
}) {
  const t = useI18n()
  const isMobile = useIsMobile()
  const [name, setName] = useState('')
  const [scopes, setScopes] = useState<string[]>(defaultReadScopes())
  const [nameError, setNameError] = useState<string>()
  const [scopeError, setScopeError] = useState<string>()
  const [pending, setPending] = useState(false)
  const [created, setCreated] = useState<CreatedToken | null>(null)

  useEffect(() => {
    if (!open) return
    setName('')
    setScopes(defaultReadScopes())
    setNameError(undefined)
    setScopeError(undefined)
    setPending(false)
    setCreated(null)
  }, [open])

  async function createToken() {
    const trimmed = name.trim()
    if (!trimmed) {
      setNameError(t('validation.nameRequired'))
      return
    }
    if (scopes.length === 0) {
      setScopeError(t('validation.scopesRequired'))
      return
    }
    setNameError(undefined)
    setScopeError(undefined)
    setPending(true)
    try {
      const result = await createPersonalAccessTokenAction({
        name: trimmed,
        scopes,
      })
      const token: CreatedToken = {
        id: result.id,
        name: trimmed,
        scopes,
        token: result.token,
      }
      setCreated(token)
      onCreated(token)
    } catch (error) {
      const raw = error instanceof Error ? error.message : ''
      const message = localizeOAuthAppMessage(raw, oauthAppErrorTranslator(t))
      if (raw.toLowerCase().includes('name')) setNameError(message)
      else if (raw.toLowerCase().includes('scope')) setScopeError(message)
      else toast.error(message || t('dashboard.settings.connections.tokenFailed'))
    } finally {
      setPending(false)
    }
  }

  return (
    <SettingsDialog
      open={open}
      onOpenChange={onOpenChange}
      wide={!created}
      title={
        created
          ? t('dashboard.settings.connections.copyToken.title')
          : t('dashboard.settings.connections.createToken')
      }
      description={
        created
          ? t('dashboard.settings.connections.copyToken.description')
          : t('dashboard.settings.connections.tokens.description')
      }
      footer={
        created ? (
          <Button type="button" className={primaryButtonClass} onClick={() => onOpenChange(false)}>
            {t('dashboard.settings.connections.done')}
          </Button>
        ) : (
          <>
            <Button
              type="button"
              variant="outline"
              className={outlineButtonClass}
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              {t('dashboard.settings.connections.cancel')}
            </Button>
            <Button
              type="button"
              className={primaryButtonClass}
              disabled={pending}
              onClick={() => void createToken()}
            >
              {t('dashboard.settings.connections.createToken')}
            </Button>
          </>
        )
      }
    >
      {created ? (
        <>
          <CopyValue value={created.token} />
          <div className="mt-4 overflow-hidden rounded-[4px] border border-[#E5E5E5] dark:border-border">
            <div className="flex items-center justify-between gap-3 px-3 py-2.5 text-[13px]">
              <span className="text-[#686D67] dark:text-muted-foreground">
                {t('dashboard.settings.connections.name')}
              </span>
              <span className="font-medium">{created.name}</span>
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-[#E5E5E5] px-3 py-2.5 text-[13px] dark:border-border">
              <span className="text-[#686D67] dark:text-muted-foreground">
                {t('dashboard.settings.connections.scopes')}
              </span>
              <ScopeChips scopes={created.scopes} className="mt-0 justify-end" />
            </div>
          </div>
        </>
      ) : (
        <>
          <NameField value={name} onChange={setName} error={nameError} autoFocus />
          <ScopePicker
            selected={scopes}
            stacked={isMobile}
            onToggle={(scope: ApiScope) => {
              setScopes((current) => toggleScope(current, scope))
              setScopeError(undefined)
            }}
          />
          {scopeError ? (
            <p className="mt-2.5 text-xs leading-4 text-[#DC2626]">{scopeError}</p>
          ) : null}
        </>
      )}
    </SettingsDialog>
  )
}
