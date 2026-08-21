"use client"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ActionSchema } from "@/app/api/ai/editor/schema"
import { useI18n } from "@/locales/client"
import { useCompletion } from "@ai-sdk/react"
import { Loader2, Sparkles } from "lucide-react"
import { useEffect, useRef } from "react"
import { toast } from "sonner"
import type { z } from "zod"

type EditorAction = z.infer<typeof ActionSchema>

interface JournalAIProps {
  getTargetText: () => string
  onInsert: (html: string) => void
  date?: Date
  locale: string
}

export function JournalAI({
  getTargetText,
  onInsert,
  date,
  locale,
}: JournalAIProps) {
  const t = useI18n()
  const lastCompletionRef = useRef("")

  const { completion, complete, isLoading, setCompletion } = useCompletion({
    api: "/api/ai/editor",
    onFinish: () => {
      lastCompletionRef.current = ""
    },
    onError: (error) => {
      console.error("Completion error:", error)
      toast.error(t("editor.ai.minCharsError"))
      lastCompletionRef.current = ""
    },
    experimental_throttle: 50,
  })

  useEffect(() => {
    if (!completion) {
      return
    }
    const delta = completion.slice(lastCompletionRef.current.length)
    lastCompletionRef.current = completion
    if (delta) {
      onInsert(delta)
    }
  }, [completion, onInsert])

  const run = (action: EditorAction) => {
    const targetText = getTargetText()
    if (
      (!targetText || targetText.length < 10) &&
      action !== "suggest_question" &&
      action !== "trades_summary"
    ) {
      toast.error(t("editor.ai.minCharsError"))
      return
    }
    lastCompletionRef.current = ""
    setCompletion("")
    void complete(targetText, {
      body: { action, date, locale },
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          title={t("editor.ai.button")}
          disabled={isLoading}
          className={isLoading ? "animate-pulse" : undefined}
          onMouseDown={(event) => event.preventDefault()}
        >
          {isLoading ? <Loader2 className="animate-spin" /> : <Sparkles />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuItem disabled={isLoading} onClick={() => run("explain")}>
          {t("editor.ai.actions.explain")}
        </DropdownMenuItem>
        <DropdownMenuItem disabled={isLoading} onClick={() => run("improve")}>
          {t("editor.ai.actions.improvements")}
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={isLoading}
          onClick={() => run("suggest_question")}
        >
          {t("editor.ai.actions.suggestQuestion")}
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={isLoading}
          onClick={() => run("trades_summary")}
        >
          {t("editor.ai.actions.tradesSummary")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
