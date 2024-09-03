'use client'

import { useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { createClient } from '@/hooks/auth'
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
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">Discord Profile</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center space-y-4">
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
                <Image src={metadata.avatar_decoration} alt="Avatar Decoration" className="w-16 h-16" />
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}