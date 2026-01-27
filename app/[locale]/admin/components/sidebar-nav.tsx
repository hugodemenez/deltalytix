import Link from "next/link"
import { usePathname } from "next/navigation"
import { Mail, BarChart, UserPlus, Send } from "lucide-react"
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
  SidebarRail,
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
      href: "/admin/send-email",
      label: "Send Email",
      icon: Send,
    },
  ]

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarRail className="after:transition-colors after:duration-200 hover:bg-sidebar-accent/10 hover:after:bg-sidebar-accent group-data-[collapsible=icon]:after:bg-sidebar-border" />
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