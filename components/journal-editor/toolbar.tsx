"use client"

import { NewsSubMenu } from "@/components/ai-elements/news-sub-menu"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { FinancialEvent } from "@/prisma/generated/prisma/browser"
import {
  Heading1,
  Heading2,
  Heading3,
  ImageIcon,
  List,
  ListOrdered,
  Maximize2,
  Minimize2,
  Quote,
} from "lucide-react"
import type { ReactNode } from "react"

export type JournalBlock = "h1" | "h2" | "h3" | "blockquote" | "ul" | "ol"

interface JournalToolbarProps {
  activeBlock: JournalBlock | "p" | null
  isFullscreen: boolean
  events?: FinancialEvent[]
  selectedNews?: string[]
  onNewsSelection?: (newsIds: string[]) => void
  onEmbedNews?: (newsIds: string[], action: "add" | "remove") => void
  date?: Date
  onToggleBlock: (block: JournalBlock) => void
  onInsertImage: () => void
  aiMenu?: ReactNode
  onToggleFullscreen: () => void
}

export function JournalToolbar({
  activeBlock,
  isFullscreen,
  events,
  selectedNews,
  onNewsSelection,
  onEmbedNews,
  date,
  onToggleBlock,
  onInsertImage,
  aiMenu,
  onToggleFullscreen,
}: JournalToolbarProps) {

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

      {aiMenu}

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
