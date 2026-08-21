"use client"

import { JournalAI } from "@/components/journal-editor/journal-ai"
import { JournalToolbar, type JournalBlock } from "@/components/journal-editor/toolbar"
import { useUserStore } from "@/store/user-store"
import {
  escapeJournalText,
  isJournalEmptyHtml,
  isSameJournalHtml,
  sanitizeJournalHtml,
} from "@/lib/journal/journal-html"
import { cn } from "@/lib/utils"
import { useCurrentLocale, useI18n } from "@/locales/client"
import { FinancialEvent } from "@/prisma/generated/prisma/browser"
import { Button } from "@/components/ui/button"
import { Sparkles } from "lucide-react"
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import { toast } from "sonner"

const MAX_FILE_SIZE = 5 * 1024 * 1024
const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]

export interface JournalEditorProps {
  content?: string
  onChange?: (content: string) => void
  placeholder?: string
  height?: string
  width?: string
  className?: string
  events?: FinancialEvent[]
  selectedNews?: string[]
  onNewsSelection?: (newsIds: string[]) => void
  onEmbedNews?: (newsIds: string[], action: "add" | "remove") => void
  date?: Date
}

function currentBlock(): JournalBlock | "p" | null {
  if (typeof document === "undefined") {
    return null
  }
  if (document.queryCommandState("insertUnorderedList")) {
    return "ul"
  }
  if (document.queryCommandState("insertOrderedList")) {
    return "ol"
  }
  const block = document.queryCommandValue("formatBlock").toLowerCase()
  if (block === "h1" || block === "h2" || block === "h3" || block === "blockquote") {
    return block
  }
  if (block === "p" || block === "div") {
    return "p"
  }
  return null
}

export function JournalEditor({
  content = "",
  onChange,
  placeholder = "Start writing...",
  height = "100%",
  width = "100%",
  className,
  events,
  selectedNews,
  onNewsSelection,
  onEmbedNews,
  date,
}: JournalEditorProps) {
  const t = useI18n()
  const locale = useCurrentLocale()
  const user = useUserStore((state) => state.user)
  const editorRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageHashCacheRef = useRef<Map<string, string>>(new Map())
  const skipEmitRef = useRef(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isEmpty, setIsEmpty] = useState(() => isJournalEmptyHtml(content))
  const [activeBlock, setActiveBlock] = useState<JournalBlock | "p" | null>(null)
  const [aiReady, setAiReady] = useState(false)

  const emitChange = useCallback(() => {
    if (skipEmitRef.current) {
      return
    }
    const html = editorRef.current?.innerHTML ?? ""
    setIsEmpty(isJournalEmptyHtml(html))
    onChange?.(html)
  }, [onChange])

  const insertHtml = useCallback(
    (html: string) => {
      editorRef.current?.focus()
      document.execCommand("insertHTML", false, html)
      emitChange()
    },
    [emitChange],
  )

  const refreshActiveBlock = useCallback(() => {
    setActiveBlock(currentBlock())
  }, [])

  useLayoutEffect(() => {
    const node = editorRef.current
    if (!node) {
      return
    }
    if (isSameJournalHtml(node.innerHTML, content)) {
      setIsEmpty(isJournalEmptyHtml(content))
      return
    }
    skipEmitRef.current = true
    node.innerHTML = content
    setIsEmpty(isJournalEmptyHtml(content))
    skipEmitRef.current = false
  }, [content])

  useEffect(() => {
    const onSelectionChange = () => {
      if (!editorRef.current) {
        return
      }
      if (editorRef.current.contains(document.activeElement)) {
        refreshActiveBlock()
      }
    }
    document.addEventListener("selectionchange", onSelectionChange)
    return () => document.removeEventListener("selectionchange", onSelectionChange)
  }, [refreshActiveBlock])

  const handleImageUpload = useCallback(
    async (file: File): Promise<string> => {
      if (file.size > MAX_FILE_SIZE) {
        toast.error(t("trade-table.imageUploadError", { error: "File too large" }))
        throw new Error("File too large")
      }
      if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
        toast.error(
          t("trade-table.imageUploadError", { error: "Unsupported file type" }),
        )
        throw new Error("Unsupported file type")
      }

      const buffer = await file.arrayBuffer()
      const digest = await crypto.subtle.digest("SHA-256", buffer)
      const hashHex = Array.from(new Uint8Array(digest))
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("")
      const cached = imageHashCacheRef.current.get(hashHex)
      if (cached) {
        return cached
      }

      const mimeExt = file.type.split("/")[1] || ""
      const nameExt = file.name.includes(".")
        ? file.name.split(".").pop() || ""
        : ""
      const ext = (mimeExt || nameExt || "bin").toLowerCase()
      const filePath = `${user?.id}/journal/${hashHex}.${ext}`

      const { createClient } = await import("@/lib/supabase")
      const supabase = createClient()
      const { error } = await supabase.storage
        .from("trade-images")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        })

      if (error && !error.message?.includes("already exists")) {
        throw error
      }

      const { data: pub } = supabase.storage
        .from("trade-images")
        .getPublicUrl(filePath)
      imageHashCacheRef.current.set(hashHex, pub.publicUrl)
      return pub.publicUrl
    },
    [t, user?.id],
  )

  const insertImageFile = useCallback(
    async (file: File) => {
      try {
        const src = await handleImageUpload(file)
        insertHtml(
          `<img src="${src}" alt="" class="rounded-lg my-4 max-w-full" />`,
        )
      } catch (error) {
        console.error("Failed to upload image:", error)
        toast.error(t("trade-table.imageUploadError", { error: "Upload failed" }))
      }
    },
    [handleImageUpload, insertHtml, t],
  )

  const handleEmbedNews = useCallback(
    (newsIds: string[], action: "add" | "remove" = "add") => {
      const node = editorRef.current
      if (!node) {
        return
      }

      if (action === "remove") {
        newsIds.forEach((id) => {
          node
            .querySelectorAll(`[data-news-id="${CSS.escape(id)}"]`)
            .forEach((el) => el.remove())
        })
        emitChange()
        return
      }

      if (!events) {
        return
      }

      const html = events
        .filter((event) => newsIds.includes(event.id))
        .map((event) => {
          const eventTime = new Date(event.date).toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          })
          const location = event.country || "Unknown"
          return `<p data-news-id="${event.id}" class="news-event-inline text-sm text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/20 px-2 py-1 rounded border-l-2 border-blue-500 my-1">${eventTime} - ${location} - ${event.title} - ${event.importance.toUpperCase()}</p>`
        })
        .join("")

      if (html) {
        insertHtml(html)
      }
    },
    [emitChange, events, insertHtml],
  )

  const handleToggleBlock = useCallback(
    (block: JournalBlock) => {
      editorRef.current?.focus()
      if (block === "ul") {
        document.execCommand("insertUnorderedList")
      } else if (block === "ol") {
        document.execCommand("insertOrderedList")
      } else {
        const next = activeBlock === block ? "p" : block
        document.execCommand("formatBlock", false, next)
      }
      refreshActiveBlock()
      emitChange()
    },
    [activeBlock, emitChange, refreshActiveBlock],
  )

  return (
    <div
      className={cn(
        "relative flex h-full flex-col overflow-hidden rounded-lg border bg-background",
        isFullscreen && "fixed inset-0 z-50 rounded-none",
        className,
      )}
      style={isFullscreen ? undefined : { height, width }}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) {
            void insertImageFile(file)
          }
          event.target.value = ""
        }}
      />
      <JournalToolbar
        activeBlock={activeBlock}
        isFullscreen={isFullscreen}
        events={events}
        selectedNews={selectedNews}
        onNewsSelection={onNewsSelection}
        onEmbedNews={onEmbedNews || handleEmbedNews}
        date={date}
        onToggleBlock={handleToggleBlock}
        onInsertImage={() => fileInputRef.current?.click()}
        aiMenu={
          aiReady ? (
            <JournalAI
              getTargetText={() => {
                const selection = window.getSelection()?.toString().trim() ?? ""
                return selection || editorRef.current?.innerText.trim() || ""
              }}
              onInsert={(text) => insertHtml(escapeJournalText(text))}
              date={date}
              locale={locale}
            />
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              title="AI actions"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => setAiReady(true)}
            >
              <Sparkles />
            </Button>
          )
        }
        onToggleFullscreen={() => setIsFullscreen((open) => !open)}
      />
      <div className="relative min-h-0 flex-1">
        {isEmpty ? (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 p-2 text-lg text-muted-foreground sm:text-sm"
          >
            {placeholder}
          </div>
        ) : null}
        <div
          ref={editorRef}
          role="textbox"
          aria-multiline="true"
          aria-label={placeholder}
          contentEditable
          suppressContentEditableWarning
          className={cn(
            "h-full overflow-y-auto p-2 text-lg leading-relaxed outline-none sm:text-sm",
            "[&_h1]:mb-2 [&_h1]:mt-3 [&_h1]:text-3xl [&_h1]:font-bold",
            "[&_h2]:mb-2 [&_h2]:mt-5 [&_h2]:text-2xl [&_h2]:font-semibold",
            "[&_h3]:mb-2 [&_h3]:mt-4 [&_h3]:text-lg [&_h3]:font-semibold",
            "[&_p]:my-2 [&_ul]:my-2 [&_ul]:pl-6 [&_ol]:my-2 [&_ol]:pl-6 [&_li]:my-1",
            "[&_blockquote]:my-4 [&_blockquote]:border-l-4 [&_blockquote]:border-border [&_blockquote]:pl-4 [&_blockquote]:italic",
            "[&_img]:my-4 [&_img]:max-w-full [&_img]:rounded-lg [&_img]:outline [&_img]:outline-1 [&_img]:outline-black/10 dark:[&_img]:outline-white/10",
          )}
          onInput={emitChange}
          onPaste={(event) => {
            const image = [...(event.clipboardData?.items ?? [])].find((item) =>
              item.type.startsWith("image/"),
            )
            if (image) {
              event.preventDefault()
              const file = image.getAsFile()
              if (file) {
                void insertImageFile(file)
              }
              return
            }
            const html = event.clipboardData?.getData("text/html")
            if (html) {
              event.preventDefault()
              insertHtml(sanitizeJournalHtml(html))
            }
          }}
          onDrop={(event) => {
            const file = [...event.dataTransfer.files].find((item) =>
              item.type.startsWith("image/"),
            )
            if (!file) {
              return
            }
            event.preventDefault()
            void insertImageFile(file)
          }}
        />
      </div>
    </div>
  )
}
