'use client'

import { useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useUser } from "@/components/context/user-data"
import { Search, LifeBuoy, Cloud, CreditCard, Database, Keyboard, LogOut, Mail, MessageSquare, Settings, User, UserPlus, Moon, Sun, Laptop } from "lucide-react"
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
type Theme = 'light' | 'dark' | 'system'

export default function Navbar() {
  const { user, subscription } = useUser()
  const [searchFocused, setSearchFocused] = useState(false)
  const { theme, toggleTheme, setTheme } = useTheme()

  const handleThemeChange = (value: string) => {
    setTheme(value as Theme)
  }

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-10 py-6 text-primary bg-background/80 backdrop-blur-md border-b shadow-sm w-screen gap-x-4">
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
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuItem asChild>
                  <Link href={process.env.NEXT_PUBLIC_STRIPE_CUSTOMER_PORTAL || ""}>
                    <div className="flex w-full">
                      <CreditCard className="mr-2 h-4 w-4" />
                      <span>Billing</span>
                      <DropdownMenuShortcut>⌘B</DropdownMenuShortcut>
                    </div>
                  </Link>
                </DropdownMenuItem>
                <Link href={"/dashboard/data"}>
                  <DropdownMenuItem>
                    <Database className="mr-2 h-4 w-4" />
                    <span>Data</span>
                    <DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
                  </DropdownMenuItem>
                </Link>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <UserPlus className="mr-2 h-4 w-4" />
                      <span>Invite users</span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuPortal>
                      <DropdownMenuSubContent>
                        <DropdownMenuItem>
                          <Mail className="mr-2 h-4 w-4" />
                          <span>Email</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem disabled>
                          <MessageSquare className="mr-2 h-4 w-4" />
                          <span>Message</span>
                        </DropdownMenuItem>
                      </DropdownMenuSubContent>
                    </DropdownMenuPortal>
                  </DropdownMenuSub>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <Link href="/support">
                <DropdownMenuItem>
                  <LifeBuoy className="mr-2 h-4 w-4" />
                  <span>Support</span>
                </DropdownMenuItem>
                </Link>
                <DropdownMenuItem disabled>
                  <Cloud className="mr-2 h-4 w-4" />
                  <span>API</span>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Keyboard className="mr-2 h-4 w-4" />
                  <span>Keyboard shortcuts</span>
                  <DropdownMenuShortcut>⌘K</DropdownMenuShortcut>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Theme</DropdownMenuLabel>
                <DropdownMenuRadioGroup value={theme} onValueChange={handleThemeChange}>
                  <DropdownMenuRadioItem value="light">
                    <Sun className="mr-2 h-4 w-4" />
                    <span>Light</span>
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="dark">
                    <Moon className="mr-2 h-4 w-4" />
                    <span>Dark</span>
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="system">
                    <Laptop className="mr-2 h-4 w-4" />
                    <span>System</span>
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => {
                  signOut()
                }}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                  <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </nav>
      <div className="h-[88px]" /> {/* Spacer to prevent content from being hidden under the navbar */}
    </>
  )
}
