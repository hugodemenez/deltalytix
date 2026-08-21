'use client'

import { useEffect, useState, type ComponentProps, type ReactNode } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { useUserStore } from '../../../../store/user-store'
import { useI18n } from '@/locales/client'
import { useIsMobile } from '@/hooks/use-mobile'
import {
  getUserIdentities,
  linkDiscordAccount,
  linkGoogleAccount,
  setPasswordAction,
  signOut,
} from '@/server/auth'
import {
  getWeeklyRecapPreference,
  setWeeklyRecapPreference,
} from '@/server/weekly-recap-preference'
import { deleteCurrentUserAccount } from '@/server/delete-account'
import {
  ConsentPrivacyControls,
  getConsentRecordCopy,
} from '@/components/consent-record'
import { getUserTeams } from './actions'
import { cn } from '@/lib/utils'

interface UserIdentity {
  id: string
  identity_id: string
  user_id: string
  identity_data?: { [key: string]: unknown }
  provider: string
  created_at?: string
  last_sign_in_at?: string
}

function SettingsSection({
  id,
  label,
  children,
}: {
  id?: string
  label: string
  children: ReactNode
}) {
  return (
    <section id={id} className={id ? 'scroll-mt-24' : undefined}>
      <h2 className="mb-3 text-xs font-medium text-[#686D67] dark:text-muted-foreground">
        {label}
      </h2>
      <div className="overflow-hidden rounded-[4px] border border-[#E5E5E5] bg-white dark:border-border dark:bg-card">
        {children}
      </div>
    </section>
  )
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
        'flex items-center justify-between gap-4 px-4 py-3.5',
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
}: ComponentProps<'button'>) {
  return (
    <button
      type="button"
      className={cn(
        'shrink-0 text-sm text-[#686D67] transition-colors hover:text-[#171717] focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:text-muted-foreground dark:hover:text-foreground',
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}

export default function SettingsPage() {
  const t = useI18n()
  const consentCopy = getConsentRecordCopy(t)
  const isMobile = useIsMobile()
  const user = useUserStore((state) => state.supabaseUser)

  const [identities, setIdentities] = useState<UserIdentity[]>([])
  const [linking, setLinking] = useState(false)
  const [weeklyRecap, setWeeklyRecap] = useState(true)
  const [weeklyRecapReady, setWeeklyRecapReady] = useState(false)
  const [weeklyRecapSaving, setWeeklyRecapSaving] = useState(false)
  const [passwordOpen, setPasswordOpen] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [teamLabel, setTeamLabel] = useState<string | null>(null)

  const isGoogleLinked = identities.some((id) => id.provider === 'google')
  const isDiscordLinked = identities.some((id) => id.provider === 'discord')

  useEffect(() => {
    const loadTeams = async () => {
      const result = await getUserTeams()
      if (result.success && result.ownedTeams && result.joinedTeams) {
        const first = result.ownedTeams[0] ?? result.joinedTeams[0]
        setTeamLabel(first?.name ?? null)
      }
    }
    void loadTeams()
  }, [])

  useEffect(() => {
    const loadIdentities = async () => {
      try {
        const userIdentities = await getUserIdentities()
        setIdentities(
          ((userIdentities?.identities || []) as UserIdentity[]).filter(
            (identity) =>
              identity.provider === 'google' || identity.provider === 'discord'
          )
        )
      } catch {
        setIdentities([])
      }
    }
    void loadIdentities()

    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('linked')) {
      toast.success(t('auth.accountLinked'))
      const nextUrl = new URL(window.location.href)
      nextUrl.searchParams.delete('linked')
      window.history.replaceState({}, '', nextUrl.toString())
    }
  }, [t])

  useEffect(() => {
    const loadRecap = async () => {
      try {
        const isActive = await getWeeklyRecapPreference()
        setWeeklyRecap(isActive)
      } catch {
        setWeeklyRecap(true)
      } finally {
        setWeeklyRecapReady(true)
      }
    }
    void loadRecap()
  }, [])

  const handleLinkGoogle = async () => {
    try {
      setLinking(true)
      await linkGoogleAccount()
    } catch {
      toast.error(t('auth.linkingFailed'))
      setLinking(false)
    }
  }

  const handleLinkDiscord = async () => {
    try {
      setLinking(true)
      await linkDiscordAccount()
    } catch {
      toast.error(t('auth.linkingFailed'))
      setLinking(false)
    }
  }

  const handleWeeklyRecap = async (next: boolean) => {
    const previous = weeklyRecap
    setWeeklyRecap(next)
    setWeeklyRecapSaving(true)
    try {
      const result = await setWeeklyRecapPreference(next)
      setWeeklyRecap(result.isActive)
    } catch {
      setWeeklyRecap(previous)
      toast.error(t('dashboard.settings.weeklyRecap.error'))
    } finally {
      setWeeklyRecapSaving(false)
    }
  }

  const handleSetPassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast.error(t('error'), { description: t('auth.passwordMinLength') })
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error(t('error'), { description: t('auth.passwordsDoNotMatch') })
      return
    }
    setPasswordSaving(true)
    try {
      await setPasswordAction(newPassword)
      toast.success(t('success'), { description: t('auth.passwordUpdated') })
      setNewPassword('')
      setConfirmPassword('')
      setPasswordOpen(false)
    } catch (error: unknown) {
      toast.error(t('error'), {
        description:
          error instanceof Error ? error.message : 'Failed to update password',
      })
    } finally {
      setPasswordSaving(false)
    }
  }

  const handleDeleteAccount = async () => {
    setDeleting(true)
    try {
      localStorage.removeItem('deltalytix_user_data')
      await deleteCurrentUserAccount()
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message === 'NEXT_REDIRECT' ||
          ('digest' in error &&
            typeof error.digest === 'string' &&
            error.digest.startsWith('NEXT_REDIRECT')))
      ) {
        throw error
      }
      setDeleting(false)
      toast.error(t('dashboard.settings.deleteAccount.error'), {
        description: error instanceof Error ? error.message : undefined,
      })
    }
  }

  const handleSignOut = () => {
    localStorage.removeItem('deltalytix_user_data')
    void signOut()
  }

  const fieldClassName =
    'h-10 rounded-[4px] border-[#E5E5E5] bg-white text-sm shadow-none focus-visible:ring-[#171717]/20 dark:border-border dark:bg-background'

  const passwordFields = (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label
          htmlFor="newPassword"
          className="text-sm font-medium text-[#171717] dark:text-foreground"
        >
          {t('dashboard.settings.newPassword')}
        </Label>
        <Input
          id="newPassword"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          className={fieldClassName}
        />
      </div>
      <div className="space-y-1.5">
        <Label
          htmlFor="confirmPassword"
          className="text-sm font-medium text-[#171717] dark:text-foreground"
        >
          {t('dashboard.settings.confirmPassword')}
        </Label>
        <Input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          className={fieldClassName}
        />
      </div>
    </div>
  )

  const deleteBody = t('dashboard.settings.deleteAccount.confirmBody')

  const deleteActions = (
    <div className="flex justify-end gap-2">
      <Button
        type="button"
        variant="outline"
        className="h-9 rounded-[4px] border-[#E5E5E5] bg-white text-sm font-medium text-[#171717] shadow-none hover:bg-[#F5F5F5] dark:border-border dark:bg-background dark:text-foreground"
        onClick={() => setDeleteOpen(false)}
        disabled={deleting}
      >
        {t('dashboard.settings.deleteAccount.cancel')}
      </Button>
      <Button
        type="button"
        className="h-9 rounded-[4px] bg-[#DC2626] text-sm font-medium text-white shadow-none hover:bg-[#DC2626]/90"
        onClick={() => void handleDeleteAccount()}
        disabled={deleting}
      >
        {t('dashboard.settings.deleteAccount.confirmAction')}
      </Button>
    </div>
  )

  // Header chrome (`← Dashboard | Settings`) comes from Navbar →
  // DashboardSubpageHeader for /dashboard/settings. Do not duplicate it here.
  return (
    <div className="min-h-[calc(100dvh-var(--navbar-height,4rem))] bg-[#FAFAFA] dark:bg-background">
      <main className="mx-auto w-full max-w-[640px] space-y-8 px-4 py-8">
        <SettingsSection label={t('dashboard.settings.account')}>
          <div className="divide-y divide-[#E5E5E5] dark:divide-border">
            <PrefRow>
              <p className="text-sm font-medium text-[#171717] dark:text-foreground">
                {t('dashboard.settings.email')}
              </p>
              <p className="truncate text-sm text-[#686D67] dark:text-muted-foreground">
                {user?.email}
              </p>
            </PrefRow>
            <PrefRow>
              <p className="text-sm font-medium text-[#171717] dark:text-foreground">
                {t('dashboard.settings.password')}
              </p>
              <RowAction onClick={() => setPasswordOpen(true)}>
                {t('dashboard.settings.password.set')}
              </RowAction>
            </PrefRow>
          </div>
        </SettingsSection>

        <SettingsSection label={t('dashboard.settings.linkedAccounts')}>
          <div className="divide-y divide-[#E5E5E5] dark:divide-border">
            <PrefRow>
              <p className="text-sm font-medium text-[#171717] dark:text-foreground">
                Google
              </p>
              {isGoogleLinked ? (
                <p className="text-sm text-[#686D67] dark:text-muted-foreground">
                  {t('dashboard.settings.linked.connected')}
                </p>
              ) : (
                <RowAction
                  disabled={linking}
                  onClick={() => void handleLinkGoogle()}
                >
                  {t('dashboard.settings.linked.connect')}
                </RowAction>
              )}
            </PrefRow>
            <PrefRow>
              <p className="text-sm font-medium text-[#171717] dark:text-foreground">
                Discord
              </p>
              {isDiscordLinked ? (
                <p className="text-sm text-[#686D67] dark:text-muted-foreground">
                  {t('dashboard.settings.linked.connected')}
                </p>
              ) : (
                <RowAction
                  disabled={linking}
                  onClick={() => void handleLinkDiscord()}
                >
                  {t('dashboard.settings.linked.connect')}
                </RowAction>
              )}
            </PrefRow>
          </div>
        </SettingsSection>

        <SettingsSection label={t('dashboard.settings.weeklyRecap')}>
          <div className="divide-y divide-[#E5E5E5] dark:divide-border">
            <PrefRow>
              <p className="text-sm font-medium text-[#171717] dark:text-foreground">
                {t('dashboard.settings.weeklyRecap')}
              </p>
              <Switch
                checked={weeklyRecap}
                disabled={!weeklyRecapReady || weeklyRecapSaving}
                onCheckedChange={(checked) => void handleWeeklyRecap(checked)}
                aria-label={t('dashboard.settings.weeklyRecap')}
                className="border border-[#E5E5E5] [&>span]:!bg-[#171717] data-[state=checked]:border-[#171717] data-[state=checked]:bg-[#171717] data-[state=checked]:[&>span]:!bg-white data-[state=unchecked]:bg-white dark:border-border dark:data-[state=checked]:bg-foreground"
              />
            </PrefRow>
            <p className="px-4 py-3 text-xs text-[#686D67] dark:text-muted-foreground">
              {t('dashboard.settings.weeklyRecap.description')}
            </p>
          </div>
        </SettingsSection>

        <SettingsSection label={t('dashboard.settings.team')}>
          <Link
            href="/teams/dashboard"
            className="flex items-center justify-between gap-4 px-4 py-3.5 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <p className="text-sm font-medium text-[#171717] dark:text-foreground">
              {t('dashboard.settings.team')}
            </p>
            <p className="text-sm text-[#686D67] dark:text-muted-foreground">
              {teamLabel
                ? `${teamLabel} →`
                : t('dashboard.settings.team.none')}
            </p>
          </Link>
        </SettingsSection>

        <SettingsSection id="privacy" label={consentCopy.privacy}>
          <div className="px-4 py-3.5">
            <ConsentPrivacyControls copy={consentCopy} />
          </div>
        </SettingsSection>

        <div className="space-y-4">
          <button
            type="button"
            className="text-sm font-medium text-[#686D67] transition-colors hover:text-[#171717] focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:text-muted-foreground dark:hover:text-foreground"
            onClick={handleSignOut}
          >
            {t('dashboard.settings.account.signOut')}
          </button>
          <div>
            <button
              type="button"
              className="text-sm font-medium text-[#DC2626] transition-colors hover:text-[#B91C1C] focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              onClick={() => setDeleteOpen(true)}
            >
              {t('dashboard.settings.deleteAccount')}
            </button>
            <p className="mt-1 max-w-md text-xs text-[#686D67] dark:text-muted-foreground">
              {t('dashboard.settings.deleteAccount.warning')}
            </p>
          </div>
        </div>
      </main>

      <Dialog open={passwordOpen && !isMobile} onOpenChange={setPasswordOpen}>
        <DialogContent className="rounded-[4px] border-[#E5E5E5] sm:max-w-md dark:border-border">
          <DialogHeader>
            <DialogTitle>{t('dashboard.settings.password')}</DialogTitle>
            <DialogDescription className="sr-only">
              {t('dashboard.settings.setPassword')}
            </DialogDescription>
          </DialogHeader>
          {passwordFields}
          <DialogFooter>
            <Button
              type="button"
              className="h-9 rounded-[4px] bg-[#171717] text-sm font-medium text-white shadow-none hover:bg-[#171717]/90"
              onClick={() => void handleSetPassword()}
              disabled={passwordSaving}
            >
              {t('dashboard.settings.setPassword')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={passwordOpen && isMobile} onOpenChange={setPasswordOpen}>
        <SheetContent
          side="bottom"
          className="rounded-t-[4px] border-[#E5E5E5] dark:border-border"
        >
          <SheetHeader className="text-left">
            <SheetTitle>{t('dashboard.settings.password')}</SheetTitle>
            <SheetDescription className="sr-only">
              {t('dashboard.settings.setPassword')}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-4">{passwordFields}</div>
          <SheetFooter className="mt-6">
            <Button
              type="button"
              className="h-9 rounded-[4px] bg-[#171717] text-sm font-medium text-white shadow-none hover:bg-[#171717]/90"
              onClick={() => void handleSetPassword()}
              disabled={passwordSaving}
            >
              {t('dashboard.settings.setPassword')}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Dialog open={deleteOpen && !isMobile} onOpenChange={setDeleteOpen}>
        <DialogContent className="rounded-[4px] border-[#E5E5E5] sm:max-w-md dark:border-border">
          <DialogHeader>
            <DialogTitle>
              {t('dashboard.settings.deleteAccount.confirmTitle')}
            </DialogTitle>
            <DialogDescription className="text-sm text-[#686D67] dark:text-muted-foreground">
              {deleteBody}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>{deleteActions}</DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={deleteOpen && isMobile} onOpenChange={setDeleteOpen}>
        <SheetContent
          side="bottom"
          className="rounded-t-[4px] border-[#E5E5E5] dark:border-border"
        >
          <SheetHeader className="text-left">
            <SheetTitle>
              {t('dashboard.settings.deleteAccount.confirmTitle')}
            </SheetTitle>
            <SheetDescription className="text-sm text-[#686D67] dark:text-muted-foreground">
              {deleteBody}
            </SheetDescription>
          </SheetHeader>
          <SheetFooter className="mt-6">{deleteActions}</SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  )
}
