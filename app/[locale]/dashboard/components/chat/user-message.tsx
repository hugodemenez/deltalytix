import type React from "react"
import { Bubble, BubbleContent } from "@/components/ui/bubble"
import { Message, MessageContent } from "@/components/ui/message"
import { Response } from "@/components/ai-elements/response"

export function UserMessage({ children }: { children: React.ReactNode }) {
  const content =
    typeof children === "string" ? (
      <Response>{children}</Response>
    ) : (
      children
    )

  return (
    <Message align="end" className="py-1">
      <MessageContent>
        <Bubble variant="default" align="end">
          <BubbleContent>{content}</BubbleContent>
        </Bubble>
      </MessageContent>
    </Message>
  )
}
