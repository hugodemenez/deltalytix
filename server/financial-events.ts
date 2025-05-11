'use server'

import { PrismaClient, FinancialEvent } from '@prisma/client'
import { startOfMonth, endOfMonth, format } from 'date-fns'
import { revalidatePath } from 'next/cache'

const CALENDAR_BASE_URL = 'https://www.investing.com/economic-calendar'
const prisma = new PrismaClient()

/**
 * Synchronizes financial events for a given month from an external API.
 * Expected event format:
 * {
 *   title: string;        // Event title (e.g., "FOMC Meeting Minutes")
 *   date: Date;          // Event date
 *   importance: string;  // Event importance level ("HIGH" | "MEDIUM" | "LOW")
 *   type: string;       // Event type (e.g., "ECONOMIC")
 *   description: string; // Detailed description of the event
 *   sourceUrl: string;  // URL to the event source
 * }
 * 
 * @param date - Target date (defaults to current date). Used to fetch events for the entire month containing this date
 * @returns Promise<FinancialEvent[]> - Array of financial events for the month
 */
export async function syncFinancialEvents(date: Date = new Date()): Promise<FinancialEvent[]> {
  // Temporarily return empty array until we have proper API integration
  console.log(`Financial events sync skipped for ${format(date, 'MMMM yyyy')} - awaiting API integration`)
  return []
}

/**
 * Retrieves financial events for a given month.
 * First attempts to fetch from local database, if no events found,
 * triggers a sync with external API.
 * 
 * Events are ordered by date ascending and filtered to the month containing the input date.
 * 
 * @param date - Target date (defaults to current date). Used to fetch events for the entire month containing this date
 * @param locale - Language locale (defaults to 'fr'). Used to filter events by language
 * @returns Promise<FinancialEvent[]> - Array of financial events for the month
 */
export async function getFinancialEvents(locale: string|undefined = undefined): Promise<FinancialEvent[]> {
  try {

    const where = locale ? {
      lang: locale
    } : {}
    const events = await prisma.financialEvent.findMany({
      where,
      orderBy: {
        date: 'desc'
      }
    })

    return events
  } catch (error) {
    console.error('Error fetching financial events:', error)
    return []
  }
} 