import { X, ChevronRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useUserData } from "@/components/context/user-data"
import { useI18n } from "@/locales/client"
import { format } from "date-fns"
import { fr } from 'date-fns/locale'
import { useParams } from "next/navigation"
import { useRef, useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { motion, AnimatePresence } from 'framer-motion'

export function ActiveFilterTags({ showAccountNumbers }: { showAccountNumbers: boolean }) {
  const { accountNumbers, instruments, setAccountNumbers, setInstruments } = useUserData()
  const t = useI18n()
  const params = useParams()
  const locale = params.locale as string
  const dateLocale = locale === 'fr' ? fr : undefined
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScroll, setCanScroll] = useState(false)

  useEffect(() => {
    const checkScroll = () => {
      if (scrollRef.current) {
        const { scrollWidth, clientWidth } = scrollRef.current
        setCanScroll(scrollWidth > clientWidth)
      }
    }

    // Create a ResizeObserver to monitor content changes
    const resizeObserver = new ResizeObserver(checkScroll)
    if (scrollRef.current) {
      resizeObserver.observe(scrollRef.current)
    }

    // Initial check
    checkScroll()
    
    // Window resize handler
    window.addEventListener('resize', checkScroll)
    
    return () => {
      window.removeEventListener('resize', checkScroll)
      resizeObserver.disconnect()
    }
  }, [])  // Remove dependencies to avoid re-creating observer

  // Add a separate effect to force check when content changes
  useEffect(() => {
    if (scrollRef.current) {
      const { scrollWidth, clientWidth } = scrollRef.current
      setCanScroll(scrollWidth > clientWidth)
    }
  }, [accountNumbers, instruments])

  const scrollToNext = () => {
    if (!scrollRef.current) return
    
    const container = scrollRef.current
    const badges = container.querySelectorAll('.badge')
    const containerLeft = container.scrollLeft
    const containerWidth = container.clientWidth

    // Find the first badge that's partially or fully out of view
    let nextBadge: Element | null = null
    for (const badge of badges) {
      const badgeLeft = badge.getBoundingClientRect().left - container.getBoundingClientRect().left
      if (badgeLeft + 20 > containerWidth) { // Adding small offset
        nextBadge = badge
        break
      }
    }

    if (nextBadge) {
      const scrollTo = nextBadge.getBoundingClientRect().left - container.getBoundingClientRect().left + container.scrollLeft
      container.scrollTo({
        left: scrollTo,
        behavior: 'smooth'
      })
    }
  }

  const anonymizeAccount = (account: string) => {
    if (!showAccountNumbers) {
      const prefix = account.slice(0, 3)
      const stars = '*'.repeat(3) // Fixed number of stars
      return `${prefix}${stars}`
    }
    return account
  }

  const handleRemoveFilter = (type: 'account' | 'instrument', value: string) => {
    switch (type) {
      case 'account':
        setAccountNumbers(accountNumbers.filter(a => a !== value))
        break
      case 'instrument':
        setInstruments(instruments.filter(i => i !== value))
        break
    }
  }

  if (!accountNumbers?.length && !instruments?.length) {
    return null
  }

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="border-t border-border/40 bg-background/50 overflow-hidden"
    >
      <div className="px-10 py-2">
        <div className="relative flex items-center overflow-hidden">
          <div 
            ref={scrollRef}
            className="flex gap-2 overflow-x-auto whitespace-nowrap no-scrollbar pr-8"
          >
            <AnimatePresence mode="popLayout">
              {accountNumbers?.map(account => (
                <motion.div
                  key={account}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.15 }}
                  layout
                >
                  <Badge variant="secondary" className="gap-1 shrink-0 badge">
                    {anonymizeAccount(account)}
                    <X 
                      className="h-3 w-3 cursor-pointer" 
                      onClick={() => handleRemoveFilter('account', account)}
                    />
                  </Badge>
                </motion.div>
              ))}
              {instruments?.map(instrument => (
                <motion.div
                  key={instrument}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.15 }}
                  layout
                >
                  <Badge variant="secondary" className="gap-1 shrink-0 badge">
                    {instrument}
                    <X 
                      className="h-3 w-3 cursor-pointer" 
                      onClick={() => handleRemoveFilter('instrument', instrument)}
                    />
                  </Badge>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          <motion.div 
            className={cn(
              "absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent flex items-center justify-end"
            )}
            initial={{ opacity: 0 }}
            animate={{ opacity: canScroll ? 1 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <Button
              variant="ghost"
              size="sm"
              className="h-full w-8 p-0"
              onClick={scrollToNext}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </motion.div>
        </div>
      </div>
    </motion.div>
  )
} 