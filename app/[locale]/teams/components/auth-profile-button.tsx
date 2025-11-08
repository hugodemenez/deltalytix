'use server'

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { LifeBuoy, CreditCard, Database, LayoutDashboard, Settings } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import Link from 'next/link'
import { getI18n } from "@/locales/server"
import { getUserProfileAction } from "@/server/user-profile"
import { TeamSubscriptionBadge } from './team-subscription-badge-client'
import { LogoutButton } from './logout-button'


export async function AuthProfileButton() {
  const  t = await getI18n()
  const profileData = await getUserProfileAction()
  const user = profileData.supabaseUser
  const subscription = profileData.subscription

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div className="relative inline-block cursor-pointer">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user?.user_metadata.avatar_url} />
            <AvatarFallback className="uppercase text-xs bg-secondary text-secondary-foreground">
              {user?.email?.[0]}
            </AvatarFallback>
          </Avatar>
          <TeamSubscriptionBadge 
            subscription={subscription} 
            className="absolute -bottom-1 -right-1 px-1 py-0 text-[10px] leading-3" 
          />
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end">
        <DropdownMenuLabel>{t('dashboard.myAccount')}</DropdownMenuLabel>
        <div className="px-2 py-1.5 text-sm text-muted-foreground">
          {user?.email}
        </div>
        <DropdownMenuSeparator />
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
        <DropdownMenuSeparator />
        <Link href="/support">
          <DropdownMenuItem className="flex items-center">
            <LifeBuoy className="mr-2 h-4 w-4" />
            <span>{t('dashboard.support')}</span>
          </DropdownMenuItem>
        </Link>
        <DropdownMenuSeparator />
        <LogoutButton />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
