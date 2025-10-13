import { useRef, useState, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Plus, Upload, Send, StopCircle, X, Image as ImageIcon, Link, FileText, Table } from "lucide-react"
import { cn } from "@/lib/utils"
import { useI18n } from "@/locales/client"

// Helper function to convert files to data URLs
async function convertFilesToDataURLs(files: FileList) {
  console.log('Converting files to data URLs:', Array.from(files).map(f => f.name))
  return Promise.all(
    Array.from(files).map(
      file =>
        new Promise<{
          type: 'file';
          mediaType: string;
          url: string;
        }>((resolve, reject) => {
          console.log('Processing file:', file.name, file.type, file.size)
          const reader = new FileReader();
          reader.onload = () => {
            console.log('File reader loaded for:', file.name)
            resolve({
              type: 'file',
              mediaType: file.type,
              url: reader.result as string,
            });
          };
          reader.onerror = (error) => {
            console.error('File reader error for:', file.name, error)
            reject(error);
          };
          reader.readAsDataURL(file);
        }),
    ),
  );
}

// Input Component
export function ChatInput({
  onSend,
  status,
  input,
  handleInputChange,
  stop,
  onFilesChange,
  files = [],
}: {
  onSend: (e?: { preventDefault?: () => void }) => void
  status: "streaming" | "submitted" | "ready" | "error"
  input: string
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  stop: () => void
  onFilesChange?: (files: { type: 'file'; mediaType: string; url: string }[]) => void
  files?: { type: 'file'; mediaType: string; url: string }[]
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const t = useI18n();

  const handleFileUpload = () => {
    console.log('File upload triggered')
    if (fileInputRef.current) {
      fileInputRef.current.accept = "image/*"
      console.log('File input accept set to:', fileInputRef.current.accept)
      fileInputRef.current.click()
      console.log('File input clicked')
    } else {
      console.error('File input ref is null')
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('File change event triggered', e.target.files)
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files)
      
      // Filter for supported file types
      const supportedFiles = selectedFiles.filter(file => 
        file.type.startsWith('image/') || 
        file.type === 'text/csv' || 
        file.type === 'application/csv' ||
        file.type === 'application/vnd.ms-excel' ||
        file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        file.name.toLowerCase().endsWith('.csv') ||
        file.name.toLowerCase().endsWith('.xls') ||
        file.name.toLowerCase().endsWith('.xlsx')
      )
      
      console.log('Files selected:', supportedFiles.map(f => ({ name: f.name, type: f.type, size: f.size })))
      try {
        const fileParts = await convertFilesToDataURLs(supportedFiles as any)
        console.log('Converted file parts:', fileParts)
        onFilesChange?.(fileParts)
      } catch (error) {
        console.error('Error converting files:', error)
      }
    }
  }

  const removeFile = (index: number) => {
    if (onFilesChange) {
      const newFiles = files.filter((_, i) => i !== index)
      onFilesChange(newFiles)
    }
  }

  const [urlInput, setUrlInput] = useState("")
  const [showUrlInput, setShowUrlInput] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)

  // Helper function to get file type icon
  const getFileIcon = (mediaType: string) => {
    if (mediaType.startsWith('image/')) {
      return <ImageIcon className="h-4 w-4" />
    } else if (mediaType === 'text/csv' || mediaType === 'application/csv') {
      return <FileText className="h-4 w-4" />
    } else if (mediaType.includes('excel') || mediaType.includes('spreadsheet')) {
      return <Table className="h-4 w-4" />
    }
    return <FileText className="h-4 w-4" />
  }

  // Auto-detect URLs in input and move them to attachments
  const detectAndMoveUrls = useCallback((text: string) => {
    const imageUrlRegex = /(https?:\/\/[^\s]+?(?:\.png|\.jpg|\.jpeg|\.gif|\.webp|\.svg)(?:\?[^\s]*)?|https?:\/\/www\.google\.com\/url\?[^\s]*url=[^\s]*)/gi
    
    const getMimeFromUrl = (url: string): string => {
      const lowered = url.toLowerCase()
      
      // Handle Google redirect URLs
      if (lowered.includes('google.com/url')) {
        try {
          const urlParams = new URLSearchParams(url.split('?')[1])
          const targetUrl = urlParams.get('url')
          if (targetUrl) {
            const decodedUrl = decodeURIComponent(targetUrl)
            if (decodedUrl.includes('.png')) return 'image/png'
            if (decodedUrl.includes('.jpeg') || decodedUrl.includes('.jpg')) return 'image/jpeg'
            if (decodedUrl.includes('.gif')) return 'image/gif'
            if (decodedUrl.includes('.webp')) return 'image/webp'
            if (decodedUrl.includes('.svg')) return 'image/svg+xml'
          }
        } catch (e) {
          console.warn('Failed to parse Google redirect URL:', e)
        }
        return 'image/*'
      }
      
      // Handle direct image URLs
      if (lowered.includes('.png')) return 'image/png'
      if (lowered.includes('.jpeg') || lowered.includes('.jpg')) return 'image/jpeg'
      if (lowered.includes('.gif')) return 'image/gif'
      if (lowered.includes('.webp')) return 'image/webp'
      if (lowered.includes('.svg')) return 'image/svg+xml'
      return 'image/*'
    }

    const urlMatches = Array.from(text.matchAll(imageUrlRegex)).map(m => m[0])
    
    if (urlMatches.length > 0) {
      // Add URLs to attachments
      const urlFileParts = urlMatches.map(url => ({
        type: 'file' as const,
        mediaType: getMimeFromUrl(url),
        url,
      }))
      
      onFilesChange?.([...files, ...urlFileParts])
      
      // Remove URLs from text
      const textWithoutUrls = text.replace(imageUrlRegex, '').trim()
      return textWithoutUrls
    }
    
    return text
  }, [files, onFilesChange])

  // Enhanced input change handler that detects URLs
  const handleInputChangeWithUrlDetection = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    const processedValue = detectAndMoveUrls(newValue)
    
    // Call the original handler with the processed value
    handleInputChange({
      ...e,
      target: {
        ...e.target,
        value: processedValue
      }
    })
  }, [detectAndMoveUrls, handleInputChange])

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)

    const droppedFiles = Array.from(e.dataTransfer.files)
    
    // Filter for supported file types: images, CSV, and Excel
    const supportedFiles = droppedFiles.filter(file => 
      file.type.startsWith('image/') || 
      file.type === 'text/csv' || 
      file.type === 'application/csv' ||
      file.type === 'application/vnd.ms-excel' ||
      file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.name.toLowerCase().endsWith('.csv') ||
      file.name.toLowerCase().endsWith('.xls') ||
      file.name.toLowerCase().endsWith('.xlsx')
    )

    if (supportedFiles.length > 0) {
      console.log('Files dropped:', supportedFiles.map(f => ({ name: f.name, type: f.type, size: f.size })))
      try {
        const fileParts = await convertFilesToDataURLs(supportedFiles as any)
        console.log('Converted dropped files:', fileParts)
        onFilesChange?.([...files, ...fileParts])
      } catch (error) {
        console.error('Error converting dropped files:', error)
      }
    }
  }, [files, onFilesChange])

  const handleUrlSubmit = () => {
    if (urlInput.trim()) {
      // Validate if it's a valid URL
      try {
        new URL(urlInput.trim())
        const newFile = {
          type: 'file' as const,
          mediaType: 'image/*',
          url: urlInput.trim()
        }
        onFilesChange?.([...files, newFile])
        setUrlInput("")
        setShowUrlInput(false)
      } catch (error) {
        console.error('Invalid URL:', error)
        // You could add a toast notification here
      }
    }
  }

  return (
    <div 
      className={cn(
        "relative p-4 border-t bg-background/95 backdrop-blur-xs transition-colors",
        isDragOver && "bg-primary/10 border-primary/50"
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {isDragOver && (
        <div className="absolute inset-0 bg-primary/10 border-2 border-dashed border-primary/50 rounded-lg flex items-center justify-center z-10">
          <div className="text-center">
            <Upload className="h-8 w-8 mx-auto mb-2 text-primary" />
            <p className="text-sm font-medium text-primary">Drop files here</p>
            <p className="text-xs text-primary/70">Images, CSV, Excel</p>
          </div>
        </div>
      )}

      {/* URL input */}
      {showUrlInput && (
        <div className="mb-3 p-3 border border-border rounded-lg bg-background/50">
          <div className="flex items-center space-x-2">
            <Input
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="Paste image URL here..."
              className="grow"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleUrlSubmit()
                } else if (e.key === 'Escape') {
                  setShowUrlInput(false)
                  setUrlInput("")
                }
              }}
            />
            <Button
              type="button"
              size="sm"
              onClick={handleUrlSubmit}
              disabled={!urlInput.trim()}
            >
              Add
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                setShowUrlInput(false)
                setUrlInput("")
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* File previews */}
      {files.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {files.map((file, index) => (
            <div key={index} className="relative group">
              <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-border bg-muted/50 flex items-center justify-center">
                {file.mediaType.startsWith('image/') ? (
                  <img
                    src={file.url}
                    alt={`attachment-${index}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    {getFileIcon(file.mediaType)}
                    <span className="text-xs mt-1 truncate max-w-12">
                      {file.mediaType === 'text/csv' || file.mediaType === 'application/csv' ? 'CSV' :
                       file.mediaType.includes('excel') || file.mediaType.includes('spreadsheet') ? 'Excel' : 'File'}
                    </span>
                  </div>
                )}
              </div>
              <Button
                type="button"
                size="icon"
                variant="destructive"
                className="absolute -top-2 -right-2 h-5 w-5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => removeFile(index)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (input.trim() || files.length > 0) {
            onSend(e)
          }
        }}
        className="flex items-center space-x-2"
      >
        <Popover>
          <PopoverTrigger asChild>
            <Button type="button" variant="outline" size="icon" className="shrink-0" disabled={status === "streaming"}>
              <Plus className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-40 p-0">
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={handleFileUpload}
              disabled={status === "streaming"}
            >
              <Upload className="mr-2 h-4 w-4" />
              {t('chat.file')}
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => setShowUrlInput(true)}
              disabled={status === "streaming"}
            >
              <Link className="mr-2 h-4 w-4" />
              {t('chat.url')}
            </Button>
          </PopoverContent>
        </Popover>
        <Input
          value={input}
          onChange={handleInputChangeWithUrlDetection}
          placeholder={status === 'streaming' ? t('chat.aiThinking') : t('chat.writeMessage')}
          className="grow bg-background/50"
          disabled={status === "streaming"}
        />
        <Button type="submit" size="icon" className="shrink-0" disabled={status === "streaming" || (!input.trim() && files.length === 0)}>
          <Send className={cn("h-4 w-4", status === "streaming" && "animate-pulse")} />
        </Button>
        {status === "streaming" && (
          <Button type="button" size="icon" variant="outline" className="shrink-0" onClick={stop}>
            <StopCircle className="h-4 w-4" />
          </Button>
        )}
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept="image/*,.csv,.xls,.xlsx" 
          multiple
          onChange={handleFileChange}
        />
      </form>
    </div>
  )
}
