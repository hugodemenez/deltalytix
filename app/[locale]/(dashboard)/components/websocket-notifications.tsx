'use client'

import { useEffect } from 'react'
import { useWebSocket } from './context/websocket-context'

export function WebSocketNotifications() {
  const { connect, disconnect } = useWebSocket()

  useEffect(() => {
    // Connect to the notifications WebSocket
    const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'wss:'}//${process.env.NEXT_PUBLIC_API_URL}/notifications`
    connect(wsUrl)

    return () => {
      disconnect()
    }
  }, [connect, disconnect])

  return null
} 