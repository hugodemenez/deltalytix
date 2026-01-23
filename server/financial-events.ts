'use server'

import { PrismaClient, FinancialEvent } from '@/prisma/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import { format } from 'date-fns'

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
})

const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

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