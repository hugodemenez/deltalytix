'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCurrentLocale, useI18n } from '@/locales/client'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { OwnedOAuthAppDTO } from '../settings/connections-actions'
import {
  countLabelKind,
  formatConnectionDate,
  truncateIdentifier,
} from '../settings/connections-format'
import {
  GroupHead,
  MetaSep,
  OwnedAppIcon,
  RowAction,
  ScopeChips,
  TextLink,
  smOutlineButtonClass,
  smPrimaryButtonClass,
} from '../settings/connections-ui'
import { AddAppDialog } from '../settings/add-app-dialog'
import { HowItWorksDialog } from '../settings/how-it-works-dialog'
import { ManageAppSheet } from '../settings/manage-app-sheet'

export type OwnedAppRow = OwnedOAuthAppDTO

// Header chrome (`← Dashboard | Developers`) comes from Navbar →
// DashboardSubpageHeader. Do not duplicate it here.
export default function DevelopersClient({
  initialOwnedApps,
}: {
  initialOwnedApps: OwnedAppRow[]
}) {
  const t = useI18n()
  const locale = useCurrentLocale()
  const router = useRouter()
  const [owned, setOwned] = useState(initialOwnedApps)
  const [addOpen, setAddOpen] = useState(false)
  const [howOpen, setHowOpen] = useState(false)
  const [manageId, setManageId] = useState<string | null>(null)

  const managed = owned.find((app) => app.id === manageId) ?? null
  const tokensHref = `/${locale}/dashboard/settings#connections`

  function usersPhrase(count: number) {
    const kind = countLabelKind(count)
    if (kind === 'none') return t('dashboard.settings.connections.usersNone')
    if (kind === 'one') return t('dashboard.settings.connections.usersOne')
    return t('dashboard.settings.connections.usersMany', { count: String(count) })
  }

  // API tokens live in Settings → Connections, not on this page.
  function goToTokens() {
    setAddOpen(false)
    setHowOpen(false)
    router.push(tokensHref)
  }

  return (
    <div className="min-h-[calc(100dvh-var(--navbar-height,4rem))] bg-[#FAFAFA] dark:bg-background">
      <main className="mx-auto w-full max-w-[640px] px-4 py-8">
        <section id="your-apps" className="scroll-mt-24">
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
          </div>

          <p className="mt-3 text-xs leading-4 text-[#A3A3A3] dark:text-muted-foreground">
            {t('dashboard.developers.tokensHint.before')}{' '}
            <TextLink href={tokensHref} className="text-xs">
              {t('dashboard.developers.tokensHint.link')}
            </TextLink>
            <MetaSep />
            <TextLink href={`/${locale}/docs`} className="text-xs">
              {t('dashboard.settings.connections.apiDocs')}
            </TextLink>
          </p>
        </section>
      </main>

      <AddAppDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onCreated={(app) => setOwned((current) => [app, ...current.filter((item) => item.id !== app.id)])}
        onUseToken={goToTokens}
      />
      <HowItWorksDialog open={howOpen} onOpenChange={setHowOpen} onUseToken={goToTokens} />
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
    </div>
  )
}
