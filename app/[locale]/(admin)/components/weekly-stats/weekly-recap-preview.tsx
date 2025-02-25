"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Eye, Pencil } from "lucide-react"
import { useWeeklyRecap } from "./weekly-recap-context"
import { useDebounce } from "@/hooks/use-debounce"
import { renderEmailPreview } from "../../server/weekly-recap"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function WeeklyRecapPreview() {
  const { content, setContent } = useWeeklyRecap()
  const [emailHtml, setEmailHtml] = useState("")
  const [isEditing, setIsEditing] = useState(false)
  
  // Debounce the content updates
  const debouncedContent = useDebounce(content, 500)

  useEffect(() => {
    const updatePreview = async () => {
      const result = await renderEmailPreview(debouncedContent)
      if (result.success && result.html) {
        setEmailHtml(result.html)
      }
    }

    updatePreview()
  }, [debouncedContent])

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Email Preview</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditing(!isEditing)}
          >
            {isEditing ? (
              <>
                <Eye className="w-4 h-4 mr-2" />
                View Preview
              </>
            ) : (
              <>
                <Pencil className="w-4 h-4 mr-2" />
                Edit Content
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>Trader Name</Label>
              <Input
                value={content.firstName}
                onChange={(e) =>
                  setContent((prev) => ({ ...prev, firstName: e.target.value }))
                }
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
                      setContent((prev) => ({
                        ...prev,
                        winLossStats: {
                          ...prev.winLossStats,
                          wins: parseInt(e.target.value) || 0,
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
                      setContent((prev) => ({
                        ...prev,
                        winLossStats: {
                          ...prev.winLossStats,
                          losses: parseInt(e.target.value) || 0,
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
                        value={day.date}
                        onChange={(e) =>
                          setContent((prev) => ({
                            ...prev,
                            dailyPnL: prev.dailyPnL.map((d, i) =>
                              i === index ? { ...d, date: e.target.value } : d
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
                          setContent((prev) => ({
                            ...prev,
                            dailyPnL: prev.dailyPnL.map((d, i) =>
                              i === index
                                ? { ...d, pnl: parseFloat(e.target.value) || 0 }
                                : d
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
        ) : (
          <div className="relative bg-gray-50 rounded-md overflow-hidden h-[calc(100vh-15rem)]">
            <div className="absolute inset-0 overflow-auto">
              <iframe
                srcDoc={emailHtml}
                className="w-full h-full border-0"
                title="Email preview"
                sandbox="allow-same-origin"
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 