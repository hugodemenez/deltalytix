'use client'

import { useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useUser } from "@/components/context/user-data"
import { Search, LifeBuoy, Cloud, CreditCard, Database, Keyboard, LogOut, Mail, MessageSquare, Settings, User, UserPlus, Moon, Sun, Laptop, Globe, LayoutDashboard, HelpCircle, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { signOut } from "@/server/auth"
import { Logo } from '@/components/logo'
import Link from 'next/link'
import { useTheme } from '@/components/context/theme-provider'
import ImportButton from './import-csv/import-button'
import { NotificationDropdown } from './notification-dropdown'
import NavbarFilters from './filters/filters'
import { SubscriptionBadge } from './subscription-badge'
import { LanguageSelector } from "@/components/ui/language-selector"
import { useI18n } from "@/locales/client"
import { useKeyboardShortcuts } from '../hooks/use-keyboard-shortcuts'
import { KeyboardShortcutsDialog } from './keyboard-shortcuts-dialog'
import { useOnborda } from 'onborda'
import DateCalendarFilter from './filters/date-calendar-filter'
import { FilterDropdowns } from './filters/filter-dropdowns'
import { ActiveFilterTags } from './filters/active-filter-tags'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

type Theme = 'light' | 'dark' | 'system'

export default function Navbar() {
  const { user, subscription } = useUser()
  const [searchFocused, setSearchFocused] = useState(false)
  const { theme, toggleTheme, setTheme } = useTheme()
  const t = useI18n()
  const [shortcutsDialogOpen, setShortcutsDialogOpen] = useState(false)
  const { startOnborda, closeOnborda } = useOnborda();
  const [showAccountNumbers, setShowAccountNumbers] = useState(true)

  // Initialize keyboard shortcuts
  useKeyboardShortcuts()

  const languages = [
    { value: 'en', label: 'English' },
    { value: 'fr', label: 'Français' },
    // Add more languages here
  ]

  const handleThemeChange = (value: string) => {
    setTheme(value as Theme)
  }

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 flex flex-col text-primary bg-background/80 backdrop-blur-md border-b shadow-sm w-screen">
        <div className="flex items-center justify-between px-10 py-6 gap-x-4">
          <div className="flex items-center gap-x-2">
            <Link href="/dashboard">
              <Logo className='fill-black h-6 w-6 dark:fill-white' />
            </Link>
            <SubscriptionBadge 
              plan={subscription?.plan || null} 
              endDate={subscription?.endDate || null}
              trialEndsAt={subscription?.trialEndsAt || null}
              status={subscription?.status || ''}
            />
          </div>
          <div className="flex items-center space-x-4">
            <div className='hidden md:flex gap-x-4'>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => setShowAccountNumbers(!showAccountNumbers)}
                      className="h-9 w-9"
                    >
                      {showAccountNumbers ? (
                        <Eye className="h-4 w-4" />
                      ) : (
                        <EyeOff className="h-4 w-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {showAccountNumbers ? t('filters.hideAccountNumbers') : t('filters.showAccountNumbers')}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <DateCalendarFilter />
              <FilterDropdowns showAccountNumbers={showAccountNumbers} />
              <ImportButton />
            </div>
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
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard">
                      <div className="flex w-full">
                        <LayoutDashboard className="mr-2 h-4 w-4" />
                        <span>{t('navbar.dashboard')}</span>
                        <DropdownMenuShortcut>⌘D</DropdownMenuShortcut>
                      </div>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href={process.env.NEXT_PUBLIC_STRIPE_CUSTOMER_PORTAL || ""}>
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
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger>
                        <UserPlus className="mr-2 h-4 w-4" />
                        <span>{t('dashboard.inviteUsers')}</span>
                      </DropdownMenuSubTrigger>
                      <DropdownMenuPortal>
                        <DropdownMenuSubContent>
                          <DropdownMenuItem>
                            <Mail className="mr-2 h-4 w-4" />
                            <span>{t('dashboard.email')}</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem disabled>
                            <MessageSquare className="mr-2 h-4 w-4" />
                            <span>{t('dashboard.message')}</span>
                          </DropdownMenuItem>
                        </DropdownMenuSubContent>
                      </DropdownMenuPortal>
                    </DropdownMenuSub>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <Link href="/support">
                  <DropdownMenuItem>
                    <LifeBuoy className="mr-2 h-4 w-4" />
                    <span>{t('dashboard.support')}</span>
                  </DropdownMenuItem>
                  </Link>
                  <DropdownMenuItem disabled>
                    <Cloud className="mr-2 h-4 w-4" />
                    <span>{t('dashboard.api')}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShortcutsDialogOpen(true)}>
                    <Keyboard className="mr-2 h-4 w-4" />
                    <span>{t('dashboard.keyboardShortcuts')}</span>
                    <DropdownMenuShortcut>⌘K</DropdownMenuShortcut>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => startOnborda("main")}>
                    <HelpCircle className="mr-2 h-4 w-4" />
                    <span>{t('dashboard.startTour')}</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>{t('dashboard.theme')}</DropdownMenuLabel>
                  <DropdownMenuRadioGroup value={theme} onValueChange={handleThemeChange}>
                    <DropdownMenuRadioItem value="light">
                      <Sun className="mr-2 h-4 w-4" />
                      <span>{t('navbar.lightMode')}</span>
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="dark">
                      <Moon className="mr-2 h-4 w-4" />
                      <span>{t('navbar.darkMode')}</span>
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="system">
                      <Laptop className="mr-2 h-4 w-4" />
                      <span>{t('navbar.systemTheme')}</span>
                    </DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>{t('dashboard.language')}</DropdownMenuLabel>
                  <div className="px-2 py-1.5">
                    <LanguageSelector
                      languages={languages}
                      className="w-full"
                      triggerClassName="w-full justify-start h-8 px-2"
                      onRequestNewLanguage={() => {
                        console.log("Request new language support")
                      }}
                    />
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => {
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
        <div className="px-10 pb-2">
          <ActiveFilterTags showAccountNumbers={showAccountNumbers} />
        </div>
      </nav>
      <div className="h-[88px]" /> {/* Adjust the spacer height if needed */}
      <KeyboardShortcutsDialog 
        open={shortcutsDialogOpen} 
        onOpenChange={setShortcutsDialogOpen} 
      />
    </>
  )
}
