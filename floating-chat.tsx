"use client"

import { useState, useEffect } from "react"
import { MessageCircle, X } from "lucide-react"
import { cn } from "@/lib/utils"
import ChatInterface from "@/chat-interface"

export default function FloatingChat() {
  const [isOpen, setIsOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [initialRender, setInitialRender] = useState(true)

  useEffect(() => {
    // Check if device is mobile
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkMobile()
    window.addEventListener("resize", checkMobile)

    // After first render, allow animations
    setTimeout(() => setInitialRender(false), 100)

    return () => {
      window.removeEventListener("resize", checkMobile)
    }
  }, [])

  const toggleChat = () => {
    // Vibrate when toggling chat
    navigator.vibrate(50)
    setIsOpen((prev) => !prev)
  }

  return (
    <>
      {/* Chat Bubble */}
      {!isOpen && (
        <button
          onClick={toggleChat}
          className={cn(
            "fixed bottom-6 right-6 z-50 flex items-center justify-center w-14 h-14 rounded-full bg-black text-white shadow-lg",
            "hover:scale-105 active:scale-95",
            !initialRender && "transition-all duration-300 animate-fade-in",
          )}
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      )}

      {/* Chat Interface Container */}
      <div
        className={cn(
          "fixed z-[9999] bg-gray-50",
          isMobile
            ? "inset-0" // Full screen on mobile
            : "bottom-6 right-6 w-[400px] h-[600px] rounded-2xl shadow-2xl overflow-hidden border border-gray-200", // Floating box on desktop
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none",
          !initialRender && "transition-all duration-300",
        )}
      >
        {/* Close button (desktop only) */}
        {!isMobile && (
          <button
            onClick={toggleChat}
            className="absolute top-3 right-3 z-50 p-1 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            <X className="h-4 w-4 text-gray-700" />
          </button>
        )}

        {/* Render the chat interface */}
        <div className="h-full">
          <ChatInterface onClose={toggleChat} isFloating={!isMobile} />
        </div>
      </div>
    </>
  )
}

