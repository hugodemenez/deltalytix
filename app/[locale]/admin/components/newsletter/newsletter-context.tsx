"use client"

import { createContext, useContext, useState, ReactNode, useCallback } from "react"

export type NewsletterContent = {
  subject: string
  youtubeId: string
  introMessage: string
  features: string[]
  firstName: string
}

interface NewsletterContextType {
  content: NewsletterContent
  setContent: (content: NewsletterContent | ((prev: NewsletterContent) => NewsletterContent)) => void
}

const initialContent: NewsletterContent = {
  subject: "",
  youtubeId: "",
  introMessage: "",
  features: [""],
  firstName: "Hugo"
}

const NewsletterContext = createContext<NewsletterContextType | undefined>(undefined)

export function NewsletterProvider({ children }: { children: ReactNode }) {
  const [content, setContent] = useState<NewsletterContent>(initialContent)

  const setContentStable = useCallback((
    update: NewsletterContent | ((prev: NewsletterContent) => NewsletterContent)
  ) => {
    setContent(prev => {
      const newContent = typeof update === 'function' ? update(prev) : update
      return {
        ...newContent,
        features: newContent.features || [""] // Ensure features is never undefined
      }
    })
  }, [])

  return (
    <NewsletterContext.Provider value={{ content, setContent: setContentStable }}>
      {children}
    </NewsletterContext.Provider>
  )
}

export function useNewsletter() {
  const context = useContext(NewsletterContext)
  if (context === undefined) {
    throw new Error("useNewsletter must be used within a NewsletterProvider")
  }
  return context
} 