"use client"

import { BarChart3, Home, Table, Users, TrendingUp } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useI18n } from "@/locales/client"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const t = useI18n()
  const pathname = usePathname()

  // Extract locale from pathname
  const locale = pathname.split('/')[1]

  // Navigation items
  const items = [
    {
      title: t('dashboard.tabs.widgets'),
      url: `/${locale}/dashboard`,
      icon: Home,
    },
    {
      title: t('dashboard.tabs.table'),
      url: `/${locale}/dashboard/table`,
      icon: Table,
    },
    {
      title: t('dashboard.tabs.accounts'),
      url: `/${locale}/dashboard/accounts`,
      icon: Users,
    },
    {
      title: t('dashboard.tabs.analysis'),
      url: `/${locale}/dashboard/analysis`,
      icon: TrendingUp,
    },
  ]

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href={`/${locale}/dashboard`}>
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <BarChart3 className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Delatlytix</span>
                  <span className="truncate text-xs">Trading Dashboard</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const isActive = pathname === item.url || 
                  (item.url === `/${locale}/dashboard` && pathname === `/${locale}/dashboard`)
                
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link href={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      
      <SidebarFooter>
        {/* Footer content can be added here */}
      </SidebarFooter>
      
      <SidebarRail />
    </Sidebar>
  )
}