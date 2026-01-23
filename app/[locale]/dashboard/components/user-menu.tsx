'use client'

import Link from 'next/link'
import { useI18n, useChangeLocale, useCurrentLocale } from '@/locales/client'
import { useTheme } from '@/context/theme-provider'
import { useData } from '@/context/data-provider'
import { useUserStore } from '@/store/user-store'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Slider } from '@/components/ui/slider'
import {
  LifeBuoy,
  CreditCard,
  Database,
  LogOut,
  Globe,
  LayoutDashboard,
  Clock,
  RefreshCw,
  Moon,
  Sun,
  Laptop,
  Settings,
  Building2,
} from 'lucide-react'
import { SubscriptionBadge } from './subscription-badge'
import { signOut } from '@/server/auth'
import { useMemo } from 'react'

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

export default function UserMenu() {
  const t = useI18n()
  const changeLocale = useChangeLocale()
  const currentLocale = useCurrentLocale()
  const { theme, setTheme, intensity, setIntensity } = useTheme()
  const { refreshAllData } = useData()
  const user = useUserStore(state => state.supabaseUser)
  const timezone = useUserStore(state => state.timezone)
  const setTimezone = useUserStore(state => state.setTimezone)

  const languages: { value: Locale; label: string }[] = useMemo(() => ([
    { value: 'en', label: 'English' },
    { value: 'fr', label: 'Français' },
  ]), [])

  const handleThemeChange = (value: string) => {
    setTheme(value as 'light' | 'dark' | 'system')
  }

  const getThemeIcon = () => {
    if (theme === 'light') return <Sun className="h-4 w-4" />
    if (theme === 'dark') return <Moon className="h-4 w-4" />
    if (typeof window !== 'undefined') {
      const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches
      return isDarkMode ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />
    }
    return <Laptop className="h-4 w-4" />
  }

  return (
    <div className="relative">
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <div className="relative inline-block">
            <Avatar className="cursor-pointer h-8 w-8">
              <AvatarImage src={user?.user_metadata.avatar_url} />
              <AvatarFallback className="uppercase text-xs bg-secondary text-secondary-foreground">
                {user?.email![0]}
              </AvatarFallback>
            </Avatar>
            <SubscriptionBadge className="absolute -bottom-1 -right-1 px-1 py-0 text-[10px] leading-3" />
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56">
          <DropdownMenuLabel>{t('dashboard.myAccount')}</DropdownMenuLabel>
          <div className="px-2 py-1.5 text-sm text-muted-foreground">
            {user?.email}
          </div>
          <DropdownMenuItem asChild>
            <Link href="/dashboard">
              <div className="flex items-center w-full">
                <LayoutDashboard className="mr-2 h-4 w-4" />
                <span>{t('landing.navbar.dashboard')}</span>
                <DropdownMenuShortcut>⌘D</DropdownMenuShortcut>
              </div>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/dashboard/settings">
              <div className="flex items-center w-full">
                <Settings className="mr-2 h-4 w-4" />
                <span>{t('dashboard.settings')}</span>
                <DropdownMenuShortcut>⌘,</DropdownMenuShortcut>
              </div>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/dashboard/billing">
              <div className="flex items-center w-full">
                <CreditCard className="mr-2 h-4 w-4" />
                <span>{t('dashboard.billing')}</span>
                <DropdownMenuShortcut>⌘B</DropdownMenuShortcut>
              </div>
            </Link>
          </DropdownMenuItem>
          <Link href="/dashboard/data">
            <DropdownMenuItem className="flex items-center">
              <Database className="mr-2 h-4 w-4" />
              <span>{t('dashboard.data')}</span>
              <DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
            </DropdownMenuItem>
          </Link>
          <DropdownMenuItem onClick={async () => await refreshAllData({ force: true })} className="flex items-center">
            <RefreshCw className="mr-2 h-4 w-4" />
            <span>{t('dashboard.refreshData')}</span>
            <DropdownMenuShortcut>⌘R</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/teams/dashboard">
              <div className="flex items-center w-full">
                <Building2 className="mr-2 h-4 w-4" />
                <span>{t('dashboard.teams')}</span>
              </div>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <Link href="/support">
            <DropdownMenuItem className="flex items-center">
              <LifeBuoy className="mr-2 h-4 w-4" />
              <span>{t('dashboard.support')}</span>
            </DropdownMenuItem>
          </Link>
          <DropdownMenuSeparator />
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              {getThemeIcon()}
              <span className="ml-2">{t('landing.navbar.toggleTheme')}</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent className="w-[200px]">
                <DropdownMenuRadioGroup value={theme} onValueChange={handleThemeChange}>
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
                  <div className="mb-2 text-sm font-medium">{t('dashboard.theme.intensity')}</div>
                  <Slider
                    value={[intensity]}
                    onValueChange={([value]) => setIntensity(value)}
                    min={90}
                    max={100}
                    step={1}
                    className="w-full"
                  />
                  <div className="mt-2 text-sm text-muted-foreground">
                    {intensity}%
                  </div>
                </div>
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Globe className="mr-2 h-4 w-4" />
              <span>{t('dashboard.language')}</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent>
                <ScrollArea className="h-[64px]">
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
              <Clock className="mr-2 h-4 w-4" />
              <span>{t('dashboard.timezone')}</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent>
                <ScrollArea className="h-[40px] sm:h-[120px]">
                  <DropdownMenuRadioGroup value={timezone} onValueChange={setTimezone}>
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
          <DropdownMenuItem
            onClick={() => {
              localStorage.removeItem('deltalytix_user_data')
              signOut()
            }}
            className="flex items-center"
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span>{t('dashboard.logOut')}</span>
            <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}


