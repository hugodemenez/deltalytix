import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Mail, BarChart, UserPlus, Calendar, TrendingUp } from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
} from "@/components/ui/sidebar"
import { ThemeSwitcher } from "./theme-switcher"

interface SidebarNavProps extends React.HTMLAttributes<HTMLDivElement> {}

export function SidebarNav({ className, ...props }: SidebarNavProps) {
  const pathname = usePathname()

  const routes = [
    {
      href: "/admin/newsletter-builder",
      label: "Newsletter Builder",
      icon: Mail,
    },
    {
      href: "/admin/weekly-recap",
      label: "Weekly Recap",
      icon: BarChart,
    },
    {
      href: "/admin/welcome-email",
      label: "Welcome Email",
      icon: UserPlus,
    },
    {
      href: "/admin/investing-calendar",
      label: "Investing Calendar",
      icon: Calendar,
    },
    {
      href: "/admin/user-equity",
      label: "User Equity",
      icon: TrendingUp,
    },
  ]

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Dashboard</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {routes.map((route) => (
                <SidebarMenuItem key={route.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname?.includes(route.href)}
                    tooltip={route.label}
                  >
                    <Link href={route.href}>
                      <route.icon className="h-4 w-4" />
                      <span>{route.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <div className="flex justify-center p-2">
              <ThemeSwitcher />
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
} 