"use client"

import { useCallback, useEffect, useState, useRef } from "react"
import { EditorContent, useEditor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Underline from "@tiptap/extension-underline"
import Link from "@tiptap/extension-link"
import Image from "@tiptap/extension-image"
import Placeholder from "@tiptap/extension-placeholder"
import {
  Bold,
  Italic,
  UnderlineIcon,
  Strikethrough,
  Code,
  LinkIcon,
  ImageIcon,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  X,
  Save,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

interface NoteEditorProps {
  initialContent?: string
  onChange?: (content: string) => void
  className?: string
  height?: string
  width?: string
}

export function NoteEditor({
  initialContent = "",
  onChange,
  className,
  height = "400px",
  width = "100%",
}: NoteEditorProps) {
  const [isMounted, setIsMounted] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const debounceTimer = useRef<NodeJS.Timeout | null>(null)

  const debouncedOnChange = useCallback((content: string) => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current)
    }
    
    debounceTimer.current = setTimeout(() => {
      onChange?.(content)
    }, 500) // 500ms debounce
  }, [onChange])

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({
        openOnClick: false,
      }),
      Image,
      Placeholder.configure({
        placeholder: "Start writing...",
        emptyEditorClass: "cursor-text before:content-[attr(data-placeholder)] before:absolute before:opacity-50 before:pointer-events-none",
      }),
    ],
    content: initialContent,
    onUpdate: ({ editor }) => {
      const content = editor.getHTML()
      debouncedOnChange(content)
    },
  })

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current)
      }
    }
  }, [])

  // Update editor content when initialContent changes
  useEffect(() => {
    if (editor && initialContent !== undefined && editor.getHTML() !== initialContent) {
      editor.commands.setContent(initialContent)
    }
  }, [editor, initialContent])

  // Load content from localStorage on mount if storageKey is provided
  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsMounted(true)
    }
  }, [])

  const handleManualSave = useCallback(() => {
    if (!editor) return

    const content = editor.getHTML()
    setIsSaving(true)
    setLastSaved(new Date())
    onChange?.(content)
    setTimeout(() => setIsSaving(false), 500)
  }, [editor, onChange])

  const setLink = useCallback(() => {
    if (!editor) return

    const previousUrl = editor.getAttributes("link").href
    const url = window.prompt("URL", previousUrl)

    // cancelled
    if (url === null) return

    // empty
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run()
      return
    }

    // update link
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run()
  }, [editor])

  const addImage = useCallback(() => {
    if (!editor) return

    const url = window.prompt("Image URL")
    if (url) {
      editor.chain().focus().setImage({ src: url }).run()
    }
  }, [editor])


  if (!isMounted) {
    return null
  }

  return (
    <div className={cn("flex flex-col border rounded-md bg-background h-full", className)} style={{ width }}>
      <div 
        className="relative flex-1 min-h-0" 
        style={{ overflow: "auto" }}
        onClick={() => editor?.commands.focus()}
      >
        <EditorContent 
          editor={editor} 
          className="h-full p-4 prose prose-sm max-w-none [&_.ProseMirror]:outline-none [&_.ProseMirror]:relative [&_.ProseMirror]:h-full" 
        />
      </div>

      {editor && (
        <div className="border-t flex flex-wrap items-center p-2 gap-1 bg-muted/20 shrink-0">
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                  className={cn("h-8 w-8", editor.isActive("heading", { level: 1 }) && "bg-muted")}
                >
                  <Heading1 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Heading 1</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                  className={cn("h-8 w-8", editor.isActive("heading", { level: 2 }) && "bg-muted")}
                >
                  <Heading2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Heading 2</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                  className={cn("h-8 w-8", editor.isActive("heading", { level: 3 }) && "bg-muted")}
                >
                  <Heading3 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Heading 3</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => editor.chain().focus().toggleBold().run()}
                  className={cn("h-8 w-8", editor.isActive("bold") && "bg-muted")}
                >
                  <Bold className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Bold</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => editor.chain().focus().toggleItalic().run()}
                  className={cn("h-8 w-8", editor.isActive("italic") && "bg-muted")}
                >
                  <Italic className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Italic</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => editor.chain().focus().toggleUnderline().run()}
                  className={cn("h-8 w-8", editor.isActive("underline") && "bg-muted")}
                >
                  <UnderlineIcon className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Underline</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => editor.chain().focus().toggleStrike().run()}
                  className={cn("h-8 w-8", editor.isActive("strike") && "bg-muted")}
                >
                  <Strikethrough className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Strikethrough</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => editor.chain().focus().toggleCode().run()}
                  className={cn("h-8 w-8", editor.isActive("code") && "bg-muted")}
                >
                  <Code className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Code</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={setLink}
                  className={cn("h-8 w-8", editor.isActive("link") && "bg-muted")}
                >
                  <LinkIcon className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Link</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={addImage} className="h-8 w-8">
                  <ImageIcon className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Image</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => editor.chain().focus().toggleBulletList().run()}
                  className={cn("h-8 w-8", editor.isActive("bulletList") && "bg-muted")}
                >
                  <List className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Bullet List</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => editor.chain().focus().toggleOrderedList().run()}
                  className={cn("h-8 w-8", editor.isActive("orderedList") && "bg-muted")}
                >
                  <ListOrdered className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Ordered List</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
                  className="h-8 w-8"
                >
                  <X className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Clear formatting</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}
    </div>
  )
}
