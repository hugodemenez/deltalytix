"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, ZoomIn, ZoomOut } from "lucide-react"
import { useWelcomeEmail } from "./welcome-email-context"
import { useDebounce } from "@/hooks/use-debounce"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { renderWelcomeEmailPreview } from "../../actions/welcome"

export function WelcomeEmailPreview() {
  const { firstName, email, language, setFirstName, setEmail, setLanguage } = useWelcomeEmail()
  const [emailHtml, setEmailHtml] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [zoom, setZoom] = useState(1)
  
  // Debounce the content updates
  const debouncedContent = useDebounce({ firstName, email, language }, 500)

  useEffect(() => {
    const updatePreview = async () => {
      setIsLoading(true)
      try {
        const result = await renderWelcomeEmailPreview({
          firstName: debouncedContent.firstName,
          email: debouncedContent.email,
          language: debouncedContent.language
        })
        
        if (result.success && result.html) {
          setEmailHtml(result.html)
        }
      } catch (error) {
        console.error('Error rendering email preview:', error)
      } finally {
        setIsLoading(false)
      }
    }

    updatePreview()
  }, [debouncedContent.firstName, debouncedContent.email, debouncedContent.language])

  return (
    <div className="h-screen flex flex-col">
      <Card className="flex-1 flex flex-col">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Email Preview</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setZoom(prev => Math.max(0.5, prev - 0.1))}
                disabled={zoom <= 0.5}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">{Math.round(zoom * 100)}%</span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setZoom(prev => Math.min(2, prev + 0.1))}
                disabled={zoom >= 2}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 p-0">
          <div className="grid grid-cols-1 md:grid-cols-2 h-full">
            {/* Edit Form */}
            <div className="p-6 space-y-6 overflow-y-auto">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Enter first name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="language">Language</Label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="fr">Français</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Preview */}
            <div className="relative bg-gray-50 overflow-hidden">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="absolute inset-0">
                  <iframe
                    srcDoc={`
                      <style>
                        body {
                          transform: scale(${zoom});
                          transform-origin: top left;
                          width: ${100 / zoom}%;
                          height: ${100 / zoom}%;
                        }
                      </style>
                      ${emailHtml}
                    `}
                    className="w-full h-full border-0"
                    title="Email preview"
                    sandbox="allow-same-origin"
                  />
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}