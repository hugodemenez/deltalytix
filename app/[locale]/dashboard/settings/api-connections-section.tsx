'use client'

import { useState, useTransition, type ReactNode } from 'react'
import { KeyRound } from 'lucide-react'
import { toast } from 'sonner'
import { useCurrentLocale, useI18n } from '@/locales/client'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  revokeAuthorizedOAuthAppAction,
  revokeSettingsPersonalAccessTokenAction,
} from './connections-actions'
import {
  appColor,
  appInitials,
  classifyLastUsed,
  formatConnectionDate,
  maskTokenPrefix,
  tokenLast4,
} from './connections-format'
import {
  GroupHead,
  MetaSep,
  RowAction,
  ScopeChips,
  SettingsDialog,
  TextLink,
  dangerButtonClass,
  outlineButtonClass,
  smOutlineButtonClass,
  smPrimaryButtonClass,
} from './connections-ui'
import { CreateTokenDialog } from './create-token-dialog'

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
  ownedAppCount = 0,
}: {
  initialAuthorizedApps: AuthorizedAppRow[]
  initialPersonalTokens: PersonalTokenRow[]
  /** Apps this user registered. They are managed on /dashboard/developers. */
  ownedAppCount?: number
}) {
  const t = useI18n()
  const locale = useCurrentLocale()
  const [pending, startTransition] = useTransition()
  const [apps, setApps] = useState(initialAuthorizedApps)
  const [tokens, setTokens] = useState(initialPersonalTokens)
  const [tokenSuffixes, setTokenSuffixes] = useState<Record<string, string>>({})
  const [freshTokenId, setFreshTokenId] = useState<string | null>(null)
  const [tokenOpen, setTokenOpen] = useState(false)
  const [revokeApp, setRevokeApp] = useState<AuthorizedAppRow | null>(null)
  const [revokeToken, setRevokeToken] = useState<PersonalTokenRow | null>(null)

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

  return (
    <section id="connections" className="scroll-mt-24">
      <h2 className="mb-3 text-xs font-medium text-[#686D67] dark:text-muted-foreground">
        {t('dashboard.settings.connections')}
      </h2>
      <div className="divide-y divide-[#E5E5E5] overflow-hidden rounded-[4px] border border-[#E5E5E5] bg-white dark:divide-border dark:border-border dark:bg-card">
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
      </div>

      <p className="mt-3 text-xs leading-4 text-[#A3A3A3] dark:text-muted-foreground">
        {t('dashboard.settings.connections.developerLine.before')}{' '}
        <TextLink href={`/${locale}/docs`} className="text-xs">
          {t('dashboard.settings.connections.developerLine.docs')}
        </TextLink>
        {ownedAppCount > 0 ? (
          <>
            <MetaSep />
            <TextLink href={`/${locale}/dashboard/developers`} className="text-xs">
              {t('dashboard.settings.connections.developerLine.yourApps')}
            </TextLink>
          </>
        ) : null}
      </p>

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
