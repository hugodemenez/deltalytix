import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { parseISO, isValid } from 'date-fns'
import { chromium } from 'playwright-core'
import sparticuzChromium from '@sparticuz/chromium-min'

interface InvestingEvent {
  time: string
  currency: string
  impact: string
  event: string
  timestamp: string | null
  country: string
  eventId: string | null
  sourceUrl: string
  lang: 'fr' | 'en'
  timezone: string
  title?: string
  date?: Date
  importance?: 'HIGH' | 'MEDIUM' | 'LOW'
  type?: string
}

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

function mapImpactToImportance(impact: string): 'HIGH' | 'MEDIUM' | 'LOW' {
  // Count the number of filled bull icons
  const filledBulls = (impact.match(/grayFullBullishIcon/g) || []).length
  switch (filledBulls) {
    case 3:
      return 'HIGH'
    case 2:
      return 'MEDIUM'
    case 1:
    default:
      return 'LOW'
  }
}

async function fetchInvestingCalendarEvents(lang: 'fr' | 'en' = 'fr') {
  let browser = null;
  try {
    // Map language to Investing.com language code
    const langMap = {
      fr: '5',  // French
      en: '1'   // English
    }

    const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
    
    if (isProduction) {
      console.log('Launching Playwright with @sparticuz/chromium-min for production...');
      browser = await chromium.launch({
        args: sparticuzChromium.args,
        executablePath: await sparticuzChromium.executablePath(),
        headless: true,
      });
    } else {
      console.log('Launching Playwright with local Chromium for development...');
      browser = await chromium.launch({
        headless: true 
      });
    }

    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      // Consider reducing resource usage for serverless:
      // javaScriptEnabled: false, // If the site works without JS after initial challenge
      // viewport: null, // Disables viewport emulation if not strictly needed
    });
    const page = await context.newPage();

    // Navigate to the page
    const targetUrl = `https://sslecal2.investing.com/?timeZone=55&lang=${langMap[lang]}`;
    console.log(`Navigating to ${targetUrl} with Playwright...`);
    
    const response = await page.goto(targetUrl, {
      waitUntil: 'domcontentloaded', // Or 'networkidle' for more sensitive cases
      timeout: 60000 // Increase timeout as page loading + JS challenges can take time
    });

    if (!response || !response.ok()) {
      console.error('Playwright navigation response:', {
        status: response?.status(),
        statusText: response?.statusText(),
        headers: response?.headers()
      });
      throw new Error(`Playwright navigation failed! status: ${response?.status()} - ${response?.statusText()}`);
    }

    console.log('Page loaded successfully. Getting HTML content...');
    const html = await page.content();
    console.log('HTML length:', html.length);
    
    // Parse the HTML table
    const events: InvestingEvent[] = []
    const tableRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/g
    
    let tableMatch
    let currentEvent: Partial<InvestingEvent> | null = null
    let currentDate: Date | null = null
    let rowCount = 0
    let dateRowCount = 0
    let eventRowCount = 0
    let eventInfoRowCount = 0
    
    while ((tableMatch = tableRegex.exec(html)) !== null) {
      rowCount++
      const fullRow = tableMatch[0] // Get the full tr element including attributes
      const row = tableMatch[1] // Get the content inside tr
      
      // Check if this is a date row
      if (row.includes('theDay')) {
        dateRowCount++
        const dateMatch = row.match(/<td[^>]*class="theDay"[^>]*>([^<]+)<\/td>/)
        if (dateMatch) {
          const dateStr = dateMatch[1].trim()
          // Parse French date format (e.g., "Mercredi 7 mai 2025")
          const [day, date, month, year] = dateStr.split(' ')
          const monthMap: { [key: string]: string } = {
            'janvier': '01', 'février': '02', 'mars': '03', 'avril': '04',
            'mai': '05', 'juin': '06', 'juillet': '07', 'août': '08',
            'septembre': '09', 'octobre': '10', 'novembre': '11', 'décembre': '12'
          }
          try {
            // Create date in UTC
            currentDate = new Date(Date.UTC(
              parseInt(year),
              parseInt(monthMap[month.toLowerCase()]) - 1,
              parseInt(date)
            ))
            
            // Validate the date
            if (!isValid(currentDate)) {
              console.log('Invalid current date created:', { dateStr, currentDate })
              currentDate = null
            }
          } catch (error) {
            console.error('Error parsing current date:', error)
            currentDate = null
          }
        }
        continue
      }
      
      // Check if this is an event info row
      if (row.includes('eventInfo')) {
        eventInfoRowCount++
        // If we have a current event, try to get its source URL
        if (currentEvent) {
          // Look for the source URL in the event info row
          const sourceUrlMatch = row.match(/<a[^>]*href="([^"]+)"[^>]*>/)
          if (sourceUrlMatch) {
            currentEvent.sourceUrl = sourceUrlMatch[1]
          }
          events.push(currentEvent as InvestingEvent)
          currentEvent = null
        }
        continue
      }
      
      // Skip non-event rows
      if (!fullRow.includes('eventRowId_')) {
        continue
      }
      
      // If we have a current event but found a new event row,
      // it means the previous event didn't have an info row
      if (currentEvent) {
        events.push(currentEvent as InvestingEvent)
        currentEvent = null
      }
      
      eventRowCount++
      
      // Extract event ID and timestamp from tr attributes
      const eventIdMatch = fullRow.match(/event_attr_id="(\d+)"/)
      const timestampMatch = fullRow.match(/event_timestamp="([^"]+)"/)
      const eventTimestamp = timestampMatch ? timestampMatch[1] : null
      const eventId = eventIdMatch ? eventIdMatch[1] : null
      
      // Extract time
      const timeMatch = row.match(/<td[^>]*class="[^"]*time[^"]*"[^>]*>([^<]+)<\/td>/)
      if (!timeMatch) continue
      
      const time = timeMatch[1].trim()
      
      // Handle "All day" events
      if (time === 'Toute la journée' || time === 'All Day') {
        if (!currentDate) continue
        
        // Extract country and event name for all-day events
        const countryMatch = row.match(/<span[^>]*title="([^"]+)"[^>]*class="[^"]*ceFlags[^"]*"[^>]*>/)
        const eventMatch = row.match(/<td[^>]*class="[^"]*event[^"]*"[^>]*>([^<]+)<\/td>/)
        
        if (countryMatch && eventMatch) {
          currentEvent = {
            time: time,
            currency: '',
            impact: '',
            event: eventMatch[1].trim(),
            timestamp: currentDate.toISOString(),
            country: countryMatch[1],
            eventId: eventId,
            sourceUrl: '',
            lang: lang,
            timezone: 'UTC'
          }
        }
        continue
      }
      
      // Handle regular events
      if (!eventTimestamp) {
        console.log('Skipping regular event - missing timestamp:', { eventTimestamp })
        continue
      }
      
      // Extract country and currency
      const flagMatch = row.match(/<span[^>]*title="([^"]+)"[^>]*class="[^"]*ceFlags[^"]*"[^>]*>.*?<\/span>\s*([A-Z]{3})/)
      if (!flagMatch) {
        console.log('Skipping regular event - no flag/currency match:', row)
        continue
      }
      
      const country = flagMatch[1]
      const currency = flagMatch[2]
      
      // Extract impact/sentiment
      const impactMatch = row.match(/<td[^>]*class="[^"]*sentiment[^"]*"[^>]*>([\s\S]*?)<\/td>/)
      if (!impactMatch) {
        console.log('Skipping regular event - no impact match:', row)
        continue
      }
      
      const impact = impactMatch[1]
      
      // Extract event name
      const eventMatch = row.match(/<td[^>]*class="[^"]*event[^"]*"[^>]*>([\s\S]*?)<\/td>/)
      if (!eventMatch) {
        console.log('Skipping regular event - no event name match:', row)
        continue
      }
      
      // Clean the event name by removing HTML elements and extra whitespace
      const eventName = eventMatch[1]
        .replace(/<[^>]*>/g, '') // Remove all HTML tags
        .replace(/&nbsp;/g, ' ') // Replace &nbsp; with space
        .replace(/&amp;/g, '&')  // Replace &amp; with &
        .replace(/&lt;/g, '<')   // Replace &lt; with <
        .replace(/&gt;/g, '>')   // Replace &gt; with >
        .replace(/&quot;/g, '"') // Replace &quot; with "
        .replace(/&#39;/g, "'")  // Replace &#39; with '
        .replace(/\s+/g, ' ')    // Replace multiple spaces with single space
        .trim()                  // Remove leading/trailing whitespace

      if (!eventName) {
        console.log('Skipping regular event - empty event name after cleaning:', eventMatch[1])
        continue
      }

      console.log('Creating regular event:', {
        time,
        currency,
        event: eventName,
        timestamp: eventTimestamp,
        country
      })
      
      // Parse the timestamp into UTC
      try {
        const [datePart, timePart] = eventTimestamp.split(' ')
        if (!datePart || !timePart) {
          console.log('Invalid timestamp format:', eventTimestamp)
          continue
        }

        const [year, month, day] = datePart.split('-').map(Number)
        const [hours, minutes] = timePart.split(':').map(Number)

        if (isNaN(year) || isNaN(month) || isNaN(day) || isNaN(hours) || isNaN(minutes)) {
          console.log('Invalid date/time components:', { year, month, day, hours, minutes })
          continue
        }

        // Create UTC date
        const utcDate = new Date(Date.UTC(year, month - 1, day, hours, minutes))
        
        // Validate the date
        if (!isValid(utcDate)) {
          console.log('Invalid UTC date created:', utcDate)
          continue
        }

        currentEvent = {
          time: time,
          currency: currency,
          impact: impact,
          event: eventName,
          timestamp: utcDate.toISOString(),
          country: country,
          eventId: eventId || '',
          sourceUrl: '',
          lang: lang,
          timezone: 'UTC'
        }
      } catch (error) {
        console.error('Error parsing timestamp:', error)
        continue
      }
    }

    // Don't forget to add the last event if there is one
    if (currentEvent) {
      console.log('Adding final event:', currentEvent)
      events.push(currentEvent as InvestingEvent)
    }

    console.log('Parsing Summary:')
    console.log('- Total rows processed:', rowCount)
    console.log('- Date rows found:', dateRowCount)
    console.log('- Event rows found:', eventRowCount)
    console.log('- Event info rows found:', eventInfoRowCount)
    console.log('- Events created:', events.length)
    console.log('- All day events:', events.filter(e => e.time === 'Toute la journée').length)
    console.log('- Regular events:', events.filter(e => e.time !== 'Toute la journée').length)

    if (events.length === 0) {
      console.log('Warning: No events were created. This might indicate a parsing issue.')
    }

    return events.map(event => ({
      title: `${event.currency} - ${event.event}`,
      date: new Date(event.timestamp!), // We know timestamp exists because we filtered for it
      importance: mapImpactToImportance(event.impact),
      type: 'ECONOMIC',
      sourceUrl: event.sourceUrl || '',
      country: event.country,
      lang: event.lang,
      timezone: event.timezone
    }))
  } finally {
    if (browser) {
      console.log('Closing Playwright browser...');
      await browser.close();
    }
  }
}

function parseEventDate(timeStr: string, currentDate: Date): Date {
  if (!timeStr) return currentDate
  
  // Handle "All Day" events
  if (timeStr === 'All Day') {
    return currentDate
  }
  
  // Try parsing the time string (format: "HH:mm")
  const [hours, minutes] = timeStr.split(':').map(Number)
  const date = new Date(currentDate)
  date.setHours(hours, minutes, 0, 0)
  
  if (isValid(date)) {
    return date
  }
  
  return currentDate
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { html, lang = 'fr' } = body

    if (!html) {
      return NextResponse.json({
        success: false,
        error: 'No HTML content provided in request body',
      }, { status: 400 })
    }

    // Process the HTML content directly
    const events = await processHtmlContent(html, lang as 'fr' | 'en')
    
    if (events.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No events found in the provided HTML content',
      }, { status: 404 })
    }
    
    // Store events in database
    const storedEvents = await Promise.all(
      events.map(async (event) => {
        try {
          // Check if event already exists
          const existingEvent = await prisma.financialEvent.findFirst({
            where: {
              title: event.title,
              date: event.date,
              lang: event.lang,
              timezone: event.timezone
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
              country: event.country,
              lang: event.lang,
              timezone: event.timezone
            },
          })
        } catch (error) {
          console.error(`Error processing event ${event.title}:`, error)
          return null
        }
      })
    )

    return NextResponse.json({
      success: true,
      events: events,
      count: events.length,
      totalProcessed: events.length,
    })
  } catch (error) {
    console.error('Error in Investing.com calendar route:', error)
    return NextResponse.json(
      { error: 'Failed to process calendar events', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  try {
    // Get the URL and search params
    const { searchParams } = new URL(request.url)
    const lang = (searchParams.get('lang') || 'fr') as 'fr' | 'en'

    // Fetch events directly from Investing.com
    const events = await fetchInvestingCalendarEvents(lang)

    if (events.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No events found',
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      events: events,
      count: events.length
    })
  } catch (error) {
    console.error('Error in GET route:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch events from Investing.com', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}

// New function to process HTML content directly
async function processHtmlContent(html: string, lang: 'fr' | 'en'): Promise<ProcessedEvent[]> {
  try {
    // Parse the HTML table
    const events: InvestingEvent[] = []
    const tableRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/g
    
    let tableMatch
    let currentEvent: Partial<InvestingEvent> | null = null
    let currentDate: Date | null = null
    let rowCount = 0
    let dateRowCount = 0
    let eventRowCount = 0
    let eventInfoRowCount = 0
    
    while ((tableMatch = tableRegex.exec(html)) !== null) {
      rowCount++
      const fullRow = tableMatch[0] // Get the full tr element including attributes
      const row = tableMatch[1] // Get the content inside tr
      
      // Check if this is a date row
      if (row.includes('theDay')) {
        dateRowCount++
        const dateMatch = row.match(/<td[^>]*class="theDay"[^>]*>([^<]+)<\/td>/)
        if (dateMatch) {
          const dateStr = dateMatch[1].trim()
          // Parse French date format (e.g., "Mercredi 7 mai 2025")
          const [day, date, month, year] = dateStr.split(' ')
          const monthMap: { [key: string]: string } = {
            'janvier': '01', 'février': '02', 'mars': '03', 'avril': '04',
            'mai': '05', 'juin': '06', 'juillet': '07', 'août': '08',
            'septembre': '09', 'octobre': '10', 'novembre': '11', 'décembre': '12'
          }
          try {
            // Create date in UTC
            currentDate = new Date(Date.UTC(
              parseInt(year),
              parseInt(monthMap[month.toLowerCase()]) - 1,
              parseInt(date)
            ))
            
            // Validate the date
            if (!isValid(currentDate)) {
              console.log('Invalid current date created:', { dateStr, currentDate })
              currentDate = null
            }
          } catch (error) {
            console.error('Error parsing current date:', error)
            currentDate = null
          }
        }
        continue
      }
      
      // Check if this is an event info row
      if (row.includes('eventInfo')) {
        eventInfoRowCount++
        // If we have a current event, try to get its source URL
        if (currentEvent) {
          // Look for the source URL in the event info row
          const sourceUrlMatch = row.match(/<a[^>]*href="([^"]+)"[^>]*>/)
          if (sourceUrlMatch) {
            currentEvent.sourceUrl = sourceUrlMatch[1]
          }
          events.push(currentEvent as InvestingEvent)
          currentEvent = null
        }
        continue
      }
      
      // Skip non-event rows
      if (!fullRow.includes('eventRowId_')) {
        continue
      }
      
      // If we have a current event but found a new event row,
      // it means the previous event didn't have an info row
      if (currentEvent) {
        events.push(currentEvent as InvestingEvent)
        currentEvent = null
      }
      
      eventRowCount++
      
      // Extract event ID and timestamp from tr attributes
      const eventIdMatch = fullRow.match(/event_attr_id="(\d+)"/)
      const timestampMatch = fullRow.match(/event_timestamp="([^"]+)"/)
      const eventTimestamp = timestampMatch ? timestampMatch[1] : null
      const eventId = eventIdMatch ? eventIdMatch[1] : null
      
      // Extract time
      const timeMatch = row.match(/<td[^>]*class="[^"]*time[^"]*"[^>]*>([^<]+)<\/td>/)
      if (!timeMatch) continue
      
      const time = timeMatch[1].trim()
      
      // Handle "All day" events
      if (time === 'Toute la journée' || time === 'All Day') {
        if (!currentDate) continue
        
        // Extract country and event name for all-day events
        const countryMatch = row.match(/<span[^>]*title="([^"]+)"[^>]*class="[^"]*ceFlags[^"]*"[^>]*>/)
        const eventMatch = row.match(/<td[^>]*class="[^"]*event[^"]*"[^>]*>([^<]+)<\/td>/)
        
        if (countryMatch && eventMatch) {
          currentEvent = {
            time: time,
            currency: '',
            impact: '',
            event: eventMatch[1].trim(),
            timestamp: currentDate.toISOString(),
            country: countryMatch[1],
            eventId: eventId,
            sourceUrl: '',
            lang: lang,
            timezone: 'UTC'
          }
        }
        continue
      }
      
      // Handle regular events
      if (!eventTimestamp) {
        console.log('Skipping regular event - missing timestamp:', { eventTimestamp })
        continue
      }
      
      // Extract country and currency
      const flagMatch = row.match(/<span[^>]*title="([^"]+)"[^>]*class="[^"]*ceFlags[^"]*"[^>]*>.*?<\/span>\s*([A-Z]{3})/)
      if (!flagMatch) {
        console.log('Skipping regular event - no flag/currency match:', row)
        continue
      }
      
      const country = flagMatch[1]
      const currency = flagMatch[2]
      
      // Extract impact/sentiment
      const impactMatch = row.match(/<td[^>]*class="[^"]*sentiment[^"]*"[^>]*>([\s\S]*?)<\/td>/)
      if (!impactMatch) {
        console.log('Skipping regular event - no impact match:', row)
        continue
      }
      
      const impact = impactMatch[1]
      
      // Extract event name
      const eventMatch = row.match(/<td[^>]*class="[^"]*event[^"]*"[^>]*>([\s\S]*?)<\/td>/)
      if (!eventMatch) {
        console.log('Skipping regular event - no event name match:', row)
        continue
      }
      
      // Clean the event name by removing HTML elements and extra whitespace
      const eventName = eventMatch[1]
        .replace(/<[^>]*>/g, '') // Remove all HTML tags
        .replace(/&nbsp;/g, ' ') // Replace &nbsp; with space
        .replace(/&amp;/g, '&')  // Replace &amp; with &
        .replace(/&lt;/g, '<')   // Replace &lt; with <
        .replace(/&gt;/g, '>')   // Replace &gt; with >
        .replace(/&quot;/g, '"') // Replace &quot; with "
        .replace(/&#39;/g, "'")  // Replace &#39; with '
        .replace(/\s+/g, ' ')    // Replace multiple spaces with single space
        .trim()                  // Remove leading/trailing whitespace

      if (!eventName) {
        console.log('Skipping regular event - empty event name after cleaning:', eventMatch[1])
        continue
      }

      console.log('Creating regular event:', {
        time,
        currency,
        event: eventName,
        timestamp: eventTimestamp,
        country
      })
      
      // Parse the timestamp into UTC
      try {
        const [datePart, timePart] = eventTimestamp.split(' ')
        if (!datePart || !timePart) {
          console.log('Invalid timestamp format:', eventTimestamp)
          continue
        }

        const [year, month, day] = datePart.split('-').map(Number)
        const [hours, minutes] = timePart.split(':').map(Number)

        if (isNaN(year) || isNaN(month) || isNaN(day) || isNaN(hours) || isNaN(minutes)) {
          console.log('Invalid date/time components:', { year, month, day, hours, minutes })
          continue
        }

        // Create UTC date
        const utcDate = new Date(Date.UTC(year, month - 1, day, hours, minutes))
        
        // Validate the date
        if (!isValid(utcDate)) {
          console.log('Invalid UTC date created:', utcDate)
          continue
        }

        currentEvent = {
          time: time,
          currency: currency,
          impact: impact,
          event: eventName,
          timestamp: utcDate.toISOString(),
          country: country,
          eventId: eventId || '',
          sourceUrl: '',
          lang: lang,
          timezone: 'UTC'
        }
      } catch (error) {
        console.error('Error parsing timestamp:', error)
        continue
      }
    }

    // Don't forget to add the last event if there is one
    if (currentEvent) {
      console.log('Adding final event:', currentEvent)
      events.push(currentEvent as InvestingEvent)
    }

    console.log('Parsing Summary:')
    console.log('- Total rows processed:', rowCount)
    console.log('- Date rows found:', dateRowCount)
    console.log('- Event rows found:', eventRowCount)
    console.log('- Event info rows found:', eventInfoRowCount)
    console.log('- Events created:', events.length)
    console.log('- All day events:', events.filter(e => e.time === 'Toute la journée').length)
    console.log('- Regular events:', events.filter(e => e.time !== 'Toute la journée').length)

    if (events.length === 0) {
      console.log('Warning: No events were created. This might indicate a parsing issue.')
    }

    return events.map(event => ({
      title: `${event.currency} - ${event.event}`,
      date: new Date(event.timestamp!), // We know timestamp exists because we filtered for it
      importance: mapImpactToImportance(event.impact),
      type: 'ECONOMIC',
      sourceUrl: event.sourceUrl || '',
      country: event.country,
      lang: event.lang,
      timezone: event.timezone
    }))
  } catch (error) {
    console.error('Error processing HTML content:', error)
    return []
  }
} 