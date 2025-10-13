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
  Heading3
} from 'lucide-react'
import { useCallback, useState, useEffect } from 'react'
import { useUserStore } from '@/store/user-store'
import { toast } from 'sonner'
import { useI18n } from '@/locales/client'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase'
import './tiptap-editor.css'

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

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      BubbleMenuExtension,
      FloatingMenuExtension,
      UnderlineExtension,
      Placeholder.configure({
        placeholder: placeholder,
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
    },
    editorProps: {
      attributes: {
        class: cn(
          'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-hidden',
          'min-h-[200px] p-4',
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

  // Update editor content when content prop changes
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content)
    }
  }, [editor, content])

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
          className="min-h-[200px] focus-within:outline-hidden p-4"
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
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleTaskList().run()}
            title="Task List"
          >
            <CheckSquare className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            title="Quote"
          >
            <Quote className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            title="Code Block"
          >
            <Code2 className="h-4 w-4" />
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
      </div>
    </div>
  )
}
