'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarEntry } from "@/components/calendar/calendar-pnl"
import { generateReflectionQuestion, generateFollowUp } from "@/server/generate-reflection-question"
import { Plus, Camera, Image, Folder, Send } from 'lucide-react'
import { ChatMessage } from "@/app/types/chat"

interface ReflectionChatProps {
  dayData: CalendarEntry | undefined;
  dateString: string;
}

const greetings = [
  "Hello trader! Ready to reflect on your day?",
  "Welcome back! Let's dive into your trading day.",
  "Hi there! Time for some trading introspection.",
  "Greetings! Excited to explore your trading journey today."
]

const initialQuestions = [
  "Before we start, how are you feeling about your trades today?",
  "To kick things off, what's your overall impression of your performance?",
  "Let's begin by discussing your emotional state during today's trading session.",
  "To start, can you share one key insight from your trading day?"
]

export function ReflectionChat({ dayData, dateString }: ReflectionChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [consecutiveAIMessages, setConsecutiveAIMessages] = useState(0)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const storedMessages = localStorage.getItem(`chat_messages_${dateString}`)
    const storedInput = localStorage.getItem(`chat_input_${dateString}`)
    
    if (storedMessages) {
      setMessages(JSON.parse(storedMessages))
    } else if (dayData) {
      const randomGreeting = greetings[Math.floor(Math.random() * greetings.length)]
      const randomQuestion = initialQuestions[Math.floor(Math.random() * initialQuestions.length)]
      
      const initialMessages: ChatMessage[] = [
        { role: 'assistant', content: randomGreeting },
        { role: 'assistant', content: randomQuestion }
      ]
      setMessages(initialMessages)
      setConsecutiveAIMessages(2)
      localStorage.setItem(`chat_messages_${dateString}`, JSON.stringify(initialMessages))
    }

    if (storedInput) {
      setInput(storedInput)
    }
  }, [dayData, dateString])

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
    }
  }, [messages])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    const lastMessage = messages[messages.length - 1]
    if (lastMessage && lastMessage.role === 'user' && !isLoading && !isTyping && dayData) {
      setIsTyping(true)
      const timer = setTimeout(() => {
        handleAIFollowUp(lastMessage.content)
      }, 1000 + Math.random() * 2000) // Random delay between 1-3 seconds
      return () => clearTimeout(timer)
    }
  }, [messages, isLoading, dayData])

  const handleAIFollowUp = async (lastContent: string) => {
    if (!dayData) return
    try {
      const { shouldFollowUp, feedback, question } = await generateFollowUp({ dayData, dateString, messages, lastContent })
      
      if (shouldFollowUp && consecutiveAIMessages < 3) {
        const newMessages: ChatMessage[] = []
        if (feedback) {
          newMessages.push({ role: 'assistant', content: feedback })
        }
        if (question) {
          newMessages.push({ role: 'assistant', content: question })
        }
        setMessages(prevMessages => [...prevMessages, ...newMessages])
        setConsecutiveAIMessages(prev => prev + newMessages.length)
        localStorage.setItem(`chat_messages_${dateString}`, JSON.stringify([...messages, ...newMessages]))
      } else {
        setConsecutiveAIMessages(0)
      }
    } catch (error) {
      console.error("Error generating follow-up:", error)
    } finally {
      setIsTyping(false)
    }
  }

  const handleSendMessage = async () => {
    if (input.trim() === '' && !fileInputRef.current?.files?.length) return

    const userMessage: ChatMessage = { role: 'user', content: input }
    
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

    // Clear the input from local storage after sending
    localStorage.removeItem(`chat_input_${dateString}`)
  }

  const sendMessage = async (userMessage: ChatMessage) => {
    setMessages(prevMessages => [...prevMessages, userMessage])
    setConsecutiveAIMessages(0)
    localStorage.setItem(`chat_messages_${dateString}`, JSON.stringify([...messages, userMessage]))
    setInput('')
    setIsLoading(true)

    try {
      if (!dayData) {
        console.error("No day data available")
        return
      }
      const { feedback, question, shouldEnd } = await generateReflectionQuestion({ dayData, dateString, messages: [...messages, userMessage], userInput: userMessage.content })
      const newMessages: ChatMessage[] = []
      if (feedback) {
        newMessages.push({ role: 'assistant', content: feedback })
      }
      if (!shouldEnd && question) {
        newMessages.push({ role: 'assistant', content: question })
      }
      setMessages(prevMessages => [...prevMessages, ...newMessages])
      setConsecutiveAIMessages(newMessages.length)
      localStorage.setItem(`chat_messages_${dateString}`, JSON.stringify([...messages, userMessage, ...newMessages]))
      
      if (shouldEnd) {
        setConsecutiveAIMessages(0)
        // Optionally, you can disable further input here
        // setIsInputDisabled(true)
      }
    } catch (error) {
      console.error("Error generating response:", error)
      const errorMessage: ChatMessage = { role: 'assistant', content: "I apologize, but I'm having trouble generating a response. Can you please try rephrasing your input?" }
      setMessages(prevMessages => [...prevMessages, errorMessage])
      setConsecutiveAIMessages(1)
      localStorage.setItem(`chat_messages_${dateString}`, JSON.stringify([...messages, userMessage, errorMessage]))
    } finally {
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

  return (
    <div className="flex flex-col h-full bg-gray-100 dark:bg-gray-900">
      <ScrollArea ref={scrollAreaRef} className="flex-grow mb-4 p-4">
        {messages.map((message, index) => (
          <div key={index} className={`flex mb-4 ${message.role === 'assistant' ? 'justify-start' : 'justify-end'}`}>
            <div className={`max-w-[70%] p-3 rounded-lg ${message.role === 'assistant' ? 'bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-200' : 'bg-blue-500 text-white'}`}>
              {message.content}
              {message.image && <img src={message.image} alt="User uploaded" className="mt-2 rounded-lg" />}
            </div>
          </div>
        ))}
        {(isLoading || isTyping) && <div className="text-center text-gray-500">AI is thinking...</div>}
        <div ref={messagesEndRef} /> {/* Add this line */}
      </ScrollArea>
      <div className="flex items-center space-x-2 p-2 bg-gray-200 dark:bg-gray-800">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="text-gray-500">
              <Plus className="h-6 w-6" />
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
          placeholder="Write a reply..."
          className="flex-grow bg-white dark:bg-gray-700 border-none"
          onKeyPress={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSendMessage()
            }
          }}
        />
        <Button onClick={handleSendMessage} disabled={isLoading || isTyping} size="icon" className="rounded-full bg-blue-500 hover:bg-blue-600">
          <Send className="h-4 w-4 text-white" />
        </Button>
      </div>
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        onChange={handleSendMessage}
      />
    </div>
  )
}