"use client"

import { createContext, useContext, useState, ReactNode } from "react"

interface WelcomeEmailContextType {
  firstName: string
  email: string
  language: string
  setFirstName: (name: string) => void
  setEmail: (email: string) => void
  setLanguage: (lang: string) => void
}

const WelcomeEmailContext = createContext<WelcomeEmailContextType | undefined>(undefined)

export function WelcomeEmailProvider({ children }: { children: ReactNode }) {
  const [firstName, setFirstName] = useState("trader")
  const [email, setEmail] = useState("preview@example.com")
  const [language, setLanguage] = useState("en")

  return (
    <WelcomeEmailContext.Provider
      value={{
        firstName,
        email,
        language,
        setFirstName,
        setEmail,
        setLanguage,
      }}
    >
      {children}
    </WelcomeEmailContext.Provider>
  )
}

export function useWelcomeEmail() {
  const context = useContext(WelcomeEmailContext)
  if (context === undefined) {
    throw new Error("useWelcomeEmail must be used within a WelcomeEmailProvider")
  }
  return context
} 