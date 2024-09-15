'use client'

import { useState, useRef, useEffect } from 'react'
import { useChat, Message } from 'ai/react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from '@/hooks/use-toast'
import { supportChat } from '@/server/support-chat'
import { sendSupportEmail } from '@/server/send-support-email'
import { ContactForm } from '@/components/emails/contact-form'

const GREETING_MESSAGE: Message = {
  id: 'greeting',
  role: 'assistant',
  content: "Hello! Welcome to Deltalytix support. How can I assist you with your trading journal today? Please explain your issue or question, and I'll do my best to help."
}

export default function SupportPage() {
  const { messages, append, setMessages, input, handleInputChange, isLoading, setInput } = useChat({
    initialMessages: [GREETING_MESSAGE]
  })
  const [needsHumanHelp, setNeedsHumanHelp] = useState(false)
  const [isSendingEmail, setIsSendingEmail] = useState(false)
  const [isContactFormOpen, setIsContactFormOpen] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    // Prevent zooming on mobile devices
    const metaViewport = document.querySelector('meta[name=viewport]')
    if (metaViewport) {
      metaViewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0')
    } else {
      const newMetaViewport = document.createElement('meta')
      newMetaViewport.name = 'viewport'
      newMetaViewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0'
      document.head.appendChild(newMetaViewport)
    }

    return () => {
      // Reset viewport meta tag when component unmounts
      if (metaViewport) {
        metaViewport.setAttribute('content', 'width=device-width, initial-scale=1.0')
      }
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage: Message = { id: Date.now().toString(), role: 'user', content: input }
    
    setMessages(prevMessages => [...prevMessages, userMessage])
    setInput('')

    try {
      const { response, needsHumanHelp: aiNeedsHumanHelp, readyForEmail } = await supportChat([...messages, userMessage])
      
      const assistantMessage: Message = { id: (Date.now() + 1).toString(), role: 'assistant', content: response }
      setMessages(prevMessages => [...prevMessages, assistantMessage])
      setNeedsHumanHelp(aiNeedsHumanHelp)

      if (readyForEmail) {
        setIsContactFormOpen(true)
      }
    } catch (error) {
      console.error('Error in chat:', error)
      const errorMessage: Message = { 
        id: (Date.now() + 1).toString(), 
        role: 'assistant', 
        content: "I'm sorry, but I encountered an error. Please try again or contact our support team." 
      }
      setMessages(prevMessages => [...prevMessages, errorMessage])
      setNeedsHumanHelp(true)
    }
  }

  const handleSendEmail = async (contactInfo: { name: string; email: string; additionalInfo: string }) => {
    if (isSendingEmail) return

    setIsSendingEmail(true)
    setIsContactFormOpen(false)

    try {
      const result = await sendSupportEmail({
        messages,
        contactInfo
      })
      if (result.success) {
        toast({
          title: "Support Request Sent",
          description: "Our team will get back to you soon.",
          duration: 5000,
        })
        setMessages(prevMessages => [
          ...prevMessages,
          {
            id: Date.now().toString(),
            role: 'assistant',
            content: `Thank you, ${contactInfo.name}. I've sent your support request to our team. They will review your case and get back to you at ${contactInfo.email} as soon as possible. Is there anything else I can help you with?`
          }
        ])
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('Error sending email:', error)
      toast({
        title: "Failed to Send Support Request",
        description: "Please try again later.",
        variant: "destructive",
        duration: 5000,
      })
    } finally {
      setIsSendingEmail(false)
    }
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-background">
      <div className="flex-shrink-0 p-4 border-b">
        <h1 className="text-xl font-bold">Deltalytix Support</h1>
        <p className="text-sm text-muted-foreground">How can we help you with your trading journal?</p>
      </div>
      <div className="flex-grow overflow-y-auto p-4" style={{ height: 'calc(100dvh - 140px)' }}>
        <div className="space-y-4">
          <AnimatePresence initial={false}>
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex items-start ${message.role === 'user' ? 'flex-row-reverse' : ''} max-w-[80%]`}>
                  <Avatar className={`w-6 h-6 ${message.role === 'user' ? 'ml-2' : 'mr-2'}`}>
                    <AvatarImage src={message.role === 'user' ? "/user-avatar.png" : "/bot-avatar.png"} alt={message.role} />
                    <AvatarFallback>{message.role === 'user' ? 'U' : 'AI'}</AvatarFallback>
                  </Avatar>
                  <div className={`rounded-lg p-2 text-sm ${message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                    {message.content}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex justify-start"
            >
              <div className="flex items-center bg-muted rounded-lg p-2 text-sm">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span>Thinking...</span>
              </div>
            </motion.div>
          )}
          {needsHumanHelp && !isSendingEmail && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex justify-center"
            >
              <Button onClick={() => setIsContactFormOpen(true)} variant="secondary" size="sm" className="text-sm">
                Request Human Support
              </Button>
            </motion.div>
          )}
        </div>
        <div ref={messagesEndRef} />
      </div>
      <div className="flex-shrink-0 p-4 border-t bg-background" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
        <form onSubmit={handleSubmit} className="flex space-x-2">
          <Input
            value={input}
            onChange={handleInputChange}
            placeholder="Type your message here..."
            disabled={isLoading || isSendingEmail}
            aria-label="Chat input"
            className="flex-grow text-sm"
          />
          <Button type="submit" disabled={isLoading || isSendingEmail} size="sm" className="whitespace-nowrap">
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span className="sr-only">Sending</span>
              </>
            ) : (
              <span>Send</span>
            )}
          </Button>
        </form>
      </div>

      <Dialog open={isContactFormOpen} onOpenChange={setIsContactFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Contact Information</DialogTitle>
            <DialogDescription>
              Please provide your contact information so we can get back to you.
            </DialogDescription>
          </DialogHeader>
          <ContactForm
            onSubmit={handleSendEmail}
            onCancel={() => setIsContactFormOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}