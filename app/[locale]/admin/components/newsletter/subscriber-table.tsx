"use client"

import { useEffect, useState, useRef } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Newsletter } from "@/prisma/generated/prisma/browser"
import { deleteSubscriber, getSubscribers, importSubscribers, sendTestNewsletter } from "@/app/[locale]/admin/actions/newsletter"
import { useNewsletter } from "./newsletter-context"
import { Brain, Loader2, Filter, Eye, X } from "lucide-react"
import { useI18n } from "@/locales/client"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"

interface Subscriber {
  email: string
  firstName: string
  lastName?: string
  isActive: boolean
}

export function SubscriberTable() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [sendingTest, setSendingTest] = useState<string | null>(null)
  const [inferringNames, setInferringNames] = useState(false)
  const [needsInference, setNeedsInference] = useState(0)
  const [showOnlyTraders, setShowOnlyTraders] = useState(false)
  const [lastInferenceResults, setLastInferenceResults] = useState<any>(null)
  const [showResults, setShowResults] = useState(false)
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set())
  const { content } = useNewsletter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const t = useI18n()

  const fetchSubscribers = async () => {
    try {
      const result = await getSubscribers()
      if ('error' in result) {
        throw new Error(result.error)
      }
      setSubscribers(result.subscribers.map(subscriber => ({
        email: subscriber.email,
        firstName: subscriber.firstName || '',
        lastName: subscriber.lastName || '',
        isActive: subscriber.isActive
      })))
    } catch (error) {
      toast.error("Failed to load subscribers")
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  // Check how many subscribers need name inference
  const checkInferenceNeeded = async () => {
    try {
      const response = await fetch('/api/email/format-name')
      const data = await response.json()
      if (data.success) {
        setNeedsInference(data.needsInference)
      }
    } catch (error) {
      console.error('Failed to check inference needed:', error)
    }
  }

  // Fetch subscribers on mount and after revalidation
  useEffect(() => {
    fetchSubscribers()
    checkInferenceNeeded()
  }, [])

  const handleCSVUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)

    try {
      const result = await importSubscribers(file)
      if ('error' in result) {
        throw new Error(result.error)
      }
      
      toast.success(`Successfully imported ${result.count} subscribers`)
      await fetchSubscribers() // Refresh the list
    } catch (error) {
      toast.error("Failed to import subscribers")
      console.error(error)
    } finally {
      setUploading(false)
      // Reset the file input
      event.target.value = ""
    }
  }

  const handleDelete = async (email: string) => {
    try {
      const result = await deleteSubscriber(email)
      if ('error' in result) {
        throw new Error(result.error)
      }
      
      toast.success("Subscriber deleted successfully")
      await fetchSubscribers() // Refresh the list
    } catch (error) {
      toast.error("Failed to delete subscriber")
      console.error(error)
    }
  }

  const handleSendTest = async (email: string, firstName: string) => {
    if (!content.subject || !content.youtubeId || !content.introMessage || content.features.some(f => !f)) {
      toast.error("Please fill in all newsletter fields before sending a test")
      return
    }

    setSendingTest(email)
    try {
      const result = await sendTestNewsletter(email, firstName, content)
      if ('error' in result) {
        throw new Error(result.error)
      }
      toast.success("Test email sent successfully")
    } catch (error) {
      toast.error("Failed to send test email")
      console.error(error)
    } finally {
      setSendingTest(null)
    }
  }

  const handleInferNames = async () => {
    setInferringNames(true)
    try {
      const response = await fetch('/api/email/format-name', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          batchSize: 10,
          forceUpdate: false,
          emails: Array.from(selectedEmails)
        })
      })

      const data = await response.json()
      
      if (data.success) {
        setLastInferenceResults(data)
        toast.success(t('newsletter.admin.nameInference.success', { 
          processed: data.processed, 
          updated: data.updated 
        }))
        await fetchSubscribers()
        await checkInferenceNeeded()
      } else {
        throw new Error(data.error || 'Failed to infer names')
      }
    } catch (error) {
      toast.error(t('newsletter.admin.nameInference.error'))
      console.error(error)
    } finally {
      setInferringNames(false)
    }
  }

  // selection helpers defined after filtered list

  // Filter subscribers based on the showOnlyTraders state
  // Match the same logic as the API: only firstName === "trader"
  const filteredSubscribers = showOnlyTraders 
    ? subscribers.filter(sub => sub.firstName === 'trader')
    : subscribers

  const allVisibleSelected = filteredSubscribers.every(s => selectedEmails.has(s.email)) && filteredSubscribers.length > 0
  const toggleSelectAllVisible = (checked: boolean) => {
    setSelectedEmails(prev => {
      const next = new Set(prev)
      if (checked) {
        filteredSubscribers.forEach(s => next.add(s.email))
      } else {
        filteredSubscribers.forEach(s => next.delete(s.email))
      }
      return next
    })
  }

  const toggleSelectOne = (email: string, checked: boolean) => {
    setSelectedEmails(prev => {
      const next = new Set(prev)
      if (checked) next.add(email)
      else next.delete(email)
      return next
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span>Subscribers</span>
            {loading ? (
              <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-gray-900" />
            ) : (
              <span className="text-sm text-gray-500">
                ({filteredSubscribers.length}{showOnlyTraders ? ` of ${subscribers.length}` : ''})
              </span>
            )}
          </div>
          <div className="flex items-center gap-4">
            <Button 
              variant="secondary"
              size="sm"
              disabled={inferringNames || selectedEmails.size === 0}
              onClick={handleInferNames}
              className="flex items-center gap-2"
            >
              {inferringNames ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('newsletter.admin.inferring')}
                </>
              ) : (
                <>
                  <Brain className="h-4 w-4" />
                  {t('newsletter.admin.inferNames')} ({selectedEmails.size})
                </>
              )}
            </Button>
            <Button 
              variant={showOnlyTraders ? "default" : "outline"}
              size="sm"
              onClick={() => setShowOnlyTraders(!showOnlyTraders)}
              className="flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              {showOnlyTraders ? t('newsletter.admin.filter.showAll') : t('newsletter.admin.filter.showTradersOnly')}
            </Button>
            {needsInference > 0 && (
              <Button 
                variant="secondary" 
                disabled={inferringNames}
                onClick={handleInferNames}
                className="flex items-center gap-2"
              >
                {inferringNames ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t('newsletter.admin.inferring')}
                  </>
                ) : (
                  <>
                    <Brain className="h-4 w-4" />
                    {t('newsletter.admin.inferNames')} ({needsInference})
                  </>
                )}
              </Button>
            )}
            {lastInferenceResults && (
              <Dialog open={showResults} onOpenChange={setShowResults}>
                <DialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Eye className="h-4 w-4" />
                    View Results
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Name Inference Results</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    {/* Summary */}
                    <div className="grid grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{lastInferenceResults.summary.totalProcessed}</div>
                        <div className="text-sm text-gray-600">Processed</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">{lastInferenceResults.summary.totalUpdated}</div>
                        <div className="text-sm text-gray-600">Updated</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-yellow-600">{lastInferenceResults.summary.totalSkipped}</div>
                        <div className="text-sm text-gray-600">Skipped</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-600">{lastInferenceResults.summary.totalErrors}</div>
                        <div className="text-sm text-gray-600">Errors</div>
                      </div>
                    </div>

                    {/* Detailed Results */}
                    <div className="space-y-2">
                      <h3 className="font-semibold">Detailed Results</h3>
                      <div className="max-h-96 overflow-y-auto border rounded-lg">
                        {lastInferenceResults.results.map((result: any, index: number) => (
                          <div key={index} className="p-3 border-b last:border-b-0">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="font-medium">{result.email}</div>
                                {result.status === 'updated' && (
                                  <div className="text-sm text-gray-600">
                                    {result.oldName} → {result.newName}
                                  </div>
                                )}
                                {result.status === 'skipped' && (
                                  <div className="text-sm text-gray-600">
                                    Inferred: {result.inferredName} (Confidence: {result.confidence})
                                  </div>
                                )}
                                {result.status === 'error' && (
                                  <div className="text-sm text-red-600">
                                    Error: {result.error}
                                  </div>
                                )}
                              </div>
                              <Badge 
                                variant={
                                  result.status === 'updated' ? 'default' :
                                  result.status === 'skipped' ? 'secondary' :
                                  'destructive'
                                }
                              >
                                {result.status}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleCSVUpload}
              disabled={uploading}
            />
            <Button 
              variant="outline" 
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? "Importing..." : "Import CSV"}
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
          </div>
        ) : filteredSubscribers.length === 0 ? (
          <div className="text-center py-6 text-gray-500">
            {showOnlyTraders 
              ? t('newsletter.admin.filter.noTradersFound')
              : "No subscribers found. Import some using CSV or add them manually."
            }
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8">
                    <Checkbox
                      checked={allVisibleSelected}
                      onCheckedChange={(checked) => toggleSelectAllVisible(Boolean(checked))}
                      aria-label="Select all"
                    />
                  </TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSubscribers.map((subscriber) => (
                  <TableRow key={subscriber.email}>
                    <TableCell className="w-8">
                      <Checkbox
                        checked={selectedEmails.has(subscriber.email)}
                        onCheckedChange={(checked) => toggleSelectOne(subscriber.email, Boolean(checked))}
                        aria-label={`Select ${subscriber.email}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{subscriber.email}</TableCell>
                    <TableCell>
                      {subscriber.firstName && subscriber.firstName !== 'trader' ? (
                        <span className="text-sm">
                          {subscriber.firstName} {subscriber.lastName || ''}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400 italic">{t('newsletter.admin.noName')}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        subscriber.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                      }`}>
                        {subscriber.isActive ? "Active" : "Inactive"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSendTest(subscriber.email, subscriber.firstName)}
                        disabled={sendingTest === subscriber.email}
                        title={!content.subject ? "Fill in newsletter content first" : "Send test email"}
                      >
                        {sendingTest === subscriber.email ? (
                          <>
                            <div className="h-4 w-4 mr-2 animate-spin rounded-full border-b-2 border-current" />
                            Sending...
                          </>
                        ) : (
                          "Send Test"
                        )}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(subscriber.email)}
                      >
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 