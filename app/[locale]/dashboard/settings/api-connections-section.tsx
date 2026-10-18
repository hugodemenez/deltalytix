'use client'

import { useState, useTransition, type ReactNode } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { useI18n } from '@/locales/client'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  revokeAuthorizedOAuthAppAction,
  revokeSettingsPersonalAccessTokenAction,
} from './connections-actions'

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

function PrefRow({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex items-start justify-between gap-4 px-4 py-3.5',
        className
      )}
    >
      {children}
    </div>
  )
}

function RowAction({
  children,
  className,
  ...props
}: React.ComponentProps<'button'>) {
  return (
    <button
      type="button"
      className={cn(
        'shrink-0 text-sm text-[#686D67] transition-colors hover:text-[#171717] focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 dark:text-muted-foreground dark:hover:text-foreground',
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}

function AppLogo({ name, logoUrl }: { name: string; logoUrl: string | null }) {
  const initial = (name.trim()[0] || '?').toUpperCase()
  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- third-party OAuth logos are arbitrary hosts
      <img
        src={logoUrl}
        alt=""
        width={32}
        height={32}
        className="size-8 shrink-0 rounded-[4px] border border-[#E5E5E5] object-cover dark:border-border"
      />
    )
  }
  return (
    <div
      aria-hidden
      className="flex size-8 shrink-0 items-center justify-center rounded-[4px] border border-[#E5E5E5] bg-[#F5F5F5] text-xs font-medium text-[#171717] dark:border-border dark:bg-muted dark:text-foreground"
    >
      {initial}
    </div>
  )
}

function formatDate(value: string) {
  return new Date(value).toLocaleString()
}

export default function ApiConnectionsSection({
  initialAuthorizedApps,
  initialPersonalTokens,
}: {
  initialAuthorizedApps: AuthorizedAppRow[]
  initialPersonalTokens: PersonalTokenRow[]
}) {
  const t = useI18n()
  const [pending, startTransition] = useTransition()
  const [apps, setApps] = useState(initialAuthorizedApps)
  const [tokens, setTokens] = useState(initialPersonalTokens)

  return (
    <section id="api-connections" className="scroll-mt-24 space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-xs font-medium text-[#686D67] dark:text-muted-foreground">
            {t('dashboard.settings.apiConnections')}
          </h2>
          <p className="mt-1 text-xs text-[#686D67] dark:text-muted-foreground">
            {t('dashboard.settings.apiConnections.description')}
          </p>
        </div>
        <Link
          href="/dashboard/developers"
          className="shrink-0 text-sm text-[#686D67] transition-colors hover:text-[#171717] focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:text-muted-foreground dark:hover:text-foreground"
        >
          {t('dashboard.settings.apiConnections.manageDevelopers')}
        </Link>
      </div>

      <div className="overflow-hidden rounded-[4px] border border-[#E5E5E5] bg-white dark:border-border dark:bg-card">
        <div className="border-b border-[#E5E5E5] px-4 py-2.5 dark:border-border">
          <p className="text-xs font-medium text-[#171717] dark:text-foreground">
            {t('dashboard.settings.apiConnections.authorizedApps')}
          </p>
        </div>
        {apps.length === 0 ? (
          <p className="px-4 py-3.5 text-sm text-[#686D67] dark:text-muted-foreground">
            {t('dashboard.settings.apiConnections.authorizedEmpty')}
          </p>
        ) : (
          <div className="divide-y divide-[#E5E5E5] dark:divide-border">
            {apps.map((app) => (
              <PrefRow key={app.appId}>
                <div className="flex min-w-0 items-start gap-3">
                  <AppLogo name={app.name} logoUrl={app.logoUrl} />
                  <div className="min-w-0 space-y-1">
                    <p className="truncate text-sm font-medium text-[#171717] dark:text-foreground">
                      {app.name || t('dashboard.settings.apiConnections.untitledApp')}
                    </p>
                    <p className="text-xs text-[#686D67] dark:text-muted-foreground">
                      {t('dashboard.settings.apiConnections.authorizedOn', {
                        date: formatDate(app.authorizedAt),
                      })}
                      {' · '}
                      {app.lastUsedAt
                        ? t('dashboard.settings.apiConnections.lastUsed', {
                            date: formatDate(app.lastUsedAt),
                          })
                        : t('dashboard.settings.apiConnections.lastUsedNever')}
                    </p>
                    <div className="flex flex-wrap gap-1 pt-0.5">
                      {app.scopes.map((scope) => (
                        <Badge key={scope} variant="secondary" className="rounded-[4px]">
                          {scope}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
                <RowAction
                  disabled={pending}
                  className="text-[#DC2626] hover:text-[#B91C1C]"
                  onClick={() =>
                    startTransition(async () => {
                      try {
                        const result = await revokeAuthorizedOAuthAppAction(app.appId)
                        if (result.revokedTokenCount === 0) {
                          toast.error(t('dashboard.settings.apiConnections.revokeAppFailed'))
                          return
                        }
                        setApps((prev) => prev.filter((row) => row.appId !== app.appId))
                        toast.success(t('dashboard.settings.apiConnections.revokedApp'))
                      } catch {
                        toast.error(t('dashboard.settings.apiConnections.revokeAppFailed'))
                      }
                    })
                  }
                >
                  {t('dashboard.settings.apiConnections.revokeApp')}
                </RowAction>
              </PrefRow>
            ))}
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-[4px] border border-[#E5E5E5] bg-white dark:border-border dark:bg-card">
        <div className="border-b border-[#E5E5E5] px-4 py-2.5 dark:border-border">
          <p className="text-xs font-medium text-[#171717] dark:text-foreground">
            {t('dashboard.settings.apiConnections.personalTokens')}
          </p>
        </div>
        {tokens.length === 0 ? (
          <p className="px-4 py-3.5 text-sm text-[#686D67] dark:text-muted-foreground">
            {t('dashboard.settings.apiConnections.tokensEmpty')}
          </p>
        ) : (
          <div className="divide-y divide-[#E5E5E5] dark:divide-border">
            {tokens.map((token) => (
              <PrefRow key={token.id}>
                <div className="min-w-0 space-y-1">
                  <p className="truncate text-sm font-medium text-[#171717] dark:text-foreground">
                    {token.name || t('apiAccess.tokens.untitled')}
                  </p>
                  <p className="text-xs text-[#686D67] dark:text-muted-foreground">
                    {t('apiAccess.tokens.createdAt', {
                      date: formatDate(token.createdAt),
                    })}
                    {' · '}
                    {token.lastUsedAt
                      ? t('apiAccess.tokens.lastUsed', {
                          date: formatDate(token.lastUsedAt),
                        })
                      : t('apiAccess.tokens.lastUsedNever')}
                  </p>
                  <div className="flex flex-wrap gap-1 pt-0.5">
                    {token.scopes.map((scope) => (
                      <Badge key={scope} variant="secondary" className="rounded-[4px]">
                        {scope}
                      </Badge>
                    ))}
                  </div>
                </div>
                <RowAction
                  disabled={pending}
                  className="text-[#DC2626] hover:text-[#B91C1C]"
                  onClick={() =>
                    startTransition(async () => {
                      try {
                        const result = await revokeSettingsPersonalAccessTokenAction(token.id)
                        if (!result.revoked) {
                          toast.error(t('apiAccess.tokens.revokeFailed'))
                          return
                        }
                        setTokens((prev) => prev.filter((row) => row.id !== token.id))
                        toast.success(t('apiAccess.tokens.revokedToast'))
                      } catch {
                        toast.error(t('apiAccess.tokens.revokeFailed'))
                      }
                    })
                  }
                >
                  {t('apiAccess.tokens.revoke')}
                </RowAction>
              </PrefRow>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
