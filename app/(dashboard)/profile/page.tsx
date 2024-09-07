'use client'

import { useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { createClient } from '@/hooks/auth'
import { CreditCard, Users, Settings, User as UserIcon } from 'lucide-react'
import Image from 'next/image'

type UserMetadata = {
  avatar_url?: string;
  full_name?: string;
  name?: string;
  preferred_username?: string;
  locale?: string;
  avatar_decoration?: string;
}

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      setLoading(false)
    }
    getUser()
  }, [supabase.auth])

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>
  }

  if (!user) {
    return <div className="flex justify-center items-center h-screen">User not found. Please log in.</div>
  }

  const metadata = user.user_metadata as UserMetadata

  return (
    <div className="container mx-auto p-4">
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">User Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="profile">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="billing">Billing</TabsTrigger>
              <TabsTrigger value="referrals">Referrals</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>
            <TabsContent value="profile" className="mt-6">
              <div className="flex flex-col items-center space-y-4">
                <Avatar className="w-32 h-32">
                  <AvatarImage src={metadata.avatar_url} alt={metadata.full_name} />
                  <AvatarFallback>{metadata.name?.charAt(0)}</AvatarFallback>
                </Avatar>
                <h2 className="text-xl font-semibold">{metadata.full_name}</h2>
                <p className="text-muted-foreground">@{metadata.preferred_username}</p>
                <div className="flex space-x-2">
                  {user.app_metadata.provider === 'discord' && (
                    <Badge variant="secondary">Discord</Badge>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-semibold">Email:</p>
                    <p>{user.email}</p>
                  </div>
                  <div>
                    <p className="font-semibold">User ID:</p>
                    <p>{user.id}</p>
                  </div>
                  {metadata.locale && (
                    <div>
                      <p className="font-semibold">Locale:</p>
                      <p>{metadata.locale}</p>
                    </div>
                  )}
                  {metadata.avatar_decoration && (
                    <div>
                      <p className="font-semibold">Avatar Decoration:</p>
                      <Image src={metadata.avatar_decoration} alt="Avatar Decoration" width={64} height={64} />
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
            <TabsContent value="billing" className="mt-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Billing Information</h3>
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="card-number">Card Number</Label>
                    <Input id="card-number" placeholder="1234 5678 9012 3456" />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="expiry-date">Expiry Date</Label>
                      <Input id="expiry-date" placeholder="MM/YY" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="cvc">CVC</Label>
                      <Input id="cvc" placeholder="123" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="zip">ZIP</Label>
                      <Input id="zip" placeholder="12345" />
                    </div>
                  </div>
                </div>
                <Button className="w-full">Update Billing Information</Button>
              </div>
            </TabsContent>
            <TabsContent value="referrals" className="mt-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Referral Program</h3>
                <p>Share your unique referral link to earn rewards:</p>
                <Input value={`https://example.com/refer/${user.id}`} readOnly />
                <Button className="w-full">Copy Referral Link</Button>
                <div className="mt-4">
                  <h4 className="font-semibold">Your Referrals</h4>
                  <p className="text-muted-foreground">You have referred 0 users so far.</p>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="settings" className="mt-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Account Settings</h3>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="notifications">Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">Receive email updates about your account</p>
                  </div>
                  <Switch id="notifications" />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="marketing">Marketing Emails</Label>
                    <p className="text-sm text-muted-foreground">Receive emails about new products and features</p>
                  </div>
                  <Switch id="marketing" />
                </div>
                <Button className="w-full">Save Settings</Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}