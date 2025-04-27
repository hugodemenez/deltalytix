import { NextResponse } from 'next/server'
import { perplexity } from '@ai-sdk/perplexity'
import { generateText } from 'ai'
import { startOfWeek, endOfWeek, format } from 'date-fns'
import { syncFinancialEvents } from '@/server/financial-events'
import { z } from 'zod'

const eventSchema = z.object({
  title: z.string(),
  date: z.string(),
  importance: z.enum(['HIGH', 'MEDIUM', 'LOW']),
  type: z.enum(['ECONOMIC', 'EARNINGS', 'TECHNICAL']),
  description: z.string(),
  sourceUrl: z.string().optional(),
})

const eventsSchema = z.array(eventSchema)

type FinancialEvent = z.infer<typeof eventSchema>

export async function POST(req: Request) {
  try {
    const { messages } = await req.json()
    
    // Get current week's date range
    const now = new Date()
    const weekStart = startOfWeek(now)
    const weekEnd = endOfWeek(now)
    
    // Create system message with date context
    const systemMessage = {
      role: 'system',
      content: `You are a financial news analyst. Analyze the following news and extract key financial events for the week of ${format(weekStart, 'MMM d')} to ${format(weekEnd, 'MMM d')}. 
      For each event, provide:
      1. Title
      2. Date (within the specified week)
      3. Importance (HIGH, MEDIUM, or LOW)
      4. Type (ECONOMIC, EARNINGS, or TECHNICAL)
      5. Description
      6. Source URL (if available)
      
      Format the response as a JSON array of events.`
    }

    const result = await generateText({
      model: perplexity('sonar-pro'),
      messages: [systemMessage, ...messages],
      providerOptions: {
        perplexity: {
          return_citations: true,
          search_recency_filter: 'week',
        },
      },
    })

    let events: FinancialEvent[] = []
    try {
      const parsed = JSON.parse(result.text)
      events = eventsSchema.parse(parsed)
    } catch (error) {
      console.error('Error parsing events:', error)
      return NextResponse.json(
        { error: 'Failed to parse events from response' },
        { status: 500 }
      )
    }

    if (events.length > 0) {
      await syncFinancialEvents(now)
    }

    return NextResponse.json({ 
      success: true, 
      events,
      metadata: {
        usage: result.usage,
        response: result.response,
      }
    })
  } catch (error) {
    console.error('Error in news route:', error)
    return NextResponse.json(
      { error: 'Failed to process news request' },
      { status: 500 }
    )
  }
}
