"use client"

import type React from "react"
import { useRef } from "react"
import { Button } from "@/components/ui/button"
import { Bubble, BubbleContent } from "@/components/ui/bubble"
import { Message, MessageContent, MessageFooter } from "@/components/ui/message"
import { Response } from "@/components/ai-elements/response"
import { toast } from "sonner"
import { ClipboardCheckIcon, type ClipboardCheckIconHandle } from "@/components/animated-icons/clipboard-check"
import { ChatStatus } from "./chat"
import { useI18n } from "@/locales/client"

export function BotMessage({
  children,
  status,
}: {
  children: React.ReactNode
  status?: ChatStatus
}) {
  const t = useI18n()
  const clipboardRef = useRef<ClipboardCheckIconHandle>(null)

  const handleCopy = () => {
    const textToCopy = typeof children === "string" ? children : ""
    navigator.clipboard.writeText(textToCopy)
    clipboardRef.current?.startAnimation()
    toast.success("Message copied to clipboard")
  }

  const content =
    typeof children === "string" ? (
      <Response>{children}</Response>
    ) : (
      children
    )

  return (
    <Message align="start" className="py-1">
      <MessageContent>
        <Bubble variant="muted" align="start">
          <BubbleContent>{content}</BubbleContent>
        </Bubble>
        {typeof children === "string" && status === "ready" && (
          <MessageFooter>
            <Button variant="ghost" size="sm" onClick={handleCopy}>
              <ClipboardCheckIcon ref={clipboardRef} size={16} className="mr-2" />
              {t("chat.copy")}
            </Button>
          </MessageFooter>
        )}
      </MessageContent>
    </Message>
  )
}
