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
import BillingManagement from '../../components/billing-management'

type UserMetadata = {
  avatar_url?: string;
  full_name?: string;
  name?: string;
  preferred_username?: string;
  locale?: string;
  avatar_decoration?: string;
}

export default function BillingPage() {
  return (
    <div className="flex w-full relative min-h-screen">
      <div className='flex flex-1 w-full'>
        <div className={`w-full flex flex-col lg:flex-row min-h-screen`}>
          <main className="w-full py-6 lg:py-8">
            <div className="container mx-auto px-4">
              <Card className="border-none shadow-none bg-transparent">
                <CardContent className="p-0">
                      <BillingManagement />
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}