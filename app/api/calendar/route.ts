import { NextResponse } from 'next/server'
import Parser from 'rss-parser'
import { parseISO, format, isValid } from 'date-fns'
import { prisma } from '@/lib/prisma'

const parser = new Parser()

function mapImpactToImportance(impact: string): 'HIGH' | 'MEDIUM' | 'LOW' {
  switch (impact.toLowerCase()) {
    case 'high':
      return 'HIGH'
    case 'medium':
      return 'MEDIUM'
    case 'low':
    case 'no-impact':
    default:
      return 'LOW'
  }
}

function parseEventDate(dateStr: string | undefined): Date {
  if (!dateStr) return new Date()
  
  console.log('Parsing date string:', dateStr)
  
  // Try parsing the date string with GMT format (e.g., "Tue, 6 May 2025 10:00 GMT")
  const gmtMatch = dateStr.match(/(\d{1,2}\s+[A-Za-z]+\s+\d{4}\s+\d{2}:\d{2})\s+GMT/)
  if (gmtMatch) {
    const dateWithoutGMT = gmtMatch[1]
    console.log('Extracted date without GMT:', dateWithoutGMT)
    
    // Parse the date string into a Date object
    const [day, month, year, time] = dateWithoutGMT.split(' ')
    const [hours, minutes] = time.split(':')
    const date = new Date(Date.UTC(
      parseInt(year),
      new Date(`${month} 1`).getMonth(),
      parseInt(day),
      parseInt(hours),
      parseInt(minutes)
    ))
    
    console.log('Parsed date:', date.toISOString())
    return date
  }
  
  // Try parsing the date string with ISO format
  const parsedDate = parseISO(dateStr)
  if (isValid(parsedDate)) {
    console.log('Parsed ISO date:', parsedDate.toISOString())
    return parsedDate
  }
  
  console.log('Failed to parse date, returning current date')
  return new Date()
}

async function fetchCalendarEvents() {
  try {
    const feed = await parser.parseURL('https://www.myfxbook.com/rss/forex-economic-calendar-events')
    
    return feed.items.map(item => {
      console.log('Processing item:', item.title)
      console.log('pubDate:', item.pubDate)
      
      // Parse the pubDate from the RSS feed
      const date = parseEventDate(item.pubDate)
      console.log('Parsed date for item:', date.toISOString())
      
      const description = item.content || item.contentSnippet || ''
      
      // Extract impact from the description table
      const impactMatch = description.match(/sprite-(\w+)-impact/i)
      let impact = impactMatch ? impactMatch[1] : 'no-impact'
      
      // Extract previous, consensus, and actual values if available
      const tableMatch = description.match(/<table[^>]*>([\s\S]*?)<\/table>/i)
      let tableData = ''
      if (tableMatch) {
        tableData = tableMatch[1]
        // Try to find impact in the table if not found in the main description
        if (impact === 'no-impact') {
          const tableImpactMatch = tableData.match(/sprite-(\w+)-impact/i)
          if (tableImpactMatch) {
            impact = tableImpactMatch[1]
          }
        }
      }
      
      return {
        title: item.title || 'Untitled Event',
        date,
        importance: mapImpactToImportance(impact),
        type: 'ECONOMIC', // Default to ECONOMIC as these are calendar events
        sourceUrl: item.link,
      }
    })
  } catch (error) {
    console.error('Error fetching calendar events:', error)
    return []
  }
}

export async function GET() {
  try {
    const events = await fetchCalendarEvents()
    
    if (events.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No events found in the RSS feed',
      }, { status: 404 })
    }
    
    // Filter out LOW impact events
    const filteredEvents = events.filter(event => event.importance !== 'LOW')
    
    // Store events in database
    const storedEvents = await Promise.all(
      filteredEvents.map(async (event) => {
        try {
          // Check if event already exists
          const existingEvent = await prisma.financialEvent.findFirst({
            where: {
              title: event.title,
              date: event.date,
            },
          })

          if (existingEvent) {
            // Update existing event
            return prisma.financialEvent.update({
              where: { id: existingEvent.id },
              data: {
                importance: event.importance,
                updatedAt: new Date(),
              },
            })
          }

          // Create new event
          return prisma.financialEvent.create({
            data: {
              title: event.title,
              date: event.date,
              importance: event.importance,
              type: event.type,
              sourceUrl: event.sourceUrl,
            },
          })
        } catch (error) {
          console.error(`Error processing event ${event.title}:`, error)
          return null
        }
      })
    )

    // Filter out any failed event processing
    const successfulEvents = storedEvents.filter(event => event !== null)

    return NextResponse.json({
      success: true,
      events: successfulEvents,
      count: successfulEvents.length,
      totalProcessed: events.length,
    })
  } catch (error) {
    console.error('Error in calendar route:', error)
    return NextResponse.json(
      { error: 'Failed to process calendar events', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
} 