'use client'

import React, { useState } from 'react'
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { Notification } from '@prisma/client'
import { formatDistanceToNow } from 'date-fns'
import { markNotificationAsRead } from '@/server/notifications'

interface NotificationItemProps {
  notification: Notification
  onRead: (id: string) => void
}

export function NotificationItem({ notification, onRead }: NotificationItemProps) {
  const [isRead, setIsRead] = useState(!!notification.readAt)

  const handleMarkAsRead = async () => {
    // Optimistically update the UI
    setIsRead(true)

    try {
      // Send request to server
      await markNotificationAsRead(notification.id)
      onRead(notification.id)
    } catch (error) {
      // If the server request fails, revert the optimistic update
      console.error('Failed to mark notification as read:', error)
      setIsRead(false)
    }
  }

  return (
    <DropdownMenuItem
      className={`flex flex-col items-start p-2 ${isRead ? 'opacity-50' : ''}`}
      onClick={handleMarkAsRead}
    >
      <div className="font-semibold">{notification.title}</div>
      <div className="text-sm">{notification.description}</div>
      <div className="text-xs text-muted-foreground mt-1">
        {formatDistanceToNow(notification.createdAt, { addSuffix: true })}
      </div>
    </DropdownMenuItem>
  )
}
