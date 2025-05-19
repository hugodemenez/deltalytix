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
import { Newsletter } from "@prisma/client"
import { deleteSubscriber, getSubscribers, importSubscribers, sendTestNewsletter } from "@/app/[locale]/admin/actions/newsletter"
import { useNewsletter } from "./newsletter-context"

interface Subscriber {
  email: string
  firstName: string
  isActive: boolean
}

export function SubscriberTable() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [sendingTest, setSendingTest] = useState<string | null>(null)
  const { content } = useNewsletter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchSubscribers = async () => {
    try {
      const result = await getSubscribers()
      if ('error' in result) {
        throw new Error(result.error)
      }
      setSubscribers(result.subscribers.map(subscriber => ({
        email: subscriber.email,
        firstName: subscriber.firstName || '',
        isActive: subscriber.isActive
      })))
    } catch (error) {
      toast.error("Failed to load subscribers")
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  // Fetch subscribers on mount and after revalidation
  useEffect(() => {
    fetchSubscribers()
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span>Subscribers</span>
            {loading ? (
              <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-gray-900" />
            ) : (
              <span className="text-sm text-gray-500">({subscribers.length})</span>
            )}
          </div>
          <div className="flex items-center gap-4">
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
        ) : subscribers.length === 0 ? (
          <div className="text-center py-6 text-gray-500">
            No subscribers found. Import some using CSV or add them manually.
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscribers.map((subscriber) => (
                  <TableRow key={subscriber.email}>
                    <TableCell className="font-medium">{subscriber.email}</TableCell>
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