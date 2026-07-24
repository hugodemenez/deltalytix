'use client'

import { useEffect, useState, useRef } from 'react'
import { Globe, LayoutDashboard, ChevronDown, Cable } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Logo } from '@/components/logo'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useI18n } from "@/locales/client"
import { useKeyboardShortcuts } from '../../../../hooks/use-keyboard-shortcuts'
import { ActiveFilterTags } from './filters/active-filter-tags'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { UsersIcon, type UsersIconHandle } from '@/components/animated-icons/users'
import { useModalStateStore } from '@/store/modal-state-store'
import { useUserStore } from '@/store/user-store'
import UserMenu from './user-menu'
import ReferralButton from './referral-button'
import FeedbackButton from './feedback-button'

export default function Navbar() {
  const router = useRouter()
  const  user = useUserStore(state => state.supabaseUser)
  const t = useI18n()
  const [shortcutsDialogOpen, setShortcutsDialogOpen] = useState(false)
  const [showAccountNumbers, setShowAccountNumbers] = useState(true)
  const [isLogoPopoverOpen, setIsLogoPopoverOpen] = useState(false)
  const usersIconRef = useRef<UsersIconHandle>(null)
  const { accountGroupBoardOpen } = useModalStateStore()

  // Initialize keyboard shortcuts
  useKeyboardShortcuts()

  // Dashboard lives inside a closed logo popover, so its Link is not in the DOM
  // on /connections and Partial Prefetching never warms the route. Connections
  // is always visible → prefetched → feels instant. Prefetch dashboard explicitly.
  useEffect(() => {
    router.prefetch('/dashboard')
  }, [router])

  return (
    <>
      <nav className="sticky top-0 left-0 right-0 z-40 flex w-full flex-col border-b bg-background pt-safe text-primary shadow-xs">
        <div className="flex items-center justify-between px-3 sm:px-6 lg:px-10 h-16 gap-3 sm:gap-4 py-2">
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
                        prefetch={true}
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
          </div>
          <ActiveFilterTags
            showAccountNumbers={showAccountNumbers}
            inline
            className="hidden md:block flex-1 min-w-0"
          />
          <div className="flex items-center gap-2 sm:gap-4">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                  className="h-9 rounded-sm px-2 active:scale-[0.96]"
                >
                  <Link
                    href="/dashboard/connections"
                    id="import-data"
                    prefetch={true}
                    aria-label={t('dashboard.connections')}
                  >
                    <Cable className="h-4 w-4" />
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('dashboard.connections')}</TooltipContent>
            </Tooltip>
            <FeedbackButton />
            <ReferralButton />
            <UserMenu />
          </div>
        </div>
      </nav>
    </>
  )
}
