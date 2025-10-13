"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { User, Bot, Target, AlertTriangle, CheckCircle } from "lucide-react"
import { useI18n } from "@/locales/client"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  isStreaming?: boolean
  showAnalysis?: boolean
  analysis?: {
    metric: string
    value: string
    trend: "positive" | "negative" | "neutral"
    insight: string
  }
}

interface TradingChatAssistantProps {
  className?: string
  maxMessages?: number
}

export default function TradingChatAssistant({ className = "", maxMessages = 3 }: TradingChatAssistantProps) {
  const t = useI18n()
  const [messages, setMessages] = useState<Message[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isLoopRunning, setIsLoopRunning] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const CONVERSATION_LOOP = [
    {
      user: t('landing.features.chat-feature.conversation.analyze'),
      assistant: t('landing.features.chat-feature.responses.analyze'),
      analysis: {
        metric: t('landing.features.chat-feature.analysis.winRate.metric'),
        value: t('landing.features.chat-feature.analysis.winRate.value'),
        trend: "positive" as const,
        insight: t('landing.features.chat-feature.analysis.winRate.insight'),
      },
    },
    {
      user: t('landing.features.chat-feature.conversation.patterns'),
      assistant: t('landing.features.chat-feature.responses.patterns'),
      analysis: {
        metric: t('landing.features.chat-feature.analysis.revengeTrading.metric'),
        value: t('landing.features.chat-feature.analysis.revengeTrading.value'),
        trend: "negative" as const,
        insight: t('landing.features.chat-feature.analysis.revengeTrading.insight'),
      },
    },
    {
      user: t('landing.features.chat-feature.conversation.riskManagement'),
      assistant: t('landing.features.chat-feature.responses.riskManagement'),
      analysis: {
        metric: t('landing.features.chat-feature.analysis.riskReward.metric'),
        value: t('landing.features.chat-feature.analysis.riskReward.value'),
        trend: "positive" as const,
        insight: t('landing.features.chat-feature.analysis.riskReward.insight'),
      },
    },
    {
      user: t('landing.features.chat-feature.conversation.profitableSetup'),
      assistant: t('landing.features.chat-feature.responses.profitableSetup'),
      analysis: {
        metric: t('landing.features.chat-feature.analysis.bestSetup.metric'),
        value: t('landing.features.chat-feature.analysis.bestSetup.value'),
        trend: "positive" as const,
        insight: t('landing.features.chat-feature.analysis.bestSetup.insight'),
      },
    },
    {
      user: t('landing.features.chat-feature.conversation.marketTiming'),
      assistant: t('landing.features.chat-feature.responses.marketTiming'),
      analysis: {
        metric: t('landing.features.chat-feature.analysis.executionQuality.metric'),
        value: t('landing.features.chat-feature.analysis.executionQuality.value'),
        trend: "negative" as const,
        insight: t('landing.features.chat-feature.analysis.executionQuality.insight'),
      },
    },
    {
      user: t('landing.features.chat-feature.conversation.journalInsights'),
      assistant: t('landing.features.chat-feature.responses.journalInsights'),
      analysis: {
        metric: t('landing.features.chat-feature.analysis.emotionalState.metric'),
        value: t('landing.features.chat-feature.analysis.emotionalState.value'),
        trend: "negative" as const,
        insight: t('landing.features.chat-feature.analysis.emotionalState.insight'),
      },
    },
    {
      user: t('landing.features.chat-feature.conversation.positionSizing'),
      assistant: t('landing.features.chat-feature.responses.positionSizing'),
      analysis: {
        metric: t('landing.features.chat-feature.analysis.positionSizing.metric'),
        value: t('landing.features.chat-feature.analysis.positionSizing.value'),
        trend: "positive" as const,
        insight: t('landing.features.chat-feature.analysis.positionSizing.insight'),
      },
    },
  ]

  const addMessage = useCallback(
    (message: Message) => {
      setMessages((prev) => {
        // Keep only the most recent messages up to maxMessages
        const newMessages = [...prev, message]
        if (newMessages.length > maxMessages) {
          return newMessages.slice(newMessages.length - maxMessages)
        }
        return newMessages
      })
    },
    [maxMessages],
  )

  const simulateStreaming = useCallback(
    async (text: string, analysis?: any) => {
      const messageId = Date.now().toString()

      // Add initial streaming message
      addMessage({
        id: messageId,
        role: "assistant",
        content: "",
        isStreaming: true,
        showAnalysis: false,
        analysis,
      })

      await new Promise((resolve) => setTimeout(resolve, 300))

      // Stream text character by character
      const chars = text.split("")
      for (let i = 0; i < chars.length; i++) {
        await new Promise((resolve) => setTimeout(resolve, 25 + Math.random() * 15))
        setMessages((prev) => {
          const updatedMessages = prev.map((msg) =>
            msg.id === messageId ? { ...msg, content: chars.slice(0, i + 1).join("") } : msg,
          )
          return updatedMessages
        })
      }

      // Complete streaming
      await new Promise((resolve) => setTimeout(resolve, 200))
      setMessages((prev) => prev.map((msg) => (msg.id === messageId ? { ...msg, isStreaming: false } : msg)))

      // Show analysis with delay if it exists
      if (analysis) {
        await new Promise((resolve) => setTimeout(resolve, 500))
        setMessages((prev) => prev.map((msg) => (msg.id === messageId ? { ...msg, showAnalysis: true } : msg)))
      }
    },
    [addMessage],
  )

  const fadeOutAllMessages = useCallback(async () => {
    await new Promise((resolve) => setTimeout(resolve, 500))
    setMessages([])
  }, [])

  const runConversationLoop = useCallback(async () => {
    if (isLoopRunning) return

    setIsLoopRunning(true)

    // Reset if we've completed all conversations
    if (currentIndex >= CONVERSATION_LOOP.length) {
      await fadeOutAllMessages()
      setCurrentIndex(0)
      await new Promise((resolve) => setTimeout(resolve, 1000))
      setIsLoopRunning(false)
      return
    }

    const current = CONVERSATION_LOOP[currentIndex]

    // Add user message
    addMessage({
      id: `user-${currentIndex}-${Date.now()}`,
      role: "user",
      content: current.user,
    })

    await new Promise((resolve) => setTimeout(resolve, 1800))

    // Stream assistant response
    await simulateStreaming(current.assistant, current.analysis)

    await new Promise((resolve) => setTimeout(resolve, 3000))
    setCurrentIndex((prev) => prev + 1)
    setIsLoopRunning(false)
  }, [currentIndex, isLoopRunning, addMessage, simulateStreaming, fadeOutAllMessages])

  useEffect(() => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Start the loop
    timeoutRef.current = setTimeout(() => {
      runConversationLoop()
    }, 1000)

    // Cleanup function
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [currentIndex, isLoopRunning])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "positive":
        return <CheckCircle className="h-3 w-3 text-black dark:text-white" />
      case "negative":
        return <AlertTriangle className="h-3 w-3 text-black dark:text-white" />
      default:
        return <Target className="h-3 w-3 text-gray-600 dark:text-gray-400" />
    }
  }

  const getTrendLabel = (trend: string) => {
    switch (trend) {
      case "positive":
        return t('landing.features.chat-feature.analysis.trends.positive')
      case "negative":
        return t('landing.features.chat-feature.analysis.trends.negative')
      default:
        return t('landing.features.chat-feature.analysis.trends.neutral')
    }
  }

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full min-h-0 bg-white dark:bg-black transition-colors duration-500 ${className}`}
      style={{
        contain: "layout style paint",
        isolation: "isolate",
      }}
    >
      <div className="w-full h-full border border-muted bg-white dark:bg-black shadow-lg dark:shadow-gray-900/50 transition-all duration-500 rounded-lg overflow-hidden">
        <div className="p-4 h-full flex flex-col min-h-0">
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-muted transition-colors duration-300 shrink-0">
            <Bot className="h-4 w-4 text-black dark:text-white transition-colors duration-300" />
            <span className="text-sm font-medium text-black dark:text-white transition-colors duration-300">
              {t('landing.features.chat-feature.title')}
            </span>
            <div className="ml-auto text-xs text-muted-foreground">
              {t('landing.features.chat-feature.stat')}
            </div>
          </div>

          <div className="flex-1 overflow-hidden relative">
            <div className="absolute inset-0 flex flex-col justify-end space-y-3 text-xs">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-2 opacity-0 animate-slide-in ${message.role === "user" ? "justify-end" : ""}`}
                >
                  <div
                    className={`flex items-start gap-2 max-w-[85%] ${message.role === "user" ? "flex-row-reverse" : ""}`}
                  >
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 ${
                        message.role === "user" ? "bg-black dark:bg-white" : "bg-muted"
                      }`}
                    >
                      {message.role === "user" ? (
                        <User className="h-3 w-3 text-white dark:text-black transition-colors duration-300" />
                      ) : (
                        <Bot className="h-3 w-3 text-black dark:text-white transition-colors duration-300" />
                      )}
                    </div>

                    <div
                      className={`p-2 rounded-lg transition-all duration-300 ${
                        message.role === "user"
                          ? "bg-black dark:bg-white text-white dark:text-black"
                          : "bg-muted text-black dark:text-white border border-muted"
                      }`}
                    >
                      <p className="leading-relaxed">
                        {message.content}
                        {message.isStreaming && (
                          <span className="animate-pulse text-gray-500 dark:text-gray-400 ml-1">|</span>
                        )}
                      </p>

                      {message.analysis && message.role === "assistant" && (
                        <div
                          className={`overflow-hidden transition-all duration-500 ease-out ${
                            message.showAnalysis ? "max-h-32 opacity-100 mt-2" : "max-h-0 opacity-0 mt-0"
                          }`}
                        >
                          <div className="pt-2 border-t border-muted-foreground transition-colors duration-300">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium text-black dark:text-white text-xs">
                                {message.analysis.metric}
                              </span>
                              <div className="flex items-center gap-1">
                                {getTrendIcon(message.analysis.trend)}
                                <span className="text-xs font-mono text-black dark:text-white">
                                  {getTrendLabel(message.analysis.trend)}
                                </span>
                              </div>
                            </div>
                            <div className="text-sm font-semibold text-black dark:text-white mb-1">
                              {message.analysis.value}
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">{message.analysis.insight}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-slide-in {
          animation: slideIn 0.4s ease-out forwards;
        }
      `}</style>
    </div>
  )
}
