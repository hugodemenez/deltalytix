'use client'

import { useState, useRef, useEffect } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useUserData } from "@/components/context/user-data"
import { LifeBuoy, CreditCard, Database, LogOut, Globe, LayoutDashboard, HelpCircle, Clock, RefreshCw, Home } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { signOut } from "@/server/auth"
import { Logo } from '@/components/logo'
import Link from 'next/link'
import ImportButton from './import/import-button'
import { SubscriptionBadge } from './subscription-badge'
import { useI18n, useChangeLocale, useCurrentLocale } from "@/locales/client"
import { useKeyboardShortcuts } from '../hooks/use-keyboard-shortcuts'
import { KeyboardShortcutsDialog } from './keyboard-shortcuts-dialog'
import { useOnborda } from 'onborda'
import DateCalendarFilter from './filters/date-calendar-filter'
import { ActiveFilterTags } from './filters/active-filter-tags'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { AnimatePresence } from 'framer-motion'
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ThemeSwitcher } from "@/components/theme-switcher"
import { AccountFilter } from './filters/account-filter'
import { UsersIcon, type UsersIconHandle } from '@/components/animated-icons/users'
import { useModalStateStore } from '../store/modal-state-store'

type Locale = 'en' | 'fr'

// Add timezone list
const timezones = [
  'UTC',
  'Europe/Paris',
  'America/New_York',
  'America/Chicago',
  'America/Los_Angeles',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Australia/Sydney',
  // Add more common timezones as needed
];

export default function Navbar() {
  const { user, subscription, timezone, setTimezone, refreshTrades } = useUserData()
  const t = useI18n()
  const changeLocale = useChangeLocale()
  const currentLocale = useCurrentLocale()
  const [shortcutsDialogOpen, setShortcutsDialogOpen] = useState(false)
  const { startOnborda } = useOnborda();
  const [showAccountNumbers, setShowAccountNumbers] = useState(true)
  const [isLogoPopoverOpen, setIsLogoPopoverOpen] = useState(false)
  const usersIconRef = useRef<UsersIconHandle>(null)
  const { accountGroupBoardOpen } = useModalStateStore()
  const [accountFilterOpen, setAccountFilterOpen] = useState(false)

  // Close account filter when account board is open
  useEffect(() => {
    if (accountGroupBoardOpen) {
      setAccountFilterOpen(false)
    }
  }, [accountGroupBoardOpen])

  // Initialize keyboard shortcuts
  useKeyboardShortcuts()

  const languages: { value: Locale; label: string }[] = [
    { value: 'en', label: 'English' },
    { value: 'fr', label: 'Français' },
    // Add more languages here
  ]

  return (
    <>
      <nav className="fixed py-2 top-0 left-0 right-0 z-50 flex flex-col text-primary bg-background/80 backdrop-blur-md border-b shadow-sm w-screen">
        <div className="flex items-center justify-between px-10 h-16">
          <div className="flex items-center gap-x-2">
            <div className="flex flex-col items-center">
              <Popover open={isLogoPopoverOpen} onOpenChange={setIsLogoPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="p-0">
                    <Logo className='fill-black h-6 w-6 dark:fill-white' />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-48" align="start">
                  <div className="space-y-2">
                    <h4 className="font-medium leading-none mb-3">{t('landing.navbar.logo.title')}</h4>
                    <div className="grid gap-2">
                      <Link 
                        href="/dashboard" 
                        className="flex items-center gap-2 text-sm hover:bg-accent hover:text-accent-foreground p-2 rounded-md transition-colors"
                        onClick={() => setIsLogoPopoverOpen(false)}
                      >
                        <div className="flex-shrink-0 w-4 h-4">
                          <LayoutDashboard className="h-full w-full" />
                        </div>
                        {t('landing.navbar.logo.dashboard')}
                      </Link>
                      <Link 
                        href="/" 
                        className="flex items-center gap-2 text-sm hover:bg-accent hover:text-accent-foreground p-2 rounded-md transition-colors"
                        onClick={() => setIsLogoPopoverOpen(false)}
                      >
                        <div className="flex-shrink-0 w-4 h-4">
                          <Home className="h-full w-full" />
                        </div>
                        {t('landing.navbar.logo.home')}
                      </Link>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              <div className="mt-[-8px]">
                <SubscriptionBadge 
                  plan={subscription?.plan?.split(' ')[0] || null} 
                  endDate={subscription?.endDate || null}
                  trialEndsAt={subscription?.trialEndsAt || null}
                  status={subscription?.status || ''}
                />
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className='hidden md:flex gap-x-4'>
              <DropdownMenu open={accountFilterOpen} onOpenChange={setAccountFilterOpen}>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="justify-start text-left font-normal"
                    onMouseEnter={() => usersIconRef.current?.startAnimation()}
                    onMouseLeave={() => usersIconRef.current?.stopAnimation()}
                  >
                    <UsersIcon ref={usersIconRef} className="h-4 w-4 mr-2" />
                    {t('filters.accounts')}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[300px]">
                  <AccountFilter showAccountNumbers={showAccountNumbers} />
                </DropdownMenuContent>
              </DropdownMenu>
              <DateCalendarFilter />
              <ImportButton />
            </div>
            <div className="flex items-center gap-2">
              <ThemeSwitcher />
              <div className="relative">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Avatar className="cursor-pointer h-8 w-8">
                      <AvatarImage src={user?.user_metadata.avatar_url} />
                      <AvatarFallback className="uppercase text-xs bg-secondary text-secondary-foreground">
                        {user?.email![0]}
                      </AvatarFallback>
                    </Avatar>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56">
                    <DropdownMenuLabel>{t('dashboard.myAccount')}</DropdownMenuLabel>
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                      {user?.email}
                    </div>
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard">
                        <div className="flex w-full">
                          <LayoutDashboard className="mr-2 h-4 w-4" />
                          <span>{t('landing.navbar.dashboard')}</span>
                          <DropdownMenuShortcut>⌘D</DropdownMenuShortcut>
                        </div>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard/billing">
                        <div className="flex w-full">
                          <CreditCard className="mr-2 h-4 w-4" />
                          <span>{t('dashboard.billing')}</span>
                          <DropdownMenuShortcut>⌘B</DropdownMenuShortcut>
                        </div>
                      </Link>
                    </DropdownMenuItem>
                    <Link href={"/dashboard/data"}>
                      <DropdownMenuItem>
                        <Database className="mr-2 h-4 w-4" />
                        <span>{t('dashboard.data')}</span>
                        <DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
                      </DropdownMenuItem>
                    </Link>
                    <DropdownMenuItem onClick={refreshTrades}>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      <span>{t('dashboard.refreshData')}</span>
                      <DropdownMenuShortcut>⌘R</DropdownMenuShortcut>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <Link href="/support">
                      <DropdownMenuItem>
                        <LifeBuoy className="mr-2 h-4 w-4" />
                        <span>{t('dashboard.support')}</span>
                      </DropdownMenuItem>
                    </Link>
                    <DropdownMenuItem onClick={() => startOnborda("main")}>
                      <HelpCircle className="mr-2 h-4 w-4" />
                      <span>{t('dashboard.startTour')}</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel className="flex items-center">
                      <Globe className="mr-2 h-4 w-4" />
                      {t('dashboard.language')}
                    </DropdownMenuLabel>
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
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel className="flex items-center">
                      <Clock className="mr-2 h-4 w-4" />
                      {t('dashboard.timezone')}
                    </DropdownMenuLabel>
                    <ScrollArea className="h-[40px] sm:h-[120px]">
                      <DropdownMenuRadioGroup value={timezone} onValueChange={setTimezone}>
                        {timezones.map((tz) => (
                          <DropdownMenuRadioItem key={tz} value={tz}>
                            {tz.replace('_', ' ')}
                          </DropdownMenuRadioItem>
                        ))}
                      </DropdownMenuRadioGroup>
                    </ScrollArea>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => {
                      localStorage.removeItem('deltalytix_user_data')
                      signOut()
                    }}>
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>{t('dashboard.logOut')}</span>
                      <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </div>
        <AnimatePresence>
          <ActiveFilterTags showAccountNumbers={showAccountNumbers} />
        </AnimatePresence>
      </nav>
      <div className="h-[72px]" />
      <KeyboardShortcutsDialog 
        open={shortcutsDialogOpen} 
        onOpenChange={setShortcutsDialogOpen} 
      />
    </>
  )
}
