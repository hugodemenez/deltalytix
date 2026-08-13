'use client'

import { useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { useTheme } from '@/context/theme-provider'
import { useUserStore } from '../../../../store/user-store'
import { useBreakevenStore } from '@/store/widgets/breakeven-store'
import {
  useChangeLocale,
  useCurrentLocale,
  useI18n,
} from '@/locales/client'
import {
  getUserIdentities,
  linkDiscordAccount,
  linkGoogleAccount,
  setPasswordAction,
  signOut,
  unlinkIdentity,
} from '@/server/auth'
import { getUserTeams, leaveTeam } from './actions'
import { cn } from '@/lib/utils'

type Locale = 'en' | 'fr'

const timezones = [
  'UTC',
  'Europe/Paris',
  'America/New_York',
  'America/Chicago',
  'America/Los_Angeles',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Australia/Sydney',
]

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
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <section>
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

function OutlineControl({
  children,
  className,
  ...props
}: React.ComponentProps<typeof Button>) {
  return (
    <Button
      type="button"
      variant="outline"
      className={cn(
        'h-8 shrink-0 rounded-[4px] border-[#E5E5E5] bg-white px-3 text-sm font-medium text-[#171717] shadow-none hover:bg-[#F5F5F5] dark:border-border dark:bg-background dark:text-foreground dark:hover:bg-muted/50',
        className
      )}
      {...props}
    >
      {children}
    </Button>
  )
}

function PrimaryAction({
  children,
  className,
  ...props
}: React.ComponentProps<typeof Button>) {
  return (
    <Button
      type="button"
      className={cn(
        'h-10 rounded-[4px] bg-[#171717] px-4 text-sm font-medium text-white shadow-none hover:bg-[#171717]/90 dark:bg-primary dark:text-primary-foreground',
        'w-full sm:w-auto',
        className
      )}
      {...props}
    >
      {children}
    </Button>
  )
}

export default function SettingsPage() {
  const t = useI18n()
  const changeLocale = useChangeLocale()
  const currentLocale = useCurrentLocale()
  const { theme, setTheme, intensity, setIntensity } = useTheme()
  const user = useUserStore((state) => state.supabaseUser)
  const timezone = useUserStore((state) => state.timezone)
  const setTimezone = useUserStore((state) => state.setTimezone)

  const breakevenRange = useBreakevenStore((state) => state.range)
  const setBreakevenRange = useBreakevenStore((state) => state.setRange)
  const resetBreakeven = useBreakevenStore((state) => state.reset)

  const [emailNotifications, setEmailNotifications] = useState(true)
  const [pushNotifications, setPushNotifications] = useState(false)
  const [tradingAlerts, setTradingAlerts] = useState(true)
  const [weeklyReports, setWeeklyReports] = useState(true)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [identities, setIdentities] = useState<UserIdentity[]>([])
  const [linking, setLinking] = useState(false)
  const [userTeams, setUserTeams] = useState<{
    ownedTeams: Array<{ id: string; name: string; traderIds: string[] }>
    joinedTeams: Array<{ id: string; name: string; traderIds: string[] }>
  }>({ ownedTeams: [], joinedTeams: [] })

  const languages: { value: Locale; label: string }[] = [
    { value: 'en', label: 'English' },
    { value: 'fr', label: 'Français' },
  ]

  const themeLabel =
    theme === 'light' ? 'Light' : theme === 'dark' ? 'Dark' : 'System'

  const isGoogleLinked = identities.some((id) => id.provider === 'google')
  const isDiscordLinked = identities.some((id) => id.provider === 'discord')
  const googleIdentity = identities.find((id) => id.provider === 'google')
  const discordIdentity = identities.find((id) => id.provider === 'discord')
  const hasTeams =
    userTeams.ownedTeams.length > 0 || userTeams.joinedTeams.length > 0

  useEffect(() => {
    const loadTeams = async () => {
      const result = await getUserTeams()
      if (result.success && result.ownedTeams && result.joinedTeams) {
        setUserTeams({
          ownedTeams: result.ownedTeams,
          joinedTeams: result.joinedTeams,
        })
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

  const handleLeaveTeam = async (teamId: string) => {
    const result = await leaveTeam(teamId)
    if (result.success) {
      toast.success(t('dashboard.teams.leaveSuccess'))
      const updatedTeams = await getUserTeams()
      if (
        updatedTeams.success &&
        updatedTeams.ownedTeams &&
        updatedTeams.joinedTeams
      ) {
        setUserTeams({
          ownedTeams: updatedTeams.ownedTeams,
          joinedTeams: updatedTeams.joinedTeams,
        })
      }
    } else {
      toast.error(result.error || t('dashboard.teams.error'))
    }
  }

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

  const handleUnlink = async (identity: UserIdentity) => {
    try {
      await unlinkIdentity(identity)
      toast.success(t('auth.accountUnlinked'))
      const userIdentities = await getUserIdentities()
      setIdentities(
        ((userIdentities?.identities || []) as UserIdentity[]).filter(
          (item) => item.provider === 'google' || item.provider === 'discord'
        )
      )
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t('auth.unlinkingFailed')
      )
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
    try {
      await setPasswordAction(newPassword)
      toast.success(t('success'), { description: t('auth.passwordUpdated') })
      setNewPassword('')
      setConfirmPassword('')
    } catch (error: unknown) {
      toast.error(t('error'), {
        description:
          error instanceof Error ? error.message : 'Failed to update password',
      })
    }
  }

  const fieldClassName =
    'h-10 rounded-[4px] border-[#E5E5E5] bg-white text-sm shadow-none focus-visible:ring-[#171717]/20 dark:border-border dark:bg-background'

  // Header chrome (`← Dashboard | Settings`) comes from Navbar →
  // DashboardSubpageHeader for /dashboard/settings. Do not duplicate it here.
  return (
    <div className="min-h-[calc(100dvh-var(--navbar-height,4rem))] bg-[#FAFAFA] dark:bg-background">
      <main className="mx-auto w-full max-w-xl space-y-8 px-4 py-8 sm:px-6 lg:px-10">
        <SettingsSection label={t('dashboard.profile')}>
          <div className="space-y-4 p-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src={user?.user_metadata?.avatar_url} />
                <AvatarFallback className="bg-[#F5F5F5] text-base font-medium text-[#171717] dark:bg-muted dark:text-foreground">
                  {(user?.email?.[0] || 'L').toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[#171717] dark:text-foreground">
                  {user?.email}
                </p>
                <p className="text-sm text-[#686D67] dark:text-muted-foreground">
                  {t('dashboard.settings.active')}
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label
                  htmlFor="firstName"
                  className="text-sm font-medium text-[#171717] dark:text-foreground"
                >
                  {t('dashboard.settings.firstName')}
                </Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  placeholder={t('dashboard.settings.firstName')}
                  className={fieldClassName}
                />
              </div>
              <div className="space-y-1.5">
                <Label
                  htmlFor="lastName"
                  className="text-sm font-medium text-[#171717] dark:text-foreground"
                >
                  {t('dashboard.settings.lastName')}
                </Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                  placeholder={t('dashboard.settings.lastName')}
                  className={fieldClassName}
                />
              </div>
            </div>

            <div className="hidden space-y-1.5 sm:block">
              <Label
                htmlFor="email"
                className="text-sm font-medium text-[#171717] dark:text-foreground"
              >
                {t('dashboard.settings.email')}
              </Label>
              <Input
                id="email"
                type="email"
                value={user?.email || ''}
                disabled
                className={cn(fieldClassName, 'disabled:opacity-100')}
              />
              <p className="text-xs text-[#686D67] dark:text-muted-foreground">
                {t('dashboard.settings.emailLocked')}
              </p>
            </div>

            <div className="flex sm:justify-end">
              <PrimaryAction type="button">{t('dashboard.settings.updateProfile')}</PrimaryAction>
            </div>
          </div>
        </SettingsSection>

        <SettingsSection label={t('dashboard.settings.preferences')}>
          <div className="divide-y divide-[#E5E5E5] dark:divide-border">
            <PrefRow>
              <div className="min-w-0">
                <p className="text-sm font-medium text-[#171717] dark:text-foreground">
                  {t('dashboard.theme')}
                </p>
                <p className="mt-0.5 hidden text-xs text-[#686D67] sm:block dark:text-muted-foreground">
                  {t('dashboard.settings.themeDescription')}
                </p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <OutlineControl>{themeLabel}</OutlineControl>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="rounded-[4px] border-[#E5E5E5] dark:border-border"
                >
                  <DropdownMenuItem onClick={() => setTheme('light')}>
                    Light
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTheme('dark')}>
                    Dark
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTheme('system')}>
                    System
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </PrefRow>

            <PrefRow>
              <p className="text-sm font-medium text-[#171717] dark:text-foreground">
                {t('dashboard.settings.themeIntensity')}
              </p>
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="text-sm tabular-nums text-[#686D67] transition-colors hover:text-[#171717] dark:text-muted-foreground dark:hover:text-foreground"
                  >
                    {intensity}%
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  align="end"
                  className="w-56 rounded-[4px] border-[#E5E5E5] p-3 shadow-md dark:border-border"
                >
                  <Slider
                    value={[intensity]}
                    onValueChange={([value]) => setIntensity(value)}
                    min={90}
                    max={100}
                    step={1}
                  />
                </PopoverContent>
              </Popover>
            </PrefRow>

            <PrefRow>
              <p className="text-sm font-medium text-[#171717] dark:text-foreground">
                {t('dashboard.language')}
              </p>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <OutlineControl>
                    {languages.find((lang) => lang.value === currentLocale)
                      ?.label}
                  </OutlineControl>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="rounded-[4px] border-[#E5E5E5] dark:border-border"
                >
                  <DropdownMenuRadioGroup value={currentLocale}>
                    {languages.map((lang) => (
                      <DropdownMenuRadioItem
                        key={lang.value}
                        value={lang.value}
                        onClick={() => changeLocale(lang.value)}
                      >
                        {lang.label}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </PrefRow>

            <PrefRow>
              <p className="text-sm font-medium text-[#171717] dark:text-foreground">
                {t('dashboard.timezone')}
              </p>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <OutlineControl>{timezone}</OutlineControl>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="rounded-[4px] border-[#E5E5E5] dark:border-border"
                >
                  <ScrollArea className="h-[200px]">
                    <DropdownMenuRadioGroup
                      value={timezone}
                      onValueChange={setTimezone}
                    >
                      {timezones.map((tz) => (
                        <DropdownMenuRadioItem key={tz} value={tz}>
                          {tz.replace('_', ' ')}
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                  </ScrollArea>
                </DropdownMenuContent>
              </DropdownMenu>
            </PrefRow>
          </div>
        </SettingsSection>

        <SettingsSection label={t('dashboard.settings.tradingPreferences')}>
          <div className="space-y-4 p-4">
            <div>
              <p className="text-sm font-medium text-[#171717] dark:text-foreground">
                {t('dashboard.settings.breakeven.title')}
              </p>
              <p className="mt-1 hidden text-sm text-[#686D67] sm:block dark:text-muted-foreground">
                {t('dashboard.settings.breakeven.description')}
              </p>
              <p className="mt-1 text-sm text-[#686D67] sm:hidden dark:text-muted-foreground">
                {t('dashboard.settings.breakeven.descriptionMobile')}
              </p>
            </div>
            <div
              className="grid gap-3 sm:grid-cols-2"
              key={`breakeven-${breakevenRange.min}-${breakevenRange.max}`}
            >
              <div className="space-y-1.5">
                <Label
                  htmlFor="be-min"
                  className="text-sm font-medium text-[#171717] dark:text-foreground"
                >
                  {t('dashboard.settings.breakeven.min')}
                </Label>
                <Input
                  id="be-min"
                  type="number"
                  step="any"
                  defaultValue={breakevenRange.min.toString()}
                  onBlur={(event) => {
                    const val = parseFloat(event.target.value)
                    if (!Number.isNaN(val) && val <= breakevenRange.max) {
                      setBreakevenRange({ ...breakevenRange, min: val })
                    } else {
                      toast.error(t('dashboard.settings.breakeven.invalidMin'))
                      event.target.value = breakevenRange.min.toString()
                    }
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      ;(event.target as HTMLInputElement).blur()
                    }
                  }}
                  placeholder="-10"
                  className={fieldClassName}
                />
              </div>
              <div className="space-y-1.5">
                <Label
                  htmlFor="be-max"
                  className="text-sm font-medium text-[#171717] dark:text-foreground"
                >
                  {t('dashboard.settings.breakeven.max')}
                </Label>
                <Input
                  id="be-max"
                  type="number"
                  step="any"
                  defaultValue={breakevenRange.max.toString()}
                  onBlur={(event) => {
                    const val = parseFloat(event.target.value)
                    if (!Number.isNaN(val) && val >= breakevenRange.min) {
                      setBreakevenRange({ ...breakevenRange, max: val })
                    } else {
                      toast.error(t('dashboard.settings.breakeven.invalidMax'))
                      event.target.value = breakevenRange.max.toString()
                    }
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      ;(event.target as HTMLInputElement).blur()
                    }
                  }}
                  placeholder="10"
                  className={fieldClassName}
                />
              </div>
            </div>
            <div className="hidden justify-end sm:flex">
              <OutlineControl onClick={() => resetBreakeven()}>
                {t('dashboard.settings.breakeven.reset')}
              </OutlineControl>
            </div>
          </div>
        </SettingsSection>

        <SettingsSection label={t('dashboard.settings.notifications')}>
          <div className="divide-y divide-[#E5E5E5] dark:divide-border">
            {(
              [
                {
                  id: 'email-notifications',
                  label: t('dashboard.settings.notifications.email'),
                  description: t(
                    'dashboard.settings.notifications.emailDescription'
                  ),
                  checked: emailNotifications,
                  onCheckedChange: setEmailNotifications,
                },
                {
                  id: 'push-notifications',
                  label: t('dashboard.settings.notifications.push'),
                  description: t(
                    'dashboard.settings.notifications.pushDescription'
                  ),
                  checked: pushNotifications,
                  onCheckedChange: setPushNotifications,
                },
                {
                  id: 'trading-alerts',
                  label: t('dashboard.settings.notifications.trading'),
                  description: t(
                    'dashboard.settings.notifications.tradingDescription'
                  ),
                  checked: tradingAlerts,
                  onCheckedChange: setTradingAlerts,
                },
                {
                  id: 'weekly-reports',
                  label: t('dashboard.settings.notifications.weekly'),
                  description: t(
                    'dashboard.settings.notifications.weeklyDescription'
                  ),
                  checked: weeklyReports,
                  onCheckedChange: setWeeklyReports,
                },
              ] as const
            ).map((item) => (
              <PrefRow key={item.id}>
                <div className="min-w-0">
                  <Label
                    htmlFor={item.id}
                    className="text-sm font-medium text-[#171717] dark:text-foreground"
                  >
                    {item.label}
                  </Label>
                  <p className="mt-0.5 hidden text-xs text-[#686D67] sm:block dark:text-muted-foreground">
                    {item.description}
                  </p>
                </div>
                <Switch
                  id={item.id}
                  checked={item.checked}
                  onCheckedChange={item.onCheckedChange}
                  className="data-[state=checked]:bg-[#171717] data-[state=unchecked]:bg-[#D4D4D4]"
                />
              </PrefRow>
            ))}
          </div>
        </SettingsSection>

        <SettingsSection label={t('dashboard.settings.team')}>
          {hasTeams ? (
            <div className="space-y-3 p-4">
              {[...userTeams.ownedTeams, ...userTeams.joinedTeams].map(
                (team) => {
                  const isOwner = userTeams.ownedTeams.some(
                    (owned) => owned.id === team.id
                  )
                  return (
                    <div
                      key={team.id}
                      className="flex items-center justify-between gap-3 rounded-[4px] border border-[#E5E5E5] px-3 py-3 dark:border-border"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-[#171717] dark:text-foreground">
                          {team.name}
                        </p>
                        <p className="text-xs text-[#686D67] dark:text-muted-foreground">
                          {team.traderIds.length} {t('dashboard.teams.traders')}
                          {isOwner ? ` · ${t('dashboard.teams.owner')}` : ''}
                        </p>
                      </div>
                      {!isOwner ? (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <OutlineControl>
                              {t('dashboard.teams.leave')}
                            </OutlineControl>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="rounded-[4px]">
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                {t('dashboard.teams.leave')}
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                {t('dashboard.teams.leaveConfirm')}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => void handleLeaveTeam(team.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                {t('dashboard.teams.leave')}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      ) : null}
                    </div>
                  )
                }
              )}
              <Button
                asChild
                className="h-10 w-full rounded-[4px] bg-[#171717] px-4 text-sm font-medium text-white shadow-none hover:bg-[#171717]/90 dark:bg-primary dark:text-primary-foreground"
              >
                <Link href="/teams/dashboard">
                  {t('dashboard.settings.team.manage')}
                </Link>
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center px-4 py-8 text-center">
              <p className="text-sm font-semibold text-[#171717] dark:text-foreground">
                {t('dashboard.teams.noTeam')}
              </p>
              <p className="mt-1 hidden max-w-sm text-sm text-[#686D67] sm:block dark:text-muted-foreground">
                {t('dashboard.settings.team.contactAdminDesktop')}
              </p>
              <p className="mt-1 max-w-sm text-sm text-[#686D67] sm:hidden dark:text-muted-foreground">
                {t('dashboard.settings.team.contactAdminMobile')}
              </p>
              <Button
                asChild
                className="mt-4 h-10 w-full rounded-[4px] bg-[#171717] px-4 text-sm font-medium text-white shadow-none hover:bg-[#171717]/90 sm:w-auto dark:bg-primary dark:text-primary-foreground"
              >
                <Link href="/teams/dashboard">
                  {t('dashboard.settings.team.manage')}
                </Link>
              </Button>
            </div>
          )}
        </SettingsSection>

        <SettingsSection label={t('dashboard.settings.linkedAccounts')}>
          <div className="divide-y divide-[#E5E5E5] dark:divide-border">
            <PrefRow>
              <div className="min-w-0">
                <p className="text-sm font-medium text-[#171717] dark:text-foreground">
                  Google
                </p>
                <p className="mt-0.5 text-xs text-[#686D67] dark:text-muted-foreground">
                  {isGoogleLinked
                    ? t('dashboard.settings.linked.signIn')
                    : t('dashboard.settings.linked.notLinked')}
                </p>
              </div>
              {isGoogleLinked && googleIdentity ? (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <OutlineControl>
                      {t('dashboard.settings.linked.linked')}
                    </OutlineControl>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="rounded-[4px]">
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        {t('auth.unlinkConfirm')}
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        {t('auth.unlinkConfirmDescription')}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{t('auth.cancel')}</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => void handleUnlink(googleIdentity)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {t('auth.unlinkAccount')}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : (
                <OutlineControl
                  disabled={linking}
                  onClick={() => void handleLinkGoogle()}
                >
                  {t('dashboard.settings.linked.link')}
                </OutlineControl>
              )}
            </PrefRow>

            <PrefRow>
              <div className="min-w-0">
                <p className="text-sm font-medium text-[#171717] dark:text-foreground">
                  Discord
                </p>
                <p className="mt-0.5 text-xs text-[#686D67] dark:text-muted-foreground">
                  {isDiscordLinked
                    ? t('dashboard.settings.linked.signIn')
                    : t('dashboard.settings.linked.notLinked')}
                </p>
              </div>
              {isDiscordLinked && discordIdentity ? (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <OutlineControl>
                      {t('dashboard.settings.linked.linked')}
                    </OutlineControl>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="rounded-[4px]">
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        {t('auth.unlinkConfirm')}
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        {t('auth.unlinkConfirmDescription')}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{t('auth.cancel')}</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => void handleUnlink(discordIdentity)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {t('auth.unlinkAccount')}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : (
                <OutlineControl
                  disabled={linking}
                  onClick={() => void handleLinkDiscord()}
                >
                  {t('dashboard.settings.linked.link')}
                </OutlineControl>
              )}
            </PrefRow>
          </div>
        </SettingsSection>

        <SettingsSection label={t('dashboard.settings.password')}>
          <div className="space-y-4 p-4">
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
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className={fieldClassName}
              />
            </div>
            <div className="flex sm:justify-end">
              <PrimaryAction onClick={() => void handleSetPassword()}>
                {t('dashboard.settings.setPassword')}
              </PrimaryAction>
            </div>
          </div>
        </SettingsSection>

        <SettingsSection label={t('dashboard.settings.account')}>
          <div className="divide-y divide-[#E5E5E5] dark:divide-border">
            <Link
              href="/dashboard/billing"
              className="flex items-center justify-between gap-3 px-4 py-3.5 text-sm font-medium text-[#171717] transition-colors hover:bg-[#FAFAFA] dark:text-foreground dark:hover:bg-muted/40"
            >
              <span>{t('dashboard.settings.account.billing')}</span>
              <ChevronRight className="h-4 w-4 text-[#A3A3A3]" aria-hidden />
            </Link>
            <Link
              href="/dashboard/data"
              className="flex items-center justify-between gap-3 px-4 py-3.5 text-sm font-medium text-[#171717] transition-colors hover:bg-[#FAFAFA] dark:text-foreground dark:hover:bg-muted/40"
            >
              <span>{t('dashboard.settings.account.data')}</span>
              <ChevronRight className="h-4 w-4 text-[#A3A3A3]" aria-hidden />
            </Link>
            <Link
              href="/support"
              className="flex items-center justify-between gap-3 px-4 py-3.5 text-sm font-medium text-[#171717] transition-colors hover:bg-[#FAFAFA] dark:text-foreground dark:hover:bg-muted/40"
            >
              <span>{t('dashboard.settings.account.support')}</span>
              <ChevronRight className="h-4 w-4 text-[#A3A3A3]" aria-hidden />
            </Link>
            <button
              type="button"
              className="flex w-full items-center px-4 py-3.5 text-left text-sm font-medium text-[#DC2626] transition-colors hover:bg-[#FAFAFA] dark:hover:bg-muted/40"
              onClick={() => {
                localStorage.removeItem('deltalytix_user_data')
                void signOut()
              }}
            >
              {t('dashboard.settings.account.signOut')}
            </button>
          </div>
        </SettingsSection>
      </main>
    </div>
  )
}
