'use client'

import { useState, useEffect } from 'react'
import { useI18n } from "@/locales/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { useUserStore } from '../../../../store/user-store'
import { useTheme } from '@/context/theme-provider'
import { 
  User, 
  Settings, 
  Bell, 
  Shield, 
  Globe, 
  Moon, 
  Sun, 
  Laptop,
  Clock,
  CreditCard,
  Database,
  LifeBuoy,
  LogOut,
  Building2
} from "lucide-react"
import { signOut } from "@/server/auth"
import Link from 'next/link'
import { useChangeLocale, useCurrentLocale } from "@/locales/client"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Slider } from "@/components/ui/slider"
import { createBusiness, joinBusiness, leaveBusiness, getUserBusinesses } from './actions'
import { toast } from "sonner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { LinkedAccounts } from "@/components/linked-accounts"

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

export default function SettingsPage() {
  const t = useI18n()
  const changeLocale = useChangeLocale()
  const currentLocale = useCurrentLocale()
  const { theme, setTheme, intensity, setIntensity } = useTheme()
  const user = useUserStore(state => state.supabaseUser)
  const timezone = useUserStore(state => state.timezone)
  const setTimezone = useUserStore(state => state.setTimezone)
  
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [pushNotifications, setPushNotifications] = useState(false)
  const [tradingAlerts, setTradingAlerts] = useState(true)
  const [weeklyReports, setWeeklyReports] = useState(true)
  
  // Business state
  const [userBusinesses, setUserBusinesses] = useState<{
    ownedBusinesses: any[]
    joinedBusinesses: any[]
  }>({ ownedBusinesses: [], joinedBusinesses: [] })

  const languages: { value: Locale; label: string }[] = [
    { value: 'en', label: 'English' },
    { value: 'fr', label: 'Français' },
  ]

  const handleThemeChange = (value: string) => {
    setTheme(value as "light" | "dark" | "system")
  }

  const getThemeIcon = () => {
    if (theme === 'light') return <Sun className="h-4 w-4" />;
    if (theme === 'dark') return <Moon className="h-4 w-4" />;
    if (typeof window !== 'undefined') {
      const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
      return isDarkMode ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />;
    }
    return <Laptop className="h-4 w-4" />;
  };

  // Load user businesses on component mount
  useEffect(() => {
    const loadBusinesses = async () => {
      const result = await getUserBusinesses()
      if (result.success && result.ownedBusinesses && result.joinedBusinesses) {
        setUserBusinesses({
          ownedBusinesses: result.ownedBusinesses,
          joinedBusinesses: result.joinedBusinesses,
        })
      }
    }
    loadBusinesses()
  }, [])



  const handleLeaveBusiness = async (businessId: string) => {
    const result = await leaveBusiness(businessId)
    if (result.success) {
      toast.success(t('dashboard.business.leaveSuccess'))
      // Reload businesses
      const updatedBusinesses = await getUserBusinesses()
      if (updatedBusinesses.success && updatedBusinesses.ownedBusinesses && updatedBusinesses.joinedBusinesses) {
        setUserBusinesses({
          ownedBusinesses: updatedBusinesses.ownedBusinesses,
          joinedBusinesses: updatedBusinesses.joinedBusinesses,
        })
      }
    } else {
      toast.error(result.error || t('dashboard.business.error'))
    }
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">{t('dashboard.settings')}</h1>
        <p className="text-muted-foreground mt-2">{t('dashboard.settings.description')}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Profile Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {t('dashboard.profile')}
            </CardTitle>
            <CardDescription>
              Manage your personal information and account details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={user?.user_metadata.avatar_url} />
                <AvatarFallback className="text-lg">
                  {user?.email![0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold">{user?.email}</h3>
                  <Badge variant="secondary">Active</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Member since {new Date(user?.created_at || '').toLocaleDateString()}
                </p>
              </div>
            </div>
            <Separator />
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name</Label>
                  <Input id="firstName" placeholder="Enter your first name" />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input id="lastName" placeholder="Enter your last name" />
                </div>
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={user?.email || ''} disabled />
              </div>
              <Button>Update Profile</Button>
            </div>
          </CardContent>
        </Card>

        {/* Preferences Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Preferences
            </CardTitle>
            <CardDescription>
              Customize your dashboard appearance and behavior
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Theme Settings */}
            <div>
              <Label className="text-base font-medium">Theme</Label>
              <div className="mt-2 flex items-center gap-4">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-[200px] justify-start">
                      {getThemeIcon()}
                      <span className="ml-2">
                        {theme === 'light' ? 'Light' : theme === 'dark' ? 'Dark' : 'System'}
                      </span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => handleThemeChange("light")}>
                      <Sun className="mr-2 h-4 w-4" />
                      <span>Light</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleThemeChange("dark")}>
                      <Moon className="mr-2 h-4 w-4" />
                      <span>Dark</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleThemeChange("system")}>
                      <Laptop className="mr-2 h-4 w-4" />
                      <span>System</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <div className="flex-1">
                  <Label className="text-sm">Theme Intensity</Label>
                  <div className="mt-2 flex items-center gap-4">
                    <Slider
                      value={[intensity]}
                      onValueChange={([value]) => setIntensity(value)}
                      min={90}
                      max={100}
                      step={1}
                      className="flex-1"
                    />
                    <span className="text-sm text-muted-foreground w-12">{intensity}%</span>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Language Settings */}
            <div>
              <Label className="text-base font-medium flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Language
              </Label>
              <div className="mt-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-[200px] justify-start">
                      <Globe className="mr-2 h-4 w-4" />
                      {languages.find(lang => lang.value === currentLocale)?.label}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuRadioGroup value={currentLocale}>
                      {languages.map((lang) => (
                        <DropdownMenuRadioItem 
                          key={lang.value} 
                          value={lang.value}
                          onClick={() => changeLocale(lang.value)}
                        >
                          {lang.label}
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <Separator />

            {/* Timezone Settings */}
            <div>
              <Label className="text-base font-medium flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Timezone
              </Label>
              <div className="mt-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-[200px] justify-start">
                      <Clock className="mr-2 h-4 w-4" />
                      {timezone}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <ScrollArea className="h-[200px]">
                      <DropdownMenuRadioGroup value={timezone} onValueChange={setTimezone}>
                        {timezones.map((tz) => (
                          <DropdownMenuRadioItem key={tz} value={tz}>
                            {tz.replace('_', ' ')}
                          </DropdownMenuRadioItem>
                        ))}
                      </DropdownMenuRadioGroup>
                    </ScrollArea>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notifications Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
            </CardTitle>
            <CardDescription>
              Configure how you receive notifications and alerts
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="email-notifications">Email Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive important updates via email
                </p>
              </div>
              <Switch
                id="email-notifications"
                checked={emailNotifications}
                onCheckedChange={setEmailNotifications}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="push-notifications">Push Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Get real-time alerts in your browser
                </p>
              </div>
              <Switch
                id="push-notifications"
                checked={pushNotifications}
                onCheckedChange={setPushNotifications}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="trading-alerts">Trading Alerts</Label>
                <p className="text-sm text-muted-foreground">
                  Notifications about your trading performance
                </p>
              </div>
              <Switch
                id="trading-alerts"
                checked={tradingAlerts}
                onCheckedChange={setTradingAlerts}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="weekly-reports">Weekly Reports</Label>
                <p className="text-sm text-muted-foreground">
                  Receive weekly performance summaries
                </p>
              </div>
              <Switch
                id="weekly-reports"
                checked={weeklyReports}
                onCheckedChange={setWeeklyReports}
              />
            </div>
          </CardContent>
        </Card>

        {/* Business Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Business
            </CardTitle>
            <CardDescription>
              Manage your business connections
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">

            {/* Current Businesses */}
            {(userBusinesses.ownedBusinesses.length > 0 || userBusinesses.joinedBusinesses.length > 0) && (
              <div>
                <Label className="text-base font-medium">Current Businesses</Label>
                <div className="mt-2 space-y-2">
                  {/* Owned Businesses */}
                  {userBusinesses.ownedBusinesses.map((business) => (
                    <div key={business.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{business.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {business.traderIds.length} traders
                        </p>
                      </div>
                      <Badge variant="secondary">Owner</Badge>
                    </div>
                  ))}
                  
                  {/* Joined Businesses */}
                  {userBusinesses.joinedBusinesses.map((business) => (
                    <div key={business.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{business.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {business.traderIds.length} traders
                        </p>
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            Leave Business
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Leave Business</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to leave this business?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleLeaveBusiness(business.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Leave Business
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* No Businesses */}
            {userBusinesses.ownedBusinesses.length === 0 && userBusinesses.joinedBusinesses.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <p>No business linked</p>
                <p className="text-sm mt-2">Contact your business administrator to get an invitation to join a business.</p>
                <div className="mt-4">
                  <Link href="/business/manage">
                    <Button>
                      <Building2 className="mr-2 h-4 w-4" />
                      Manage Businesses
                    </Button>
                  </Link>
                </div>
              </div>
            )}

            {/* Business Management Link */}
            {(userBusinesses.ownedBusinesses.length > 0 || userBusinesses.joinedBusinesses.length > 0) && (
              <div className="mt-4">
                <Link href="/business/manage">
                  <Button variant="outline" className="w-full">
                    <Settings className="mr-2 h-4 w-4" />
                    Manage Businesses
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Linked Accounts Section */}
        <LinkedAccounts />

        {/* Account Management Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Account Management
            </CardTitle>
            <CardDescription>
              Manage your account settings and data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4">
              <Link href="/dashboard/billing">
                <Button variant="outline" className="w-full justify-start">
                  <CreditCard className="mr-2 h-4 w-4" />
                  Billing & Subscription
                </Button>
              </Link>
              <Link href="/dashboard/data">
                <Button variant="outline" className="w-full justify-start">
                  <Database className="mr-2 h-4 w-4" />
                  Data Management
                </Button>
              </Link>
              <Link href="/support">
                <Button variant="outline" className="w-full justify-start">
                  <LifeBuoy className="mr-2 h-4 w-4" />
                  Support & Help
                </Button>
              </Link>
              <Separator />
              <Button 
                variant="destructive" 
                className="w-full justify-start"
                onClick={() => {
                  localStorage.removeItem('deltalytix_user_data')
                  signOut()
                }}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
