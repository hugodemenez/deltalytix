"use client"

import type React from "react"
import { useRef, useState, useEffect, useMemo, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { RotateCcw, ChevronDown, MessageSquare, Loader2 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { motion, AnimatePresence } from "framer-motion"
import { Message, useChat } from "@ai-sdk/react"
import { WidgetSize } from "../../types/dashboard"
import { BotMessage } from "./bot-message"
import { UserMessage } from "./user-message"
import { ChatInput } from "./input"
import { ChatHeader } from "./header"
import { useCurrentLocale } from "@/locales/client"
import { useI18n } from "@/locales/client"
import { loadChat, saveChat } from "./actions/chat"
import { useUserStore } from "../../../../../store/user-store"
import { useChatStore } from "../../../../../store/chat-store"
import { format } from "date-fns"
import { DotStream } from 'ldrs/react'
import 'ldrs/react/DotStream.css'

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
const ResumeScrollButton = ({ onClick, show }: { onClick: () => void; show: boolean }) => {
    const t = useI18n()
    return (
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
                        {t('chat.overlay.resumeScroll')}
                    </Button>
                </motion.div>
            )}
        </AnimatePresence>
    )
}

// Add new message type components
const ThinkingMessage = () => (
    <div className="flex items-center gap-2 text-muted-foreground text-sm py-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Thinking...</span>
    </div>
)

const FirstMessageLoading = () => {
    const t = useI18n()
    return (
        <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <DotStream
                size="60"
                speed="2.5"
                color="hsl(var(--primary))"
            />
            <p className="text-muted-foreground text-sm">
                {t('chat.loading.firstMessage')}
            </p>
        </div>
    )
}

const ToolCallMessage = ({ toolName, args, state }: { toolName: string; args: any; state: string }) => {
    const isLoading = state === "call" || state === "partial-call"
    return (
        <div className="flex items-center gap-2 text-muted-foreground text-sm py-2">
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            <div className="flex flex-col">
                <span>
                    {state === "result"
                        ? `Completed ${toolName}`
                        : state === "partial-call"
                            ? `Preparing ${toolName}...`
                            : `Calling ${toolName}...`}
                </span>
                {args && (
                    <span className="text-xs opacity-70">
                        {Object.entries(args).map(([key, value]) => (
                            <span key={key} className="mr-2">
                                {key}: {JSON.stringify(value)}
                            </span>
                        ))}
                    </span>
                )}
            </div>
        </div>
    )
}

// Main Component
export default function ChatWidget({ size = "large" }: ChatWidgetProps) {
    const timezone = useUserStore(state => state.timezone)
    const { supabaseUser: user } = useUserStore.getState()
    const locale = useCurrentLocale();
    const t = useI18n()
    const [isStarted, setIsStarted] = useState(false)
    const { messages: storedMessages, setMessages: setStoredMessages } = useChatStore()
    const [isLoadingMessages, setIsLoadingMessages] = useState(true)
    const scrollContainerRef = useRef<HTMLDivElement>(null)
    const [showResumeButton, setShowResumeButton] = useState(false)
    const [isNearBottom, setIsNearBottom] = useState(true)
    const moods = useUserStore(state => state.moods)
    const setMoods = useUserStore(state => state.setMoods)

    // Load stored messages when component mounts
    // Load from user mood store if no messages are stored
    useEffect(() => {
        const loadStoredMessages = async () => {
            // If user is not logged in or there are stored messages, return
            if (!user?.id || storedMessages.length > 0) return
            setIsLoadingMessages(true)
            try {
                if (moods.length > 0) {
                    // Find current day in moods
                    const currentDay = format(new Date(), 'yyyy-MM-dd')
                    const currentMood = moods.find(mood => format(mood.day, 'yyyy-MM-dd') === currentDay)
                    if (currentMood && currentMood.conversation) {
                        try {
                            const parsedConversation = JSON.parse(currentMood.conversation as string)
                            // Ensure each message has the required properties for Message type
                            const validMessages = parsedConversation.map((msg: any) => ({
                                id: msg.id,
                                content: msg.content,
                                role: msg.role,
                                // Preserve additional properties that might be needed
                                createdAt: msg.createdAt,
                                toolInvocations: msg.toolInvocations
                            }))
                            setStoredMessages(validMessages as Message[])
                            setIsStarted(true)
                        } catch (e) {
                            console.error('Failed to parse conversation:', e)
                            setStoredMessages([])
                        }
                    }
                }
            } finally {
                setIsLoadingMessages(false)
            }
        }
        loadStoredMessages()
    }, [user?.id, moods])


    const { messages, input, handleInputChange, handleSubmit, status, stop, setMessages, addToolResult, error, reload, append } =
        useChat({
            api: "/api/ai/chat",
            body: {
                username: user?.user_metadata?.full_name || user?.email?.split('@')[0] || "User",
                locale: locale,
                timezone,
            },
            initialMessages: storedMessages,
            onFinish: async (message: Message) => {
                if (!user?.id) return
                const updatedMood = await saveChat(user.id, [...storedMessages, message])
                if (updatedMood) {
                    // Find current day in moods
                    const currentDay = format(new Date(), 'yyyy-MM-dd')
                    const currentMoodIndex = moods.findIndex(mood => format(mood.day, 'yyyy-MM-dd') === currentDay)
                    
                    if (currentMoodIndex !== -1) {
                        // Replace existing mood with updated one
                        const newMoods = [...moods]
                        newMoods[currentMoodIndex] = updatedMood
                        setMoods(newMoods)
                    } else {
                        // Add new mood if none exists for today
                        setMoods([...moods, updatedMood])
                    }
                }
                setStoredMessages([...storedMessages, message])
            },
        })


    // Custom scroll management
    useEffect(() => {
        const container = scrollContainerRef.current
        if (!container) return

        const handleScroll = throttle(() => {
            const { scrollTop, scrollHeight, clientHeight } = container
            const threshold = 100 // pixels from bottom to consider "near bottom"
            const isNearBottom = scrollHeight - scrollTop - clientHeight < threshold
            setIsNearBottom(isNearBottom)
            setShowResumeButton(!isNearBottom)
        }, 100) // Throttle to 100ms

        // Initial check
        handleScroll()

        // Add scroll listener
        container.addEventListener('scroll', handleScroll)
        return () => container.removeEventListener('scroll', handleScroll)
    }, [])

    // Auto-scroll when new messages arrive
    useEffect(() => {
        if (!scrollContainerRef.current || !isNearBottom) return
        scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight
    }, [messages, isNearBottom])

    const scrollToBottom = useCallback(() => {
        if (!scrollContainerRef.current) return
        scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight
        setIsNearBottom(true)
        setShowResumeButton(false)
    }, [])

    const { visibleMessages, hasMoreMessages, loadMoreMessages } = useMessageVirtualization(messages)

    const handleReset = useCallback(async () => {
        setMessages([])
        setStoredMessages([])
        setIsStarted(false)
    }, [setMessages, setStoredMessages, setIsStarted])

    return (
        <Card className="h-full flex flex-col bg-background relative">
            <ChatHeader title="AI Assistant" onReset={handleReset} isLoading={status === "streaming"} size={size} />
            <CardContent className="flex-1 flex flex-col min-h-0 p-0 relative">
                <div
                    className="flex-1 min-h-0 w-full overflow-y-auto"
                    style={{ overscrollBehavior: "contain" }}
                    ref={scrollContainerRef}
                >
                    <div className="p-4">
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

                            {isStarted && messages.length === 1 && (status === "streaming" || status === "submitted") && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 10 }}
                                >
                                    <FirstMessageLoading />
                                </motion.div>
                            )}

                            {visibleMessages.map((message) => {
                                switch (message.role) {
                                    case "user":
                                        return <UserMessage key={message.id}>{message.content}</UserMessage>
                                    case "assistant":
                                        if (message.parts) {
                                            return message.parts.map((part, index) => {
                                                switch (part.type) {
                                                    case "step-start":
                                                        if (message.parts && message.parts.length > index) {
                                                            return null
                                                        }
                                                        return <ThinkingMessage key={`${message.id}-step-${index}`} />
                                                    case "text":
                                                        return (
                                                            <BotMessage
                                                                key={`${message.id}-${index}`}
                                                                status={status}
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
                                                                            <BotMessage key={`${callId}-partial-call`} status={status}>
                                                                                {part.toolInvocation.args?.message}
                                                                            </BotMessage>
                                                                        )
                                                                    case "call":
                                                                        return (
                                                                            <BotMessage key={`${callId}-call`} status={status}>
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
                                                                            <BotMessage key={`${callId}-result`} status={status}>
                                                                                Response: {part.toolInvocation.result}
                                                                            </BotMessage>
                                                                        )
                                                                }
                                                            }
                                                            default:
                                                                return (
                                                                    <ToolCallMessage
                                                                        key={`${callId}-${part.toolInvocation.state}`}
                                                                        toolName={part.toolInvocation.toolName}
                                                                        args={part.toolInvocation.args}
                                                                        state={part.toolInvocation.state}
                                                                    />
                                                                )
                                                        }
                                                    }
                                                    default:
                                                        return null
                                                }
                                            })
                                        }
                                        return (
                                            <BotMessage
                                                status={status}
                                                key={message.id}
                                            >
                                                {message.content}
                                            </BotMessage>
                                        )
                                    case "system":
                                        return null
                                    case "data":
                                        if (message.content === "thinking") {
                                            return <ThinkingMessage key={message.id} />
                                        }
                                        return null
                                    default:
                                        return null
                                }
                            })}
                        </AnimatePresence>
                    </div>
                </div>

                <ResumeScrollButton onClick={scrollToBottom} show={showResumeButton} />

                <ChatInput
                    onSend={handleSubmit}
                    status={status}
                    stop={stop}
                    input={input}
                    handleInputChange={handleInputChange}
                />
            </CardContent>

            {!isStarted && !isLoadingMessages && storedMessages.length === 0 && (
                <div className="absolute inset-0 bg-background/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="w-full max-w-md p-4 sm:p-6 space-y-4 sm:space-y-6 text-center">
                        <div className="flex justify-center">
                            <div className="p-2 sm:p-3 rounded-full bg-primary/10">
                                <MessageSquare className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-xl sm:text-2xl font-semibold tracking-tight">{t('chat.overlay.welcome')}</h3>
                            <p className="text-sm sm:text-base text-muted-foreground">
                                {t('chat.overlay.description')}
                            </p>
                        </div>
                        <Button
                            onClick={() => {
                                setIsStarted(true)
                                append({
                                    role: 'system',
                                    content: 'Say hello to the user when the chat starts remind the time of date and current trading data for week and day',
                                })
                            }}
                            size="lg"
                            className="w-full text-sm sm:text-base animate-in fade-in zoom-in"
                        >
                            {t('chat.overlay.startButton')}
                        </Button>
                    </div>
                </div>
            )}
        </Card>
    )
}
