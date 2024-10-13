'use client'

import React, { useEffect, useState } from 'react'
import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import Link from 'next/link'
import { getRecentNotifications, getUnreadNotificationsCount } from '@/server/notifications'
import { useUser } from '@/components/context/user-data'
import { Notification } from '@prisma/client'
import { NotificationItem } from './notification-item'

export function NotificationDropdown() {
  const { user } = useUser()
  const [unreadCount, setUnreadCount] = useState(0)
  const [recentNotifications, setRecentNotifications] = useState<Notification[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchNotifications() {
      if (user?.id) {
        try {
          const count = await getUnreadNotificationsCount(user.id)
          const notifications = await getRecentNotifications(user.id)
          setUnreadCount(count)
          setRecentNotifications(notifications)
          setError(null)
        } catch (err) {
          console.error("Error fetching notifications:", err)
          setError("Failed to fetch notifications")
        }
      } else {
        console.log("User ID is undefined")
      }
    }

    fetchNotifications()
  }, [user])

  if (!user) {
    console.log("User is null, not rendering NotificationDropdown")
    return null
  }

  const handleRead = (id: string) => {
    setRecentNotifications(prev => prev.filter(n => n.id !== id))
    setUnreadCount(prev => prev - 1)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
              {unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80">
        <DropdownMenuLabel>Notifications</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {error ? (
          <DropdownMenuItem disabled>{error}</DropdownMenuItem>
        ) : !recentNotifications || recentNotifications.length === 0 ? (
          <DropdownMenuItem disabled>No notifications</DropdownMenuItem>
        ) : (
          recentNotifications.map((notification) => (
            <NotificationItem 
              key={notification.id} 
              notification={notification} 
              onRead={handleRead}
            />
          ))
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-center">
          <Link href="/dashboard/notifications" className="w-full text-center">
            View all notifications
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
