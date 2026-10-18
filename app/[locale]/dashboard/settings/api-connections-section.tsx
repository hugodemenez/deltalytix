'use client'

import { useState, useTransition, type ComponentProps, type ReactNode } from 'react'
import { KeyRound } from 'lucide-react'
import { toast } from 'sonner'
import { useCurrentLocale, useI18n } from '@/locales/client'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  revokeAuthorizedOAuthAppAction,
  revokeSettingsPersonalAccessTokenAction,
  type OwnedOAuthAppDTO,
} from './connections-actions'
import {
  appColor,
  appInitials,
  classifyLastUsed,
  countLabelKind,
  formatConnectionDate,
  maskTokenPrefix,
  tokenLast4,
  truncateIdentifier,
} from './connections-format'
import {
  MetaSep,
  OwnedAppIcon,
  ScopeChips,
  SettingsDialog,
  dangerButtonClass,
  outlineButtonClass,
  smOutlineButtonClass,
  smPrimaryButtonClass,
} from './connections-ui'
import { AddAppDialog } from './add-app-dialog'
import { CreateTokenDialog } from './create-token-dialog'
import { HowItWorksDialog } from './how-it-works-dialog'
import { ManageAppSheet } from './manage-app-sheet'

export type AuthorizedAppRow = {
  appId: string
  name: string
  logoUrl: string | null
  scopes: string[]
  authorizedAt: string
  lastUsedAt: string | null
}

export type PersonalTokenRow = {
  id: string
  name: string | null
  scopes: string[]
  createdAt: string
  lastUsedAt: string | null
}

export type OwnedAppRow = OwnedOAuthAppDTO

function GroupHead({
  title,
  description,
  action,
}: {
  title: string
  description: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-4 bg-[#FCFCFC] px-4 py-3.5 dark:bg-muted/20">
      <div className="min-w-0">
        <p className="text-sm font-medium text-[#171717] dark:text-foreground">{title}</p>
        <div className="mt-0.5 max-w-[440px] text-xs leading-4 text-[#686D67] dark:text-muted-foreground">
          {description}
        </div>
      </div>
      {action}
    </div>
  )
}

function RowAction({
  children,
  ...props
}: ComponentProps<'button'>) {
  return (
    <button
      type="button"
      className="shrink-0 text-sm text-[#686D67] hover:text-[#171717] focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 dark:text-muted-foreground dark:hover:text-foreground"
      {...props}
    >
      {children}
    </button>
  )
}

function CenteredEmpty({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="px-4 py-7 text-center">
      <p className="text-sm font-medium text-[#171717] dark:text-foreground">{title}</p>
      <p className="mx-auto mt-1 max-w-[340px] text-xs leading-4 text-[#686D67] dark:text-muted-foreground">
        {description}
      </p>
      {action ? <div className="mt-3.5">{action}</div> : null}
    </div>
  )
}

export default function ApiConnectionsSection({
  initialAuthorizedApps,
  initialPersonalTokens,
  initialOwnedApps = [],
}: {
  initialAuthorizedApps: AuthorizedAppRow[]
  initialPersonalTokens: PersonalTokenRow[]
  initialOwnedApps?: OwnedAppRow[]
}) {
  const t = useI18n()
  const locale = useCurrentLocale()
  const [pending, startTransition] = useTransition()
  const [apps, setApps] = useState(initialAuthorizedApps)
  const [tokens, setTokens] = useState(initialPersonalTokens)
  const [owned, setOwned] = useState(initialOwnedApps)
  const [tokenSuffixes, setTokenSuffixes] = useState<Record<string, string>>({})
  const [freshTokenId, setFreshTokenId] = useState<string | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [howOpen, setHowOpen] = useState(false)
  const [tokenOpen, setTokenOpen] = useState(false)
  const [manageId, setManageId] = useState<string | null>(null)
  const [revokeApp, setRevokeApp] = useState<AuthorizedAppRow | null>(null)
  const [revokeToken, setRevokeToken] = useState<PersonalTokenRow | null>(null)

  const managed = owned.find((app) => app.id === manageId) ?? null

  function usersPhrase(count: number) {
    const kind = countLabelKind(count)
    if (kind === 'none') return t('dashboard.settings.connections.usersNone')
    if (kind === 'one') return t('dashboard.settings.connections.usersOne')
    return t('dashboard.settings.connections.usersMany', { count: String(count) })
  }

  function lastUsedPhrase(iso: string | null) {
    const kind = classifyLastUsed(iso)
    if (kind.kind === 'never') return t('dashboard.settings.connections.lastUsedNever')
    const when =
      kind.kind === 'justNow'
        ? t('dashboard.settings.connections.lastUsedJustNow')
        : kind.kind === 'yesterday'
          ? t('dashboard.settings.connections.lastUsedYesterday')
          : kind.kind === 'minutes'
            ? kind.count === 1
              ? t('dashboard.settings.connections.lastUsedMinute')
              : t('dashboard.settings.connections.lastUsedMinutes', { count: String(kind.count) })
            : kind.kind === 'hours'
              ? kind.count === 1
                ? t('dashboard.settings.connections.lastUsedHour')
                : t('dashboard.settings.connections.lastUsedHours', { count: String(kind.count) })
              : formatConnectionDate(iso ?? '', locale)
    return t('dashboard.settings.connections.lastUsed', { when })
  }

  function openTokenDialog() {
    setAddOpen(false)
    setHowOpen(false)
    setTokenOpen(true)
  }

  return (
    <section id="connections" className="scroll-mt-24">
      <h2 className="mb-3 text-xs font-medium text-[#686D67] dark:text-muted-foreground">
        {t('dashboard.settings.connections')}
      </h2>
      <div className="divide-y divide-[#E5E5E5] overflow-hidden rounded-[4px] border border-[#E5E5E5] bg-white dark:divide-border dark:border-border dark:bg-card">
        <GroupHead
          title={t('dashboard.settings.connections.yourApps')}
          description={
            <>
              {t('dashboard.settings.connections.yourApps.description')}{' '}
              <button
                type="button"
                className="text-xs text-[#686D67] underline decoration-[#D4D4D4] underline-offset-[3px] hover:text-[#171717] dark:text-muted-foreground dark:hover:text-foreground"
                onClick={() => setHowOpen(true)}
              >
                {t('dashboard.settings.connections.howItWorks')}
              </button>
            </>
          }
          action={
            owned.length > 0 ? (
              <Button
                type="button"
                variant="outline"
                className={smOutlineButtonClass}
                onClick={() => setAddOpen(true)}
              >
                {t('dashboard.settings.connections.addApp')}
              </Button>
            ) : null
          }
        />
        {owned.length === 0 ? (
          <div className="flex items-center justify-between gap-4 px-4 py-5">
            <div>
              <p className="text-[13px] leading-[18px] text-[#686D67] dark:text-muted-foreground">
                {t('dashboard.settings.connections.yourApps.empty')}
              </p>
              <p className="mt-0.5 text-xs text-[#A3A3A3]">
                {t('dashboard.settings.connections.yourApps.emptyExample')}
              </p>
            </div>
            <Button
              type="button"
              className={cn(smPrimaryButtonClass, 'shrink-0')}
              onClick={() => setAddOpen(true)}
            >
              {t('dashboard.settings.connections.addApp')}
            </Button>
          </div>
        ) : (
          owned.map((app) => (
            <div key={app.id} className="flex items-start gap-3 px-4 py-3.5">
              <OwnedAppIcon />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="flex min-w-0 flex-wrap items-baseline gap-2 text-sm font-medium text-[#171717] dark:text-foreground">
                    <span className="truncate">{app.name}</span>
                    <span className="font-mono text-xs font-normal text-[#686D67] dark:text-muted-foreground">
                      {truncateIdentifier(app.clientId)}
                    </span>
                  </p>
                  <RowAction onClick={() => setManageId(app.id)}>
                    {t('dashboard.settings.connections.manage')}
                  </RowAction>
                </div>
                <ScopeChips scopes={app.scopes} />
                <p className="mt-1.5 text-xs leading-4 text-[#686D67] dark:text-muted-foreground">
                  {t('dashboard.settings.connections.created', {
                    date: formatConnectionDate(app.createdAt, locale),
                  })}
                  <MetaSep />
                  {usersPhrase(app.connectedUserCount)}
                </p>
              </div>
            </div>
          ))
        )}

        <GroupHead
          title={t('dashboard.settings.connections.authorizedApps')}
          description={t('dashboard.settings.connections.authorizedApps.description')}
        />
        {apps.length === 0 ? (
          <CenteredEmpty
            title={t('dashboard.settings.connections.authorizedEmpty.title')}
            description={t('dashboard.settings.connections.authorizedEmpty.description')}
          />
        ) : (
          apps.map((app) => (
            <div key={app.appId} className="flex items-start gap-3 px-4 py-3.5">
              <AppMark name={app.name} logoUrl={app.logoUrl} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="truncate text-sm font-medium text-[#171717] dark:text-foreground">
                    {app.name || t('dashboard.settings.connections.untitled')}
                  </p>
                  <RowAction disabled={pending} onClick={() => setRevokeApp(app)}>
                    {t('dashboard.settings.connections.revoke')}
                  </RowAction>
                </div>
                <ScopeChips scopes={app.scopes} />
                <p className="mt-1.5 text-xs leading-4 text-[#686D67] dark:text-muted-foreground">
                  {t('dashboard.settings.connections.authorizedOn', {
                    date: formatConnectionDate(app.authorizedAt, locale),
                  })}
                  <MetaSep />
                  {lastUsedPhrase(app.lastUsedAt)}
                </p>
              </div>
            </div>
          ))
        )}

        <GroupHead
          title={t('dashboard.settings.connections.tokens')}
          description={t('dashboard.settings.connections.tokens.description')}
          action={
            tokens.length > 0 ? (
              <Button
                type="button"
                variant="outline"
                className={smOutlineButtonClass}
                onClick={() => setTokenOpen(true)}
              >
                {t('dashboard.settings.connections.createToken')}
              </Button>
            ) : null
          }
        />
        {tokens.length === 0 ? (
          <CenteredEmpty
            title={t('dashboard.settings.connections.tokensEmpty.title')}
            description={t('dashboard.settings.connections.tokensEmpty.description')}
            action={
              <Button type="button" className={smPrimaryButtonClass} onClick={() => setTokenOpen(true)}>
                {t('dashboard.settings.connections.createToken')}
              </Button>
            }
          />
        ) : (
          tokens.map((token) => {
            const isNew = token.id === freshTokenId
            return (
              <div
                key={token.id}
                className={cn(
                  'flex items-start gap-3 px-4 py-3.5',
                  isNew && 'bg-[#F7FBF6] dark:bg-emerald-950/20',
                )}
              >
                <span className="mt-px flex size-7 shrink-0 items-center justify-center rounded-[4px] border border-[#E5E5E5] bg-[#F5F5F5] text-[#686D67] dark:border-border dark:bg-muted dark:text-muted-foreground">
                  <KeyRound className="size-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="flex min-w-0 flex-wrap items-baseline gap-2 text-sm font-medium text-[#171717] dark:text-foreground">
                      <span className="truncate">
                        {token.name || t('dashboard.settings.connections.untitled')}
                      </span>
                      <span className="font-mono text-xs font-normal text-[#686D67] dark:text-muted-foreground">
                        {maskTokenPrefix(tokenSuffixes[token.id])}
                      </span>
                      {isNew ? (
                        <span className="rounded-[4px] bg-[#EFF5EC] px-1.5 text-[11px] font-medium leading-4 text-[#2F5A2A]">
                          {t('dashboard.settings.connections.new')}
                        </span>
                      ) : null}
                    </p>
                    <RowAction disabled={pending} onClick={() => setRevokeToken(token)}>
                      {t('dashboard.settings.connections.revoke')}
                    </RowAction>
                  </div>
                  <ScopeChips scopes={token.scopes} />
                  <p className="mt-1.5 text-xs leading-4 text-[#686D67] dark:text-muted-foreground">
                    {t('dashboard.settings.connections.created', {
                      date: formatConnectionDate(token.createdAt, locale),
                    })}
                    <MetaSep />
                    {lastUsedPhrase(token.lastUsedAt)}
                  </p>
                </div>
              </div>
            )
          })
        )}
      </div>

      <AddAppDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onCreated={(app) => setOwned((current) => [app, ...current.filter((item) => item.id !== app.id)])}
        onUseToken={openTokenDialog}
      />
      <HowItWorksDialog open={howOpen} onOpenChange={setHowOpen} onUseToken={openTokenDialog} />
      <CreateTokenDialog
        open={tokenOpen}
        onOpenChange={setTokenOpen}
        onCreated={(created) => {
          setFreshTokenId(created.id)
          setTokenSuffixes((current) => ({
            ...current,
            [created.id]: tokenLast4(created.token),
          }))
          setTokens((current) => [
            {
              id: created.id,
              name: created.name,
              scopes: created.scopes,
              createdAt: new Date().toISOString(),
              lastUsedAt: null,
            },
            ...current.filter((token) => token.id !== created.id),
          ])
        }}
      />
      {managed ? (
        <ManageAppSheet
          key={managed.id}
          app={managed}
          open
          onOpenChange={(next) => {
            if (!next) setManageId(null)
          }}
          onUpdated={(app) =>
            setOwned((current) => current.map((item) => (item.id === app.id ? app : item)))
          }
          onDeleted={(id) => {
            setOwned((current) => current.filter((item) => item.id !== id))
            setManageId(null)
          }}
        />
      ) : null}

      <SettingsDialog
        open={revokeApp !== null}
        onOpenChange={(next) => {
          if (!next) setRevokeApp(null)
        }}
        title={t('dashboard.settings.connections.revokeApp.title', {
          name: revokeApp?.name || t('dashboard.settings.connections.untitled'),
        })}
        description={t('dashboard.settings.connections.revokeApp.description', {
          name: revokeApp?.name || t('dashboard.settings.connections.untitled'),
        })}
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              className={outlineButtonClass}
              onClick={() => setRevokeApp(null)}
              disabled={pending}
            >
              {t('dashboard.settings.connections.cancel')}
            </Button>
            <Button
              type="button"
              className={dangerButtonClass}
              disabled={pending || !revokeApp}
              onClick={() => {
                if (!revokeApp) return
                const target = revokeApp
                startTransition(async () => {
                  try {
                    const result = await revokeAuthorizedOAuthAppAction(target.appId)
                    if (result.revokedTokenCount === 0) {
                      toast.error(t('dashboard.settings.connections.revokeFailed'))
                      return
                    }
                    setApps((current) => current.filter((app) => app.appId !== target.appId))
                    setRevokeApp(null)
                  } catch {
                    toast.error(t('dashboard.settings.connections.revokeFailed'))
                  }
                })
              }}
            >
              {t('dashboard.settings.connections.revokeAccess')}
            </Button>
          </>
        }
      />

      <SettingsDialog
        open={revokeToken !== null}
        onOpenChange={(next) => {
          if (!next) setRevokeToken(null)
        }}
        title={t('dashboard.settings.connections.revokeToken.title', {
          name: revokeToken?.name || t('dashboard.settings.connections.untitled'),
        })}
        description={t('dashboard.settings.connections.revokeToken.description')}
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              className={outlineButtonClass}
              onClick={() => setRevokeToken(null)}
              disabled={pending}
            >
              {t('dashboard.settings.connections.cancel')}
            </Button>
            <Button
              type="button"
              className={dangerButtonClass}
              disabled={pending || !revokeToken}
              onClick={() => {
                if (!revokeToken) return
                const target = revokeToken
                startTransition(async () => {
                  try {
                    const result = await revokeSettingsPersonalAccessTokenAction(target.id)
                    if (!result.revoked) {
                      toast.error(t('dashboard.settings.connections.revokeFailed'))
                      return
                    }
                    setTokens((current) => current.filter((token) => token.id !== target.id))
                    setRevokeToken(null)
                  } catch {
                    toast.error(t('dashboard.settings.connections.revokeFailed'))
                  }
                })
              }}
            >
              {t('dashboard.settings.connections.revokeToken.action')}
            </Button>
          </>
        }
      />
    </section>
  )
}

function AppMark({ name, logoUrl }: { name: string; logoUrl: string | null }) {
  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- third-party OAuth logos are arbitrary hosts
      <img
        src={logoUrl}
        alt=""
        width={28}
        height={28}
        className="mt-px size-7 shrink-0 rounded-[4px] object-cover"
      />
    )
  }
  return (
    <span
      aria-hidden
      className="mt-px flex size-7 shrink-0 items-center justify-center rounded-[4px] text-xs font-semibold text-white"
      style={{ backgroundColor: appColor(name || '?') }}
    >
      {appInitials(name || '?')}
    </span>
  )
}
