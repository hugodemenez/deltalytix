// CRON JOB RUNNING EVERY WEEK

import { NextRequest, NextResponse } from "next/server";

// PURPOSE:
// - Compute MAE and MFE for all trades of the week
// - Group trades by instruments
// - Get earliest trade date for each instrument
// - Get latest trade date for each instrument
// - Get the data from Databento
// - Save the data in database for later use

// Compute MAE and MFE for all trades
// Based on the entry date (entry price check (it shouldn't differ from the data from Databento))
// If price is different we might have an issue with either the trade date or from the data from Databento
// What could be issues: 
// - Broker data is not up to date
// - Databento data is not up to date
// - Missmatch in timezones between broker and Databento
 

export async function GET() {
    return new Response('Hello, Next.js!', {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      })

}