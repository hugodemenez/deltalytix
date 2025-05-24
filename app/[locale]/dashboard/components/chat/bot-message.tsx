"use client"

import { motion } from "motion/react";
import type React from "react"
import ReactMarkdown from "react-markdown"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { useRef } from "react"
import { ClipboardCheckIcon, type ClipboardCheckIconHandle } from "@/components/animated-icons/clipboard-check"
import { ChatStatus } from "./chat"
import { useI18n } from "@/locales/client"

// Message Components
export function BotMessage({ children, status }: { children: React.ReactNode, status?: ChatStatus }) {
  const t = useI18n()
  const clipboardRef = useRef<ClipboardCheckIconHandle>(null);

  const handleCopy = () => {
    const textToCopy = typeof children === "string" ? children : "";
    navigator.clipboard.writeText(textToCopy);
    clipboardRef.current?.startAnimation();
    toast.success("Message copied to clipboard");
  };

  const content =
    typeof children === "string" ? (
      <div className="prose prose-sm dark:prose-invert max-w-none">
        <ReactMarkdown
          components={{
            p: ({ children }) => (
              <p className="inline">
                {children}
              </p>
            ),
          }}
        >
          {children}
        </ReactMarkdown>
      </div>
    ) : (
      <div className="inline-flex items-baseline">
        <span>{children}</span>
      </div>
    )

  return (
    <motion.div
      className="flex w-full mb-3"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <div className="flex flex-col gap-2">
        <div className="text-pretty break-words max-w-[90%] bg-muted/50 p-4 rounded-lg rounded-tl-none border border-muted">
          {content}
        </div>
        {typeof children === "string" && status === "ready" && (
          <Button
            variant="ghost"
            size="sm"
            className="self-start"
            onClick={handleCopy}
          >
            <ClipboardCheckIcon ref={clipboardRef} size={16} className="mr-2" />
            {t('chat.copy')}
          </Button>
        )}
      </div>
    </motion.div>
  )
}
