"use client"

import type React from "react"
import { useRef, useState, useEffect, useMemo, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Camera, Folder, Send, RotateCcw, ChevronDown, StopCircle, MessageSquare, Sparkles } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import { Message, useChat } from "@ai-sdk/react"
import ReactMarkdown from "react-markdown"
import { WidgetSize } from "../../types/dashboard"
import { BotMessage } from "./bot-message"
import { UserMessage } from "./user-message"
import { ChatInput } from "./input"
import { ChatHeader } from "./header"
import { useUserData } from "@/components/context/user-data"
import { useCurrentLocale } from "@/locales/client"
import { useI18n } from "@/locales/client"
import { generateGreeting } from "./actions/generate-greeting"
import { formatInTimeZone } from "date-fns-tz"
import { loadChat, saveChat } from "./actions/chat-store"

// Types
interface ChatWidgetProps {
  size?: WidgetSize
}

export type ChatStatus = "error" | "submitted" | "streaming" | "ready"

interface ScrollState {
  isAutoScrollEnabled: boolean
  isNearBottom: boolean
  showResumeButton: boolean
}

// Constants
const SCROLL_THRESHOLD = 100
const MESSAGE_BATCH_SIZE = 50

// Utility functions
function throttle<T extends (...args: any[]) => any>(func: T, delay: number): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null
  let lastExecTime = 0

  return (...args: Parameters<T>) => {
    const currentTime = Date.now()

    if (currentTime - lastExecTime > delay) {
      func(...args)
      lastExecTime = currentTime
    } else {
      if (timeoutId) clearTimeout(timeoutId)
      timeoutId = setTimeout(
        () => {
          func(...args)
          lastExecTime = Date.now()
        },
        delay - (currentTime - lastExecTime),
      )
    }
  }
}

// Custom hook for scroll management - FIXED VERSION
function useScrollManagement(messagesLength: number, isStreaming: boolean) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [scrollState, setScrollState] = useState<ScrollState>({
    isAutoScrollEnabled: true,
    isNearBottom: true,
    showResumeButton: false,
  })
  const [isUserScrolling, setIsUserScrolling] = useState(false)
  const lastMessageCountRef = useRef(messagesLength)
  const scrollTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)

  // Check if user is near bottom of scroll area
  const checkScrollPosition = useCallback(() => {
    const container = scrollContainerRef.current
    if (!container) return

    const { scrollTop, scrollHeight, clientHeight } = container
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight
    const isNearBottom = distanceFromBottom <= SCROLL_THRESHOLD

    setScrollState((prev) => {
      const newState = {
        ...prev,
        isNearBottom,
        showResumeButton: !isNearBottom && !prev.isAutoScrollEnabled,
      }

      // If user scrolled to bottom manually, re-enable auto-scroll
      if (isNearBottom && !prev.isAutoScrollEnabled) {
        newState.isAutoScrollEnabled = true
        newState.showResumeButton = false
      }

      return newState
    })
  }, [])

  // Throttled scroll handler
  const handleScroll = useMemo(
    () =>
      throttle(() => {
        checkScrollPosition()
      }, 100),
    [checkScrollPosition],
  )

  // Handle user-initiated scrolling
  const handleUserScroll = useCallback(() => {
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current)
    }

    setIsUserScrolling(true)

    // Check if user scrolled away from bottom
    const container = scrollContainerRef.current
    if (container) {
      const { scrollTop, scrollHeight, clientHeight } = container
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight

      if (distanceFromBottom > SCROLL_THRESHOLD) {
        setScrollState((prev) => ({
          ...prev,
          isAutoScrollEnabled: false,
          showResumeButton: true,
        }))
      }
    }

    // Reset user scrolling flag after delay
    scrollTimeoutRef.current = setTimeout(() => {
      setIsUserScrolling(false)
    }, 150)
  }, [])

  // Auto-scroll to bottom
  const scrollToBottom = useCallback((smooth = true) => {
    const container = scrollContainerRef.current
    if (!container) return

    container.scrollTo({
      top: container.scrollHeight,
      behavior: smooth ? "smooth" : "instant",
    })
  }, [])

  // Resume auto-scroll
  const resumeAutoScroll = useCallback(() => {
    setScrollState({
      isAutoScrollEnabled: true,
      isNearBottom: true,
      showResumeButton: false,
    })
    scrollToBottom(true)
  }, [scrollToBottom])

  // Effect to handle auto-scroll when new messages arrive or streaming
  useEffect(() => {
    const hasNewMessages = messagesLength > lastMessageCountRef.current
    lastMessageCountRef.current = messagesLength

    if ((hasNewMessages || isStreaming) && scrollState.isAutoScrollEnabled && !isUserScrolling) {
      // Use requestAnimationFrame to ensure DOM is updated
      requestAnimationFrame(() => {
        setTimeout(() => scrollToBottom(true), 10)
      })
    }
  }, [messagesLength, isStreaming, scrollState.isAutoScrollEnabled, isUserScrolling, scrollToBottom])

  // Set up scroll event listener
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    const scrollHandler = () => {
      handleUserScroll()
      handleScroll()
    }

    container.addEventListener("scroll", scrollHandler, { passive: true })
    return () => {
      container.removeEventListener("scroll", scrollHandler)
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
    }
  }, [handleScroll, handleUserScroll])

  return {
    scrollContainerRef,
    scrollState,
    resumeAutoScroll,
    scrollToBottom,
  }
}

// Message virtualization hook
function useMessageVirtualization(messages: Message[]) {
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: MESSAGE_BATCH_SIZE })
  const [shouldShowAll, setShouldShowAll] = useState(false)

  useEffect(() => {
    if (messages.length <= MESSAGE_BATCH_SIZE) {
      setShouldShowAll(true)
      setVisibleRange({ start: 0, end: messages.length })
    } else if (!shouldShowAll) {
      setVisibleRange({
        start: Math.max(0, messages.length - MESSAGE_BATCH_SIZE),
        end: messages.length,
      })
    }
  }, [messages.length, shouldShowAll])

  const visibleMessages = useMemo(() => {
    if (shouldShowAll) return messages
    return messages.slice(visibleRange.start, visibleRange.end)
  }, [messages, visibleRange, shouldShowAll])

  const loadMoreMessages = useCallback(() => {
    setShouldShowAll(true)
    setVisibleRange({ start: 0, end: messages.length })
  }, [messages.length])

  return {
    visibleMessages,
    hasMoreMessages: !shouldShowAll && messages.length > MESSAGE_BATCH_SIZE,
    loadMoreMessages,
  }
}

// Resume Scroll Button Component
const ResumeScrollButton = ({ onClick, show }: { onClick: () => void; show: boolean }) => (
  <AnimatePresence>
    {show && (
      <motion.div
        className="absolute bottom-20 right-4 z-10"
        initial={{ opacity: 0, y: 20, scale: 0.8 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.8 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
        <Button onClick={onClick} size="sm" className="shadow-lg hover:shadow-xl transition-shadow" variant="secondary">
          <ChevronDown className="h-4 w-4 mr-1" />
          Resume Scroll
        </Button>
      </motion.div>
    )}
  </AnimatePresence>
)

// Main Component
export default function ChatWidget({ size = "large" }: ChatWidgetProps) {
  const [lastMessageLength, setLastMessageLength] = useState(0)
  const { user, timezone } = useUserData()
  const locale = useCurrentLocale();
  const t = useI18n()
  const [initialGreeting, setInitialGreeting] = useState<string>("")
  const hasGeneratedGreeting = useRef(false)
  const [isStarted, setIsStarted] = useState(false)
  const [storedMessages, setStoredMessages] = useState<Message[]>([])
  const [isLoadingMessages, setIsLoadingMessages] = useState(true)

  // Load stored messages when component mounts
  useEffect(() => {
    const loadStoredMessages = async () => {
      if (!user?.id) return
      setIsLoadingMessages(true)
      try {
        const messages = await loadChat(user.id)
        setStoredMessages(messages)
        if (messages.length > 0) {
          setIsStarted(true)
        }
      } finally {
        setIsLoadingMessages(false)
      }
    }
    loadStoredMessages()
  }, [user?.id])

  useEffect(() => {
    const generateInitialGreeting = async () => {
      if (hasGeneratedGreeting.current || !isStarted || isLoadingMessages || storedMessages.length > 0) return
      hasGeneratedGreeting.current = true
      
      const greeting = await generateGreeting(
        locale,
        user?.user_metadata?.full_name || user?.email?.split('@')[0] || "User",
        formatInTimeZone(new Date(), timezone, 'yyyy-MM-dd')
      )
      setInitialGreeting(greeting)
    }
    generateInitialGreeting()
  }, [locale, user, timezone, isStarted, storedMessages, isLoadingMessages])

  const { messages, input, handleInputChange, handleSubmit, status, stop, setMessages, addToolResult, error, reload } =
    useChat({
      body: {
        username: user?.user_metadata?.full_name || user?.email?.split('@')[0] || "User",
        locale: locale,
      },
      experimental_throttle: 50,
      initialMessages: storedMessages.length > 0 ? storedMessages : initialGreeting ? [
        {
          id: 'init-1',
          role: 'assistant',
          content: initialGreeting,
        },
      ] : [],
    })

  // Save messages when they change
  useEffect(() => {
    const saveMessages = async () => {
      if (!user?.id || messages.length === 0) return
      await saveChat(user.id, messages)
    }
    saveMessages()
  }, [messages, user?.id])

  // Track message content changes for streaming detection
  useEffect(() => {
    const currentLength = messages.reduce((acc, msg) => acc + msg.content.length, 0)
    if (currentLength > lastMessageLength) {
    }
    setLastMessageLength(currentLength)
  }, [messages, lastMessageLength])

  const { scrollContainerRef, scrollState, resumeAutoScroll } = useScrollManagement(
    messages.length,
    status === "streaming",
  )
  const { visibleMessages, hasMoreMessages, loadMoreMessages } = useMessageVirtualization(messages)

  const handleReset = useCallback(() => {
    setMessages([])
  }, [setMessages])

  return (
    <Card className="h-full flex flex-col bg-background relative">
      <ChatHeader title="AI Assistant" onReset={handleReset} isLoading={status === "streaming"} size={size} />
      <CardContent className="flex-1 flex flex-col min-h-0 p-0 relative">
        <div
          className="flex-1 min-h-0 w-full overflow-y-auto"
          style={{ overscrollBehavior: "contain" }}
          ref={scrollContainerRef}
        >
          <div className="p-4 pb-24">
            {hasMoreMessages && (
              <div className="text-center mb-4">
                <Button variant="outline" size="sm" onClick={loadMoreMessages} className="text-xs">
                  Load earlier messages ({messages.length - visibleMessages.length} more)
                </Button>
              </div>
            )}

            <AnimatePresence mode="popLayout">
              {error && (
                <motion.div
                  className="p-3 rounded-lg break-words overflow-hidden bg-destructive/10 text-destructive border border-destructive/20 mb-4"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <div className="flex items-center justify-between">
                    <span>An error occurred while processing your message.</span>
                    <Button type="button" onClick={() => reload()} size="sm" variant="outline">
                      <RotateCcw className="h-3 w-3 mr-1" />
                      Retry
                    </Button>
                  </div>
                </motion.div>
              )}

              {visibleMessages.map((message) => {
                switch (message.role) {
                  case "user":
                    return <UserMessage key={message.id}>{message.content}</UserMessage>
                  case "assistant":
                    return (
                      <BotMessage 
                        status={status}
                        key={message.id}
                      >
                        {message.content}
                      </BotMessage>
                    )
                  default:
                    return message.parts?.map((part, index) => {
                      switch (part.type) {
                        case "text":
                          return (
                            <BotMessage 
                              key={`${message.id}-${index}`}
                            >
                              {part.text}
                            </BotMessage>
                          )
                        case "tool-invocation": {
                          const callId = part.toolInvocation.toolCallId
                          switch (part.toolInvocation.toolName) {
                            case "askForConfirmation": {
                              switch (part.toolInvocation.state) {
                                case "partial-call":
                                  return (
                                    <BotMessage key={`${callId}-partial-call`}>
                                      {part.toolInvocation.args?.message}
                                    </BotMessage>
                                  )
                                case "call":
                                  return (
                                    <BotMessage key={`${callId}-call`}>
                                      {part.toolInvocation.args?.message}
                                      <div className="flex gap-2 mt-2">
                                        <Button
                                          variant="secondary"
                                          size="sm"
                                          onClick={() =>
                                            addToolResult({
                                              toolCallId: callId,
                                              result: "Yes, confirmed.",
                                            })
                                          }
                                        >
                                          Yes
                                        </Button>
                                        <Button
                                          variant="secondary"
                                          size="sm"
                                          onClick={() =>
                                            addToolResult({
                                              toolCallId: callId,
                                              result: "No, denied",
                                            })
                                          }
                                        >
                                          No
                                        </Button>
                                      </div>
                                    </BotMessage>
                                  )
                                case "result":
                                  return (
                                    <BotMessage key={`${callId}-result`}>
                                      Response: {part.toolInvocation.result}
                                    </BotMessage>
                                  )
                              }
                            }
                            default:
                              return null
                          }
                        }
                        default:
                          return null
                      }
                    })
                }
              })}
            </AnimatePresence>
          </div>
        </div>

        <ResumeScrollButton onClick={resumeAutoScroll} show={scrollState.showResumeButton} />

        <ChatInput
          onSend={handleSubmit}
          status={status}
          stop={stop}
          input={input}
          handleInputChange={handleInputChange}
        />
      </CardContent>

      {!isStarted && !isLoadingMessages && storedMessages.length === 0 && (
        <div className="absolute inset-0 bg-background/60 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="w-full max-w-md p-6 space-y-6 text-center">
            <div className="flex justify-center">
              <div className="p-3 rounded-full bg-primary/10">
                <MessageSquare className="w-8 h-8 text-primary" />
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-semibold tracking-tight">{t('chat.overlay.welcome')}</h3>
              <p className="text-muted-foreground">
                {t('chat.overlay.description')}
              </p>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <Card className="p-3 rounded-lg">
                    <CardHeader>
                        <CardTitle>
                            <Sparkles className="w-4 h-4 mb-2 text-primary" />
                            {t('chat.overlay.features.smartAnalysis.title')}
                        </CardTitle>
                        <CardDescription>
                            {t('chat.overlay.features.smartAnalysis.description')}
                        </CardDescription>
                    </CardHeader>
                </Card>
                <Card className="p-3 rounded-lg">
                    <CardHeader>
                        <CardTitle>
                            <MessageSquare className="w-4 h-4 mb-2 text-primary" />
                            {t('chat.overlay.features.naturalChat.title')}
                        </CardTitle>
                        <CardDescription>
                            {t('chat.overlay.features.naturalChat.description')}
                        </CardDescription>
                    </CardHeader>
                </Card>
              </div>
              <Button 
                onClick={() => setIsStarted(true)}
                size="lg"
                className="w-full animate-in fade-in zoom-in"
              >
                {t('chat.overlay.startButton')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}
