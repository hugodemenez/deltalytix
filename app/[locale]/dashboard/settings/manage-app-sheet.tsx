'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { useCurrentLocale, useI18n } from '@/locales/client'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { useIsMobile } from '@/hooks/use-mobile'
import { cn } from '@/lib/utils'
import { validateOAuthAppInput } from '@/lib/api/oauth-app-input'
import type { OAuthAppFieldError } from '@/lib/api/oauth-app-input'
import type { ApiScope } from '@/lib/api/scopes'
import {
  deleteOwnedOAuthAppAction,
  rotateOwnedOAuthAppSecretAction,
  updateOwnedOAuthAppAction,
  type OwnedOAuthAppDTO,
} from './connections-actions'
import {
  countLabelKind,
  draftFromApp,
  draftsEqual,
  fieldErrorMessage,
  formatConnectionDate,
  secretRotatedSource,
  type AppDraft,
} from './connections-format'
import {
  CopyValue,
  DescriptionField,
  InfoCallout,
  NameField,
  RedirectUriEditor,
  ScopePicker,
  SettingsDialog,
  dangerButtonClass,
  outlineButtonClass,
  primaryButtonClass,
  smOutlineButtonClass,
  toggleScope,
} from './connections-ui'

export function ManageAppSheet({
  app,
  open,
  onOpenChange,
  onUpdated,
  onDeleted,
}: {
  app: OwnedOAuthAppDTO
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdated: (app: OwnedOAuthAppDTO) => void
  onDeleted: (id: string) => void
}) {
  const t = useI18n()
  const locale = useCurrentLocale()
  const isMobile = useIsMobile()
  const [draft, setDraft] = useState<AppDraft>(() => draftFromApp(app))
  const [saved, setSaved] = useState<AppDraft>(() => draftFromApp(app))
  const [errors, setErrors] = useState<OAuthAppFieldError[]>([])
  const [pending, setPending] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [confirmRotate, setConfirmRotate] = useState(false)
  const [newSecret, setNewSecret] = useState<string | null>(null)
  const dirty = !draftsEqual(draft, saved)
  const rotatedAt = formatConnectionDate(secretRotatedSource(app), locale)
  const createdAt = formatConnectionDate(app.createdAt, locale)

  function usersPhrase(count: number) {
    const kind = countLabelKind(count)
    if (kind === 'none') return t('dashboard.settings.connections.usersNone')
    if (kind === 'one') return t('dashboard.settings.connections.usersOne')
    return t('dashboard.settings.connections.usersMany', { count: String(count) })
  }

  async function save() {
    const parsed = validateOAuthAppInput(
      {
        name: draft.name,
        description: draft.description,
        redirectUris: draft.redirectUris,
        scopes: draft.scopes,
      },
      'update',
    )
    if (!parsed.ok) {
      setErrors(parsed.errors)
      return
    }
    setPending(true)
    try {
      const result = await updateOwnedOAuthAppAction(app.id, parsed.value)
      if (!result.ok) {
        if (result.code === 'invalid') setErrors(result.errors)
        else toast.error(t('dashboard.settings.connections.notFound'))
        return
      }
      const next = draftFromApp(result.app)
      setDraft(next)
      setSaved(next)
      setErrors([])
      onUpdated(result.app)
    } catch {
      toast.error(t('dashboard.settings.connections.saveFailed'))
    } finally {
      setPending(false)
    }
  }

  async function rotate() {
    setPending(true)
    try {
      const result = await rotateOwnedOAuthAppSecretAction(app.id)
      if (!result.ok) {
        toast.error(t('dashboard.settings.connections.notFound'))
        return
      }
      setConfirmRotate(false)
      setNewSecret(result.clientSecret)
      onUpdated({ ...app, secretRotatedAt: result.secretRotatedAt })
    } catch {
      toast.error(t('dashboard.settings.connections.saveFailed'))
    } finally {
      setPending(false)
    }
  }

  async function remove() {
    setPending(true)
    try {
      const result = await deleteOwnedOAuthAppAction(app.id)
      if (!result.ok) {
        toast.error(t('dashboard.settings.connections.notFound'))
        return
      }
      setConfirmDelete(false)
      onDeleted(app.id)
    } catch {
      toast.error(t('dashboard.settings.connections.saveFailed'))
    } finally {
      setPending(false)
    }
  }

  const deleteBody =
    countLabelKind(app.connectedUserCount) === 'none'
      ? t('dashboard.settings.connections.delete.none', { name: app.name })
      : countLabelKind(app.connectedUserCount) === 'one'
        ? t('dashboard.settings.connections.delete.one', { name: app.name })
        : t('dashboard.settings.connections.delete.many', {
            name: app.name,
            count: String(app.connectedUserCount),
          })

  const deleteHint =
    countLabelKind(app.connectedUserCount) === 'none'
      ? t('dashboard.settings.connections.deleteHint.none')
      : countLabelKind(app.connectedUserCount) === 'one'
        ? t('dashboard.settings.connections.deleteHint.one')
        : t('dashboard.settings.connections.deleteHint.many', {
            count: String(app.connectedUserCount),
          })

  const notice =
    app.connectedUserCount === 1
      ? t('dashboard.settings.connections.scopeNotice.one')
      : t('dashboard.settings.connections.scopeNotice.many', {
          count: String(app.connectedUserCount),
        })

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side={isMobile ? 'bottom' : 'right'}
          className={cn(
            'flex flex-col gap-0 p-0',
            isMobile
              ? 'top-6 h-auto max-h-none rounded-t-lg border-[#E5E5E5] dark:border-border [&>button]:top-7'
              : 'h-full border-l border-[#E5E5E5] sm:w-[520px] sm:max-w-[520px] dark:border-border',
          )}
        >
          <SheetHeader
            className={cn(
              'space-y-0 border-b border-[#E5E5E5] text-left dark:border-border',
              isMobile ? 'px-4 pb-3.5 pt-3' : 'px-6 pb-4 pt-6',
            )}
          >
            {isMobile ? (
              <div className="mx-auto mb-3.5 h-1 w-9 -mt-1 rounded-full bg-[#E5E5E5] dark:bg-border" />
            ) : null}
            <SheetTitle className="pr-8 text-left text-[18px] font-semibold leading-[18px] tracking-[-0.01em]">
              {app.name}
            </SheetTitle>
            <SheetDescription className="mt-2 text-left text-sm leading-5 text-[#686D67] dark:text-muted-foreground">
              {usersPhrase(app.connectedUserCount)}
              <span className="mx-1.5 text-[#C4C4C4]">·</span>
              {t('dashboard.settings.connections.created', { date: createdAt })}
            </SheetDescription>
          </SheetHeader>

          <div className={cn('min-h-0 flex-1 overflow-y-auto', isMobile ? 'px-4' : 'px-6')}>
            <section className="py-5">
              <h3 className="text-sm font-semibold leading-5">
                {t('dashboard.settings.connections.details')}
              </h3>
              <NameField
                value={draft.name}
                onChange={(name) => setDraft((current) => ({ ...current, name }))}
                error={fieldErrorMessage(errors, 'name')}
              />
              <DescriptionField
                value={draft.description}
                onChange={(description) =>
                  setDraft((current) => ({ ...current, description }))
                }
                error={fieldErrorMessage(errors, 'description')}
              />
            </section>

            <section className="border-t border-[#E5E5E5] py-5 dark:border-border">
              <h3 className="text-sm font-semibold leading-5">
                {t('dashboard.settings.connections.redirects.title')}
              </h3>
              <p className="mt-0.5 text-xs leading-4 text-[#686D67] dark:text-muted-foreground">
                {t('dashboard.settings.connections.redirects.manageDescription')}
              </p>
              <RedirectUriEditor
                uris={draft.redirectUris}
                onChange={(redirectUris) =>
                  setDraft((current) => ({ ...current, redirectUris }))
                }
                errors={errors}
                hint={
                  draft.redirectUris.length <= 1
                    ? t('dashboard.settings.connections.redirects.oneRequired')
                    : t('dashboard.settings.connections.redirects.manageHint')
                }
              />
            </section>

            <section className="border-t border-[#E5E5E5] py-5 dark:border-border">
              <h3 className="text-sm font-semibold leading-5">
                {t('dashboard.settings.connections.permissions.title')}
              </h3>
              <p className="mt-0.5 text-xs leading-4 text-[#686D67] dark:text-muted-foreground">
                {t('dashboard.settings.connections.permissions.manageDescription')}
              </p>
              <ScopePicker
                selected={draft.scopes}
                original={saved.scopes}
                stacked={isMobile}
                onToggle={(scope: ApiScope) =>
                  setDraft((current) => ({
                    ...current,
                    scopes: toggleScope(current.scopes, scope),
                  }))
                }
              />
              {fieldErrorMessage(errors, 'scopes') ? (
                <p className="mt-2.5 text-xs leading-4 text-[#DC2626]">
                  {fieldErrorMessage(errors, 'scopes')}
                </p>
              ) : null}
              <InfoCallout>
                <span className="font-medium text-[#171717] dark:text-foreground">
                  {t('dashboard.settings.connections.scopeNoticeLead')}
                </span>{' '}
                {notice}
              </InfoCallout>
            </section>

            <section className="border-t border-[#E5E5E5] py-5 dark:border-border">
              <h3 className="text-sm font-semibold leading-5">
                {t('dashboard.settings.connections.credentials')}
              </h3>
              <CopyValue
                label={t('dashboard.settings.connections.clientId')}
                value={app.clientId}
                compact
              />
              <div className="mt-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[13px] font-medium text-[#171717] dark:text-foreground">
                    {t('dashboard.settings.connections.clientSecret')}
                  </p>
                  <p className="mt-0.5 text-xs leading-4 text-[#686D67] dark:text-muted-foreground">
                    {t('dashboard.settings.connections.secretRotated', { date: rotatedAt })}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className={smOutlineButtonClass}
                  onClick={() => setConfirmRotate(true)}
                >
                  {t('dashboard.settings.connections.generateSecret')}
                </Button>
              </div>
            </section>

            <section className="border-t border-[#E5E5E5] py-5 dark:border-border">
              <h3 className="text-sm font-semibold leading-5">
                {t('dashboard.settings.connections.deleteApp')}
              </h3>
              <div className="mt-1 flex items-center justify-between gap-3">
                <p className="text-xs leading-4 text-[#686D67] dark:text-muted-foreground">
                  {deleteHint}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className={smOutlineButtonClass}
                  onClick={() => setConfirmDelete(true)}
                >
                  {t('dashboard.settings.connections.deleteApp')}
                </Button>
              </div>
              {fieldErrorMessage(errors, 'form') ? (
                <p className="mt-2 text-xs leading-4 text-[#DC2626]">
                  {fieldErrorMessage(errors, 'form')}
                </p>
              ) : null}
            </section>
          </div>

          <div
            className={cn(
              'border-t border-[#E5E5E5] bg-white dark:border-border dark:bg-background',
              isMobile
                ? 'flex flex-col gap-2 px-4 pb-5 pt-3'
                : 'flex items-center justify-between gap-2 px-6 py-4',
            )}
          >
            {isMobile ? null : (
              <span className="text-xs text-[#686D67] dark:text-muted-foreground">
                {dirty ? t('dashboard.settings.connections.unsaved') : null}
              </span>
            )}
            <div className={cn('flex gap-2', isMobile && 'flex-col')}>
              {isMobile ? (
                <Button
                  type="button"
                  className={cn(primaryButtonClass, 'w-full')}
                  disabled={!dirty || pending}
                  onClick={() => void save()}
                >
                  {t('dashboard.settings.connections.save')}
                </Button>
              ) : null}
              <Button
                type="button"
                variant="outline"
                className={cn(outlineButtonClass, isMobile && 'w-full')}
                onClick={() => onOpenChange(false)}
              >
                {t('dashboard.settings.connections.cancel')}
              </Button>
              {isMobile ? null : (
                <Button
                  type="button"
                  className={primaryButtonClass}
                  disabled={!dirty || pending}
                  onClick={() => void save()}
                >
                  {t('dashboard.settings.connections.save')}
                </Button>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <SettingsDialog
        open={confirmRotate}
        onOpenChange={setConfirmRotate}
        title={t('dashboard.settings.connections.rotate.title')}
        description={t('dashboard.settings.connections.rotate.description')}
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              className={outlineButtonClass}
              onClick={() => setConfirmRotate(false)}
              disabled={pending}
            >
              {t('dashboard.settings.connections.cancel')}
            </Button>
            <Button
              type="button"
              className={dangerButtonClass}
              disabled={pending}
              onClick={() => void rotate()}
            >
              {t('dashboard.settings.connections.generateSecret')}
            </Button>
          </>
        }
      />

      <SettingsDialog
        open={newSecret !== null}
        onOpenChange={(next) => {
          if (!next) setNewSecret(null)
        }}
        title={t('dashboard.settings.connections.rotateDone.title')}
        description={t('dashboard.settings.connections.rotateDone.description')}
        footer={
          <Button
            type="button"
            className={primaryButtonClass}
            onClick={() => setNewSecret(null)}
          >
            {t('dashboard.settings.connections.done')}
          </Button>
        }
      >
        {newSecret ? (
          <CopyValue
            label={t('dashboard.settings.connections.clientSecret')}
            value={newSecret}
            once={t('dashboard.settings.connections.shownOnce')}
            compact
          />
        ) : null}
      </SettingsDialog>

      <SettingsDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={t('dashboard.settings.connections.delete.title', { name: app.name })}
        description={deleteBody}
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              className={outlineButtonClass}
              onClick={() => setConfirmDelete(false)}
              disabled={pending}
            >
              {t('dashboard.settings.connections.cancel')}
            </Button>
            <Button
              type="button"
              className={dangerButtonClass}
              disabled={pending}
              onClick={() => void remove()}
            >
              {t('dashboard.settings.connections.deleteApp')}
            </Button>
          </>
        }
      />
    </>
  )
}
