"use client"

import { useEffect, useState, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ZoomIn, ZoomOut, Smartphone, Monitor } from "lucide-react"
import { useWeeklyRecap } from "./weekly-recap-context"
import { useDebounce } from "@/hooks/use-debounce"
import { generateAnalysis, renderEmail, WeeklyRecapContent, listUsers } from "../../actions/weekly-recap"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { EmailPreviewLoading } from "./email-preview-loading"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { toast } from "sonner"
import React from "react"

interface User {
  id: string
  email: string
  created_at: string
}

export function WeeklyRecapPreview() {
  const { content, setContent, isLoading: isContextLoading, selectedUserId, setSelectedUserId, selectedEmail, setSelectedEmail } = useWeeklyRecap()
  const [emailHtml, setEmailHtml] = useState("")
  const [zoom, setZoom] = useState(1)
  const [error, setError] = useState<string | null>(null)
  const [loadingState, setLoadingState] = useState<"idle" | "analyzing" | "rendering" | "complete">("idle")
  const [users, setUsers] = useState<User[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const [viewMode, setViewMode] = useState<"desktop" | "mobile">("desktop")
  const inputRef = useRef<HTMLInputElement>(null)

  // Load users on component mount
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const userList = await listUsers()
        setUsers(userList)
        if (userList.length > 0 && !selectedUserId) {
          setSelectedUserId(userList[0].id)
          setSelectedEmail(userList[0].email)
        }
      } catch (err) {
        console.error("Error loading users:", err)
        toast.error("Error", {
          description: "Failed to load users",
        })
      }
    }
    loadUsers()
  }, [selectedUserId, setSelectedUserId, setSelectedEmail])

  const filteredUsers = React.useMemo(() => {
    if (!searchQuery) return users
    return users.filter(user => 
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [users, searchQuery])

  // Debounce the content updates
  const debouncedContent = useDebounce(content, 500)

  useEffect(() => {
    const updatePreview = async () => {
      if (isContextLoading) return
      if (debouncedContent.dailyPnL.length === 0) {
        setError("No trading data available to preview")
        return
      }

      try {
        setError(null)
        setLoadingState("analyzing")

        // First generate the analysis
        const analysisResult = await generateAnalysis(debouncedContent)
        if (!analysisResult.success || !analysisResult.analysis) {
          throw new Error(analysisResult.error || "Failed to generate analysis")
        }

        setLoadingState("rendering")

        // Then render the email with the analysis
        const renderResult = await renderEmail(debouncedContent, analysisResult.analysis)
        if (renderResult.success && renderResult.html) {
          setEmailHtml(renderResult.html)
          setLoadingState("complete")
        } else {
          throw new Error(renderResult.error || "Failed to render email")
        }
      } catch (err) {
        console.error("Error generating preview:", err)
        setError(err instanceof Error ? err.message : "An error occurred while generating the preview")
        setLoadingState("idle")
      }
    }

    updatePreview()
  }, [debouncedContent, isContextLoading])

  useEffect(() => {
    if (isOpen && inputRef.current) {
      // Small delay to ensure popover is mounted and all re-renders are complete
      setTimeout(() => {
        inputRef.current?.select()
      }, 50)
    }
  }, [isOpen])

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
                onClick={() => setViewMode(viewMode === "desktop" ? "mobile" : "desktop")}
                title={`Switch to ${viewMode === "desktop" ? "mobile" : "desktop"} view`}
              >
                {viewMode === "desktop" ? <Smartphone className="h-4 w-4" /> : <Monitor className="h-4 w-4" />}
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setZoom((prev: number) => Math.max(0.5, prev - 0.1))}
                disabled={zoom <= 0.5}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">{Math.round(zoom * 100)}%</span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setZoom((prev: number) => Math.min(2, prev + 0.1))}
                disabled={zoom >= 2}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 p-0">
          <div className="grid grid-cols-1 md:grid-cols-2 h-full">
            {/* Edit Form - Always visible */}
            <div className="p-6 space-y-6 overflow-y-auto">
              <div className="space-y-2">
                <Label>Select User</Label>
                <div className="relative">
                  <Command 
                    className="w-full" 
                    shouldFilter={false}
                    onFocus={() => setIsOpen(true)}
                    onBlur={() => {
                      // Small delay to allow click events to fire
                      setTimeout(() => setIsOpen(false), 200)
                    }}
                  >
                    <CommandInput 
                      ref={inputRef}
                      placeholder="Search users..." 
                      value={searchQuery}
                      onValueChange={setSearchQuery}
                      onFocus={() => {
                        setIsOpen(true)
                        // Immediate selection attempt
                        setTimeout(() => {
                          inputRef.current?.select()
                        }, 0)
                      }}
                    />
                    {isOpen && (
                      <CommandList className="absolute top-full left-0 right-0 z-50 mt-1 max-h-[300px] overflow-auto rounded-md border bg-popover shadow-md">
                        <CommandEmpty>No users found.</CommandEmpty>
                        <CommandGroup>
                          {filteredUsers.map((user) => (
                            <CommandItem
                              key={user.id}
                              value={user.email}
                              onSelect={() => {
                                setSelectedUserId(user.id)
                                setSelectedEmail(user.email)
                                setSearchQuery(user.email)
                                setIsOpen(false)
                              }}
                              className="cursor-pointer"
                            >
                              {user.email}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    )}
                  </Command>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Trader Name</Label>
                <Input
                  value={content.firstName}
                  onChange={(e) => setContent((prev: WeeklyRecapContent) => ({ ...prev, firstName: e.target.value }))}
                  placeholder="Trader's name"
                />
              </div>
              <div className="space-y-2">
                <Label>Performance Stats</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm">Wins</Label>
                    <Input
                      type="number"
                      value={content.winLossStats.wins}
                      onChange={(e) =>
                        setContent((prev: WeeklyRecapContent) => ({
                          ...prev,
                          winLossStats: {
                            ...prev.winLossStats,
                            wins: Number.parseInt(e.target.value) || 0,
                          },
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Label className="text-sm">Losses</Label>
                    <Input
                      type="number"
                      value={content.winLossStats.losses}
                      onChange={(e) =>
                        setContent((prev: WeeklyRecapContent) => ({
                          ...prev,
                          winLossStats: {
                            ...prev.winLossStats,
                            losses: Number.parseInt(e.target.value) || 0,
                          },
                        }))
                      }
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Daily PnL</Label>
                <div className="grid grid-cols-2 gap-4">
                  {content.dailyPnL.map((day, index) => (
                    <div key={index} className="space-y-1">
                      <Label className="text-sm">Day {index + 1}</Label>
                      <div className="flex gap-2">
                        <Input
                          value={day.date.toLocaleDateString('fr-FR', {
                            day: '2-digit',
                            month: '2-digit'
                          })}
                          onChange={(e) =>
                            setContent((prev: WeeklyRecapContent) => ({
                              ...prev,
                              dailyPnL: prev.dailyPnL.map((d, i) => 
                                i === index ? { ...d, date: new Date(e.target.value) } : d
                              ),
                            }))
                          }
                          placeholder="Date"
                          className="w-1/2"
                        />
                        <Input
                          type="number"
                          value={day.pnl}
                          onChange={(e) =>
                            setContent((prev: WeeklyRecapContent) => ({
                              ...prev,
                              dailyPnL: prev.dailyPnL.map((d, i) =>
                                i === index ? { ...d, pnl: Number.parseFloat(e.target.value) || 0 } : d
                              ),
                            }))
                          }
                          placeholder="PnL"
                          className="w-1/2"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Preview - Shows loading animation, error, or iframe */}
            <div className="relative bg-gray-50 overflow-hidden">
              {loadingState !== "complete" ? (
                <EmailPreviewLoading stage={loadingState === "analyzing" ? "analyzing" : "generating"} />
              ) : error ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center p-6">
                    <div className="text-red-500 mb-2">{error}</div>
                    <p className="text-sm text-muted-foreground">
                      Please check your trading data and try again.
                    </p>
                  </div>
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
                          margin: 0;
                          padding: 0;
                        }
                        @media (max-width: 600px) {
                          body {
                            width: 100%;
                            max-width: 100%;
                          }
                        }
                      </style>
                      <div class="${viewMode === "mobile" ? "mobile-preview" : ""}">
                        ${emailHtml}
                      </div>
                    `}
                    className={`w-full h-full border-0 ${viewMode === "mobile" ? "max-w-[375px] mx-auto" : ""}`}
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
