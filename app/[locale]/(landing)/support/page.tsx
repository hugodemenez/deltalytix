'use client'

import { useState, useEffect } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from '@/hooks/use-toast'
import { sendSupportEmail } from '@/app/[locale]/(landing)/actions/send-support-email'
import { ContactForm } from '@/components/emails/contact-form'
import { useI18n } from '@/locales/client'
import { Streamdown } from "streamdown"
import { ClipboardCheckIcon, type ClipboardCheckIconHandle } from "@/components/animated-icons/clipboard-check"
import { toast } from "sonner"
import { useRef } from "react"

// FormattedMessage component for rich text rendering using Streamdown
function FormattedMessage({ children, onCopy }: { children: string; onCopy?: () => void }) {
  const clipboardRef = useRef<ClipboardCheckIconHandle>(null);

  const handleCopy = () => {
    navigator.clipboard.writeText(children);
    clipboardRef.current?.startAnimation();
    toast.success("Message copied to clipboard");
    onCopy?.();
  };

  return (
    <div className="space-y-2">
      <Streamdown 
        className="prose prose-sm dark:prose-invert max-w-none"
        parseIncompleteMarkdown={true}
        controls={{ table: true, code: true, mermaid: true }}
      >
        {children}
      </Streamdown>
      {onCopy && (
        <Button
          variant="ghost"
          size="sm"
          className="self-start text-xs text-muted-foreground hover:text-foreground"
          onClick={handleCopy}
        >
          <ClipboardCheckIcon ref={clipboardRef} size={14} className="mr-1" />
          Copy message
        </Button>
      )}
    </div>
  );
}

export default function SupportPage() {
  const t = useI18n()
  
  const [input, setInput] = useState('')
  
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/ai/support',
    }),
  })

  // Track if we should show the initial greeting
  const [showInitialGreeting, setShowInitialGreeting] = useState(true)
  
  const [needsHumanHelp, setNeedsHumanHelp] = useState(false)
  const [isSendingEmail, setIsSendingEmail] = useState(false)
  const [isContactFormOpen, setIsContactFormOpen] = useState(false)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const lastMessageRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  useEffect(() => {
    if (lastMessageRef.current && window.innerWidth < 768) {
      lastMessageRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  // Parse AI responses for tool calls
  useEffect(() => {
    const lastMessage = messages[messages.length - 1]
    if (lastMessage?.role === 'assistant') {
      lastMessage.parts.forEach(part => {
        if (part.type === 'tool-needsHumanHelp') {
          switch (part.state) {
            case 'output-available':
              setNeedsHumanHelp(true)
              break
            case 'output-error':
              console.error('Error in needsHumanHelp tool:', part.errorText)
              break
          }
        }
        
        if (part.type === 'tool-readyForEmail') {
          switch (part.state) {
            case 'output-available':
              setIsContactFormOpen(true)
              break
            case 'output-error':
              console.error('Error in readyForEmail tool:', part.errorText)
              break
          }
        }
      })
    }
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
    if (!input.trim() || status !== 'ready') return

    const currentInput = input
    setInput('')
    
    // Hide initial greeting when user sends first message
    if (showInitialGreeting) {
      setShowInitialGreeting(false)
    }

    try {
      await sendMessage({ text: currentInput })
    } catch (error) {
      console.error('Error in chat:', error)
      setNeedsHumanHelp(true)
    }
  }

  const handleSendEmail = async (contactInfo: { name: string; email: string; additionalInfo: string }) => {
    if (isSendingEmail) return

    setIsSendingEmail(true)
    setIsContactFormOpen(false)

    try {
      const result = await sendSupportEmail({
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.parts.filter(part => part.type === 'text').map(part => part.text).join('')
        })),
        contactInfo
      })
      if (result.success) {
        toast({
          title: t('success'),
          description: t('support.emailSent'),
          duration: 5000,
        })
        // Add confirmation message using sendMessage
        await sendMessage({ 
          text: t('support.emailConfirmation', { name: contactInfo.name, email: contactInfo.email })
        })
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('Error sending email:', error)
      toast({
        title: t('error'),
        description: t('support.emailError'),
        variant: "destructive",
        duration: 5000,
      })
    } finally {
      setIsSendingEmail(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-background">
      <Card className="w-full h-full flex flex-col">
        <CardHeader className="p-4 sm:p-6 flex-shrink-0">
          <CardTitle className="text-xl sm:text-2xl">{t('dashboard.support')}</CardTitle>
          <CardDescription className="text-sm sm:text-base">{t('support.description')}</CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 flex-grow overflow-hidden">
          <ScrollArea className="h-[calc(100vh-180px)] pr-4" ref={scrollAreaRef}>
            <AnimatePresence initial={false}>
              {/* Show initial greeting message */}
              {showInitialGreeting && messages.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="flex justify-start mb-4"
                >
                  <div className="flex items-start max-w-[80%] sm:max-w-[70%]">
                    <Avatar className="w-6 h-6 sm:w-8 sm:h-8 mr-2">
                      <AvatarFallback>AI</AvatarFallback>
                    </Avatar>
                    <div className="rounded-lg p-2 sm:p-3 text-base bg-muted">
                      <FormattedMessage>{t('support.greeting')}</FormattedMessage>
                    </div>
                  </div>
                </motion.div>
              )}
              {messages.map((message, index) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} mb-4`}
                  ref={index === messages.length - 1 ? lastMessageRef : null}
                >
                  <div className={`flex items-start ${message.role === 'user' ? 'flex-row-reverse' : ''} max-w-[80%] sm:max-w-[70%]`}>
                    <Avatar className={`w-6 h-6 sm:w-8 sm:h-8 ${message.role === 'user' ? 'ml-2' : 'mr-2'}`}>
                      <AvatarFallback>{message.role === 'user' ? 'U' : 'AI'}</AvatarFallback>
                    </Avatar>
                    <div className={`rounded-lg p-2 sm:p-3 text-base ${message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                      {message.parts.map((part, partIndex) => {
                        if (part.type === 'text') {
                          return message.role === 'assistant' ? (
                            <FormattedMessage key={partIndex} onCopy={() => {}}>
                              {part.text}
                            </FormattedMessage>
                          ) : (
                            <span key={partIndex}>{part.text}</span>
                          )
                        }
                        
                        if (part.type === 'tool-needsHumanHelp') {
                          switch (part.state) {
                            case 'input-available':
                              return (
                                <div key={partIndex} className="flex items-center text-sm text-muted-foreground">
                                  <Loader2 className="h-3 w-3 animate-spin mr-2" />
                                  {t('support.evaluatingSupport')}
                                </div>
                              )
                            case 'output-available':
                              return null // Handled by useEffect
                            case 'output-error':
                              return (
                                <div key={partIndex} className="text-sm text-destructive">
                                  {t('support.evaluationError')}
                                </div>
                              )
                            default:
                              return null
                          }
                        }
                        
                        if (part.type === 'tool-readyForEmail') {
                          switch (part.state) {
                            case 'input-available':
                              return (
                                <div key={partIndex} className="flex items-center text-sm text-muted-foreground">
                                  <Loader2 className="h-3 w-3 animate-spin mr-2" />
                                  {t('support.preparingEmail')}
                                </div>
                              )
                            case 'output-available':
                              return null // Handled by useEffect
                            case 'output-error':
                              return (
                                <div key={partIndex} className="text-sm text-destructive">
                                  {t('support.emailPreparationError')}
                                </div>
                              )
                            default:
                              return null
                          }
                        }
                        
                        return null
                      })}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {(status === 'submitted' || status === 'streaming') && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex justify-start mb-4"
              >
                <div className="flex items-center bg-muted rounded-lg p-2 sm:p-3 text-base">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  <span>{t('chat.aiThinking')}</span>
                </div>
              </motion.div>
            )}
            {needsHumanHelp && !isSendingEmail && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex justify-center my-4"
              >
                <Button onClick={() => setIsContactFormOpen(true)} variant="secondary" size="sm" className="text-base">
                  {t('support.requestHumanSupport')}
                </Button>
              </motion.div>
            )}
          </ScrollArea>
        </CardContent>
        <CardFooter className="p-4 sm:p-6 flex-shrink-0">
          <form onSubmit={handleSubmit} className="flex w-full space-x-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t('chat.writeMessage')}
              disabled={status !== 'ready' || isSendingEmail}
              aria-label={t('chat.writeMessage')}
              className="text-base"
            />
            <Button type="submit" disabled={status !== 'ready' || isSendingEmail} size="sm" className="whitespace-nowrap text-base">
              {status === 'submitted' || status === 'streaming' ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  <span className="hidden sm:inline">{t('common.saving')}</span>
                </>
              ) : (
                <>
                  <span className="hidden sm:inline">{t('common.send')}</span>
                  <span className="sm:hidden">➤</span>
                </>
              )}
            </Button>
          </form>
        </CardFooter>
      </Card>

      <Dialog open={isContactFormOpen} onOpenChange={setIsContactFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('support.contactInformation')}</DialogTitle>
            <DialogDescription>
              {t('support.contactInformationDescription')}
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