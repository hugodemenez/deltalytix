"use client"

import { NewsSubMenu } from "@/components/ai-elements/news-sub-menu"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { useI18n } from "@/locales/client"
import { FinancialEvent } from "@/prisma/generated/prisma/browser"
import { ActionSchema } from "@/app/api/ai/editor/schema"
import {
  Heading1,
  Heading2,
  Heading3,
  ImageIcon,
  List,
  ListOrdered,
  Loader2,
  Maximize2,
  Minimize2,
  Quote,
  Sparkles,
} from "lucide-react"
import type { z } from "zod"

type EditorAction = z.infer<typeof ActionSchema>

export type JournalBlock = "h1" | "h2" | "h3" | "blockquote" | "ul" | "ol"

interface JournalToolbarProps {
  activeBlock: JournalBlock | "p" | null
  isStreaming: boolean
  isFullscreen: boolean
  events?: FinancialEvent[]
  selectedNews?: string[]
  onNewsSelection?: (newsIds: string[]) => void
  onEmbedNews?: (newsIds: string[], action: "add" | "remove") => void
  date?: Date
  onToggleBlock: (block: JournalBlock) => void
  onInsertImage: () => void
  onRunAIAction: (action: EditorAction) => void
  onToggleFullscreen: () => void
}

export function JournalToolbar({
  activeBlock,
  isStreaming,
  isFullscreen,
  events,
  selectedNews,
  onNewsSelection,
  onEmbedNews,
  date,
  onToggleBlock,
  onInsertImage,
  onRunAIAction,
  onToggleFullscreen,
}: JournalToolbarProps) {
  const t = useI18n()

  const formatButtons: Array<{
    id: JournalBlock
    icon: typeof Heading1
    title: string
  }> = [
    { id: "h1", icon: Heading1, title: "Heading 1" },
    { id: "h2", icon: Heading2, title: "Heading 2" },
    { id: "h3", icon: Heading3, title: "Heading 3" },
    { id: "ul", icon: List, title: "Bullet list" },
    { id: "ol", icon: ListOrdered, title: "Numbered list" },
    { id: "blockquote", icon: Quote, title: "Quote" },
  ]

  return (
    <div className="flex flex-wrap items-center gap-1 border-b bg-muted/30 p-2">
      {events &&
      events.length > 0 &&
      onNewsSelection &&
      onEmbedNews &&
      date ? (
        <NewsSubMenu
          events={events}
          selectedNews={selectedNews || []}
          onNewsSelection={onNewsSelection}
          onEmbedNews={onEmbedNews}
          date={date}
          className="shrink-0"
        />
      ) : null}

      {formatButtons.map(({ id, icon: Icon, title }) => (
        <Button
          key={id}
          type="button"
          variant="ghost"
          size="icon-sm"
          title={title}
          aria-pressed={activeBlock === id}
          className={cn(activeBlock === id && "bg-muted")}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => onToggleBlock(id)}
        >
          <Icon />
        </Button>
      ))}

      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        title="Upload image"
        onMouseDown={(event) => event.preventDefault()}
        onClick={onInsertImage}
      >
        <ImageIcon />
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            title={t("editor.ai.button")}
            disabled={isStreaming}
            className={cn(isStreaming && "animate-pulse")}
            onMouseDown={(event) => event.preventDefault()}
          >
            {isStreaming ? <Loader2 className="animate-spin" /> : <Sparkles />}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuItem
            disabled={isStreaming}
            onClick={() => onRunAIAction("explain")}
          >
            {t("editor.ai.actions.explain")}
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={isStreaming}
            onClick={() => onRunAIAction("improve")}
          >
            {t("editor.ai.actions.improvements")}
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={isStreaming}
            onClick={() => onRunAIAction("suggest_question")}
          >
            {t("editor.ai.actions.suggestQuestion")}
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={isStreaming}
            onClick={() => onRunAIAction("trades_summary")}
          >
            {t("editor.ai.actions.tradesSummary")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="ml-auto"
        title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
        onClick={onToggleFullscreen}
      >
        {isFullscreen ? <Minimize2 /> : <Maximize2 />}
      </Button>
    </div>
  )
}
