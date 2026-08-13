'use client'

import { useState, useEffect, type ReactNode } from 'react'
import { useI18n } from "@/locales/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useUserStore } from '../../../../store/user-store'
import { useTheme } from '@/context/theme-provider'
import {
  Sun,
  Moon,
  Laptop,
  Eye,
  EyeOff,
  ChevronRight,
} from "lucide-react"
import { signOut, setPasswordAction } from "@/server/auth"
import { useBreakevenStore } from "@/store/widgets/breakeven-store"
import Link from 'next/link'
import { useChangeLocale, useCurrentLocale } from "@/locales/client"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Slider } from "@/components/ui/slider"
import { leaveTeam, getUserTeams } from './actions'
import { toast } from "sonner"
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
} from "@/components/ui/alert-dialog"
import { LinkedAccounts } from "@/components/linked-accounts"
import { DashboardSubpageHeader } from "../components/dashboard-subpage-header"
import { cn } from "@/lib/utils"

type Locale = 'en' | 'fr'

type SettingsTeam = {
  id: string
  name: string
  traderIds: string[]
}

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

const fieldClassName =
  "h-10 rounded-[4px] border-[#E5E5E5] text-sm dark:border-border"
const outlineControlClassName =
  "h-8 rounded-[4px] border border-[#E5E5E5] bg-white px-3 text-sm font-medium text-[#171717] shadow-none hover:bg-[#FAFAFA] dark:border-border dark:bg-background dark:text-foreground"
const primaryButtonClassName =
  "h-10 w-full rounded-[4px] bg-[#171717] text-white hover:bg-[#171717]/90 md:w-auto dark:bg-white dark:text-[#171717]"

function SettingsSection({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <section>
      <h2 className="mb-2 text-xs font-medium text-[#686D67] dark:text-muted-foreground">
        {title}
      </h2>
      <div className="overflow-hidden rounded-[4px] border border-[#E5E5E5] bg-white dark:border-border dark:bg-card">
        {children}
      </div>
    </section>
  )
}

function SettingsRow({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[#E5E5E5] px-4 py-3 last:border-b-0 dark:border-border">
      <div className="min-w-0">
        <p className="text-sm font-medium text-[#171717] dark:text-foreground">{label}</p>
        {hint ? (
          <p className="mt-0.5 text-xs text-[#686D67] dark:text-muted-foreground">{hint}</p>
        ) : null}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

export default function SettingsPage() {
  const t = useI18n()
  const changeLocale = useChangeLocale()
  const currentLocale = useCurrentLocale()
  const { theme, setTheme, intensity, setIntensity } = useTheme()
  const user = useUserStore(state => state.supabaseUser)
  const timezone = useUserStore(state => state.timezone)
  const setTimezone = useUserStore(state => state.setTimezone)

  const breakevenRange = useBreakevenStore(state => state.range)
  const setBreakevenRange = useBreakevenStore(state => state.setRange)
  const resetBreakeven = useBreakevenStore(state => state.reset)
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [pushNotifications, setPushNotifications] = useState(false)
  const [tradingAlerts, setTradingAlerts] = useState(true)
  const [weeklyReports, setWeeklyReports] = useState(true)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [userTeams, setUserTeams] = useState<{
    ownedTeams: SettingsTeam[]
    joinedTeams: SettingsTeam[]
  }>({ ownedTeams: [], joinedTeams: [] })

  const languages: { value: Locale; label: string }[] = [
    { value: 'en', label: 'English' },
    { value: 'fr', label: 'Français' },
  ]

  const handleThemeChange = (value: string) => {
    setTheme(value as "light" | "dark" | "system")
  }

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
    loadTeams()
  }, [])

  const handleLeaveTeam = async (teamId: string) => {
    const result = await leaveTeam(teamId)
    if (result.success) {
      toast.success(t('dashboard.teams.leaveSuccess'))
      const updatedTeams = await getUserTeams()
      if (updatedTeams.success && updatedTeams.ownedTeams && updatedTeams.joinedTeams) {
        setUserTeams({
          ownedTeams: updatedTeams.ownedTeams,
          joinedTeams: updatedTeams.joinedTeams,
        })
      }
    } else {
      toast.error(result.error || t('dashboard.teams.error'))
    }
  }

  const themeLabel =
    theme === 'light'
      ? t('dashboard.settings.page.themeLight')
      : theme === 'dark'
        ? t('dashboard.settings.page.themeDark')
        : t('dashboard.settings.page.themeSystem')

  const hasTeams =
    userTeams.ownedTeams.length > 0 || userTeams.joinedTeams.length > 0

  return (
    <div className="min-h-[calc(100dvh-var(--navbar-height,4rem))] bg-[#FAFAFA] dark:bg-background">
      <DashboardSubpageHeader title={t('dashboard.settings')} titleAsHeading />
      <main className="px-4 py-8 sm:px-6 lg:px-10">
        <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
          <SettingsSection title={t('dashboard.profile')}>
            <div className="space-y-4 p-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={user?.user_metadata.avatar_url} />
                  <AvatarFallback className="text-sm uppercase">
                    {user?.email?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-medium text-[#171717] dark:text-foreground">
                      {user?.email}
                    </p>
                    <span className="rounded-[4px] bg-[#EFF5EC] px-2 py-0.5 text-[11px] font-medium text-[#3E7550] dark:bg-[#243028] dark:text-[#9BC4A8]">
                      {t('dashboard.settings.page.active')}
                    </span>
                  </div>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="firstName">{t('dashboard.settings.page.firstName')}</Label>
                  <Input
                    id="firstName"
                    autoComplete="given-name"
                    placeholder={t('dashboard.settings.page.firstName')}
                    className={fieldClassName}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lastName">{t('dashboard.settings.page.lastName')}</Label>
                  <Input
                    id="lastName"
                    autoComplete="family-name"
                    placeholder={t('dashboard.settings.page.lastName')}
                    className={fieldClassName}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">{t('dashboard.email')}</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={user?.email || ''}
                  disabled
                  aria-describedby="email-locked-hint"
                  className={fieldClassName}
                />
                <p id="email-locked-hint" className="text-xs text-[#686D67] dark:text-muted-foreground">
                  {t('dashboard.settings.page.emailLocked')}
                </p>
              </div>
              <div className="flex justify-end">
                <Button type="button" className={primaryButtonClassName}>
                  {t('dashboard.settings.page.updateProfile')}
                </Button>
              </div>
            </div>
          </SettingsSection>

          <SettingsSection title={t('dashboard.settings.page.preferences')}>
            <SettingsRow
              label={t('dashboard.theme')}
              hint={t('dashboard.settings.page.themeHint')}
            >
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="outline" className={outlineControlClassName}>
                    {themeLabel}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleThemeChange("light")}>
                    <Sun className="mr-2 h-4 w-4" />
                    <span>{t('dashboard.settings.page.themeLight')}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleThemeChange("dark")}>
                    <Moon className="mr-2 h-4 w-4" />
                    <span>{t('dashboard.settings.page.themeDark')}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleThemeChange("system")}>
                    <Laptop className="mr-2 h-4 w-4" />
                    <span>{t('dashboard.settings.page.themeSystem')}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SettingsRow>
            <SettingsRow label={t('dashboard.settings.page.themeIntensity')}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="outline" className={outlineControlClassName}>
                    {intensity}%
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 p-4">
                  <Slider
                    value={[intensity]}
                    onValueChange={([value]) => setIntensity(value)}
                    min={90}
                    max={100}
                    step={1}
                    className="w-full"
                    aria-label={t('dashboard.settings.page.themeIntensity')}
                  />
                </DropdownMenuContent>
              </DropdownMenu>
            </SettingsRow>
            <SettingsRow label={t('dashboard.language')}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="outline" className={outlineControlClassName}>
                    {languages.find(lang => lang.value === currentLocale)?.label}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
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
            </SettingsRow>
            <SettingsRow label={t('dashboard.timezone')}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="outline" className={outlineControlClassName}>
                    {timezone}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <ScrollArea className="h-[200px]">
                    <DropdownMenuRadioGroup value={timezone} onValueChange={setTimezone}>
                      {timezones.map((tz) => (
                        <DropdownMenuRadioItem key={tz} value={tz}>
                          {tz.replace('_', ' ')}
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                  </ScrollArea>
                </DropdownMenuContent>
              </DropdownMenu>
            </SettingsRow>
          </SettingsSection>

          <SettingsSection title={t('dashboard.settings.tradingPreferences')}>
            <div className="space-y-4 p-4">
              <div>
                <p className="text-sm font-medium text-[#171717] dark:text-foreground">
                  {t('dashboard.settings.breakeven.title')}
                </p>
                <p className="mt-0.5 text-xs text-[#686D67] dark:text-muted-foreground">
                  {t('dashboard.settings.page.breakevenHint')}
                </p>
              </div>
              <div
                className="grid grid-cols-1 gap-4 sm:grid-cols-2"
                key={`breakeven-${breakevenRange.min}-${breakevenRange.max}`}
              >
                <div className="space-y-1.5">
                  <Label htmlFor="be-min">{t('dashboard.settings.breakeven.min')}</Label>
                  <Input
                    id="be-min"
                    type="number"
                    inputMode="decimal"
                    step="any"
                    defaultValue={breakevenRange.min.toString()}
                    onBlur={(e) => {
                      const val = parseFloat(e.target.value)
                      if (!isNaN(val) && val <= breakevenRange.max) {
                        setBreakevenRange({ ...breakevenRange, min: val })
                      } else {
                        toast.error(t('dashboard.settings.breakeven.invalidMin'))
                        e.target.value = breakevenRange.min.toString()
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                    }}
                    placeholder="-10"
                    className={fieldClassName}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="be-max">{t('dashboard.settings.breakeven.max')}</Label>
                  <Input
                    id="be-max"
                    type="number"
                    inputMode="decimal"
                    step="any"
                    defaultValue={breakevenRange.max.toString()}
                    onBlur={(e) => {
                      const val = parseFloat(e.target.value)
                      if (!isNaN(val) && val >= breakevenRange.min) {
                        setBreakevenRange({ ...breakevenRange, max: val })
                      } else {
                        toast.error(t('dashboard.settings.breakeven.invalidMax'))
                        e.target.value = breakevenRange.max.toString()
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                    }}
                    placeholder="10"
                    className={fieldClassName}
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  className={cn(outlineControlClassName, "h-10 w-full md:w-auto")}
                  onClick={() => {
                    resetBreakeven()
                  }}
                >
                  {t('dashboard.settings.breakeven.reset')}
                </Button>
              </div>
            </div>
          </SettingsSection>

          <SettingsSection title={t('dashboard.settings.page.notifications')}>
            <SettingsRow label={t('dashboard.settings.page.emailNotifications')}>
              <Switch
                id="email-notifications"
                checked={emailNotifications}
                onCheckedChange={setEmailNotifications}
                className="data-[state=checked]:bg-[#171717]"
              />
            </SettingsRow>
            <SettingsRow label={t('dashboard.settings.page.pushNotifications')}>
              <Switch
                id="push-notifications"
                checked={pushNotifications}
                onCheckedChange={setPushNotifications}
                className="data-[state=checked]:bg-[#171717]"
              />
            </SettingsRow>
            <SettingsRow label={t('dashboard.settings.page.tradingAlerts')}>
              <Switch
                id="trading-alerts"
                checked={tradingAlerts}
                onCheckedChange={setTradingAlerts}
                className="data-[state=checked]:bg-[#171717]"
              />
            </SettingsRow>
            <SettingsRow label={t('dashboard.settings.page.weeklyReports')}>
              <Switch
                id="weekly-reports"
                checked={weeklyReports}
                onCheckedChange={setWeeklyReports}
                className="data-[state=checked]:bg-[#171717]"
              />
            </SettingsRow>
          </SettingsSection>

          <SettingsSection title={t('dashboard.teams')}>
            {hasTeams ? (
              <div className="space-y-3 p-4">
                {userTeams.ownedTeams.map((team) => (
                  <div
                    key={team.id}
                    className="flex items-center justify-between rounded-[4px] border border-[#E5E5E5] px-3 py-2.5 dark:border-border"
                  >
                    <div>
                      <p className="text-sm font-medium">{team.name}</p>
                      <p className="text-xs text-[#686D67] dark:text-muted-foreground">
                        {team.traderIds.length} {t('dashboard.teams.traders').toLowerCase()}
                      </p>
                    </div>
                    <span className="text-xs text-[#686D67] dark:text-muted-foreground">
                      {t('dashboard.teams.owner')}
                    </span>
                  </div>
                ))}
                {userTeams.joinedTeams.map((team) => (
                  <div
                    key={team.id}
                    className="flex items-center justify-between rounded-[4px] border border-[#E5E5E5] px-3 py-2.5 dark:border-border"
                  >
                    <div>
                      <p className="text-sm font-medium">{team.name}</p>
                      <p className="text-xs text-[#686D67] dark:text-muted-foreground">
                        {team.traderIds.length} {t('dashboard.teams.traders').toLowerCase()}
                      </p>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button type="button" variant="outline" className={outlineControlClassName}>
                          {t('dashboard.teams.leave')}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>{t('dashboard.teams.leave')}</AlertDialogTitle>
                          <AlertDialogDescription>
                            {t('dashboard.teams.leaveConfirm')}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleLeaveTeam(team.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            {t('dashboard.teams.leave')}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                ))}
                <Link href="/teams/dashboard" className="block">
                  <Button type="button" className={cn(primaryButtonClassName, "w-full")}>
                    {t('dashboard.settings.page.manageTeams')}
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="flex flex-col items-center px-4 py-8 text-center">
                <p className="text-sm font-medium text-[#171717] dark:text-foreground">
                  {t('dashboard.teams.noTeam')}
                </p>
                <p className="mt-1 text-xs text-[#686D67] dark:text-muted-foreground">
                  {t('dashboard.settings.page.teamInviteHint')}
                </p>
                <Link href="/teams/dashboard" className="mt-4 w-full sm:w-auto">
                  <Button type="button" className={cn(primaryButtonClassName, "w-full")}>
                    {t('dashboard.settings.page.manageTeams')}
                  </Button>
                </Link>
              </div>
            )}
          </SettingsSection>

          <SettingsSection title={t('dashboard.settings.page.linkedAccounts')}>
            <LinkedAccounts />
          </SettingsSection>

          <SettingsSection title={t('dashboard.settings.page.password')}>
            <div className="space-y-4 p-4">
              <div className="space-y-1.5">
                <Label htmlFor="newPassword">{t('dashboard.settings.page.newPassword')}</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showNewPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className={cn(fieldClassName, "pr-10")}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2"
                    aria-label={t('dashboard.settings.page.newPassword')}
                    onClick={() => setShowNewPassword((v) => !v)}
                  >
                    {showNewPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword">{t('dashboard.settings.page.confirmPassword')}</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={cn(fieldClassName, "pr-10")}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2"
                    aria-label={t('dashboard.settings.page.confirmPassword')}
                    onClick={() => setShowConfirmPassword((v) => !v)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              <div className="flex justify-end">
                <Button
                  type="button"
                  className={primaryButtonClassName}
                  onClick={async () => {
                    const newPwd = newPassword || ''
                    const confirmPwd = confirmPassword || ''
                    if (!newPwd || newPwd.length < 6) {
                      toast.error(t('error'), { description: t('auth.passwordMinLength') })
                      return
                    }
                    if (newPwd !== confirmPwd) {
                      toast.error(t('error'), { description: t('auth.passwordsDoNotMatch') })
                      return
                    }
                    try {
                      await setPasswordAction(newPwd)
                      toast.success(t('success'), { description: t('auth.passwordUpdated') })
                      setNewPassword('')
                      setConfirmPassword('')
                    } catch (e: unknown) {
                      toast.error(t('error'), {
                        description:
                          e instanceof Error ? e.message : 'Failed to update password',
                      })
                    }
                  }}
                >
                  {t('dashboard.settings.page.setPassword')}
                </Button>
              </div>
            </div>
          </SettingsSection>

          <SettingsSection title={t('dashboard.settings.page.account')}>
            <Link
              href={`/${currentLocale}/dashboard/billing`}
              className="flex items-center justify-between gap-3 border-b border-[#E5E5E5] px-4 py-3 text-sm font-medium text-[#171717] transition-colors hover:bg-[#FAFAFA] dark:border-border dark:text-foreground dark:hover:bg-muted/40"
            >
              {t('dashboard.settings.page.billing')}
              <ChevronRight className="h-4 w-4 text-[#A3A3A3]" aria-hidden />
            </Link>
            <Link
              href="/dashboard/data"
              className="flex items-center justify-between gap-3 border-b border-[#E5E5E5] px-4 py-3 text-sm font-medium text-[#171717] transition-colors hover:bg-[#FAFAFA] dark:border-border dark:text-foreground dark:hover:bg-muted/40"
            >
              {t('dashboard.settings.page.data')}
              <ChevronRight className="h-4 w-4 text-[#A3A3A3]" aria-hidden />
            </Link>
            <Link
              href="/support"
              className="flex items-center justify-between gap-3 border-b border-[#E5E5E5] px-4 py-3 text-sm font-medium text-[#171717] transition-colors hover:bg-[#FAFAFA] dark:border-border dark:text-foreground dark:hover:bg-muted/40"
            >
              {t('dashboard.settings.page.support')}
              <ChevronRight className="h-4 w-4 text-[#A3A3A3]" aria-hidden />
            </Link>
            <button
              type="button"
              className="w-full px-4 py-3 text-left text-sm font-medium text-[#DC2626] transition-colors hover:bg-[#FAFAFA] dark:hover:bg-muted/40"
              onClick={() => {
                localStorage.removeItem('deltalytix_user_data')
                signOut()
              }}
            >
              {t('dashboard.settings.page.signOut')}
            </button>
          </SettingsSection>
        </div>
      </main>
    </div>
  )
}
