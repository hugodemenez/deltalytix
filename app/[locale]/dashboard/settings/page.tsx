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
  Building2,
  Eye,
  EyeOff
} from "lucide-react"
import { signOut, setPasswordAction } from "@/server/auth"
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
import { createTeam, joinTeam, leaveTeam, getUserTeams } from './actions'
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
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  
  // Team state
  const [userTeams, setUserTeams] = useState<{
    ownedTeams: any[]
    joinedTeams: any[]
  }>({ ownedTeams: [], joinedTeams: [] })

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

  // Load user teams on component mount
  useEffect(() => {
    const loadTeams = async () => {
      const result = await getUserTeams()
      if (result.success && result.ownedTeams && result.joinedTeams) {
        setUserTeams({
          ownedTeams: result.ownedTeams,
          joinedTeams: result.joinedTeams,
        })
      }
    }
    loadTeams()
  }, [])



  const handleLeaveTeam = async (teamId: string) => {
    const result = await leaveTeam(teamId)
    if (result.success) {
      toast.success(t('dashboard.teams.leaveSuccess'))
      // Reload teams
      const updatedTeams = await getUserTeams()
      if (updatedTeams.success && updatedTeams.ownedTeams && updatedTeams.joinedTeams) {
        setUserTeams({
          ownedTeams: updatedTeams.ownedTeams,
          joinedTeams: updatedTeams.joinedTeams,
        })
      }
    } else {
      toast.error(result.error || t('dashboard.teams.error'))
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

        {/* Team Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Team
            </CardTitle>
            <CardDescription>
              Manage your team connections
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">

            {/* Current Teams */}
            {(userTeams.ownedTeams.length > 0 || userTeams.joinedTeams.length > 0) && (
              <div>
                <Label className="text-base font-medium">Current Teams</Label>
                <div className="mt-2 space-y-2">
                  {/* Owned Teams */}
                  {userTeams.ownedTeams.map((team) => (
                    <div key={team.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{team.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {team.traderIds.length} traders
                        </p>
                      </div>
                      <Badge variant="secondary">Owner</Badge>
                    </div>
                  ))}
                  
                  {/* Joined Teams */}
                  {userTeams.joinedTeams.map((team) => (
                    <div key={team.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{team.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {team.traderIds.length} traders
                        </p>
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            Leave Team
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Leave Team</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to leave this team?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleLeaveTeam(team.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Leave Team
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* No Teams */}
            {userTeams.ownedTeams.length === 0 && userTeams.joinedTeams.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <p>No team linked</p>
                <p className="text-sm mt-2">Contact your team administrator to get an invitation to join a team.</p>
                <div className="mt-4">
                  <Link href="/teams/dashboard">
                    <Button>
                      <Building2 className="mr-2 h-4 w-4" />
                      Manage Teams
                    </Button>
                  </Link>
                </div>
              </div>
            )}

            {/* Team Management Link */}
            {(userTeams.ownedTeams.length > 0 || userTeams.joinedTeams.length > 0) && (
              <div className="mt-4">
                <Link href="/teams/dashboard">
                  <Button variant="outline" className="w-full">
                    <Settings className="mr-2 h-4 w-4" />
                    Manage Teams
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Linked Accounts Section */}
        <LinkedAccounts />

        {/* Password (Migration) Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              {t('auth.setPassword')}
            </CardTitle>
            <CardDescription>
              {t('auth.setPasswordDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4">
              <div>
                <Label htmlFor="newPassword">{t('auth.newPassword')}</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showNewPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2"
                    onClick={() => setShowNewPassword((v) => !v)}
                  >
                    {showNewPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              <div>
                <Label htmlFor="confirmPassword">{t('auth.confirmPassword')}</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2"
                    onClick={() => setShowConfirmPassword((v) => !v)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              <Button onClick={async () => {
                const newPwd = newPassword || ''
                const confirmPwd = confirmPassword || ''
                if (!newPwd || newPwd.length < 6) {
                  toast.error(t('error'), { description: t('auth.passwordMinLength') })
                  return
                }
                if (newPwd !== confirmPwd) {
                  toast.error(t('error'), { description: t('auth.passwordsDoNotMatch') })
                  return
                }
                try {
                  await setPasswordAction(newPwd)
                  toast.success(t('success'), { description: t('auth.passwordUpdated') })
                  setNewPassword('')
                  setConfirmPassword('')
                } catch (e: any) {
                  toast.error(t('error'), { description: e?.message || 'Failed to update password' })
                }
              }}>{t('auth.setPassword')}</Button>
            </div>
          </CardContent>
        </Card>

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
