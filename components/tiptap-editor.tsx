"use client"

import { useEditor, EditorContent } from '@tiptap/react'
import { BubbleMenu, FloatingMenu } from '@tiptap/react/menus'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import { BubbleMenu as BubbleMenuExtension } from '@tiptap/extension-bubble-menu'
import { FloatingMenu as FloatingMenuExtension } from '@tiptap/extension-floating-menu'
import { TextAlign } from '@tiptap/extension-text-align'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import { Highlight } from '@tiptap/extension-highlight'
import { TaskList } from '@tiptap/extension-task-list'
import { TaskItem } from '@tiptap/extension-task-item'
import UnderlineExtension from '@tiptap/extension-underline'
import { Placeholder } from '@tiptap/extension-placeholder'
import { Button } from '@/components/ui/button'
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Code,
  List,
  ListOrdered,
  CheckSquare,
  Image as ImageIcon,
  Quote,
  Code2,
  Highlighter,
  Heading1,
  Heading2,
  Heading3,
  Check,
  X
} from 'lucide-react'
import { useCallback, useState, useEffect, useRef, useMemo } from 'react'
import { useUserStore } from '@/store/user-store'
import { toast } from 'sonner'
import { useI18n } from '@/locales/client'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase'
import './tiptap-editor.css'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { Kbd, KbdGroup } from '@/components/ui/kbd'

const supabase = createClient()

// Generate a random 6-character alphanumeric ID
function generateShortId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']

interface TiptapEditorProps {
  content?: string
  onChange?: (content: string) => void
  placeholder?: string
  height?: string
  width?: string
  className?: string
}

export function TiptapEditor({
  content = '',
  onChange,
  placeholder = 'Start writing...',
  height = '200px',
  width = '100%',
  className
}: TiptapEditorProps) {
  const t = useI18n()
  const user = useUserStore(state => state.user)
  const [generatedId] = useState(() => generateShortId())
  
  // AI suggestion state
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null)
  const [showSuggestion, setShowSuggestion] = useState(false)
  const [suggestionPosition, setSuggestionPosition] = useState<number | null>(null)
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastTextRef = useRef<string>('')
  const isTypingRef = useRef<boolean>(false)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastSuggestionTimeRef = useRef<number>(0)
  const suggestionCooldown = 30000 // 30 seconds cooldown between suggestions

  // Set up AI chat hook to stream questions
  const { messages, sendMessage, status, setMessages } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/ai/question-suggest',
    }),
    onFinish: (message) => {
      console.log(JSON.stringify(message, null, 2))
    }
  });

  useEffect(() => {
    if (messages.length > 0) {
      // Only keep role assistant messages
      const assistantMessages = messages.filter(message => message.role === 'assistant')
      
      if (assistantMessages.length > 0) {
        const lastMessage = assistantMessages[assistantMessages.length - 1]
        const textPart = lastMessage.parts?.find(part => part.type === 'text')
        setAiSuggestion(textPart?.text || null)
      }
    }
  }, [messages, setAiSuggestion])

  const handleImageUpload = useCallback(async (file: File): Promise<string> => {
    try {
      // Try to upload directly to Supabase with upsert enabled
      const filePath = `${user?.id}/${generatedId}/${file.name}`

      const { data, error } = await supabase.storage
        .from('trade-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true // This will overwrite if file exists
        })

      if (error) {
        // If it's an "already exists" error and upsert didn't work, try to get the existing file
        if (error.message && error.message.includes('already exists')) {
          const imageUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/trade-images/${filePath}`
          return imageUrl
        }
        throw error
      }

      // If upload was successful, return the URL
      const imageUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/trade-images/${filePath}`
      return imageUrl
    } catch (error) {
      console.error('Image upload error:', error)
      toast.error(t('trade-table.imageUploadError', { error: 'Upload failed' }))
      throw error
    }
  }, [user?.id, generatedId, t])

  // Handle dismissing AI suggestion
  const handleDismissSuggestion = useCallback(() => {
    setAiSuggestion(null)
    setShowSuggestion(false)
    setSuggestionPosition(null)
  }, [])

  // Memoized word count calculation
  const getWordCount = useCallback((text: string) => {
    return text.split(/\s+/).filter(word => word.length > 0).length
  }, [])

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      BubbleMenuExtension,
      FloatingMenuExtension,
      UnderlineExtension,
      Placeholder.configure({
        placeholder: ({ node }) => {
          if (node.type.name === 'heading') {
            return 'Heading...'
          }
          return placeholder
        },
        showOnlyCurrent: false,
        includeChildren: true,
      }),
      Image.configure({
        inline: true,
        allowBase64: false,
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-lg',
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-500 underline cursor-pointer',
        },
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      TextStyle,
      Color.configure({
        types: ['textStyle'],
      }),
      Highlight.configure({
        multicolor: true,
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML())
      
      // Get current text content
      const text = editor.getText().trim()
      const currentText = text
      
      // Mark as typing
      isTypingRef.current = true
      
      // Clear existing typing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
      
      // Set timeout to mark as not typing after 2 seconds of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        isTypingRef.current = false
      }, 2000)
      
      // Clear existing suggestion timeout
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
      
      // Dismiss suggestion if user is actively typing and text has changed
      if (showSuggestion && aiSuggestion && currentText !== lastTextRef.current) {
        const textDiff = Math.abs(currentText.length - lastTextRef.current.length)
        // Dismiss on any significant change or if user is actively typing
        if (textDiff > 5 || isTypingRef.current) {
          handleDismissSuggestion()
        }
      }
      
      const wordCount = getWordCount(text)
      
      // Only suggest if user has written at least 8 words and is not actively typing
      if (wordCount >= 8 && !isTypingRef.current) {
        const now = Date.now()
        const timeSinceLastSuggestion = now - lastSuggestionTimeRef.current
        
        // Check cooldown period
        if (timeSinceLastSuggestion >= suggestionCooldown) {
          // Set debounced timeout for 3 seconds (longer pause required)
          debounceTimeoutRef.current = setTimeout(() => {
            // Check if suggestion is not already showing and user is still not typing
            if (!showSuggestion && !aiSuggestion && !isTypingRef.current && currentText === editor.getText().trim()) {
              // Clear previous messages to avoid sending conversation history
              setMessages([])
              
              sendMessage({
                text: currentText,
              })
              setSuggestionPosition(editor.state.selection.$anchor.pos)
              setShowSuggestion(true)
              lastSuggestionTimeRef.current = now
            }
          }, 3000)
        }
      }
      
      lastTextRef.current = currentText
    },
    editorProps: {
      attributes: {
        class: cn(
          'prose prose-sm sm:prose lg:prose-sm xl:prose mx-auto focus:outline-hidden',
          'min-h-[200px] p-2',
          className
        ),
        style: `height: ${height}; width: ${width};`,
      },
      handlePaste: (view, event) => {
        const items = Array.from(event.clipboardData?.items || [])

        for (const item of items) {
          if (item.type.startsWith('image/')) {
            event.preventDefault()
            const file = item.getAsFile()
            if (file && editor) {
              handleImageUpload(file).then((imageUrl) => {
                editor.chain().focus().setImage({ src: imageUrl }).run()
              }).catch((error) => {
                console.error('Failed to upload pasted image:', error)
              })
            }
            return true
          }
        }
        return false
      },
      handleDrop: (view, event) => {
        const files = Array.from(event.dataTransfer?.files || [])

        for (const file of files) {
          if (file.type.startsWith('image/') && editor) {
            event.preventDefault()
            handleImageUpload(file).then((imageUrl) => {
              editor.chain().focus().setImage({ src: imageUrl }).run()
            }).catch((error) => {
              console.error('Failed to upload dropped image:', error)
            })
            return true
          }
        }
        return false
      },
    },
  })

  // Handle accepting AI suggestion
  const handleAcceptSuggestion = useCallback(() => {
    if (!editor || !aiSuggestion) return
    
    // Insert the question as italic and muted text on a new line
    const questionHtml = `<p><em class="text-muted-foreground">${aiSuggestion}</em></p>`
    
    // Insert at the end of current content (creates new line)
    editor.chain().focus().insertContent(questionHtml).insertContent('<p></p>').run()
    
    // Clear suggestion state
    setAiSuggestion(null)
    setShowSuggestion(false)
    setSuggestionPosition(null)
  }, [editor, aiSuggestion])

  // Handle keyboard events for AI suggestion
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!showSuggestion || !aiSuggestion) return
    
    if (event.key === 'Enter') {
      event.preventDefault()
      handleAcceptSuggestion()
    } else if (event.key !== 'Shift' && event.key !== 'Control' && event.key !== 'Alt' && event.key !== 'Meta') {
      // Dismiss on any other key except modifier keys
      event.preventDefault()
      handleDismissSuggestion()
    }
  }, [showSuggestion, aiSuggestion, handleAcceptSuggestion, handleDismissSuggestion])

  // Add keyboard event listener when suggestion is shown
  useEffect(() => {
    if (showSuggestion && aiSuggestion) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [showSuggestion, aiSuggestion, handleKeyDown])

  // Update editor content when content prop changes
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content)
    }
  }, [editor, content])

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
    }
  }, [])

  // Handle file input for image upload
  const handleFileInput = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type.startsWith('image/') && editor) {
      handleImageUpload(file).then((imageUrl) => {
        editor.chain().focus().setImage({ src: imageUrl }).run()
      }).catch((error) => {
        console.error('Failed to upload image:', error)
      })
    }
  }, [editor, handleImageUpload])

  if (!editor) {
    return null
  }

  return (
    <div className="border rounded-lg overflow-hidden bg-background relative">
      {/* Editor Content */}
      <div className="relative">
        <EditorContent
          editor={editor}
          className="min-h-[200px] focus-within:outline-hidden p-2 overflow-y-auto"
          style={{ height, width }}
        />

        {/* Bubble Menu - appears when text is selected */}
        <BubbleMenu
          editor={editor}
          className="flex items-center flex-wrap gap-1 p-2 bg-background border rounded-lg shadow-lg max-w-[90vw] overflow-hidden"
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={cn(editor.isActive('bold') && 'bg-muted')}
            title="Bold"
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={cn(editor.isActive('italic') && 'bg-muted')}
            title="Italic"
          >
            <Italic className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={cn(editor.isActive('underline') && 'bg-muted')}
            title="Underline"
          >
            <UnderlineIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleStrike().run()}
            className={cn(editor.isActive('strike') && 'bg-muted')}
            title="Strikethrough"
          >
            <Strikethrough className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleCode().run()}
            className={cn(editor.isActive('code') && 'bg-muted')}
            title="Code"
          >
            <Code className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleHighlight().run()}
            className={cn(editor.isActive('highlight') && 'bg-muted')}
            title="Highlight"
          >
            <Highlighter className="h-4 w-4" />
          </Button>
        </BubbleMenu>

        {/* Floating Menu - appears on empty lines */}
        <FloatingMenu
          options={{
            placement: 'top-start',
            offset: 5,
            flip: true,
            shift: true,
          }}
          editor={editor}
          className="flex items-center flex-wrap gap-1 p-2 bg-background border rounded-lg shadow-lg max-w-[90vw] overflow-hidden"
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            title="Heading 1"
          >
            <Heading1 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            title="Heading 2"
          >
            <Heading2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            title="Heading 3"
          >
            <Heading3 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            title="Bullet List"
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            title="Numbered List"
          >
            <ListOrdered className="h-4 w-4" />
          </Button>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileInput}
            className="hidden"
            id="image-upload"
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => document.getElementById('image-upload')?.click()}
            title="Upload Image"
            className="h-8 w-8 p-0 shrink-0 overflow-hidden"
          >
            <ImageIcon className="h-4 w-4" />
          </Button>
        </FloatingMenu>

        {/* AI Suggestion Popup */}
        {showSuggestion && aiSuggestion && (
          <div className="absolute bottom-3 right-3 z-50 max-w-sm">
            <div className="bg-background/95 backdrop-blur-sm border border-border/50 rounded-lg shadow-lg p-3 animate-in slide-in-from-bottom-2 duration-200">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-muted-foreground">AI Suggestion</span>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <KbdGroup>
                      <Kbd>Enter</Kbd>
                    </KbdGroup>
                    <span className="text-xs">to accept</span>
                  </div>
                </div>
                <p className="text-sm leading-relaxed text-foreground/90">{aiSuggestion}</p>
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <span>Any other key to dismiss</span>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleAcceptSuggestion}
                      className="h-6 w-6 p-0 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950/20"
                      title="Accept suggestion"
                    >
                      <Check className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleDismissSuggestion}
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground hover:bg-muted"
                      title="Dismiss suggestion"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
