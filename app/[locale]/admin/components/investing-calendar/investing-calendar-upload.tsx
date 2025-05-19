'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Loader2 } from 'lucide-react'

interface ProcessedEvent {
  title: string
  date: Date
  importance: 'HIGH' | 'MEDIUM' | 'LOW'
  type: string
  sourceUrl: string
  country: string
  lang: 'fr' | 'en'
  timezone: string
}

export function InvestingCalendarUpload() {
  const [html, setHtml] = useState('')
  const [lang, setLang] = useState<'fr' | 'en'>('fr')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<{
    count: number
    events: ProcessedEvent[]
  } | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch('/api/investing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ html, lang }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process calendar')
      }

      setSuccess(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>Investing.com Calendar Upload</CardTitle>
        <CardDescription>
          Paste the HTML content from Investing.com calendar page to process and store the events.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="lang" className="text-sm font-medium">
              Language
            </label>
            <Select value={lang} onValueChange={(value: 'fr' | 'en') => setLang(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fr">French</SelectItem>
                <SelectItem value="en">English</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label htmlFor="html" className="text-sm font-medium">
              HTML Content
            </label>
            <Textarea
              id="html"
              value={html}
              onChange={(e) => setHtml(e.target.value)}
              placeholder="Paste the HTML content from Investing.com calendar page here..."
              className="min-h-[200px] font-mono text-sm"
            />
          </div>

          <Button type="submit" disabled={isLoading || !html.trim()}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              'Process Calendar'
            )}
          </Button>
        </form>

        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mt-4">
            <AlertTitle>Success!</AlertTitle>
            <AlertDescription>
              Successfully processed {success.count} events.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
} 