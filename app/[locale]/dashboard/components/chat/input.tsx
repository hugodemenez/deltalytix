import { useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Plus, Camera, Folder, Send, StopCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { useI18n } from "@/locales/client"

// Input Component
export function ChatInput({
  onSend,
  status,
  input,
  handleInputChange,
  stop,
}: {
  onSend: (e?: { preventDefault?: () => void }) => void
  status: "streaming" | "submitted" | "ready" | "error"
  input: string
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  stop: () => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const t = useI18n();

  const handleFileUpload = (type: "camera" | "folder") => {
    if (fileInputRef.current) {
      fileInputRef.current.accept = type === "camera" ? "image/*;capture=camera" : "image/*"
      fileInputRef.current.click()
    }
  }

  return (
    <div className="p-4 border-t bg-background/95 backdrop-blur-sm">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (input.trim()) {
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
              onClick={() => handleFileUpload("camera")}
              disabled={status === "streaming"}
            >
              <Camera className="mr-2 h-4 w-4" />
              {t('chat.camera')}
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => handleFileUpload("folder")}
              disabled={status === "streaming"}
            >
              <Folder className="mr-2 h-4 w-4" />
              {t('chat.folder')}
            </Button>
          </PopoverContent>
        </Popover>
        <Input
          value={input}
          onChange={handleInputChange}
          placeholder={status === 'streaming' ? t('chat.aiThinking') : t('chat.writeMessage')}
          className="flex-grow bg-background/50"
          disabled={status === "streaming"}
        />
        <Button type="submit" size="icon" className="shrink-0" disabled={status === "streaming" || !input.trim()}>
          <Send className={cn("h-4 w-4", status === "streaming" && "animate-pulse")} />
        </Button>
        {status === "streaming" && (
          <Button type="button" size="icon" variant="outline" className="shrink-0" onClick={stop}>
            <StopCircle className="h-4 w-4" />
          </Button>
        )}
        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" />
      </form>
    </div>
  )
}
