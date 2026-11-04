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
  variant?: "default" | "compact"
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
  variant = "default",
}: JournalToolbarProps) {
  const t = useI18n()

  if (variant === "compact") {
    const hasNews =
      Boolean(events?.length) &&
      Boolean(onNewsSelection) &&
      Boolean(onEmbedNews) &&
      Boolean(date)

    return (
      <div className="mt-0 flex gap-1 rounded-[10px] border border-[#222] p-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              className="h-8 flex-1 text-[13px] text-[#bdbdbd]"
              title={t("mindset.editor.headingMenu")}
              aria-label={t("mindset.editor.headingMenu")}
              onMouseDown={(event) => event.preventDefault()}
            >
              H
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem
              onMouseDown={(event) => event.preventDefault()}
              onSelect={() => onToggleBlock("h1")}
            >
              {t("mindset.editor.heading1")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onMouseDown={(event) => event.preventDefault()}
              onSelect={() => onToggleBlock("h2")}
            >
              {t("mindset.editor.heading2")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onMouseDown={(event) => event.preventDefault()}
              onSelect={() => onToggleBlock("h3")}
            >
              {t("mindset.editor.heading3")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onMouseDown={(event) => event.preventDefault()}
              onSelect={() => onToggleBlock("blockquote")}
            >
              {t("mindset.editor.quote")}
            </DropdownMenuItem>
            {hasNews ? (
              <div className="px-1 py-1">
                <NewsSubMenu
                  events={events!}
                  selectedNews={selectedNews || []}
                  onNewsSelection={onNewsSelection!}
                  onEmbedNews={onEmbedNews!}
                  date={date!}
                  className="w-full"
                />
              </div>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              className="h-8 flex-1 text-[#bdbdbd]"
              title={t("mindset.editor.lists")}
              aria-label={t("mindset.editor.lists")}
              onMouseDown={(event) => event.preventDefault()}
            >
              <List className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem
              onMouseDown={(event) => event.preventDefault()}
              onSelect={() => onToggleBlock("ul")}
            >
              {t("mindset.editor.bulletList")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onMouseDown={(event) => event.preventDefault()}
              onSelect={() => onToggleBlock("ol")}
            >
              {t("mindset.editor.numberedList")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          type="button"
          variant="ghost"
          className="h-8 flex-1 text-[#bdbdbd]"
          title={t("mindset.editor.image")}
          aria-label={t("mindset.editor.image")}
          onMouseDown={(event) => event.preventDefault()}
          onClick={onInsertImage}
        >
          <ImageIcon className="h-4 w-4" />
        </Button>

        <div className="flex flex-1 items-center justify-center">{aiMenu}</div>

        <Button
          type="button"
          variant="ghost"
          className="h-8 flex-1 text-[#bdbdbd]"
          title={
            isFullscreen
              ? t("mindset.editor.exitFullscreen")
              : t("mindset.editor.fullscreen")
          }
          aria-label={
            isFullscreen
              ? t("mindset.editor.exitFullscreen")
              : t("mindset.editor.fullscreen")
          }
          onClick={onToggleFullscreen}
        >
          {isFullscreen ? (
            <Minimize2 className="h-4 w-4" />
          ) : (
            <Maximize2 className="h-4 w-4" />
          )}
        </Button>
      </div>
    )
  }

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
