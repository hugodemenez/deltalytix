'use client'

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import { useToast } from "@/hooks/use-toast"

interface WebSocketContextType {
  connect: (url: string) => void
  disconnect: () => void
  sendMessage: (message: any) => void
  isConnected: boolean
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined)

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const [ws, setWs] = useState<WebSocket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [pendingMessages, setPendingMessages] = useState<any[]>([])
  const { toast } = useToast()

  const handleMessage = useCallback((message: any) => {
    if (message.type === 'log') {
      // Show important log messages
      if (message.message.includes('Successfully processed orders for date')) {
        toast({
          title: "Orders Processed",
          description: message.message,
          duration: 3000
        })
      } else if (message.message.includes('Completed processing account') && message.message.includes('collected')) {
        const match = message.message.match(/account ([^,]+), collected (\d+) orders/)
        if (match) {
          const [, accountId, orders] = match
          toast({
            title: "Account Processing Complete",
            description: `Collected ${orders} orders from account ${accountId}`,
            duration: 5000
          })
        }
      }
    } else if (message.type === 'status' && message.all_complete) {
      toast({
        title: "Processing Complete",
        description: `Successfully processed all accounts. Total orders: ${message.total_orders || 0}`,
        duration: 10000
      })
    } else if (message.type === 'error') {
      toast({
        variant: "destructive",
        title: "Error",
        description: message.message,
        duration: 5000
      })
    }
  }, [toast])

  const sendMessage = useCallback((message: any) => {
    if (ws && isConnected) {
      ws.send(JSON.stringify(message))
    } else {
      // Queue message to be sent when connection is established
      setPendingMessages(prev => [...prev, message])
    }
  }, [ws, isConnected])

  // Send pending messages when connection is established
  useEffect(() => {
    if (isConnected && ws && pendingMessages.length > 0) {
      pendingMessages.forEach(message => {
        ws.send(JSON.stringify(message))
      })
      setPendingMessages([])
    }
  }, [isConnected, ws, pendingMessages])

  const connect = useCallback((url: string) => {
    if (ws) {
      ws.close()
    }

    const newWs = new WebSocket(url)

    newWs.onopen = () => {
      console.log('WebSocket connected')
      setIsConnected(true)
      toast({
        title: "Connected",
        description: "WebSocket connection established",
        duration: 3000
      })
    }

    newWs.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data)
        handleMessage(message)
      } catch (error) {
        console.error('Error parsing WebSocket message:', error)
      }
    }

    newWs.onerror = (error) => {
      console.error('WebSocket error:', error)
      toast({
        variant: "destructive",
        title: "Connection Error",
        description: "Failed to connect to notification service",
        duration: 5000
      })
    }

    newWs.onclose = () => {
      console.log('WebSocket disconnected')
      setIsConnected(false)
      toast({
        variant: "default",
        title: "Disconnected",
        description: "WebSocket connection closed",
        duration: 3000
      })
    }

    setWs(newWs)
  }, [ws, handleMessage, toast])

  const disconnect = useCallback(() => {
    if (ws) {
      ws.close()
      setWs(null)
      setIsConnected(false)
    }
  }, [ws])

  useEffect(() => {
    return () => {
      if (ws) {
        ws.close()
      }
    }
  }, [ws])

  return (
    <WebSocketContext.Provider value={{ connect, disconnect, sendMessage, isConnected }}>
      {children}
    </WebSocketContext.Provider>
  )
}

export function useWebSocket() {
  const context = useContext(WebSocketContext)
  if (context === undefined) {
    throw new Error('useWebSocket must be used within a WebSocketProvider')
  }
  return context
} 