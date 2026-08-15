'use client'

import Link from 'next/link'
import { useI18n, useChangeLocale, useCurrentLocale } from '@/locales/client'
import { useTheme } from '@/context/theme-provider'
import { useUserStore } from '@/store/user-store'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Slider } from '@/components/ui/slider'
import { Laptop, Moon, Sun } from 'lucide-react'
import { signOut } from '@/server/auth'
import { useMemo, useState, type ButtonHTMLAttributes } from 'react'
import { useIsMobile } from '@/hooks/use-mobile'
import { cn } from '@/lib/utils'
import ReferralButton from './referral-button'
import { useStripeSubscriptionStore } from '@/store/stripe-subscription-store'
import { resolvePlanLabel } from './plan-label'

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

function accountInitial(email?: string | null): string {
  const letter = email?.trim().charAt(0)
  return letter ? letter.toUpperCase() : '?'
}

function AccountTrigger({
  email,
  photoUrl,
  label,
  className,
  ...props
}: {
  email?: string | null
  photoUrl?: string | null
  label: string
  className?: string
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  const initial = accountInitial(email)
  return (
    <button
      type="button"
      className={cn(
        'inline-flex h-7 shrink-0 items-center gap-1.5 rounded-[4px] border border-[#E5E5E5] bg-white px-1.5 text-sm font-medium text-[#171717] transition-colors hover:bg-[#FAFAFA] focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:border-border dark:bg-background dark:text-foreground dark:hover:bg-muted/40',
        className
      )}
      {...props}
    >
      {photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photoUrl}
          alt=""
          className="h-5 w-5 rounded-[2px] object-cover"
        />
      ) : (
        <span
          aria-hidden
          className="inline-flex h-5 w-5 items-center justify-center rounded-[2px] bg-[#171717] text-[10px] font-semibold leading-none text-white dark:bg-foreground dark:text-background"
        >
          {initial}
        </span>
      )}
      <span>{label}</span>
    </button>
  )
}

function useBillingPlanLabel() {
  const t = useI18n()
  const subscription = useStripeSubscriptionStore(
    (state) => state.stripeSubscription
  )
  return resolvePlanLabel(
    subscription?.plan?.name,
    subscription?.plan?.interval,
    t('pricing.free.name'),
    t('pricing.lifetime')
  ).label
}

function MenuLinks({
  onNavigate,
  className,
}: {
  onNavigate?: () => void
  className?: string
}) {
  const t = useI18n()
  const currentLocale = useCurrentLocale()
  const planLabel = useBillingPlanLabel()
  const itemClass =
    'flex w-full items-center px-2 py-1.5 text-sm text-[#171717] dark:text-foreground'

  return (
    <div className={className}>
      <Link href="/dashboard/settings" onClick={onNavigate} className={itemClass}>
        {t('dashboard.settings')}
      </Link>
      <Link
        href={`/${currentLocale}/dashboard/billing`}
        onClick={onNavigate}
        className={cn(itemClass, 'justify-between gap-3')}
      >
        <span>{t('dashboard.billingSheet.title')}</span>
        <span className="text-[#686D67] dark:text-muted-foreground">
          {planLabel}
        </span>
      </Link>
      <Link
        href="/dashboard/connections"
        onClick={onNavigate}
        className={itemClass}
      >
        {t('dashboard.connections')}
      </Link>
      <Link href="/dashboard/data" onClick={onNavigate} className={itemClass}>
        {t('dashboard.data')}
      </Link>
    </div>
  )
}

function ThemeOptions() {
  const t = useI18n()
  const { theme, setTheme, intensity, setIntensity } = useTheme()

  return (
    <>
      <DropdownMenuRadioGroup
        value={theme}
        onValueChange={(value) => setTheme(value as 'light' | 'dark' | 'system')}
      >
        <DropdownMenuRadioItem value="light">
          <Sun className="mr-2 h-4 w-4" />
          <span>{t('landing.navbar.lightMode')}</span>
        </DropdownMenuRadioItem>
        <DropdownMenuRadioItem value="dark">
          <Moon className="mr-2 h-4 w-4" />
          <span>{t('landing.navbar.darkMode')}</span>
        </DropdownMenuRadioItem>
        <DropdownMenuRadioItem value="system">
          <Laptop className="mr-2 h-4 w-4" />
          <span>{t('landing.navbar.systemTheme')}</span>
        </DropdownMenuRadioItem>
      </DropdownMenuRadioGroup>
      <DropdownMenuSeparator />
      <div className="p-4">
        <div className="mb-2 text-sm font-medium">
          {t('dashboard.theme.intensity')}
        </div>
        <Slider
          value={[intensity]}
          onValueChange={([value]) => setIntensity(value)}
          min={90}
          max={100}
          step={1}
          className="w-full"
        />
        <div className="mt-2 text-sm text-muted-foreground">{intensity}%</div>
      </div>
    </>
  )
}

function MobileThemeOptions() {
  const t = useI18n()
  const { theme, setTheme, intensity, setIntensity } = useTheme()
  const options = [
    { value: 'light' as const, label: t('landing.navbar.lightMode') },
    { value: 'dark' as const, label: t('landing.navbar.darkMode') },
    { value: 'system' as const, label: t('landing.navbar.systemTheme') },
  ]

  return (
    <div className="pb-2">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={cn(
            'block w-full px-2 py-1.5 text-left text-sm',
            theme === option.value
              ? 'font-medium text-[#171717] dark:text-foreground'
              : 'text-[#686D67] dark:text-muted-foreground'
          )}
          onClick={() => setTheme(option.value)}
        >
          {option.label}
        </button>
      ))}
      <div className="px-2 pt-3">
        <div className="mb-2 text-sm font-medium text-[#171717] dark:text-foreground">
          {t('dashboard.theme.intensity')}
        </div>
        <Slider
          value={[intensity]}
          onValueChange={([value]) => setIntensity(value)}
          min={90}
          max={100}
          step={1}
          className="w-full"
        />
        <div className="mt-2 text-sm text-[#686D67] dark:text-muted-foreground">
          {intensity}%
        </div>
      </div>
    </div>
  )
}

function handleSignOut() {
  localStorage.removeItem('deltalytix_user_data')
  void signOut()
}

export default function UserMenu() {
  const t = useI18n()
  const changeLocale = useChangeLocale()
  const currentLocale = useCurrentLocale()
  const isMobile = useIsMobile()
  const user = useUserStore((state) => state.supabaseUser)
  const timezone = useUserStore((state) => state.timezone)
  const setTimezone = useUserStore((state) => state.setTimezone)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [mobilePref, setMobilePref] = useState<
    'theme' | 'language' | 'timezone' | null
  >(null)

  const languages: { value: Locale; label: string }[] = useMemo(
    () => [
      { value: 'en', label: 'English' },
      { value: 'fr', label: 'Français' },
    ],
    []
  )

  const photoUrl = user?.user_metadata?.avatar_url as string | undefined
  const accountLabel = t('dashboard.account')
  const planLabel = useBillingPlanLabel()
  const trigger = (
    <AccountTrigger
      email={user?.email}
      photoUrl={photoUrl}
      label={accountLabel}
    />
  )

  if (isMobile) {
    return (
      <div className="relative">
        <AccountTrigger
          email={user?.email}
          photoUrl={photoUrl}
          label={accountLabel}
          onClick={() => setSheetOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={sheetOpen}
        />
        <Drawer
          open={sheetOpen}
          onOpenChange={(open) => {
            setSheetOpen(open)
            if (!open) setMobilePref(null)
          }}
          shouldScaleBackground={false}
        >
          <DrawerContent className="max-h-[85svh] rounded-t-[4px] border-[#E5E5E5] bg-white p-0 dark:border-border dark:bg-background">
            <DrawerHeader className="flex flex-row items-center justify-between gap-3 border-b border-[#E5E5E5] px-4 py-3 text-left dark:border-border">
              <div className="min-w-0">
                <DrawerTitle className="sr-only">{accountLabel}</DrawerTitle>
                <p className="truncate text-sm text-[#686D67] dark:text-muted-foreground">
                  {user?.email}
                </p>
              </div>
              <ReferralButton />
            </DrawerHeader>
            <div className="min-h-0 overflow-y-auto px-2 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
              <MenuLinks
                onNavigate={() => setSheetOpen(false)}
                className="flex flex-col"
              />
              <div className="my-2 h-px bg-[#E5E5E5] dark:bg-border" />
              {(
                [
                  ['theme', t('dashboard.theme')],
                  ['language', t('dashboard.language')],
                  ['timezone', t('dashboard.timezone')],
                ] as const
              ).map(([key, label]) => (
                <div key={key}>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between px-2 py-1.5 text-sm text-[#171717] dark:text-foreground"
                    onClick={() =>
                      setMobilePref((current) => (current === key ? null : key))
                    }
                    aria-expanded={mobilePref === key}
                  >
                    <span>{label}</span>
                    <span aria-hidden className="text-[#A3A3A3]">
                      ›
                    </span>
                  </button>
                  {mobilePref === key && key === 'theme' ? (
                    <MobileThemeOptions />
                  ) : null}
                  {mobilePref === key && key === 'language' ? (
                    <div className="flex flex-col pb-2">
                      {languages.map((lang) => (
                        <button
                          key={lang.value}
                          type="button"
                          className={cn(
                            'px-2 py-1.5 text-left text-sm',
                            currentLocale === lang.value
                              ? 'font-medium text-[#171717] dark:text-foreground'
                              : 'text-[#686D67] dark:text-muted-foreground'
                          )}
                          onClick={() => changeLocale(lang.value)}
                        >
                          {lang.label}
                        </button>
                      ))}
                    </div>
                  ) : null}
                  {mobilePref === key && key === 'timezone' ? (
                    <ScrollArea className="h-48 pb-2">
                      {timezones.map((tz) => (
                        <button
                          key={tz}
                          type="button"
                          className={cn(
                            'block w-full px-2 py-1.5 text-left text-sm',
                            timezone === tz
                              ? 'font-medium text-[#171717] dark:text-foreground'
                              : 'text-[#686D67] dark:text-muted-foreground'
                          )}
                          onClick={() => setTimezone(tz)}
                        >
                          {tz.replace('_', ' ')}
                        </button>
                      ))}
                    </ScrollArea>
                  ) : null}
                </div>
              ))}
              <div className="my-2 h-px bg-[#E5E5E5] dark:bg-border" />
              <button
                type="button"
                className="flex w-full items-center px-2 py-1.5 text-sm text-[#171717] dark:text-foreground"
                onClick={handleSignOut}
              >
                {t('dashboard.settings.account.signOut')}
              </button>
            </div>
          </DrawerContent>
        </Drawer>
      </div>
    )
  }

  return (
    <div className="relative">
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="max-h-[min(var(--radix-dropdown-menu-content-available-height),calc(100dvh-1rem))] w-56 overflow-y-auto overscroll-contain rounded-[4px] border-[#E5E5E5] p-1 dark:border-border"
        >
          <div className="px-2 py-1.5 text-sm text-[#686D67] dark:text-muted-foreground">
            {user?.email}
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/dashboard/settings">{t('dashboard.settings')}</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link
              href={`/${currentLocale}/dashboard/billing`}
              className="flex w-full items-center justify-between gap-3"
            >
              <span>{t('dashboard.billingSheet.title')}</span>
              <span className="text-[#686D67] dark:text-muted-foreground">
                {planLabel}
              </span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/dashboard/connections">
              {t('dashboard.connections')}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/dashboard/data">{t('dashboard.data')}</Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              {t('dashboard.theme')}
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent className="max-h-[min(var(--radix-dropdown-menu-content-available-height),calc(100dvh-1rem))] w-[200px] overflow-y-auto overscroll-contain">
                <ThemeOptions />
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              {t('dashboard.language')}
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent className="max-h-[min(var(--radix-dropdown-menu-content-available-height),calc(100dvh-1rem))] overflow-y-auto overscroll-contain">
                <ScrollArea className="max-h-32">
                  <DropdownMenuRadioGroup value={currentLocale}>
                    {languages.map((lang) => (
                      <DropdownMenuRadioItem
                        key={lang.value}
                        value={lang.value}
                        onClick={() => {
                          changeLocale(lang.value)
                        }}
                      >
                        {lang.label}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </ScrollArea>
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              {t('dashboard.timezone')}
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent className="max-h-[min(var(--radix-dropdown-menu-content-available-height),calc(100dvh-1rem))] overflow-y-auto overscroll-contain">
                <ScrollArea className="max-h-64">
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
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleSignOut}>
            {t('dashboard.settings.account.signOut')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
