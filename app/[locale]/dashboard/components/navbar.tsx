'use client'

import { useState, useRef } from 'react'
import { Globe, LayoutDashboard, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Logo } from '@/components/logo'
import Link from 'next/link'
import ImportButton from './import/import-button'
import { useI18n } from "@/locales/client"
import { useKeyboardShortcuts } from '../../../../hooks/use-keyboard-shortcuts'
import { ActiveFilterTags } from './filters/active-filter-tags'
import { AnimatePresence } from 'framer-motion'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { FilterCommandMenu } from './filters/filter-command-menu'
import { UsersIcon, type UsersIconHandle } from '@/components/animated-icons/users'
import { useModalStateStore } from '@/store/modal-state-store'
import { useUserStore } from '@/store/user-store'
import UserMenu from './user-menu'
import ReferralButton from './referral-button'

export default function Navbar() {
  const  user = useUserStore(state => state.supabaseUser)
  const t = useI18n()
  const [shortcutsDialogOpen, setShortcutsDialogOpen] = useState(false)
  const [showAccountNumbers, setShowAccountNumbers] = useState(true)
  const [isLogoPopoverOpen, setIsLogoPopoverOpen] = useState(false)
  const usersIconRef = useRef<UsersIconHandle>(null)
  const { accountGroupBoardOpen } = useModalStateStore()

  // Initialize keyboard shortcuts
  useKeyboardShortcuts()

  return (
    <>
      <nav className="sticky py-2 top-0 left-0 right-0 flex flex-col text-primary bg-background/80 backdrop-blur-md border-b shadow-xs w-full z-1">
        <div className="flex items-center justify-between px-10 h-16">
          <div className="flex items-center gap-x-4">
            <div className="flex flex-col items-center">
              <Popover open={isLogoPopoverOpen} onOpenChange={setIsLogoPopoverOpen} modal={false}>
                <PopoverTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-9 px-2 rounded-md hover:bg-accent hover:text-accent-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-colors"
                    aria-haspopup="menu"
                    aria-expanded={isLogoPopoverOpen}
                    aria-label={t('landing.navbar.logo.title')}
                  >
                    <span className="flex items-center gap-1">
                      <Logo className='fill-black h-6 w-6 dark:fill-white' />
                      <ChevronDown 
                        className={`h-4 w-4 transition-transform duration-200 ${isLogoPopoverOpen ? 'rotate-180' : 'rotate-0'}`}
                        aria-hidden="true"
                      />
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64" align="start">
                  <div className="space-y-2">
                    <h4 className="font-medium leading-none mb-3">{t('landing.navbar.logo.title')}</h4>
                    <div className="grid gap-2">
                      <Link 
                        href="/dashboard" 
                        className="flex items-center gap-2 text-sm hover:bg-accent hover:text-accent-foreground p-2 rounded-md transition-colors"
                        onClick={() => setIsLogoPopoverOpen(false)}
                      >
                        <div className="shrink-0 w-4 h-4">
                          <LayoutDashboard className="h-full w-full" />
                        </div>
                        {t('landing.navbar.logo.dashboard')}
                      </Link>
                      <Link 
                        href="/" 
                        className="flex items-center gap-2 text-sm hover:bg-accent hover:text-accent-foreground p-2 rounded-md transition-colors"
                        onClick={() => setIsLogoPopoverOpen(false)}
                      >
                        <div className="shrink-0 w-4 h-4">
                          <Globe className="h-full w-full" />
                        </div>
                        {t('landing.navbar.logo.home')}
                      </Link>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            <div className="hidden md:block">
              <FilterCommandMenu variant="navbar" />
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className='hidden md:flex gap-x-4'>
              <ImportButton />
            </div>
            <div className="flex items-center gap-2">
              <ReferralButton />
              <UserMenu />
            </div>
          </div>
        </div>
        <AnimatePresence>
          <ActiveFilterTags showAccountNumbers={showAccountNumbers} />
        </AnimatePresence>
      </nav>
    </>
  )
}
