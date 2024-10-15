'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { generateReflectionQuestion } from "@/server/generate-reflection-question"
import { Plus, Camera, Image, Folder, Send, Loader2, RefreshCw } from 'lucide-react'
import { ChatMessage } from "@/types/chat"
import { cn } from "@/lib/utils"
import { useUser } from "@/components/context/user-data"
import { CalendarEntry } from "@/types/calendar"

interface ReflectionChatProps {
  dayData: CalendarEntry | undefined;
  dateString: string;
}

export function ReflectionChat({ dayData, dateString }: ReflectionChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [followUpTimer, setFollowUpTimer] = useState<NodeJS.Timeout | null>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { user } = useUser()
  const [followUpCount, setFollowUpCount] = useState(0)
  const [lastQuestion, setLastQuestion] = useState('')
  const [consecutiveAIResponses, setConsecutiveAIResponses] = useState(0)
  const [isTyping, setIsTyping] = useState(false)

  useEffect(() => {
    const storedMessages = localStorage.getItem(`chat_messages_${dateString}`)
    const storedInput = localStorage.getItem(`chat_input_${dateString}`)
    
    if (storedMessages) {
      setMessages(JSON.parse(storedMessages))
    } else if (dayData) {
      initializeChat()
    }

    if (storedInput) {
      setInput(storedInput)
    }
  }, [dayData, dateString])

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [messages])

  const initializeChat = async () => {
    if (!dayData) return

    setMessages([]) // Clear existing messages
    setInput('') // Clear input
    localStorage.removeItem(`chat_input_${dateString}`) // Clear stored input

    try {
      const { greeting, response, question } = await generateReflectionQuestion({
        dayData,
        dateString,
        messages: [],
        userInput: '',
        isInitialGreeting: true,
        userName: user?.user_metadata?.full_name || user?.email || 'Trader'
      })

      const initialMessages: ChatMessage[] = [
        { role: 'assistant', content: greeting || '' },
        { role: 'assistant', content: response },
        { role: 'assistant', content: question || '' }
      ]

      setMessages(initialMessages)
      localStorage.setItem(`chat_messages_${dateString}`, JSON.stringify(initialMessages))
    } catch (error) {
      console.error("Error initializing chat:", error)
    }
  }

  const handleSendMessage = async (message: string) => {
    if (message.trim() === '' && !fileInputRef.current?.files?.length) return

    const userMessage: ChatMessage = { role: 'user', content: message }
    
    if (fileInputRef.current?.files?.length) {
      const file = fileInputRef.current.files[0]
      const reader = new FileReader()
      reader.onloadend = () => {
        userMessage.image = reader.result as string
        sendMessage(userMessage)
      }
      reader.readAsDataURL(file)
    } else {
      sendMessage(userMessage)
    }

    localStorage.removeItem(`chat_input_${dateString}`)
    setIsLoading(true)
  }

  const sendMessage = async (userMessage: ChatMessage) => {
    setMessages(prevMessages => [...prevMessages, userMessage])
    localStorage.setItem(`chat_messages_${dateString}`, JSON.stringify([...messages, userMessage]))
    setInput('')
    setIsTyping(true)

    // Clear any existing follow-up timer
    if (followUpTimer) {
      clearTimeout(followUpTimer)
      setFollowUpTimer(null)
    }

    try {
      if (!dayData) {
        console.error("No day data available")
        return
      }

      const { response, question, shouldEnd } = await generateReflectionQuestion({ 
        dayData, 
        dateString, 
        messages: [...messages, userMessage], 
        userInput: userMessage.content,
        lastQuestion
      })

      const aiResponses: ChatMessage[] = []
      if (response) aiResponses.push({ role: 'assistant', content: response })
      if (question) {
        aiResponses.push({ role: 'assistant', content: question })
        setLastQuestion(question)
      }

      setMessages(prevMessages => [...prevMessages, ...aiResponses])
      localStorage.setItem(`chat_messages_${dateString}`, JSON.stringify([...messages, userMessage, ...aiResponses]))

      if (shouldEnd) {
        // Optionally, you can disable further input here
        // setIsInputDisabled(true)
      }
    } catch (error) {
      console.error("Error generating response:", error)
      const errorMessage: ChatMessage = { role: 'assistant', content: "I apologize, but I'm having trouble generating a response. Can you please try rephrasing your input? 😅" }
      setMessages(prevMessages => [...prevMessages, errorMessage])
      localStorage.setItem(`chat_messages_${dateString}`, JSON.stringify([...messages, userMessage, errorMessage]))
    } finally {
      setIsTyping(false)
      setIsLoading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleFileUpload = (type: 'camera' | 'photo' | 'folder') => {
    if (fileInputRef.current) {
      fileInputRef.current.accept = type === 'camera' ? 'image/*;capture=camera' : 'image/*'
      fileInputRef.current.click()
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newInput = e.target.value
    setInput(newInput)
    localStorage.setItem(`chat_input_${dateString}`, newInput)
  }

  const renderLoadingIndicator = () => (
    <div className="flex justify-start items-center mb-4">
      <div className="bg-muted text-muted-foreground p-3 rounded-lg max-w-[80%] flex items-center">
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        <span>AI is thinking...</span>
      </div>
    </div>
  )

  const handleRestart = () => {
    initializeChat()
  }

  const renderMessage = (message: ChatMessage) => {
    return (
      <div className={cn("max-w-[80%] p-3 rounded-lg", 
        message.role === 'assistant' 
          ? "bg-muted text-muted-foreground" 
          : "bg-primary text-primary-foreground"
      )}>
        {message.content.split('\n').map((line, index) => (
          <React.Fragment key={index}>
            {line}
            {index < message.content.split('\n')?.length - 1 && <br />}
          </React.Fragment>
        ))}
        {message.image && (
          <img src={message.image} alt="User uploaded" className="mt-2 rounded-lg max-w-full h-auto" />
        )}
      </div>
    )
  }

  const renderTypingIndicator = () => (
    <div className="flex justify-start items-center mb-4">
      <div className="bg-muted text-muted-foreground p-3 rounded-lg max-w-[80%] flex items-center">
        <span className="typing-indicator">AI is typing<span>.</span><span>.</span><span>.</span></span>
      </div>
    </div>
  )

  return (
    <div className="flex flex-col h-full bg-background">
      <div 
        ref={chatContainerRef}
        className="flex-grow overflow-y-auto p-4 space-y-4"
        style={{ maxHeight: 'calc(100vh - 120px)' }}
      >
        {messages?.length > 0 && (
          <>
            {messages?.map((message, index) => (
              <div key={index} className={cn("flex", message.role === 'assistant' ? "justify-start" : "justify-end")}>
                {renderMessage(message)}
              </div>
            ))}
            <div className="flex justify-center mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRestart}
                className="flex items-center space-x-2"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Restart Conversation</span>
              </Button>
            </div>
          </>
        )}
        {isTyping && renderTypingIndicator()}
        <div ref={messagesEndRef} />
      </div>
      <div className="p-4 border-t bg-background sticky bottom-0 left-0 right-0">
        <form onSubmit={(e) => {
          e.preventDefault()
          handleSendMessage(input)
        }} className="flex items-center space-x-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button type="button" variant="outline" size="icon" className="shrink-0">
                <Plus className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-40 p-0">
              <Button variant="ghost" className="w-full justify-start" onClick={() => handleFileUpload('camera')}>
                <Camera className="mr-2 h-4 w-4" />
                Camera
              </Button>
              <Button variant="ghost" className="w-full justify-start" onClick={() => handleFileUpload('photo')}>
                <Image className="mr-2 h-4 w-4" />
                Photo
              </Button>
              <Button variant="ghost" className="w-full justify-start" onClick={() => handleFileUpload('folder')}>
                <Folder className="mr-2 h-4 w-4" />
                Folder
              </Button>
            </PopoverContent>
          </Popover>
          <Input
            value={input}
            onChange={handleInputChange}
            onFocus={() => {
              if (followUpTimer) {
                clearTimeout(followUpTimer)
                setFollowUpTimer(null)
              }
            }}
            placeholder="Write a reply..."
            className="flex-grow"
          />
          <Button type="submit" disabled={isLoading} size="icon" className="shrink-0">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
      </div>
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        onChange={() => handleSendMessage(input)}
      />
    </div>
  )
}