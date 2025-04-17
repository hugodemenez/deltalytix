"use client"

import { createContext, useCallback, useContext, useEffect, useState } from "react"
import { loadInitialContent, WeeklyRecapContent } from "@/app/[locale]/(admin)/server/weekly-recap"
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
}

const WeeklyRecapContext = createContext<WeeklyRecapContextType | undefined>(undefined)

export function WeeklyRecapProvider({ children }: { children: React.ReactNode }) {
  const [content, setContent] = useState<WeeklyRecapContent>(initialContent)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadContent = async () => {
      try {
        setIsLoading(true)
        const content = await loadInitialContent()
        setContent(content)
      } catch (error) {
        console.error("Failed to load weekly recap content:", error)
      } finally {
        setIsLoading(false)
      }
    }
    loadContent()
  }, [])

  return (
    <WeeklyRecapContext.Provider value={{ content, setContent, isLoading }}>
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