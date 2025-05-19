"use client"

import { createContext, useCallback, useContext, useEffect, useState } from "react"
import { loadInitialContent, WeeklyRecapContent } from "@/app/[locale]/admin/actions/weekly-recap"
import { prisma } from "@/lib/prisma"

const initialContent: WeeklyRecapContent = {
  firstName: "",
  dailyPnL: [],
  winLossStats: {
    wins: 0,
    losses: 0
  }
}

interface WeeklyRecapContextType {
  content: WeeklyRecapContent
  setContent: React.Dispatch<React.SetStateAction<WeeklyRecapContent>>
  isLoading: boolean
  selectedUserId: string
  setSelectedUserId: (userId: string) => void
  selectedEmail: string
  setSelectedEmail: (email: string) => void
}

const WeeklyRecapContext = createContext<WeeklyRecapContextType | undefined>(undefined)

export function WeeklyRecapProvider({ children }: { children: React.ReactNode }) {
  const [content, setContent] = useState<WeeklyRecapContent>(initialContent)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedUserId, setSelectedUserId] = useState<string>("")
  const [selectedEmail, setSelectedEmail] = useState<string>("")
  const loadContent = useCallback(async (email: string, userId: string) => {
    try {
      setIsLoading(true)
      const content = await loadInitialContent(email,userId)
      setContent(content)
    } catch (error) {
      console.error("Failed to load weekly recap content:", error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (selectedUserId) {
      loadContent(selectedEmail,selectedUserId)
    }
  }, [selectedUserId, selectedEmail, loadContent])

  return (
    <WeeklyRecapContext.Provider value={{ content, setContent, isLoading, selectedUserId, setSelectedUserId, selectedEmail, setSelectedEmail }}>
      {children}
    </WeeklyRecapContext.Provider>
  )
}

export function useWeeklyRecap() {
  const context = useContext(WeeklyRecapContext)
  if (context === undefined) {
    throw new Error("useWeeklyRecap must be used within a WeeklyRecapProvider")
  }
  return context
} 